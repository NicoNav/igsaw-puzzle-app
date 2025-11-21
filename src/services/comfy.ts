// src/api/comfy.ts
import type { ComfyPromptResponse, ComfyHistory } from '../types'

const BASE_HTTP = '/comfy'
const BASE_WS   = (location.protocol === 'https:' ? 'wss://' : 'ws://')
  + location.host + '/comfy' // goes through Vite proxy

// Safe UUID that works even when randomUUID is unavailable (non-HTTPS LAN)
function safeUUID(): string {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {}
  try {
    // RFC4122 v4 using getRandomValues if available
    const c = globalThis.crypto
    if (c?.getRandomValues) {
      const b = new Uint8Array(16)
      c.getRandomValues(b)
      b[6]! = (b[6]! & 0x0f) | 0x40
      b[8]! = (b[8]! & 0x3f) | 0x80
      const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
      return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
    }
  } catch {}
  // Last resort (non-crypto)
  return `uuid-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

// Use this everywhere you need a client id
const clientId = safeUUID()

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_HTTP}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

/** Queue a prompt using WS-style body (includes client_id). */
export async function queuePromptWS(payload: unknown) {
  // WS flow requires { prompt: ..., client_id: ... }
  return postJSON<ComfyPromptResponse>('/prompt', {
    prompt: payload,
    client_id: clientId,
  })
}

export async function waitUntilFinishedWS(promptId: string, onNode?: (nodeId: string) => void) {
  const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/comfy/ws?clientId=${encodeURIComponent(clientId)}`)
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = (err) => reject(err)
  })
  const done = await new Promise<void>((resolve) => {
    ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        try {
          const msg = JSON.parse(ev.data)
          if (msg?.type === 'executing' && msg?.data?.prompt_id === promptId) {
            if (msg.data.node) onNode?.(msg.data.node)
            if (msg.data.node === null) { ws.close(); resolve() }
          }
        } catch {}
      }
    }
    ws.onclose = () => resolve()
  })
  return done
}

/** Stream images from a SaveImageWebsocket node while also listening to execution updates. */
export async function runPromptAndStreamImages(
  payload: unknown,
  options: {
    captureNodeId?: string // default: 'save_image_websocket_node'
    onEvent?: (evt: unknown) => void // receives parsed JSON execution events
    onError?: (err: unknown) => void
  } = {},
): Promise<{ promptId: string; imageUrls: string[] }> {
  const captureId = options.captureNodeId ?? 'save_image_websocket_node'
  const { prompt_id } = await queuePromptWS(payload)

  const ws = new WebSocket(`${BASE_WS}/ws?clientId=${encodeURIComponent(clientId)}`)

  const imageBlobs: Blob[] = []
  let currentNode = ''

  const openPromise = new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve()
    ws.onerror = (e) => reject(e)
  })

  await openPromise

  const donePromise = new Promise<{ imageUrls: string[] }>((resolve, reject) => {
    ws.onmessage = (event) => {
      // Text frame → execution event
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data)
          options.onEvent?.(message)

          if (message.type === 'executing') {
            const d = message.data
            if (d?.prompt_id === prompt_id) {
              // node == null means execution finished
              currentNode = d.node ?? currentNode
              if (d.node === null) {
                ws.close()
                const urls = imageBlobs.map(b => URL.createObjectURL(b))
                resolve({ imageUrls: urls })
              }
            }
          }
        } catch {
          // ignore malformed event
        }
        return
      }

      // Binary frame → likely image bytes from SaveImageWebsocket
      // ComfyUI puts an 8-byte header; slice it off like the Python example
      try {
        if (currentNode === captureId) {
          const raw = event.data as Blob
          imageBlobs.push(raw.slice(8))
        }
      } catch (err) {
        options.onError?.(err)
      }
    }

    ws.onclose = () => {
      // If closed without resolving (no 'executing: null'), still return what we got
      const urls = imageBlobs.map(b => URL.createObjectURL(b))
      resolve({ imageUrls: urls })
    }

    ws.onerror = (e) => {
      reject(e)
    }
  })

  const result = await donePromise
  return { promptId: prompt_id, imageUrls: result.imageUrls }
}

/** Legacy/simple HTTP submit (no client_id). Keep for non-WS graphs or video polling. */
export async function submitPrompt(payload: unknown): Promise<string> {
  const body = { prompt: payload, client_id: crypto.randomUUID() }
  const res = await postJSON<ComfyPromptResponse>('/prompt', body)
  return res.prompt_id
}


// upload to INPUT ROOT
export async function uploadImageToComfy(file: File, subfolder = '') {
  const qs = new URLSearchParams({ type: 'input', subfolder }) // subfolder: ''
  const form = new FormData()
  form.append('image', file, file.name)
  const res = await fetch(`/comfy/upload/image?${qs}`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as { name: string; subfolder?: string }
  return { filename: data.name, subfolder: data.subfolder ?? '' }
}

// copy output → input ROOT
export async function bringOutputImageToInput(filename: string, subfolder = '') {
  const qs = new URLSearchParams({ filename, subfolder, type: 'output' })
  const res = await fetch(`/comfy/view?${qs}`)
  if (!res.ok) throw new Error(`Fetch output image failed: ${res.status}`)
  const blob = await res.blob()
  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  // upload with subfolder '' (root)
  return uploadImageToComfy(file, '')
}


/** History polling (still useful for MP4 from SaveVideo). */
export async function waitForOutputs(promptId: string, { pollMs = 1500, timeoutMs = 5 * 60_000 } = {}) {
  const t0 = Date.now()
  while (true) {
    if (Date.now() - t0 > timeoutMs) throw new Error('Timeout waiting for ComfyUI outputs')
    const res = await fetch(`${BASE_HTTP}/history/${promptId}`)
    if (res.ok) {
      const data = (await res.json()) as Record<string, ComfyHistory>
      const entry = data[promptId]
      if (entry?.outputs /* && entry?.status?.status_str === 'success' */) {
        return entry.outputs
      }
    }
    await new Promise(r => setTimeout(r, pollMs))
  }
}

/** Build /view URLs for files saved to disk (images/videos). */
export function buildAssetUrls(outputs: Record<string, unknown>) {
  const assets: {
    type: 'image' | 'video' | 'other'
    url: string
    node: string
    filename: string
  }[] = []
  for (const [node, out] of Object.entries(outputs)) {
    const output = out as { images?: Array<{ filename: string; subfolder?: string; type?: string }> }
    const files = output?.images ?? []
    for (const f of files) {
      const url = `${BASE_HTTP}/view?filename=${encodeURIComponent(f.filename)}&subfolder=${encodeURIComponent(f.subfolder || '')}&type=${encodeURIComponent(f.type || 'output')}`
      const lower = f.filename.toLowerCase()
      const isVideo = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')
      assets.push({ type: isVideo ? 'video' : 'image', url, node, filename: f.filename })
    }
  }
  return assets
}

export async function getHistory(promptId: string) {
  const res = await fetch(`/comfy/history/${promptId}`)
  if (!res.ok) return null
  return res.json() as Promise<Record<string, import('../types').ComfyHistory>>
}

/**
 * Run the `sdxl_simple_example` workflow for many prompts.
 * - clones the JSON, applies each prompt to the CLIP nodes (6 & 15)
 * - posts via queuePromptWS and returns an array of prompt ids
 *
 * If waitForOutputs = true the function will also wait for the outputs and
 * return built asset URLs for each completed run.
 */
export async function runSdxlWithPrompts(prompts: string[], { waitForOutputs: wait = false, pollMs = 1500, timeoutMs = 5 * 60_000 } = {}) {
  // Load the workflow JSON asset from the built app (served from /src/assets)
  const res = await fetch('/src/assets/sdxl_simple_example.json')
  if (!res.ok) throw new Error(`Failed to load sdxl workflow asset: ${res.status}`)
  const baseGraph = await res.json()

  const results: Array<{ prompt: string; promptId: string; assets?: ReturnType<typeof buildAssetUrls> }> = []

  for (const p of prompts) {
    const copy = JSON.parse(JSON.stringify(baseGraph))
    // Apply to nodes 6 & 15 if present (positive prompts for base & refiner)
    if (copy['6']?.inputs) copy['6'].inputs.text = p
    if (copy['15']?.inputs) copy['15'].inputs.text = p

    const { prompt_id } = await queuePromptWS(copy)
    results.push({ prompt: p, promptId: prompt_id })
  }

  if (!wait) return results

  // Wait for outputs for each run and attach built assets
  for (const r of results) {
    try {
      await waitUntilFinishedWS(r.promptId)
      const outs = await waitForOutputs(r.promptId, { pollMs, timeoutMs })
      r.assets = buildAssetUrls(outs)
    } catch {
      // attach empty assets on failure
      r.assets = []
    }
  }

  return results
}