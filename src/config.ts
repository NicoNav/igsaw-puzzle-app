/**
 * Configuration for Ollama and ComfyUI services
 */

export const config = {
  ollama: {
    // Base URL for Ollama API
    baseUrl: import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434',
    // Default model to use (llava, gwen, or other vision models)
    defaultModel: import.meta.env.VITE_OLLAMA_MODEL || 'llava',
  },
  comfyui: {
    // Base URL for ComfyUI API
    baseUrl: import.meta.env.VITE_COMFYUI_URL || 'http://localhost:8188',
    // WebSocket URL for real-time updates
    wsUrl: import.meta.env.VITE_COMFYUI_WS || 'ws://localhost:8188/ws',
  },
}

export default config
