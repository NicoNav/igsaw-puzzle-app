import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createComfyUIService, type ComfyUIPrompt } from '@/services/comfyUIService'
import config from '@/config'

export const useComfyUIStore = defineStore('comfyui', () => {
  const service = createComfyUIService(config.comfyui.baseUrl, config.comfyui.wsUrl)
  const isConnected = ref(false)
  const isProcessing = ref(false)
  const clientId = ref(`client_${Date.now()}`)
  const queue = ref<{ queue_running: Array<unknown>; queue_pending: Array<unknown> } | null>(null)
  const history = ref<Record<string, unknown>>({})
  const generatedImages = ref<string[]>([])
  const error = ref<string | null>(null)

  const hasGeneratedImages = computed(() => generatedImages.value.length > 0)
  const queueLength = computed(() => {
    if (!queue.value) return 0
    return (queue.value.queue_running?.length || 0) + (queue.value.queue_pending?.length || 0)
  })

  async function checkConnection() {
    try {
      const connected = await service.healthCheck()
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
      const result = await service.getQueue()
      queue.value = result
    } catch (err) {
      console.error('Failed to update queue:', err)
    }
  }

  async function queuePrompt(prompt: ComfyUIPrompt) {
    isProcessing.value = true
    error.value = null

    try {
      const result = await service.queuePrompt(prompt, clientId.value)
      await updateQueue()
      return result
    } catch (err) {
      error.value = 'Failed to queue prompt'
      console.error('Queue prompt error:', err)
      throw err
    } finally {
      isProcessing.value = false
    }
  }

  async function getHistory(promptId?: string) {
    try {
      const result = await service.getHistory(promptId)
      history.value = result
      return result
    } catch (err) {
      error.value = 'Failed to get history'
      console.error('Get history error:', err)
      throw err
    }
  }

  async function getImage(filename: string, subfolder: string = '', type: string = 'output') {
    try {
      const blob = await service.getImage(filename, subfolder, type)
      const url = URL.createObjectURL(blob)
      generatedImages.value.push(url)
      return url
    } catch (err) {
      error.value = 'Failed to get image'
      console.error('Get image error:', err)
      throw err
    }
  }

  async function uploadImage(file: File) {
    try {
      const result = await service.uploadImage(file)
      return result
    } catch (err) {
      error.value = 'Failed to upload image'
      console.error('Upload image error:', err)
      throw err
    }
  }

  async function interrupt() {
    try {
      await service.interrupt()
      isProcessing.value = false
      await updateQueue()
    } catch (err) {
      error.value = 'Failed to interrupt'
      console.error('Interrupt error:', err)
    }
  }

  function clearGeneratedImages() {
    generatedImages.value.forEach((url) => URL.revokeObjectURL(url))
    generatedImages.value = []
  }

  return {
    service,
    isConnected,
    isProcessing,
    clientId,
    queue,
    history,
    generatedImages,
    error,
    hasGeneratedImages,
    queueLength,
    checkConnection,
    updateQueue,
    queuePrompt,
    getHistory,
    getImage,
    uploadImage,
    interrupt,
    clearGeneratedImages,
  }
})
