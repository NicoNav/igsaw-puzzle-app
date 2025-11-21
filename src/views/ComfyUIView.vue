<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useComfyUIStore } from '@/stores/comfyui'

const comfyUIStore = useComfyUIStore()
const promptText = ref('')
const negativePromptText = ref('')
const uploadedFile = ref<File | null>(null)
const uploadedFilename = ref<string>('')
const fileInput = ref<HTMLInputElement | null>(null)
const seed = ref<number>(Math.floor(Math.random() * 1000000))
const steps = ref<number>(4)

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
    uploadedFilename.value = result.filename
    console.log('Image uploaded:', result)
    alert(`Image uploaded successfully as: ${result.filename}`)
  } catch (error) {
    console.error('Failed to upload image:', error)
    alert('Failed to upload image')
  }
}

const generateImage = async () => {
  if (!promptText.value.trim()) {
    alert('Please enter a prompt')
    return
  }

  if (!uploadedFilename.value) {
    alert('Please upload an image first')
    return
  }

  try {
    const result = await comfyUIStore.runQwenImageEdit({
      imageFilename: uploadedFilename.value,
      positivePrompt: promptText.value,
      negativePrompt: negativePromptText.value || undefined,
      seed: seed.value,
      steps: steps.value,
    })
    console.log('Generation complete:', result)
    alert(`Generated ${result.images.length} image(s)!`)
  } catch (error) {
    console.error('Failed to generate image:', error)
    alert('Failed to generate image')
  }
}

const interruptGeneration = async () => {
  await comfyUIStore.interrupt()
}

const clearImages = () => {
  comfyUIStore.clearGeneratedImages()
}

const randomizeSeed = () => {
  seed.value = Math.floor(Math.random() * 10000000)
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
        <p v-if="uploadedFilename" class="success-message">
          ✓ Uploaded: {{ uploadedFilename }}
        </p>
      </div>

      <div class="section">
        <h2>Generate Image with Qwen Edit</h2>
        
        <label>Positive Prompt (what you want):</label>
        <textarea
          v-model="promptText"
          placeholder="Enter your prompt for what to generate/edit..."
          :disabled="!comfyUIStore.isConnected"
          rows="3"
        ></textarea>

        <label>Negative Prompt (what to avoid - optional):</label>
        <textarea
          v-model="negativePromptText"
          placeholder="Enter what you want to avoid (optional)..."
          :disabled="!comfyUIStore.isConnected"
          rows="2"
        ></textarea>

        <div class="param-row">
          <div class="param">
            <label>Seed:</label>
            <div class="seed-control">
              <input
                v-model.number="seed"
                type="number"
                :disabled="!comfyUIStore.isConnected"
              />
              <button @click="randomizeSeed" :disabled="!comfyUIStore.isConnected" class="btn-small">
                🎲
              </button>
            </div>
          </div>
          <div class="param">
            <label>Steps:</label>
            <input
              v-model.number="steps"
              type="number"
              min="1"
              max="50"
              :disabled="!comfyUIStore.isConnected"
            />
          </div>
        </div>

        <p v-if="comfyUIStore.currentProgress" class="progress-message">
          {{ comfyUIStore.currentProgress }}
        </p>

        <div class="button-group">
          <button
            @click="generateImage"
            :disabled="!comfyUIStore.isConnected || comfyUIStore.isProcessing || !uploadedFilename"
          >
            {{ comfyUIStore.isProcessing ? 'Generating...' : 'Generate with Qwen Edit' }}
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
        This view uses the Qwen Image Edit workflow to edit/transform images using AI.
        Make sure ComfyUI is running with the required Qwen models installed.
      </p>
      <p>
        <strong>Workflow:</strong>
      </p>
      <ol>
        <li>Upload an image to ComfyUI</li>
        <li>Enter a prompt describing what you want to generate/edit</li>
        <li>Optionally add a negative prompt for what to avoid</li>
        <li>Click "Generate with Qwen Edit"</li>
        <li>View results below when processing completes</li>
      </ol>
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

label {
  display: block;
  margin-bottom: 0.5rem;
  margin-top: 1rem;
  font-weight: 500;
}

.param-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

.param label {
  margin-top: 0;
}

.param input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.seed-control {
  display: flex;
  gap: 0.5rem;
}

.seed-control input {
  flex: 1;
}

.success-message {
  color: #28a745;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.progress-message {
  color: #007bff;
  margin-top: 0.5rem;
  font-style: italic;
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
