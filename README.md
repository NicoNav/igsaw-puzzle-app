# 🧩 Igsaw Puzzle App

A Vue 3 application that integrates **ComfyUI** for advanced AI-powered image processing and jigsaw puzzle generation using SAM3.

## Features

- 🔗 **Jigsaw Bridge**: Specialized workflow for creating puzzle pieces using SAM3 segmentation
- 🎨 **ComfyUI Integration**: Advanced image generation and processing workflows
- 🔄 **Real-time Updates**: Live status of ComfyUI service
- 📤 **Image Upload**: Easy image uploading and processing
- 🎯 **TypeScript**: Fully typed for better development experience
- 📦 **State Management**: Pinia for efficient state management
- 🧪 **Testing**: Vitest for unit testing

## Prerequisites

Before running this application, make sure you have the following installed:

1. **Node.js** (v20.19.0 or higher)
2. **ComfyUI** - Clone from [GitHub](https://github.com/comfyanonymous/ComfyUI)

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

3. Download required models and place them in the appropriate folders. Specifically, you will need models for SAM3 segmentation.

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

### Jigsaw Bridge

The **Jigsaw Bridge** provides a specialized workflow for creating puzzle pieces using SAM3 segmentation.

1. Navigate to the "Jigsaw Bridge" tab
2. Upload your jigsaw puzzle image
3. The workflow guides you through 3 steps:
   - **Step 1**: Upload image
   - **Step 2**: Define pieces (enter number of points)
   - **Step 3**: Generate pieces with SAM3

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
│   │   ├── comfy.ts
│   │   └── jigsawBridgeService.ts
│   ├── stores/          # Pinia stores
│   │   ├── comfyui.ts
│   │   └── jigsawBridge.ts
│   ├── views/           # Page components
│   │   ├── HomeView.vue
│   │   ├── JigsawBridgeViewNew.vue
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
# ComfyUI Configuration
# Change these if services are running on different machines
VITE_COMFYUI_BASE_URL=http://127.0.0.1:8188
```

The Vite dev server proxies requests:
- `/comfy/*` → configured ComfyUI server

This eliminates CORS issues during development.

### Production Mode

For production builds, override the proxy URLs with direct URLs:

```env
VITE_COMFYUI_URL=http://your-comfyui-server:8188
```

**Examples for different setups:**

If ComfyUI is running on a different machine in your network:
```env
VITE_COMFYUI_BASE_URL=http://10.0.0.77:8188
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

### ComfyUI not connecting
- Make sure ComfyUI is running: `python main.py`
- Check if the port 8188 is accessible
- In development, set `VITE_COMFYUI_BASE_URL` in your `.env` file

### CORS Issues (405 Method Not Allowed, Access-Control-Allow-Origin)

**In Development:** The app uses Vite's built-in proxy to avoid CORS issues. Make sure you're using the proxy configuration:

1. Set backend URLs in `.env`:
   ```env
   VITE_COMFYUI_BASE_URL=http://10.0.0.77:8188
   ```

2. The Vite dev server automatically proxies requests:
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
