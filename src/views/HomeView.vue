<script setup lang="ts">
import { onMounted } from 'vue'
import { useComfyUIStore } from '@/stores/comfyui'

const comfyUIStore = useComfyUIStore()

onMounted(async () => {
  await comfyUIStore.checkConnection()
})
</script>

<template>
  <main class="home">
    <div class="hero">
      <h1>🧩 Igsaw Puzzle App</h1>
      <p class="subtitle">AI-Powered Jigsaw Puzzle Generation with ComfyUI</p>
    </div>

    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">🧩</div>
        <h2>Jigsaw Bridge</h2>
        <p>
          Create custom jigsaw puzzles from your images. Define pieces and let AI generate them.
        </p>
        <div class="status">
          <span :class="['status-dot', { connected: comfyUIStore.isConnected }]"></span>
          <span>{{ comfyUIStore.isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <RouterLink to="/jigsaw-bridge" class="btn">Create Puzzle →</RouterLink>
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
        <RouterLink to="/comfyui" class="btn">Open ComfyUI →</RouterLink>
      </div>
    </div>

    <div class="getting-started">
      <h2>Getting Started</h2>
      <div class="steps">
        <div class="step">
          <h3>1. Install ComfyUI</h3>
          <p>
            Clone and setup ComfyUI from
            <a href="https://github.com/comfyanonymous/ComfyUI" target="_blank">GitHub</a>
          </p>
          <code>python main.py</code>
        </div>
        <div class="step">
          <h3>2. Start Creating</h3>
          <p>Navigate to the Jigsaw Bridge section and start creating puzzles!</p>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h2>About This App</h2>
      <p>This Vue 3 application integrates ComfyUI for advanced image processing:</p>
      <ul>
        <li><strong>ComfyUI:</strong> For advanced image generation and manipulation workflows</li>
        <li><strong>Jigsaw Bridge:</strong> Specialized workflow for creating puzzle pieces using SAM3 segmentation</li>
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
  margin-bottom: 4rem;
}

.hero h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
  background: linear-gradient(45deg, #42b883, #35495e);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  font-size: 1.5rem;
  color: #666;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 4rem;
}

.feature-card {
  background: var(--color-background-soft);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h2 {
  margin-bottom: 1rem;
  color: var(--color-heading);
}

.feature-card p {
  margin-bottom: 1.5rem;
  color: var(--color-text);
}

.status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ef4444;
}

.status-dot.connected {
  background-color: #22c55e;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background-color: #42b883;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: bold;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #3aa876;
}

.getting-started {
  margin-bottom: 4rem;
}

.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.step {
  background: var(--color-background-mute);
  padding: 1.5rem;
  border-radius: 8px;
}

.step h3 {
  margin-bottom: 0.5rem;
  color: var(--color-heading);
}

.step code {
  display: block;
  background: #1a1a1a;
  color: #fff;
  padding: 0.5rem;
  border-radius: 4px;
  margin-top: 1rem;
  font-family: monospace;
}

.info-section {
  background: var(--color-background-soft);
  padding: 2rem;
  border-radius: 12px;
}

.info-section ul {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.info-section li {
  margin-bottom: 0.5rem;
}
</style>


