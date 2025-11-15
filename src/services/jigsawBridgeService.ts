import { OllamaService, type OllamaMessage } from './ollamaService'

export interface JigsawAnalysis {
  imageDescription: string
  pieceCount?: number
  colors?: string[]
  complexity?: string
  context: string
}

export interface JigsawEditRequest {
  originalImage: string // Base64
  analysis: JigsawAnalysis
  editPrompt: string
  visionModel?: string
  editModel?: string
}

/**
 * Bridge service that connects Qwen vision analysis with Qwen edit
 * for context-aware jigsaw puzzle processing
 */
export class JigsawBridgeService {
  private visionService: OllamaService
  private editService: OllamaService

  constructor(
    baseUrl: string = 'http://localhost:11434',
    visionModel: string = 'qwen2-vl',
    editModel: string = 'qwen2.5',
  ) {
    this.visionService = new OllamaService({ baseUrl, model: visionModel })
    this.editService = new OllamaService({ baseUrl, model: editModel })
  }

  /**
   * Analyze jigsaw puzzle image using Qwen vision
   */
  async analyzeJigsaw(imageBase64: string): Promise<JigsawAnalysis> {
    const analysisPrompt = `Analyze this jigsaw puzzle image in detail. Describe:
1. The overall scene or subject matter
2. Estimated number of pieces (if visible)
3. Dominant colors and color scheme
4. Complexity level (easy, medium, hard)
5. Any distinctive features or patterns
6. Current state (complete, in progress, scattered)

Provide a comprehensive description that will help in editing or manipulating this puzzle.`

    const response = await this.visionService.analyzeImage(imageBase64, analysisPrompt)

    // Parse the response to extract structured information
    return {
      imageDescription: response,
      context: response,
    }
  }

  /**
   * Generate context-aware edit prompt by combining vision analysis with user intent
   */
  async generateContextAwarePrompt(analysis: JigsawAnalysis, userIntent: string): Promise<string> {
    const messages: OllamaMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant that generates precise image editing prompts for jigsaw puzzles. 
You have access to a detailed analysis of the puzzle and must create a prompt that incorporates this context.`,
      },
      {
        role: 'user',
        content: `Based on this jigsaw puzzle analysis:
${analysis.context}

The user wants to: ${userIntent}

Generate a detailed, context-aware prompt for an image editing model that:
1. References specific elements from the analysis
2. Maintains consistency with the puzzle's characteristics
3. Achieves the user's intent
4. Preserves the jigsaw puzzle nature of the image

Return only the editing prompt, no explanations.`,
      },
    ]

    const response = await this.editService.chat(messages)
    return response.message.content
  }

  /**
   * Complete workflow: analyze image, generate context-aware prompt, and prepare for editing
   */
  async processJigsawForEdit(request: JigsawEditRequest): Promise<{
    analysis: JigsawAnalysis
    contextAwarePrompt: string
    editRequest: {
      image: string
      prompt: string
      context: string
    }
  }> {
    // Step 1: Analyze the jigsaw if not already done
    const analysis = request.analysis || (await this.analyzeJigsaw(request.originalImage))

    // Step 2: Generate context-aware editing prompt
    const contextAwarePrompt = await this.generateContextAwarePrompt(analysis, request.editPrompt)

    // Step 3: Prepare the complete edit request
    return {
      analysis,
      contextAwarePrompt,
      editRequest: {
        image: request.originalImage,
        prompt: contextAwarePrompt,
        context: analysis.context,
      },
    }
  }

  /**
   * Execute the edit with Qwen edit model using context-aware prompt
   */
  async executeEdit(
    imageBase64: string,
    contextAwarePrompt: string,
  ): Promise<{ response: string; suggestions: string[] }> {
    const messages: OllamaMessage[] = [
      {
        role: 'user',
        content: contextAwarePrompt,
        images: [imageBase64],
      },
    ]

    const response = await this.editService.chat(messages)

    // Parse suggestions from the response
    const suggestions = this.extractSuggestions(response.message.content)

    return {
      response: response.message.content,
      suggestions,
    }
  }

  /**
   * Extract actionable suggestions from the model response
   */
  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = []
    const lines = response.split('\n')

    for (const line of lines) {
      if (
        line.trim().match(/^[-*]\s/) ||
        line.toLowerCase().includes('suggest') ||
        line.toLowerCase().includes('recommend')
      ) {
        suggestions.push(line.trim())
      }
    }

    return suggestions
  }

  /**
   * Update vision model
   */
  setVisionModel(model: string) {
    this.visionService = new OllamaService({
      baseUrl: this.visionService['config'].baseUrl,
      model,
    })
  }

  /**
   * Update edit model
   */
  setEditModel(model: string) {
    this.editService = new OllamaService({
      baseUrl: this.editService['config'].baseUrl,
      model,
    })
  }
}

// Factory function for easy instantiation
export const createJigsawBridge = (
  baseUrl?: string,
  visionModel?: string,
  editModel?: string,
): JigsawBridgeService => {
  return new JigsawBridgeService(baseUrl, visionModel, editModel)
}
