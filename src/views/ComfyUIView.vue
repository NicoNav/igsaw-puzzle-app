<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useComfyUIStore } from '@/stores/comfyui'

const comfyUIStore = useComfyUIStore()
const promptText = ref('')
const uploadedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Example workflow prompt structure for ComfyUI
// This is a simplified example - actual workflows can be much more complex
const examplePrompt = {
  '3': {
    inputs: {
      seed: Math.floor(Math.random() * 1000000),
      steps: 20,
      cfg: 8,
      sampler_name: 'euler',
      scheduler: 'normal',
      denoise: 1,
      model: ['4', 0],
      positive: ['6', 0],
      negative: ['7', 0],
      latent_image: ['5', 0],
    },
    class_type: 'KSampler',
  },
}

onMounted(async () => {
  await comfyUIStore.checkConnection()
})

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    uploadedFile.value = file
  }
}

const uploadImage = async () => {
  if (!uploadedFile.value) return

  try {
    const result = await comfyUIStore.uploadImage(uploadedFile.value)
    console.log('Image uploaded:', result)
    alert('Image uploaded successfully!')
  } catch (error) {
    console.error('Failed to upload image:', error)
  }
}

const generateImage = async () => {
  if (!promptText.value.trim()) {
    alert('Please enter a prompt')
    return
  }

  try {
    // This is a simplified example - you would typically have a more complete workflow
    const prompt = {
      ...examplePrompt,
      // Add your prompt text to the workflow
      '6': {
        inputs: {
          text: promptText.value,
          clip: ['4', 1],
        },
        class_type: 'CLIPTextEncode',
      },
    }

    const result = await comfyUIStore.queuePrompt(prompt)
    console.log('Prompt queued:', result)

    // Poll for completion
    setTimeout(async () => {
      const history = await comfyUIStore.getHistory(result.prompt_id)
      console.log('History:', history)
    }, 5000)
  } catch (error) {
    console.error('Failed to generate image:', error)
  }
}

const interruptGeneration = async () => {
  await comfyUIStore.interrupt()
}

const clearImages = () => {
  comfyUIStore.clearGeneratedImages()
}
</script>

<template>
  <div class="comfyui-view">
    <div class="header">
      <h1>ComfyUI Integration</h1>
      <div class="connection-status">
        <span :class="['status-indicator', { connected: comfyUIStore.isConnected }]"></span>
        <span>{{ comfyUIStore.isConnected ? 'Connected' : 'Disconnected' }}</span>
        <button @click="comfyUIStore.checkConnection" class="btn-small">Reconnect</button>
      </div>
    </div>

    <div class="queue-info" v-if="comfyUIStore.isConnected">
      <p>Queue Length: {{ comfyUIStore.queueLength }}</p>
      <p>Processing: {{ comfyUIStore.isProcessing ? 'Yes' : 'No' }}</p>
    </div>

    <div class="controls">
      <div class="section">
        <h2>Upload Image</h2>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileUpload"
          class="file-input"
        />
        <button @click="uploadImage" :disabled="!uploadedFile || !comfyUIStore.isConnected">
          Upload to ComfyUI
        </button>
      </div>

      <div class="section">
        <h2>Generate Image</h2>
        <textarea
          v-model="promptText"
          placeholder="Enter your prompt for image generation..."
          :disabled="!comfyUIStore.isConnected"
        ></textarea>
        <div class="button-group">
          <button
            @click="generateImage"
            :disabled="!comfyUIStore.isConnected || comfyUIStore.isProcessing"
          >
            Generate
          </button>
          <button
            @click="interruptGeneration"
            :disabled="!comfyUIStore.isProcessing"
            class="btn-secondary"
          >
            Interrupt
          </button>
        </div>
      </div>
    </div>

    <div class="generated-images" v-if="comfyUIStore.hasGeneratedImages">
      <h2>Generated Images</h2>
      <div class="image-grid">
        <img
          v-for="(imageUrl, index) in comfyUIStore.generatedImages"
          :key="index"
          :src="imageUrl"
          alt="Generated image"
        />
      </div>
      <button @click="clearImages" class="btn-secondary">Clear Images</button>
    </div>

    <div v-if="comfyUIStore.error" class="error-message">
      {{ comfyUIStore.error }}
    </div>

    <div class="info-box">
      <h3>ℹ️ About ComfyUI Integration</h3>
      <p>
        This view allows you to interact with ComfyUI for advanced image generation and processing.
        Make sure ComfyUI is running on <code>http://localhost:8188</code> before using this
        feature.
      </p>
      <p>
        <strong>Note:</strong> The current implementation uses a simplified workflow structure. For
        production use, you would need to implement complete workflow definitions based on your
        specific ComfyUI setup and models.
      </p>
    </div>
  </div>
</template>

<style scoped>
.comfyui-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ff4444;
}

.status-indicator.connected {
  background-color: #44ff44;
}

.queue-info {
  padding: 1rem;
  background-color: var(--color-background-soft);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.section h2 {
  margin-top: 0;
  margin-bottom: 1rem;
}

.file-input {
  display: block;
  margin-bottom: 0.5rem;
  padding: 0.5rem;
}

textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 0.5rem;
}

.button-group {
  display: flex;
  gap: 0.5rem;
}

button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  background-color: var(--color-primary, #42b983);
  color: white;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.btn-secondary {
  background-color: #6c757d;
}

.generated-images {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.image-grid img {
  width: 100%;
  border-radius: 4px;
}

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
}

.info-box {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.info-box h3 {
  margin-top: 0;
  color: #1976d2;
}

.info-box code {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
}
</style>
