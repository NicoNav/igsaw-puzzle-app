// ComfyUI Types
export interface ComfyPromptResponse {
  prompt_id: string
  number: number
  node_errors?: Record<string, unknown>
}

export interface ComfyHistory {
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
  status?: {
    status_str?: string
    completed?: boolean
    messages?: Array<unknown>
  }
}
