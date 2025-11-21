<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useComfyUIStore } from '@/stores/comfyui'

const comfyUIStore = useComfyUIStore()
const promptText = ref('')
const uploadedFile = ref<File | null>(null)
const uploadedFilename = ref<string>('')
const fileInput = ref<HTMLInputElement | null>(null)

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
    alert('Please enter a prompt (number of points)')
    return
  }

  if (!uploadedFilename.value) {
    alert('Please upload an image first')
    return
  }

  try {
    const result = await comfyUIStore.runSAM3Segmentation({
      imageFilename: uploadedFilename.value,
      prompt: promptText.value,
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
        <h2>Generate Image with SAM3</h2>
        
        <label>Prompt (Number of Points):</label>
        <textarea
          v-model="promptText"
          placeholder="Enter number of points (e.g. 10)"
          :disabled="!comfyUIStore.isConnected"
          rows="3"
        ></textarea>

        <p v-if="comfyUIStore.currentProgress" class="progress-message">
          {{ comfyUIStore.currentProgress }}
        </p>

        <div class="button-group">
          <button
            @click="generateImage"
            :disabled="!comfyUIStore.isConnected || comfyUIStore.isProcessing || !uploadedFilename"
          >
            {{ comfyUIStore.isProcessing ? 'Generating...' : 'Generate with SAM3' }}
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
        This view uses the SAM3 workflow to segment images.
        Make sure ComfyUI is running with the required SAM3 models installed.
      </p>
    </div>
  </div>
</template>

<style scoped>
.comfyui-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ef4444;
}

.status-indicator.connected {
  background-color: #22c55e;
}

.controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.section {
  background: #f8fafc;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.section h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.file-input {
  display: block;
  margin-bottom: 1rem;
  width: 100%;
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-family: inherit;
}

.param-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.param {
  flex: 1;
}

.seed-control {
  display: flex;
  gap: 0.5rem;
}

.seed-control input {
  flex: 1;
}

input[type="number"] {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}

button {
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

button:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #64748b;
}

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.button-group {
  display: flex;
  gap: 1rem;
}

.success-message {
  color: #16a34a;
  margin-top: 0.5rem;
}

.progress-message {
  color: #2563eb;
  margin-bottom: 1rem;
  font-weight: 500;
}

.error-message {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 2rem;
}

.generated-images {
  margin-top: 2rem;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.image-grid img {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.info-box {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #eff6ff;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.info-box h3 {
  margin-top: 0;
  color: #1e40af;
}

.info-box p {
  margin-bottom: 0;
  color: #1e3a8a;
}
</style>
