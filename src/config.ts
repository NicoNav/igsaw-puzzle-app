/**
 * Configuration for ComfyUI services
 */

export const config = {
  comfyui: {
    // Base URL for ComfyUI API (using proxy in development to avoid CORS)
    baseUrl: import.meta.env.VITE_COMFYUI_URL || '/comfy',
    // WebSocket URL for real-time updates (using proxy in development)
    wsUrl: import.meta.env.VITE_COMFYUI_WS || 'ws://localhost:5173/comfy/ws',

  },
}

export default config
