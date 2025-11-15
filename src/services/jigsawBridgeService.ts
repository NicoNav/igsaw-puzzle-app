import { OllamaService, type OllamaMessage } from './ollamaService'

export interface DetectedPerson {
  id: number
  description: string
  position: string
  clothing?: string
  age?: string
  gender?: string
}

export interface JigsawAnalysis {
  imageDescription: string
  pieceCount?: number
  colors?: string[]
  complexity?: string
  context: string
  detectedPeople?: DetectedPerson[]
  peopleCount?: number
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
   * Detect and analyze people/individuals in the image
   * This is useful for creating custom jigsaw cuts around people
   */
  async detectPeople(imageBase64: string): Promise<DetectedPerson[]> {
    const detectionPrompt = `Analyze this image and identify all people/individuals present. For each person, provide:
1. A unique identifier (1, 2, 3, etc.)
2. A description of the person (age range, gender if apparent)
3. Their position in the image (left, center, right, top, bottom)
4. What they're wearing or distinctive features
5. Their approximate location and pose

Format your response as a structured list for each person detected.
If no people are detected, respond with "No individuals detected in this image."`

    const response = await this.visionService.analyzeImage(imageBase64, detectionPrompt)

    // Parse the response to extract people information
    const people = this.parsePeopleFromResponse(response)
    return people
  }

  /**
   * Parse detected people from vision model response
   */
  private parsePeopleFromResponse(response: string): DetectedPerson[] {
    const people: DetectedPerson[] = []

    if (response.toLowerCase().includes('no individuals detected')) {
      return people
    }

    // Simple parsing - in production you'd want more robust parsing
    const lines = response.split('\n')
    let currentPerson: Partial<DetectedPerson> | null = null
    let personId = 0

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Check for person markers
      if (
        trimmedLine.match(/^(person|individual|subject)\s*[:#]?\s*\d+/i) ||
        trimmedLine.match(/^\d+\s*[:.)\-]/)
      ) {
        // Save previous person if exists
        if (currentPerson && currentPerson.description) {
          people.push({
            id: currentPerson.id || ++personId,
            description: currentPerson.description || '',
            position: currentPerson.position || 'unknown',
            clothing: currentPerson.clothing,
            age: currentPerson.age,
            gender: currentPerson.gender,
          })
        }

        // Start new person
        currentPerson = {
          id: ++personId,
          description: trimmedLine,
        }
      } else if (currentPerson && trimmedLine.length > 0) {
        // Add to current person's description
        if (trimmedLine.toLowerCase().includes('position')) {
          currentPerson.position = trimmedLine
        } else if (trimmedLine.toLowerCase().includes('wearing') || trimmedLine.toLowerCase().includes('clothing')) {
          currentPerson.clothing = trimmedLine
        } else if (trimmedLine.toLowerCase().includes('age')) {
          currentPerson.age = trimmedLine
        } else if (trimmedLine.toLowerCase().includes('gender') || trimmedLine.toLowerCase().includes('male') || trimmedLine.toLowerCase().includes('female')) {
          currentPerson.gender = trimmedLine
        } else {
          currentPerson.description = (currentPerson.description || '') + ' ' + trimmedLine
        }
      }
    }

    // Add the last person
    if (currentPerson && currentPerson.description) {
      people.push({
        id: currentPerson.id || ++personId,
        description: currentPerson.description || '',
        position: currentPerson.position || 'unknown',
        clothing: currentPerson.clothing,
        age: currentPerson.age,
        gender: currentPerson.gender,
      })
    }

    return people
  }

  /**
   * Analyze image with person detection (for family photos, group photos, etc.)
   */
  async analyzeWithPeopleDetection(imageBase64: string): Promise<JigsawAnalysis> {
    // Get basic analysis
    const basicAnalysis = await this.analyzeJigsaw(imageBase64)

    // Detect people in the image
    const detectedPeople = await this.detectPeople(imageBase64)

    // Enhance analysis with people information
    return {
      ...basicAnalysis,
      detectedPeople,
      peopleCount: detectedPeople.length,
      context: `${basicAnalysis.context}\n\nDetected ${detectedPeople.length} individual(s) in the image:\n${detectedPeople.map((p) => `- Person ${p.id}: ${p.description} (${p.position})`).join('\n')}`,
    }
  }

  /**
   * Generate jigsaw puzzle creation prompt with cuts along individuals
   */
  async generateJigsawCutPrompt(
    analysis: JigsawAnalysis,
    userPreferences?: {
      pieceSize?: string
      cutStyle?: string
      preserveIndividuals?: boolean
    },
  ): Promise<string> {
    const preferences = {
      pieceSize: userPreferences?.pieceSize || 'medium',
      cutStyle: userPreferences?.cutStyle || 'traditional',
      preserveIndividuals: userPreferences?.preserveIndividuals ?? true,
    }

    const messages: OllamaMessage[] = [
      {
        role: 'system',
        content: `You are an expert at creating jigsaw puzzle cutting patterns. You understand how to create engaging puzzles that respect the content of the image, especially when it contains people.`,
      },
      {
        role: 'user',
        content: `Based on this image analysis:
${analysis.context}

Generate a detailed jigsaw puzzle cutting pattern with the following specifications:
- Piece size: ${preferences.pieceSize}
- Cut style: ${preferences.cutStyle}
${preferences.preserveIndividuals && analysis.peopleCount ? `- IMPORTANT: Create cut lines that follow along the contours of the ${analysis.peopleCount} detected individual(s), keeping each person's form intact as much as possible` : ''}
${analysis.detectedPeople && analysis.detectedPeople.length > 0 ? `\nDetailed individual information:\n${analysis.detectedPeople.map((p) => `Person ${p.id}: ${p.description} at ${p.position}`).join('\n')}` : ''}

Provide a comprehensive cutting pattern description that:
1. Specifies how to cut around each detected individual
2. Describes the puzzle piece distribution
3. Explains how to maintain visual coherence
4. Suggests difficulty level based on the image content

Return the cutting pattern as a detailed technical specification.`,
      },
    ]

    const response = await this.editService.chat(messages)
    return response.message.content
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
