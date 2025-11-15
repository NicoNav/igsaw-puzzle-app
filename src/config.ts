/**
 * Configuration for Ollama and ComfyUI services
 */

export const config = {
  ollama: {
    // Base URL for Ollama API (using proxy in development to avoid CORS)
    baseUrl: import.meta.env.VITE_OLLAMA_URL || '/ollama',
    // Default model to use (llava, gwen, or other vision models)
    defaultModel: import.meta.env.VITE_OLLAMA_MODEL || 'llava',
    // Qwen vision model for jigsaw analysis
    visionModel: import.meta.env.VITE_QWEN_VISION_MODEL || 'qwen2-vl',
    // Qwen edit model for context-aware editing
    editModel: import.meta.env.VITE_QWEN_EDIT_MODEL || 'qwen2.5',
  },
  comfyui: {
    // Base URL for ComfyUI API (using proxy in development to avoid CORS)
    baseUrl: import.meta.env.VITE_COMFYUI_URL || '/comfy',
    // WebSocket URL for real-time updates (using proxy in development)
    wsUrl: import.meta.env.VITE_COMFYUI_WS || 'ws://localhost:5173/comfy/ws',
  },
}

export default config
