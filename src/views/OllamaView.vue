<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOllamaStore } from '@/stores/ollama'

const ollamaStore = useOllamaStore()
const prompt = ref('')
const selectedImage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  await ollamaStore.checkConnection()
})

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      // Remove data URL prefix to get base64
      const base64Data = result.split(',')[1]
      selectedImage.value = base64Data || null
    }
    reader.readAsDataURL(file)
  }
}

const sendPrompt = async () => {
  if (!prompt.value.trim()) return

  try {
    if (selectedImage.value) {
      await ollamaStore.sendMessage(prompt.value, [selectedImage.value])
    } else {
      await ollamaStore.sendMessage(prompt.value)
    }
    prompt.value = ''
    selectedImage.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (error) {
    console.error('Failed to send prompt:', error)
  }
}

const clearChat = () => {
  ollamaStore.clearMessages()
  selectedImage.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="ollama-view">
    <div class="header">
      <h1>Ollama Vision (Gwen)</h1>
      <div class="connection-status">
        <span :class="['status-indicator', { connected: ollamaStore.isConnected }]"></span>
        <span>{{ ollamaStore.isConnected ? 'Connected' : 'Disconnected' }}</span>
        <button @click="ollamaStore.checkConnection" class="btn-small">Reconnect</button>
      </div>
    </div>

    <div class="model-selector" v-if="ollamaStore.availableModels.length > 0">
      <label>Model:</label>
      <select
        v-model="ollamaStore.currentModel"
        @change="ollamaStore.setModel(ollamaStore.currentModel)"
      >
        <option v-for="model in ollamaStore.availableModels" :key="model.name" :value="model.name">
          {{ model.name }}
        </option>
      </select>
    </div>

    <div class="chat-container">
      <div class="messages">
        <div
          v-for="(message, index) in ollamaStore.messages"
          :key="index"
          :class="['message', message.role]"
        >
          <div class="message-role">{{ message.role }}</div>
          <div class="message-content">
            {{ message.content }}
            <div v-if="message.images && message.images.length > 0" class="message-images">
              <img
                v-for="(img, imgIndex) in message.images"
                :key="imgIndex"
                :src="`data:image/jpeg;base64,${img}`"
                alt="Attached image"
              />
            </div>
          </div>
        </div>
        <div v-if="ollamaStore.isLoading" class="message assistant">
          <div class="message-role">assistant</div>
          <div class="message-content loading">Thinking...</div>
        </div>
      </div>

      <div class="input-area">
        <div v-if="selectedImage" class="preview">
          <img :src="`data:image/jpeg;base64,${selectedImage}`" alt="Preview" />
          <button @click="selectedImage = null" class="btn-small">Remove</button>
        </div>

        <div class="input-controls">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            @change="handleImageUpload"
            class="file-input"
          />
          <textarea
            v-model="prompt"
            placeholder="Ask about the image or chat with Ollama..."
            @keydown.ctrl.enter="sendPrompt"
            :disabled="!ollamaStore.isConnected"
          ></textarea>
          <div class="button-group">
            <button
              @click="sendPrompt"
              :disabled="!ollamaStore.isConnected || ollamaStore.isLoading"
            >
              Send (Ctrl+Enter)
            </button>
            <button @click="clearChat" class="btn-secondary">Clear Chat</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="ollamaStore.error" class="error-message">
      {{ ollamaStore.error }}
    </div>
  </div>
</template>

<style scoped>
.ollama-view {
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

.model-selector {
  margin-bottom: 1rem;
}

.model-selector select {
  margin-left: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
}

.chat-container {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.messages {
  height: 500px;
  overflow-y: auto;
  padding: 1rem;
  background-color: var(--color-background-soft);
}

.message {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 8px;
  background-color: var(--color-background);
}

.message.user {
  background-color: #e3f2fd;
}

.message.assistant {
  background-color: #f5f5f5;
}

.message-role {
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-transform: capitalize;
}

.message-content {
  white-space: pre-wrap;
}

.message-images {
  margin-top: 0.5rem;
}

.message-images img {
  max-width: 200px;
  border-radius: 4px;
}

.loading {
  font-style: italic;
  color: #666;
}

.input-area {
  padding: 1rem;
  background-color: var(--color-background);
}

.preview {
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.preview img {
  max-width: 150px;
  border-radius: 4px;
}

.input-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-input {
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

.error-message {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
}
</style>
