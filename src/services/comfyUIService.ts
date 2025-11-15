import axios, { type AxiosInstance } from 'axios'

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

export class ComfyUIService {
  private client: AxiosInstance
  private config: ComfyUIConfig

  constructor(config: ComfyUIConfig) {
    this.config = config
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes timeout for image generation
    })
  }

  /**
   * Queue a prompt for execution
   */
  async queuePrompt(prompt: ComfyUIPrompt, clientId?: string): Promise<ComfyUIQueueResponse> {
    try {
      const response = await this.client.post('/prompt', {
        prompt,
        client_id: clientId,
      })
      return response.data
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
      const response = await this.client.get('/queue')
      return response.data
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
      const url = promptId ? `/history/${promptId}` : '/history'
      const response = await this.client.get(url)
      return response.data
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
      const response = await this.client.get(`/view?${params.toString()}`, {
        responseType: 'blob',
      })
      return response.data
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
      const formData = new FormData()
      formData.append('image', file)
      formData.append('subfolder', subfolder)
      formData.append('type', type)

      const response = await this.client.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
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
      const response = await this.client.get('/system_stats')
      return response.data
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
      await this.client.post('/interrupt')
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
      const response = await this.client.get('/system_stats')
      return response.status === 200
    } catch {
      return false
    }
  }

  /**
   * Create WebSocket connection for real-time updates
   */
  createWebSocket(clientId: string): WebSocket | null {
    if (!this.config.wsUrl) {
      console.warn('WebSocket URL not configured')
      return null
    }

    const ws = new WebSocket(`${this.config.wsUrl}?clientId=${clientId}`)
    return ws
  }
}

// Default instance with common configuration
export const createComfyUIService = (
  baseUrl: string = 'http://10.0.0.77:8188',
  wsUrl: string = 'ws://10.0.0.77:8188/ws',
): ComfyUIService => {
  return new ComfyUIService({ baseUrl, wsUrl })
}
