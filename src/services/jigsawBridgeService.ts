import { OllamaService, type OllamaMessage } from './ollamaService'

export interface DetectedPerson {
  id: number
  description: string
  position: string
  clothing?: string
  age?: string
  gender?: string
}

export interface ImageSubject {
  id: number
  name: string
  description: string
  position: string
  boundingArea?: string
  generatedPrompt?: string
}

export interface JigsawPiece {
  id: number
  subjectId: number
  prompt: string
  imageUrl?: string
  status: 'pending' | 'generating' | 'complete' | 'error'
  error?: string
}

export interface JigsawAnalysis {
  imageDescription: string
  pieceCount?: number
  colors?: string[]
  complexity?: string
  context: string
  detectedPeople?: DetectedPerson[]
  peopleCount?: number
  subjects?: ImageSubject[]
  subjectCount?: number
}

export interface JigsawEditRequest {
  originalImage: string // Base64
  analysis: JigsawAnalysis
  editPrompt: string
  visionModel?: string
  editModel?: string
}

/**
 * Bridge service that uses Qwen vision for jigsaw puzzle processing
 * Vision model handles both analysis and instruction-following
 */
export class JigsawBridgeService {
  private visionService: OllamaService

  constructor(
    baseUrl: string = 'http://localhost:11434',
    visionModel: string = 'qwen3-vl:4b',
  ) {
    this.visionService = new OllamaService({ baseUrl, model: visionModel })
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

  /**
   * Identify subjects/elements in the image for jigsaw piece generation
   * This is the foundation for multi-piece jigsaw puzzle creation
   */
  async identifyImageSubjects(imageBase64: string): Promise<ImageSubject[]> {
    const identificationPrompt = `Analyze this image and identify all distinct subjects or elements that could be separated into individual jigsaw puzzle pieces.

For each subject/element, provide:
1. A unique identifier (1, 2, 3, etc.)
2. A name or label for the subject (e.g., "person in blue shirt", "dog", "house", "tree", "car")
3. A detailed description
4. Their position in the image (e.g., "left foreground", "center background", "top right")
5. The approximate bounding area they occupy

Format your response as a structured list for each subject.
Think of each subject as something that could become its own puzzle piece or set of pieces.

Example output:
1. Subject: Woman in red dress
   Description: Adult woman wearing a red dress, smiling
   Position: Center-left of image
   Area: Occupies approximately 20% of image, central positioning

2. Subject: Golden Retriever
   Description: Large golden-colored dog sitting
   Position: Right side of image
   Area: Occupies approximately 15% of image, lower right quadrant

Continue this format for all identifiable subjects.`

    const response = await this.visionService.analyzeImage(imageBase64, identificationPrompt)
    const subjects = this.parseSubjectsFromResponse(response)
    return subjects
  }

  /**
   * Parse identified subjects from vision model response
   */
  private parseSubjectsFromResponse(response: string): ImageSubject[] {
    const subjects: ImageSubject[] = []
    const lines = response.split('\n')
    let currentSubject: Partial<ImageSubject> | null = null
    let subjectId = 0

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Check for subject markers (numbered items)
      if (trimmedLine.match(/^\d+\.\s*(subject|element|item)[:\s]/i)) {
        // Save previous subject if exists
        if (currentSubject && currentSubject.name) {
          subjects.push({
            id: currentSubject.id || ++subjectId,
            name: currentSubject.name || '',
            description: currentSubject.description || '',
            position: currentSubject.position || 'unknown',
            boundingArea: currentSubject.boundingArea,
          })
        }

        // Extract subject name from line
        const nameMatch = trimmedLine.match(/^\d+\.\s*(?:subject|element|item)[:\s]*(.+)/i)
        currentSubject = {
          id: ++subjectId,
          name: nameMatch ? nameMatch[1].trim() : trimmedLine,
        }
      } else if (currentSubject && trimmedLine.length > 0) {
        // Parse subject properties
        if (trimmedLine.toLowerCase().includes('description:')) {
          currentSubject.description = trimmedLine.replace(/description:\s*/i, '').trim()
        } else if (trimmedLine.toLowerCase().includes('position:')) {
          currentSubject.position = trimmedLine.replace(/position:\s*/i, '').trim()
        } else if (trimmedLine.toLowerCase().includes('area:')) {
          currentSubject.boundingArea = trimmedLine.replace(/area:\s*/i, '').trim()
        } else if (!currentSubject.description) {
          // If no description yet, add to it
          currentSubject.description = (currentSubject.description || '') + ' ' + trimmedLine
        }
      }
    }

    // Add the last subject
    if (currentSubject && currentSubject.name) {
      subjects.push({
        id: currentSubject.id || ++subjectId,
        name: currentSubject.name || '',
        description: currentSubject.description || '',
        position: currentSubject.position || 'unknown',
        boundingArea: currentSubject.boundingArea,
      })
    }

    return subjects
  }

  /**
   * Generate individual prompts for each subject to create jigsaw pieces
   * This is Step 3 of your workflow
   */
  async generateSubjectPrompts(subjects: ImageSubject[], imageContext: string): Promise<ImageSubject[]> {
    const promptGenerationMessages: OllamaMessage[] = [
      {
        role: 'system',
        content: `You are an expert at creating image generation prompts for jigsaw puzzle pieces. Each subject should get a detailed, specific prompt that will generate a high-quality puzzle piece.`,
      },
      {
        role: 'user',
        content: `Based on this image context:
${imageContext}

Generate a detailed ComfyUI/image generation prompt for each of the following subjects. Each prompt should:
1. Describe the subject in detail for accurate generation
2. Include style, lighting, and composition details from the original image
3. Be specific enough to create a recognizable puzzle piece
4. Maintain visual consistency with the original image

Subjects:
${subjects.map((s, i) => `${i + 1}. ${s.name}: ${s.description} (${s.position})`).join('\n')}

For each subject, provide a complete, standalone prompt that could be used to generate that portion of the image.

Format your response as:
Subject 1: [detailed prompt]
Subject 2: [detailed prompt]
etc.`,
      },
    ]

    const response = await this.editService.chat(promptGenerationMessages)
    const prompts = this.parseGeneratedPrompts(response.message.content, subjects.length)

    // Attach prompts to subjects
    return subjects.map((subject, index) => ({
      ...subject,
      generatedPrompt: prompts[index] || `Generate ${subject.name}: ${subject.description}`,
    }))
  }

  /**
   * Parse generated prompts from LLM response
   */
  private parseGeneratedPrompts(response: string, expectedCount: number): string[] {
    const prompts: string[] = []
    const lines = response.split('\n')
    let currentPrompt = ''

    for (const line of lines) {
      const trimmedLine = line.trim()

      // Check if this is a new subject line
      if (trimmedLine.match(/^subject\s+\d+:/i)) {
        if (currentPrompt) {
          prompts.push(currentPrompt.trim())
        }
        currentPrompt = trimmedLine.replace(/^subject\s+\d+:\s*/i, '')
      } else if (currentPrompt && trimmedLine.length > 0) {
        currentPrompt += ' ' + trimmedLine
      }
    }

    // Add the last prompt
    if (currentPrompt) {
      prompts.push(currentPrompt.trim())
    }

    // Ensure we have enough prompts
    while (prompts.length < expectedCount) {
      prompts.push('Generate detailed image')
    }

    return prompts
  }

  /**
   * Complete workflow for multi-piece jigsaw puzzle generation:
   * 1. Analyze image to get context
   * 2. Identify subjects for puzzle pieces
   * 3. Generate prompts for each subject
   * Returns everything needed to call ComfyUI for each piece
   */
  async prepareMultiPieceJigsaw(imageBase64: string): Promise<{
    analysis: JigsawAnalysis
    subjects: ImageSubject[]
    readyForGeneration: boolean
  }> {
    // Step 1: Get image context
    const analysis = await this.analyzeJigsaw(imageBase64)

    // Step 2: Identify subjects
    const subjects = await this.identifyImageSubjects(imageBase64)

    // Step 3: Generate prompts for each subject
    const subjectsWithPrompts = await this.generateSubjectPrompts(subjects, analysis.context)

    // Update analysis with subject information
    const enhancedAnalysis: JigsawAnalysis = {
      ...analysis,
      subjects: subjectsWithPrompts,
      subjectCount: subjectsWithPrompts.length,
      context: `${analysis.context}\n\nIdentified ${subjectsWithPrompts.length} subjects for puzzle pieces:\n${subjectsWithPrompts.map((s) => `- ${s.name}: ${s.description}`).join('\n')}`,
    }

    return {
      analysis: enhancedAnalysis,
      subjects: subjectsWithPrompts,
      readyForGeneration: subjectsWithPrompts.length > 0 && subjectsWithPrompts.every((s) => s.generatedPrompt),
    }
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
