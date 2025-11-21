import editQwenWorkflow from '@/assets/edit_qwen_wf.json'

export interface ComfyUIConfig {
  baseUrl: string
  wsUrl?: string
}

export interface ComfyUIPromptNode {
  inputs: Record<string, unknown>
  class_type: string
}

export interface ComfyUIPrompt {
  [key: string]: ComfyUIPromptNode
}

export interface ComfyUIQueueResponse {
  prompt_id: string
  number: number
  node_errors?: Record<string, unknown>
}

export interface ComfyUIHistoryItem {
  prompt: Array<Record<string, unknown>>
  outputs: {
    [key: string]: {
      images?: Array<{
        filename: string
        subfolder: string
        type: string
      }>
    }
  }
}

// Safe UUID generation
function safeUUID(): string {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  } catch {}
  try {
    const c = globalThis.crypto
    if (c?.getRandomValues) {
      const b = new Uint8Array(16)
      c.getRandomValues(b)
      b[6]! = (b[6]! & 0x0f) | 0x40
      b[8]! = (b[8]! & 0x3f) | 0x80
      const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
    }
  } catch {}
  return `uuid-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export class ComfyUIService {
  private config: ComfyUIConfig
  private clientId: string

  constructor(config: ComfyUIConfig) {
    this.config = config
    this.clientId = safeUUID()
  }

  private async postJSON<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`)
    return res.json() as Promise<T>
  }

  /**
   * Queue a prompt for execution
   */
  async queuePrompt(prompt: ComfyUIPrompt, clientId?: string): Promise<ComfyUIQueueResponse> {
    try {
      return await this.postJSON<ComfyUIQueueResponse>('/prompt', {
        prompt,
        client_id: clientId || this.clientId,
      })
    } catch (error) {
      console.error('ComfyUI queue prompt error:', error)
      throw error
    }
  }

  /**
   * Get the queue status
   */
  async getQueue(): Promise<{
    queue_running: Array<unknown>
    queue_pending: Array<unknown>
  }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/queue`)
      if (!response.ok) throw new Error(`Get queue failed: ${response.status}`)
      return response.json()
    } catch (error) {
      console.error('ComfyUI get queue error:', error)
      throw error
    }
  }

  /**
   * Get prompt history
   */
  async getHistory(promptId?: string): Promise<{ [key: string]: ComfyUIHistoryItem }> {
    try {
      const url = promptId
        ? `${this.config.baseUrl}/history/${promptId}`
        : `${this.config.baseUrl}/history`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Get history failed: ${response.status}`)
      return response.json()
    } catch (error) {
      console.error('ComfyUI get history error:', error)
      throw error
    }
  }

  /**
   * Get an image by filename
   */
  async getImage(filename: string, subfolder: string = '', type: string = 'output'): Promise<Blob> {
    try {
      const params = new URLSearchParams({
        filename,
        subfolder,
        type,
      })
      const response = await fetch(`${this.config.baseUrl}/view?${params.toString()}`)
      if (!response.ok) throw new Error(`Get image failed: ${response.status}`)
      return response.blob()
    } catch (error) {
      console.error('ComfyUI get image error:', error)
      throw error
    }
  }

  /**
   * Upload an image
   */
  async uploadImage(
    file: File,
    subfolder: string = '',
    type: string = 'input',
  ): Promise<{ name: string; subfolder: string; type: string }> {
    try {
      const params = new URLSearchParams({ type, subfolder })
      const formData = new FormData()
      formData.append('image', file, file.name)

      const response = await fetch(`${this.config.baseUrl}/upload/image?${params.toString()}`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error(`Upload image failed: ${response.status}`)
      const data = (await response.json()) as { name: string; subfolder?: string }
      return { name: data.name, subfolder: data.subfolder ?? '', type }
    } catch (error) {
      console.error('ComfyUI upload image error:', error)
      throw error
    }
  }

  /**
   * Get system stats
   */
  async getSystemStats(): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.config.baseUrl}/system_stats`)
      if (!response.ok) throw new Error(`Get system stats failed: ${response.status}`)
      return response.json()
    } catch (error) {
      console.error('ComfyUI get system stats error:', error)
      throw error
    }
  }

  /**
   * Interrupt current execution
   */
  async interrupt(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/interrupt`, { method: 'POST' })
      if (!response.ok) throw new Error(`Interrupt failed: ${response.status}`)
    } catch (error) {
      console.error('ComfyUI interrupt error:', error)
      throw error
    }
  }

  /**
   * Check if ComfyUI is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/system_stats`)
      return response.status === 200
    } catch {
      return false
    }
  }

  /**
   * Wait for execution to finish using WebSocket
   */
  async waitUntilFinished(
    promptId: string,
    onNode?: (nodeId: string) => void,
  ): Promise<void> {
    const wsUrl = this.config.wsUrl || this.config.baseUrl.replace('http', 'ws') + '/ws'
    const ws = new WebSocket(`${wsUrl}?clientId=${encodeURIComponent(this.clientId)}`)

    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve()
      ws.onerror = (err) => reject(err)
    })

    await new Promise<void>((resolve) => {
      ws.onmessage = (ev) => {
        if (typeof ev.data === 'string') {
          try {
            const msg = JSON.parse(ev.data)
            if (msg?.type === 'executing' && msg?.data?.prompt_id === promptId) {
              if (msg.data.node) onNode?.(msg.data.node)
              if (msg.data.node === null) {
                ws.close()
                resolve()
              }
            }
          } catch {}
        }
      }
      ws.onclose = () => resolve()
    })
  }

  /**
   * Run Qwen Image Edit workflow
   * This uses the edit_qwen_wf.json workflow
   */
  async runQwenImageEdit(options: {
    imageFilename: string // filename in ComfyUI input folder
    positivePrompt: string
    negativePrompt?: string
    seed?: number
    steps?: number
    onProgress?: (nodeId: string) => void
  }): Promise<{ promptId: string; images: string[] }> {
    try {
      // Clone the workflow
      const workflow: ComfyUIPrompt = JSON.parse(JSON.stringify(editQwenWorkflow))

      // Update the workflow with user inputs
      // Load image node (78)
      if (workflow['78']?.inputs) {
        workflow['78'].inputs.image = options.imageFilename
      }

      // Positive prompt node (115:111)
      if (workflow['115:111']?.inputs) {
        workflow['115:111'].inputs.prompt = options.positivePrompt
      }

      // Negative prompt node (115:110) 
      if (workflow['115:110']?.inputs && options.negativePrompt) {
        workflow['115:110'].inputs.prompt = options.negativePrompt
      }

      // Sampler settings (115:3)
      if (workflow['115:3']?.inputs) {
        if (options.seed !== undefined) {
          workflow['115:3'].inputs.seed = options.seed
        }
        if (options.steps !== undefined) {
          workflow['115:3'].inputs.steps = options.steps
        }
      }

      // Queue the prompt
      const { prompt_id } = await this.queuePrompt(workflow)

      // Wait for execution to finish
      await this.waitUntilFinished(prompt_id, options.onProgress)

      // Get the outputs
      const history = await this.getHistory(prompt_id)
      const outputs = history[prompt_id]?.outputs || {}

      // Build image URLs
      const images: string[] = []
      for (const nodeOutput of Object.values(outputs)) {
        if (nodeOutput.images) {
          for (const img of nodeOutput.images) {
            const params = new URLSearchParams({
              filename: img.filename,
              subfolder: img.subfolder || '',
              type: img.type || 'output',
            })
            images.push(`${this.config.baseUrl}/view?${params.toString()}`)
          }
        }
      }

      return { promptId: prompt_id, images }
    } catch (error) {
      console.error('Qwen Image Edit error:', error)
      throw error
    }
  }

  /**
   * Create WebSocket connection for real-time updates
   */
  createWebSocket(clientId?: string): WebSocket | null {
    const wsUrl = this.config.wsUrl || this.config.baseUrl.replace('http', 'ws') + '/ws'
    const cid = clientId || this.clientId
    const ws = new WebSocket(`${wsUrl}?clientId=${encodeURIComponent(cid)}`)
    return ws
  }
}

// Default instance with common configuration
export const createComfyUIService = (
  baseUrl: string = '/comfy',
  wsUrl?: string,
): ComfyUIService => {
  const ws = wsUrl || (typeof window !== 'undefined'
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/comfy/ws`
    : undefined)
  return new ComfyUIService({ baseUrl, wsUrl: ws })
}
