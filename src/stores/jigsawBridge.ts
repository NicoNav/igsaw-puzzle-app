import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { createJigsawBridge, type JigsawAnalysis } from '@/services/jigsawBridgeService'
import config from '@/config'

export const useJigsawBridgeStore = defineStore('jigsawBridge', () => {
  const service = createJigsawBridge(
    config.ollama.baseUrl,
    config.ollama.visionModel,
    config.ollama.editModel,
  )

  const isAnalyzing = ref(false)
  const isGeneratingPrompt = ref(false)
  const isEditing = ref(false)
  const detectPeople = ref(false) // Toggle for people detection
  const currentAnalysis = ref<JigsawAnalysis | null>(null)
  const contextAwarePrompt = ref<string>('')
  const jigsawCutPattern = ref<string>('') // New: jigsaw cut pattern
  const editResponse = ref<string>('')
  const suggestions = ref<string[]>([])
  const error = ref<string | null>(null)
  const currentImage = ref<string | null>(null)

  const hasAnalysis = computed(() => currentAnalysis.value !== null)
  const hasPrompt = computed(() => contextAwarePrompt.value.length > 0)
  const hasSuggestions = computed(() => suggestions.value.length > 0)
  const hasPeople = computed(
    () => currentAnalysis.value?.detectedPeople && currentAnalysis.value.detectedPeople.length > 0,
  )
  const peopleCount = computed(() => currentAnalysis.value?.peopleCount || 0)
  const isProcessing = computed(
    () => isAnalyzing.value || isGeneratingPrompt.value || isEditing.value,
  )

  /**
   * Step 1: Analyze jigsaw puzzle image (with optional people detection)
   */
  async function analyzeJigsaw(imageBase64: string, withPeopleDetection: boolean = false) {
    isAnalyzing.value = true
    error.value = null
    currentImage.value = imageBase64

    try {
      const analysis = withPeopleDetection
        ? await service.analyzeWithPeopleDetection(imageBase64)
        : await service.analyzeJigsaw(imageBase64)

      currentAnalysis.value = analysis
      return analysis
    } catch (err) {
      error.value = 'Failed to analyze jigsaw puzzle'
      console.error('Analyze jigsaw error:', err)
      throw err
    } finally {
      isAnalyzing.value = false
    }
  }

  /**
   * Generate jigsaw cutting pattern based on detected individuals
   */
  async function generateJigsawCutPattern(preferences?: {
    pieceSize?: string
    cutStyle?: string
    preserveIndividuals?: boolean
  }) {
    if (!currentAnalysis.value) {
      error.value = 'Please analyze the image first'
      return
    }

    isGeneratingPrompt.value = true
    error.value = null

    try {
      const pattern = await service.generateJigsawCutPrompt(currentAnalysis.value, preferences)
      jigsawCutPattern.value = pattern
      return pattern
    } catch (err) {
      error.value = 'Failed to generate jigsaw cut pattern'
      console.error('Generate cut pattern error:', err)
      throw err
    } finally {
      isGeneratingPrompt.value = false
    }
  }

  /**
   * Step 2: Generate context-aware prompt for editing
   */
  async function generateEditPrompt(userIntent: string) {
    if (!currentAnalysis.value) {
      error.value = 'Please analyze the image first'
      return
    }

    isGeneratingPrompt.value = true
    error.value = null

    try {
      const prompt = await service.generateContextAwarePrompt(currentAnalysis.value, userIntent)
      contextAwarePrompt.value = prompt
      return prompt
    } catch (err) {
      error.value = 'Failed to generate context-aware prompt'
      console.error('Generate prompt error:', err)
      throw err
    } finally {
      isGeneratingPrompt.value = false
    }
  }

  /**
   * Step 3: Execute edit with context-aware prompt
   */
  async function executeEdit(customPrompt?: string) {
    if (!currentImage.value) {
      error.value = 'No image to edit'
      return
    }

    const promptToUse = customPrompt || contextAwarePrompt.value
    if (!promptToUse) {
      error.value = 'No prompt available'
      return
    }

    isEditing.value = true
    error.value = null

    try {
      const result = await service.executeEdit(currentImage.value, promptToUse)
      editResponse.value = result.response
      suggestions.value = result.suggestions
      return result
    } catch (err) {
      error.value = 'Failed to execute edit'
      console.error('Execute edit error:', err)
      throw err
    } finally {
      isEditing.value = false
    }
  }

  /**
   * Complete workflow: analyze, generate prompt, and execute edit
   */
  async function processJigsaw(
    imageBase64: string,
    userIntent: string,
    withPeopleDetection: boolean = false,
  ) {
    try {
      // Step 1: Analyze (with optional people detection)
      await analyzeJigsaw(imageBase64, withPeopleDetection)

      // Step 2: Generate context-aware prompt
      await generateEditPrompt(userIntent)

      // Step 3: Execute edit
      const result = await executeEdit()

      return {
        analysis: currentAnalysis.value,
        prompt: contextAwarePrompt.value,
        result,
      }
    } catch (err) {
      console.error('Process jigsaw error:', err)
      throw err
    }
  }

  /**
   * Clear all state
   */
  function reset() {
    currentAnalysis.value = null
    contextAwarePrompt.value = ''
    jigsawCutPattern.value = ''
    editResponse.value = ''
    suggestions.value = []
    error.value = null
    currentImage.value = null
    detectPeople.value = false
  }

  /**
   * Update models
   */
  function setModels(visionModel: string, editModel: string) {
    service.setVisionModel(visionModel)
    service.setEditModel(editModel)
  }

  return {
    service,
    isAnalyzing,
    isGeneratingPrompt,
    isEditing,
    isProcessing,
    detectPeople,
    currentAnalysis,
    contextAwarePrompt,
    jigsawCutPattern,
    editResponse,
    suggestions,
    error,
    currentImage,
    hasAnalysis,
    hasPrompt,
    hasSuggestions,
    hasPeople,
    peopleCount,
    analyzeJigsaw,
    generateEditPrompt,
    generateJigsawCutPattern,
    executeEdit,
    processJigsaw,
    reset,
    setModels,
  }
})
