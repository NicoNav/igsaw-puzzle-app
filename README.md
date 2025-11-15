# 🧩 Igsaw Puzzle App

A Vue 3 application that integrates **Ollama with Vision Models (Qwen/LLaVA)** and **ComfyUI** for advanced AI-powered image processing and generation.

## Features

- 🔗 **Jigsaw Bridge**: Context-aware workflow connecting Qwen Vision and Qwen Edit for intelligent jigsaw puzzle processing
- 🤖 **Ollama Vision Integration**: Analyze and understand images using vision AI models like Qwen or LLaVA
- 🎨 **ComfyUI Integration**: Advanced image generation and processing workflows
- 🔄 **Real-time Updates**: Live status of both services
- 💬 **Interactive Chat**: Chat with AI about your images
- 📤 **Image Upload**: Easy image uploading and processing
- 🎯 **TypeScript**: Fully typed for better development experience
- 📦 **State Management**: Pinia for efficient state management
- 🧪 **Testing**: Vitest for unit testing

## Prerequisites

Before running this application, make sure you have the following installed:

1. **Node.js** (v20.19.0 or higher)
2. **Ollama** - Download from [ollama.ai](https://ollama.ai)
3. **ComfyUI** - Clone from [GitHub](https://github.com/comfyanonymous/ComfyUI)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/NicoNav/igsaw-puzzle-app.git
cd igsaw-puzzle-app
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration (optional):
```bash
cp .env.example .env
```

Edit `.env` to customize service URLs if needed.

## Setting Up Services

### Ollama Setup

1. Install Ollama from [ollama.ai](https://ollama.ai)

2. Pull vision models:
```bash
# For general vision tasks (LLaVA)
ollama pull llava

# For Qwen Vision (recommended for Jigsaw Bridge)
ollama pull qwen2-vl

# For Qwen Edit
ollama pull qwen2.5
```

**Important**: Make sure to pull the models you want to use before accessing the application. If you get a "model not found" error, pull the specific model:
```bash
# Example: if you see "model 'llava' not found"
ollama pull llava
```

3. Verify models are installed:
```bash
ollama list
```

4. Start Ollama (it usually runs automatically):
```bash
ollama serve
```

The service will be available at `http://localhost:11434`

### ComfyUI Setup

1. Clone ComfyUI:
```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Download required models and place them in the appropriate folders

4. Start ComfyUI:
```bash
python main.py
```

The service will be available at `http://localhost:8188` by default.

**Note**: If you're running ComfyUI on a different machine or port, you can configure the URL in your `.env` file. For example:
```env
VITE_COMFYUI_URL=http://10.0.0.77:8188
VITE_COMFYUI_WS=ws://10.0.0.77:8188/ws
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Usage

### Jigsaw Bridge (Recommended)

The **Jigsaw Bridge** provides a context-aware workflow where Qwen Vision analyzes your puzzle and Qwen Edit applies changes based on that context.

1. Navigate to the "Jigsaw Bridge" tab
2. Configure vision and edit models (defaults: qwen2-vl and qwen2.5)
3. Upload your jigsaw puzzle image
4. The workflow guides you through 4 steps:
   - **Step 1**: Upload image
   - **Step 2**: Analyze with Qwen Vision (provides detailed context)
   - **Step 3**: Enter your intent (generates context-aware prompt)
   - **Step 4**: Execute edit with Qwen Edit

**Key Benefit**: The edit model receives context from the vision analysis, making edits more accurate and contextually appropriate for jigsaw puzzles.

### Ollama Vision

1. Navigate to the "Ollama Vision" tab
2. Upload an image or enter a text prompt
3. Click "Send" to interact with the vision model
4. The AI will analyze your image and provide descriptions or answers

### ComfyUI

1. Navigate to the "ComfyUI" tab
2. Upload images or configure generation parameters
3. Queue prompts for image generation
4. View generated images in the gallery

## Project Structure

```
igsaw-puzzle-app/
├── src/
│   ├── assets/          # Static assets
│   ├── components/      # Vue components
│   ├── router/          # Vue Router configuration
│   ├── services/        # API services
│   │   ├── ollamaService.ts
│   │   ├── comfyUIService.ts
│   │   └── jigsawBridgeService.ts  # Bridge between vision and edit
│   ├── stores/          # Pinia stores
│   │   ├── ollama.ts
│   │   ├── comfyui.ts
│   │   └── jigsawBridge.ts         # Jigsaw Bridge state
│   ├── views/           # Page components
│   │   ├── HomeView.vue
│   │   ├── JigsawBridgeView.vue   # Context-aware workflow
│   │   ├── OllamaView.vue
│   │   └── ComfyUIView.vue
│   │   ├── OllamaView.vue
│   │   └── ComfyUIView.vue
│   ├── App.vue          # Main app component
│   ├── config.ts        # Application configuration
│   └── main.ts          # Application entry point
├── public/              # Public static files
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.ts       # Vite configuration
└── tsconfig.json        # TypeScript configuration
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run test:unit` - Run unit tests
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier
- `npm run type-check` - Type check with TypeScript

## Configuration

### Development Mode

In development, the app uses Vite's proxy to avoid CORS issues. Configure the backend service URLs in `.env`:

```env
# Ollama Configuration
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llava

# Qwen Models for Jigsaw Bridge
VITE_QWEN_VISION_MODEL=qwen2-vl
VITE_QWEN_EDIT_MODEL=qwen2.5

# ComfyUI Configuration
# Change these if services are running on different machines
VITE_COMFYUI_BASE_URL=http://10.0.0.77:8188
```

The Vite dev server proxies requests:
- `/ollama/*` → configured Ollama server
- `/comfy/*` → configured ComfyUI server

This eliminates CORS issues during development.

### Production Mode

For production builds, override the proxy URLs with direct URLs:

```env
VITE_OLLAMA_URL=http://your-ollama-server:11434
VITE_COMFYUI_URL=http://your-comfyui-server:8188
VITE_COMFYUI_WS=ws://your-comfyui-server:8188/ws
```

**Examples for different setups:**

If ComfyUI is running on a different machine in your network:
```env
VITE_COMFYUI_BASE_URL=http://10.0.0.77:8188
```

If Ollama is running on a different machine:
```env
VITE_OLLAMA_BASE_URL=http://192.168.1.100:11434
```

## Technologies Used

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation frontend tooling
- **Pinia** - State management
- **Vue Router** - Official router for Vue.js
- **Axios** - HTTP client
- **Vitest** - Unit testing framework

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Troubleshooting

### Model 'llava' not found (404 error)
This error occurs when the selected model hasn't been downloaded to Ollama yet.

**Solution:**
```bash
# Pull the model that's showing as "not found"
ollama pull llava

# Or for other models:
ollama pull qwen2-vl
ollama pull qwen2.5

# Verify models are installed
ollama list
```

**Note**: Even if the model appears in the dropdown, it must be downloaded to your local Ollama installation. The dropdown shows models configured in the app, not necessarily the models you have installed.

### Ollama not connecting
- Make sure Ollama is running: `ollama serve`
- Check if the port 11434 is accessible
- In development, set `VITE_OLLAMA_BASE_URL` in your `.env` file

### ComfyUI not connecting
- Make sure ComfyUI is running: `python main.py`
- Check if the port 8188 is accessible
- In development, set `VITE_COMFYUI_BASE_URL` in your `.env` file

### CORS Issues (405 Method Not Allowed, Access-Control-Allow-Origin)

**In Development:** The app uses Vite's built-in proxy to avoid CORS issues. Make sure you're using the proxy configuration:

1. Set backend URLs in `.env`:
   ```env
   VITE_OLLAMA_BASE_URL=http://localhost:11434
   VITE_COMFYUI_BASE_URL=http://10.0.0.77:8188
   ```

2. The Vite dev server automatically proxies requests:
   - `/ollama/*` → your Ollama server
   - `/comfy/*` → your ComfyUI server

3. Restart the dev server after changing `.env`:
   ```bash
   npm run dev
   ```

**In Production:** If you encounter CORS issues in production:
- Configure CORS headers on your backend services
- Or use a reverse proxy (nginx, Apache, etc.) to serve both the app and APIs from the same origin

## Support

For issues and questions, please open an issue on GitHub.
