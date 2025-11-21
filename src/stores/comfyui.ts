import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  queuePromptWS,
  waitUntilFinishedWS,
  uploadImageToComfy,
  buildAssetUrls,
  getHistory as getComfyHistory,
} from '@/services/comfy'
import sam3Workflow from '@/assets/SAM3-WORKFLOW.json'

export const useComfyUIStore = defineStore('comfyui', () => {
  const isConnected = ref(false)
  const isProcessing = ref(false)
  const queue = ref<{ queue_running: Array<unknown>; queue_pending: Array<unknown> } | null>(null)
  const history = ref<Record<string, unknown>>({})
  const generatedImages = ref<string[]>([])
  const currentProgress = ref<string>('')
  const error = ref<string | null>(null)

  const hasGeneratedImages = computed(() => generatedImages.value.length > 0)
  const queueLength = computed(() => {
    if (!queue.value) return 0
    return (queue.value.queue_running?.length || 0) + (queue.value.queue_pending?.length || 0)
  })

  async function checkConnection() {
    try {
      const res = await fetch('/comfy/system_stats')
      const connected = res.ok
      isConnected.value = connected
      if (connected) {
        await updateQueue()
      }
      error.value = null
      return connected
    } catch {
      error.value = 'Failed to connect to ComfyUI'
      isConnected.value = false
      return false
    }
  }

  async function updateQueue() {
    try {
      const res = await fetch('/comfy/queue')
      if (res.ok) {
        queue.value = await res.json()
      }
    } catch (err) {
      console.error('Failed to update queue:', err)
    }
  }

  async function interrupt() {
    try {
      await fetch('/comfy/interrupt', { method: 'POST' })
      isProcessing.value = false
      await updateQueue()
    } catch (err) {
      error.value = 'Failed to interrupt'
      console.error('Interrupt error:', err)
    }
  }

  function clearGeneratedImages() {
    generatedImages.value = []
  }

  /**
   * Upload an image to ComfyUI
   */
  async function uploadImage(file: File) {
    try {
      const result = await uploadImageToComfy(file)
      return result
    } catch (err) {
      error.value = 'Failed to upload image'
      console.error('Upload image error:', err)
      throw err
    }
  }

  /**
   * Run SAM3 Segmentation workflow
   * Uses SAM3-WORKFLOW.json to segment objects based on text prompt
   */
  async function runSAM3Segmentation(options: {
    imageFilename: string
    prompt: string
  }): Promise<{ promptId: string; images: string[] }> {
    isProcessing.value = true
    error.value = null
    currentProgress.value = 'Starting SAM3 Segmentation...'

    try {
      // Clone the workflow
      const workflow = JSON.parse(JSON.stringify(sam3Workflow))

      // Update Node 3: Load Image
      if (workflow['3'] && workflow['3'].inputs) {
        workflow['3'].inputs.image = options.imageFilename
      }

      // Update Node 4: SAM3 Segmentation
      if (workflow['4'] && workflow['4'].inputs) {
        workflow['4'].inputs.text_prompt = options.prompt
      }

      // Execute
      const { prompt_id } = await queuePromptWS(workflow)
      currentProgress.value = 'Processing...'

      // Wait for completion
      await waitUntilFinishedWS(prompt_id)

      // Get outputs
      const history = await getComfyHistory(prompt_id)
      const outputs = history?.[prompt_id]?.outputs
      
      const images: string[] = []
      if (outputs) {
        const assets = buildAssetUrls(outputs)
        // Filter for Node 5 (PreviewImage)
        const node5Assets = assets.filter(a => a.node === '5' && a.type === 'image')
        images.push(...node5Assets.map(a => a.url))
      }

      generatedImages.value = images
      return { promptId: prompt_id, images }

    } catch (err) {
      error.value = 'Failed to run SAM3 segmentation'
      console.error('SAM3 error:', err)
      throw err
    } finally {
      isProcessing.value = false
      currentProgress.value = ''
    }
  }

  return {
    isConnected,
    isProcessing,
    queue,
    history,
    generatedImages,
    currentProgress,
    error,
    hasGeneratedImages,
    queueLength,
    checkConnection,
    updateQueue,
    interrupt,
    clearGeneratedImages,
    uploadImage,
    runSAM3Segmentation,
  }
})
