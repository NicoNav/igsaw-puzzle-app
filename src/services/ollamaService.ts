import axios, { type AxiosInstance } from 'axios'

export interface OllamaConfig {
  baseUrl: string
  model: string
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[] // Base64 encoded images for vision
}

export interface OllamaResponse {
  model: string
  created_at: string
  message: OllamaMessage
  done: boolean
}

export interface OllamaGenerateRequest {
  model: string
  prompt: string
  images?: string[]
  stream?: boolean
}

export class OllamaService {
  private client: AxiosInstance
  private config: OllamaConfig

  constructor(config: OllamaConfig) {
    this.config = config
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 seconds timeout for vision processing
    })
  }

  /**
   * Send a chat message to Ollama with optional images (for vision models like Gwen)
   */
  async chat(messages: OllamaMessage[]): Promise<OllamaResponse> {
    try {
      const response = await this.client.post('/api/chat', {
        model: this.config.model,
        messages,
        stream: false,
      })
      return response.data
    } catch (error) {
      console.error('Ollama chat error:', error)
      throw error
    }
  }

  /**
   * Generate a response with optional images (for vision models)
   */
  async generate(request: OllamaGenerateRequest): Promise<OllamaResponse> {
    try {
      const response = await this.client.post('/api/generate', {
        ...request,
        model: this.config.model,
        stream: false,
      })
      return response.data
    } catch (error) {
      console.error('Ollama generate error:', error)
      throw error
    }
  }

  /**
   * Analyze an image using the vision model (Gwen)
   */
  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    try {
      const messages: OllamaMessage[] = [
        {
          role: 'user',
          content: prompt,
          images: [imageBase64],
        },
      ]

      const response = await this.chat(messages)
      return response.message.content
    } catch (error) {
      console.error('Image analysis error:', error)
      throw error
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<{ models: Array<{ name: string; size: number }> }> {
    try {
      const response = await this.client.get('/api/tags')
      return response.data
    } catch (error) {
      console.error('List models error:', error)
      throw error
    }
  }

  /**
   * Check if Ollama is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags')
      return response.status === 200
    } catch {
      return false
    }
  }
}

// Default instance with common configuration
export const createOllamaService = (
  baseUrl: string = 'http://localhost:11434',
  model: string = 'llava', // Default vision model, can be changed to gwen
): OllamaService => {
  return new OllamaService({ baseUrl, model })
}
