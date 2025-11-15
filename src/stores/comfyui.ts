import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  queuePromptWS,
  waitUntilFinishedWS,
  uploadImageToComfy,
  buildAssetUrls,
  waitForOutputs,
  getHistory as getComfyHistory,
} from '@/services/comfy'
import editQwenWorkflow from '@/assets/edit_qwen_wf.json'

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
   * Run Qwen Image Edit workflow
   * This uses the edit_qwen_wf.json workflow
   */
  async function runQwenImageEdit(options: {
    imageFilename: string // filename in ComfyUI input folder (e.g., "my-photo.jpg")
    positivePrompt: string // what you want to generate/edit
    negativePrompt?: string // what to avoid (optional)
    seed?: number // random seed for reproducibility (optional)
    steps?: number // number of inference steps (optional, default: 4)
  }): Promise<{ promptId: string; images: string[] }> {
    isProcessing.value = true
    error.value = null
    currentProgress.value = 'Starting...'

    try {
      // Clone the workflow - cast to the workflow structure
      const workflow = JSON.parse(JSON.stringify(editQwenWorkflow)) as {
        '78'?: { inputs?: { image?: string } }
        '115:111'?: { inputs?: { prompt?: string } }
        '115:110'?: { inputs?: { prompt?: string } }
        '115:3'?: { inputs?: { seed?: number; steps?: number } }
        [key: string]: unknown
      }

      // REQUIRED: Update the image filename
      // Node 78 - LoadImage: Set the input image filename
      if (workflow['78']?.inputs) {
        workflow['78'].inputs.image = options.imageFilename
      }

      // REQUIRED: Update the positive prompt
      // Node 115:111 - TextEncodeQwenImageEditPlus: Set what you want to generate
      if (workflow['115:111']?.inputs) {
        workflow['115:111'].inputs.prompt = options.positivePrompt
      }

      // OPTIONAL: Update the negative prompt
      // Node 115:110 - TextEncodeQwenImageEditPlus: Set what to avoid
      if (workflow['115:110']?.inputs) {
        workflow['115:110'].inputs.prompt = options.negativePrompt || ''
      }

      // OPTIONAL: Update sampler settings
      // Node 115:3 - KSampler: Control generation parameters
      if (workflow['115:3']?.inputs) {
        if (options.seed !== undefined) {
          workflow['115:3'].inputs.seed = options.seed
        }
        if (options.steps !== undefined) {
          workflow['115:3'].inputs.steps = options.steps
        }
      }

      // Queue the prompt
      currentProgress.value = 'Queuing prompt...'
      const { prompt_id } = await queuePromptWS(workflow)

      // Wait for execution to finish
      currentProgress.value = 'Processing...'
      await waitUntilFinishedWS(prompt_id, (nodeId) => {
        currentProgress.value = `Processing node: ${nodeId}`
      })

      // Get the outputs
      currentProgress.value = 'Fetching results...'
      const outputs = await waitForOutputs(prompt_id)

      // Build image URLs
      const assets = buildAssetUrls(outputs)
      const images = assets.filter((a) => a.type === 'image').map((a) => a.url)

      // Store the generated images
      generatedImages.value.push(...images)

      currentProgress.value = 'Complete!'
      return { promptId: prompt_id, images }
    } catch (err) {
      error.value = 'Failed to run Qwen Image Edit'
      console.error('Qwen Image Edit error:', err)
      throw err
    } finally {
      isProcessing.value = false
      currentProgress.value = ''
    }
  }

  /**
   * Get history for a specific prompt
   */
  async function getHistory(promptId: string) {
    try {
      const result = await getComfyHistory(promptId)
      if (result) {
        history.value = result
      }
      return result
    } catch (err) {
      error.value = 'Failed to get history'
      console.error('Get history error:', err)
      throw err
    }
  }

  function clearGeneratedImages() {
    generatedImages.value.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    })
    generatedImages.value = []
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
    uploadImage,
    runQwenImageEdit,
    getHistory,
    clearGeneratedImages,
  }
})
