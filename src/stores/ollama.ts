import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createOllamaService, type OllamaMessage } from '@/services/ollamaService'
import config from '@/config'

export const useOllamaStore = defineStore('ollama', () => {
  let service = createOllamaService(config.ollama.baseUrl, config.ollama.defaultModel)
  const isConnected = ref(false)
  const isLoading = ref(false)
  const currentModel = ref(config.ollama.defaultModel)
  const messages = ref<OllamaMessage[]>([])
  const availableModels = ref<Array<{ name: string; size: number }>>([])
  const error = ref<string | null>(null)

  const hasMessages = computed(() => messages.value.length > 0)

  async function checkConnection() {
    isLoading.value = true
    try {
      const connected = await service.healthCheck()
      isConnected.value = connected
      if (connected) {
        await loadModels()
      }
      error.value = null
      return connected
    } catch {
      error.value = 'Failed to connect to Ollama'
      isConnected.value = false
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function loadModels() {
    try {
      const result = await service.listModels()
      availableModels.value = result.models || []
    } catch (err) {
      console.error('Failed to load models:', err)
      error.value = 'Failed to load models'
    }
  }

  async function sendMessage(content: string, images?: string[]) {
    isLoading.value = true
    error.value = null

    const userMessage: OllamaMessage = {
      role: 'user',
      content,
      images,
    }

    messages.value.push(userMessage)

    try {
      const response = await service.chat([...messages.value])
      messages.value.push(response.message)
      return response.message.content
    } catch (err) {
      error.value = 'Failed to send message'
      console.error('Send message error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function analyzeImage(imageBase64: string, prompt: string) {
    isLoading.value = true
    error.value = null

    try {
      const result = await service.analyzeImage(imageBase64, prompt)
      return result
    } catch (err) {
      error.value = 'Failed to analyze image'
      console.error('Analyze image error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function clearMessages() {
    messages.value = []
  }

  function setModel(model: string) {
    currentModel.value = model
    // Recreate the service with the new model
    service = createOllamaService(config.ollama.baseUrl, model)
  }

  return {
    isConnected,
    isLoading,
    currentModel,
    messages,
    availableModels,
    error,
    hasMessages,
    checkConnection,
    loadModels,
    sendMessage,
    analyzeImage,
    clearMessages,
    setModel,
  }
})
