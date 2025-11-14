# 🧩 Igsaw Puzzle App

A Vue 3 application that integrates **Ollama with Vision Models (Gwen/LLaVA)** and **ComfyUI** for advanced AI-powered image processing and generation.

## Features

- 🤖 **Ollama Vision Integration**: Analyze and understand images using vision AI models like Gwen or LLaVA
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

2. Pull a vision model (e.g., LLaVA):
```bash
ollama pull llava
```

Or for Gwen vision model (if available):
```bash
ollama pull gwen
```

3. Start Ollama (it usually runs automatically):
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

The service will be available at `http://localhost:8188`

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
│   │   └── comfyUIService.ts
│   ├── stores/          # Pinia stores
│   │   ├── ollama.ts
│   │   └── comfyui.ts
│   ├── views/           # Page components
│   │   ├── HomeView.vue
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

You can customize the application by editing `.env`:

```env
# Ollama Configuration
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llava

# ComfyUI Configuration
VITE_COMFYUI_URL=http://localhost:8188
VITE_COMFYUI_WS=ws://localhost:8188/ws
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

### Ollama not connecting
- Make sure Ollama is running: `ollama serve`
- Check if the port 11434 is accessible
- Verify the VITE_OLLAMA_URL in your .env file

### ComfyUI not connecting
- Make sure ComfyUI is running: `python main.py`
- Check if the port 8188 is accessible
- Verify the VITE_COMFYUI_URL in your .env file

### CORS Issues
- Both services need to allow CORS from your development server
- Ollama typically allows all origins by default
- ComfyUI may need additional configuration

## Support

For issues and questions, please open an issue on GitHub.
