<script setup lang="ts">
import { onMounted } from 'vue'
import { useOllamaStore } from '@/stores/ollama'
import { useComfyUIStore } from '@/stores/comfyui'

const ollamaStore = useOllamaStore()
const comfyUIStore = useComfyUIStore()

onMounted(async () => {
  await Promise.all([ollamaStore.checkConnection(), comfyUIStore.checkConnection()])
})
</script>

<template>
  <main class="home">
    <div class="hero">
      <h1>🧩 Igsaw Puzzle App</h1>
      <p class="subtitle">AI-Powered Image Processing with Ollama Vision and ComfyUI</p>
    </div>

    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <h2>Ollama Vision (Gwen)</h2>
        <p>
          Leverage powerful vision AI models to analyze and understand images. Chat with AI about
          your images and get detailed descriptions.
        </p>
        <div class="status">
          <span :class="['status-dot', { connected: ollamaStore.isConnected }]"></span>
          <span>{{ ollamaStore.isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <RouterLink to="/ollama" class="btn">Try Ollama Vision →</RouterLink>
      </div>

      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h2>ComfyUI</h2>
        <p>
          Advanced image generation and processing workflows. Create, transform, and enhance images
          with powerful AI models.
        </p>
        <div class="status">
          <span :class="['status-dot', { connected: comfyUIStore.isConnected }]"></span>
          <span>{{ comfyUIStore.isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <RouterLink to="/comfyui" class="btn">Try ComfyUI →</RouterLink>
      </div>
    </div>

    <div class="getting-started">
      <h2>Getting Started</h2>
      <div class="steps">
        <div class="step">
          <h3>1. Install Ollama</h3>
          <p>
            Download and install Ollama from
            <a href="https://ollama.ai" target="_blank">ollama.ai</a>
          </p>
          <code>ollama run llava</code>
        </div>
        <div class="step">
          <h3>2. Install ComfyUI</h3>
          <p>
            Clone and setup ComfyUI from
            <a href="https://github.com/comfyanonymous/ComfyUI" target="_blank">GitHub</a>
          </p>
          <code>python main.py</code>
        </div>
        <div class="step">
          <h3>3. Start Creating</h3>
          <p>Navigate to the respective sections and start processing images with AI!</p>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h2>About This App</h2>
      <p>This Vue 3 application integrates two powerful AI tools for image processing:</p>
      <ul>
        <li>
          <strong>Ollama with Vision Models (like Gwen/LLaVA):</strong> For image analysis and
          visual understanding
        </li>
        <li><strong>ComfyUI:</strong> For advanced image generation and manipulation workflows</li>
      </ul>
      <p>
        Built with Vue 3, TypeScript, Pinia for state management, and Vue Router for navigation.
      </p>
    </div>
  </main>
</template>

<style scoped>
.home {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  margin-bottom: 3rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.25rem;
  color: var(--color-text-mute, #666);
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.feature-card {
  padding: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background-color: var(--color-background-soft);
  text-align: center;
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h2 {
  margin-bottom: 1rem;
}

.feature-card p {
  margin-bottom: 1rem;
  color: var(--color-text-mute, #666);
}

.status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ff4444;
}

.status-dot.connected {
  background-color: #44ff44;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: var(--color-primary, #42b983);
  color: white;
  text-decoration: none;
  border-radius: 6px;
  transition: opacity 0.3s;
}

.btn:hover {
  opacity: 0.9;
}

.getting-started {
  margin-bottom: 3rem;
  padding: 2rem;
  background-color: var(--color-background-soft);
  border-radius: 12px;
}

.getting-started h2 {
  text-align: center;
  margin-bottom: 2rem;
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.step {
  text-align: center;
}

.step h3 {
  margin-bottom: 0.5rem;
}

.step p {
  margin-bottom: 0.5rem;
}

.step code {
  display: block;
  padding: 0.5rem;
  background-color: var(--color-background);
  border-radius: 4px;
  font-family: monospace;
  margin-top: 0.5rem;
}

.info-section {
  padding: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.info-section h2 {
  margin-top: 0;
}

.info-section ul {
  margin: 1rem 0;
}

.info-section li {
  margin: 0.5rem 0;
}

.info-section a {
  color: var(--color-primary, #42b983);
}
</style>
