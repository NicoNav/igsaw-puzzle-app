<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useJigsawBridgeStore } from '@/stores/jigsawBridge'
import { useOllamaStore } from '@/stores/ollama'
import { useComfyUIStore } from '@/stores/comfyui'

const jigsawStore = useJigsawBridgeStore()
const ollamaStore = useOllamaStore()
const comfyUIStore = useComfyUIStore()

const selectedImage = ref<string | null>(null)
const selectedImageDisplay = ref<string | null>(null)
const uploadedFilename = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const visionModel = ref('qwen2-vl:4b')
const editModel = ref('qwen2.5')

// Workflow modes
const workflowMode = ref<'multi-piece' | 'single-edit'>('multi-piece')
const currentStep = ref<1 | 2 | 3 | 4 | 5>(1)

onMounted(async () => {
  await ollamaStore.checkConnection()
  await comfyUIStore.checkConnection()
})

const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    // Upload to ComfyUI first
    try {
      const result = await comfyUIStore.uploadImage(file)
      if (result && result.filename) {
        uploadedFilename.value = result.filename
        console.log('Uploaded to ComfyUI:', result.filename)
      }
    } catch (error) {
      console.error('Failed to upload to ComfyUI:', error)
      alert('Failed to upload image to ComfyUI. Please check connection.')
    }

    // Also prepare for preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      selectedImageDisplay.value = result
      const base64Data = result.split(',')[1]
      selectedImage.value = base64Data || null
    }
    reader.readAsDataURL(file)
  }
}

// Multi-piece workflow
const prepareMultiPiece = async () => {
  if (!selectedImage.value) return

  try {
    await jigsawStore.prepareMultiPieceJigsaw(selectedImage.value)
    currentStep.value = 2
  } catch (error) {
    console.error('Failed to prepare multi-piece:', error)
  }
}

const generatePieces = async () => {
  if (!uploadedFilename.value) {
    alert('Please upload image to ComfyUI first')
    return
  }

  try {
    currentStep.value = 4
    await jigsawStore.generateAllPuzzlePieces(uploadedFilename.value)
    currentStep.value = 5
  } catch (error) {
    console.error('Failed to generate pieces:', error)
  }
}

const resetWorkflow = () => {
  jigsawStore.reset()
  selectedImage.value = null
  selectedImageDisplay.value = null
  uploadedFilename.value = null
  currentStep.value = 1
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="jigsaw-bridge-view">
    <div class="header">
      <h1>🧩 Jigsaw Puzzle Bridge - Multi-Piece Workflow</h1>
      <p class="subtitle">
        AI-powered jigsaw puzzle generation: Vision analysis → Subject identification → Individual
        prompts → ComfyUI generation → Playable puzzle
      </p>
      <div class="connections">
        <div class="connection-status">
          <span :class="['status-indicator', { connected: ollamaStore.isConnected }]"></span>
          <span>Ollama: {{ ollamaStore.isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
        <div class="connection-status">
          <span :class="['status-indicator', { connected: comfyUIStore.isConnected }]"></span>
          <span>ComfyUI: {{ comfyUIStore.isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
      </div>
    </div>

    <!-- Model Configuration -->
    <div class="model-config">
      <div class="model-select">
        <label>Vision Model:</label>
        <input v-model="visionModel" placeholder="qwen2-vl:4b" />
      </div>
      <div class="model-select">
        <label>Edit Model:</label>
        <input v-model="editModel" placeholder="qwen2.5" />
      </div>
    </div>

    <!-- Workflow Steps -->
    <div class="workflow-steps">
      <div :class="['step', { active: currentStep === 1, completed: currentStep > 1 }]">
        <div class="step-number">1</div>
        <div class="step-label">Upload</div>
      </div>
      <div :class="['step', { active: currentStep === 2, completed: currentStep > 2 }]">
        <div class="step-number">2</div>
        <div class="step-label">Analyze & Identify</div>
      </div>
      <div :class="['step', { active: currentStep === 3, completed: currentStep > 3 }]">
        <div class="step-number">3</div>
        <div class="step-label">Generate Prompts</div>
      </div>
      <div :class="['step', { active: currentStep === 4, completed: currentStep > 4 }]">
        <div class="step-number">4</div>
        <div class="step-label">Create Pieces</div>
      </div>
      <div :class="['step', { active: currentStep === 5 }]">
        <div class="step-number">5</div>
        <div class="step-label">Play Puzzle</div>
      </div>
    </div>

    <!-- Step 1: Upload -->
    <div v-if="currentStep === 1" class="section">
      <h2>Step 1: Upload Your Image</h2>
      <p class="step-description">
        Upload a family photo, group picture, or any image with multiple subjects. The AI will
        identify each subject and create individual puzzle pieces.
      </p>
      <div class="upload-area">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleImageUpload"
          class="file-input"
        />
        <div v-if="selectedImageDisplay" class="preview">
          <img :src="selectedImageDisplay" alt="Preview" />
        </div>
        
        <!-- Upload status message -->
        <div v-if="selectedImage && !uploadedFilename" class="upload-status">
          <p>⏳ Uploading image to ComfyUI...</p>
        </div>
        <div v-else-if="uploadedFilename" class="upload-status success">
          <p>✅ Image uploaded successfully: {{ uploadedFilename }}</p>
        </div>
        
        <!-- Next step button -->
        <button
          v-if="selectedImage && uploadedFilename"
          @click="prepareMultiPiece"
          :disabled="jigsawStore.isProcessing"
          class="btn-primary btn-large"
        >
          {{ jigsawStore.isProcessing ? '⏳ Analyzing Image...' : '🔍 Analyze Image & Identify Subjects →' }}
        </button>
        <button
          v-else-if="selectedImage && !uploadedFilename"
          disabled
          class="btn-primary btn-large"
        >
          ⏳ Uploading to ComfyUI...
        </button>
      </div>
    </div>

    <!-- Step 2: Analysis & Subject Identification -->
    <div v-if="currentStep === 2" class="section">
      <h2>Step 2: Image Analysis & Subject Identification</h2>
      <div class="analysis-section">
        <div class="image-preview">
          <img v-if="selectedImageDisplay" :src="selectedImageDisplay" alt="Image" />
        </div>
        <div class="analysis-content">
          <h3>📸 Image Context:</h3>
          <p class="analysis-text">{{ jigsawStore.currentAnalysis?.imageDescription }}</p>

          <h3>🎯 Identified Subjects ({{ jigsawStore.currentAnalysis?.subjectCount || 0 }}):</h3>
          <div class="subjects-list">
            <div
              v-for="subject in jigsawStore.subjectsWithPrompts"
              :key="subject.id"
              class="subject-card"
            >
              <div class="subject-header">
                <strong>{{ subject.id }}. {{ subject.name }}</strong>
                <span class="subject-position">{{ subject.position }}</span>
              </div>
              <p class="subject-description">{{ subject.description }}</p>
            </div>
          </div>

          <button
            @click="currentStep = 3"
            :disabled="!jigsawStore.currentAnalysis?.subjects?.length"
            class="btn-primary"
          >
            View Generated Prompts →
          </button>
        </div>
      </div>
    </div>

    <!-- Step 3: Generated Prompts -->
    <div v-if="currentStep === 3" class="section">
      <h2>Step 3: AI-Generated Prompts for Each Subject</h2>
      <p class="step-description">
        The AI has created specific prompts for each subject. These will be used to generate
        individual puzzle pieces.
      </p>
      <div class="prompts-list">
        <div
          v-for="subject in jigsawStore.subjectsWithPrompts"
          :key="subject.id"
          class="prompt-card"
        >
          <h4>{{ subject.id }}. {{ subject.name }}</h4>
          <div class="prompt-text">{{ subject.generatedPrompt }}</div>
        </div>
      </div>

      <div class="actions">
        <button @click="generatePieces" :disabled="jigsawStore.isGeneratingPieces" class="btn-primary">
          {{
            jigsawStore.isGeneratingPieces
              ? `Generating... (${jigsawStore.generationProgress.current}/${jigsawStore.generationProgress.total})`
              : 'Generate All Puzzle Pieces →'
          }}
        </button>
      </div>
    </div>

    <!-- Step 4: Generating Pieces -->
    <div v-if="currentStep === 4" class="section">
      <h2>Step 4: Generating Puzzle Pieces...</h2>
      <div class="generation-progress">
        <h3>
          Processing {{ jigsawStore.generationProgress.current }} of
          {{ jigsawStore.generationProgress.total }}
        </h3>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{
              width:
                (jigsawStore.generationProgress.current /
                  jigsawStore.generationProgress.total) *
                  100 +
                '%',
            }"
          ></div>
        </div>

        <div class="pieces-status">
          <div
            v-for="piece in jigsawStore.puzzlePieces"
            :key="piece.id"
            :class="['piece-status', piece.status]"
          >
            <span class="piece-id">Piece {{ piece.id }}</span>
            <span class="piece-state">
              {{ piece.status === 'pending' ? '⏳' : piece.status === 'generating' ? '🔄' : piece.status === 'complete' ? '✅' : '❌' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 5: Completed Puzzle Pieces -->
    <div v-if="currentStep === 5" class="section">
      <h2>Step 5: Your Jigsaw Puzzle Pieces! 🎉</h2>
      <p class="step-description">
        All {{ jigsawStore.completedPieces.length }} puzzle pieces have been generated. You can now
        play with them or download them individually.
      </p>

      <div class="puzzle-pieces-grid">
        <div v-for="piece in jigsawStore.puzzlePieces" :key="piece.id" class="puzzle-piece">
          <div class="piece-header">
            <h4>Piece {{ piece.id }}</h4>
            <span :class="['status-badge', piece.status]">{{ piece.status }}</span>
          </div>
          <div v-if="piece.imageUrl" class="piece-image">
            <img :src="piece.imageUrl" :alt="`Piece ${piece.id}`" />
          </div>
          <div v-else-if="piece.error" class="piece-error">{{ piece.error }}</div>
          <div class="piece-prompt">{{ piece.prompt }}</div>
        </div>
      </div>

      <div class="actions">
        <button @click="resetWorkflow" class="btn-secondary">Create New Puzzle</button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="jigsawStore.error" class="error-message">
      <strong>Error:</strong> {{ jigsawStore.error }}
    </div>

    <!-- How It Works -->
    <div class="info-section">
      <h3>ℹ️ How It Works</h3>
      <ol>
        <li>
          <strong>Upload:</strong> Provide an image (e.g., family photo) to both ComfyUI and the
          vision model
        </li>
        <li>
          <strong>Analyze:</strong> Qwen Vision examines the image and identifies all distinct
          subjects/elements
        </li>
        <li>
          <strong>Generate Prompts:</strong> Qwen Edit creates a specific prompt for each subject
          based on the vision analysis
        </li>
        <li>
          <strong>Create Pieces:</strong> ComfyUI is called X times (once per subject) to generate
          individual puzzle pieces
        </li>
        <li>
          <strong>Play:</strong> The generated pieces can be assembled into a playable jigsaw puzzle
        </li>
      </ol>
      <p class="key-benefit">
        <strong>Key Benefit:</strong> Each puzzle piece is contextually aware of the original image,
        making the pieces coherent and accurately representing each subject.
      </p>
    </div>
  </div>
</template>

<style scoped>
/* Mobile-first responsive styles using Tailwind + custom CSS */
.jigsaw-bridge-view {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8;
}

.header {
  @apply text-center mb-6 sm:mb-8;
}

.header h1 {
  @apply text-2xl sm:text-3xl lg:text-4xl font-bold mb-2;
}

.subtitle {
  @apply text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 px-2;
}

.connections {
  @apply flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center mt-4 px-2;
}

.connection-status {
  @apply flex items-center gap-2 justify-center sm:justify-start;
}

.status-indicator {
  @apply w-3 h-3 rounded-full bg-red-500;
}

.status-indicator.connected {
  @apply bg-green-500;
}

.model-config {
  @apply flex flex-col sm:flex-row gap-4 mb-6 sm:mb-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg;
}

.model-select {
  @apply flex-1 flex flex-col gap-2;
}

.model-select label {
  @apply font-semibold text-sm sm:text-base;
}

.model-select input {
  @apply px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm sm:text-base;
}

.workflow-steps {
  @apply flex justify-between mb-6 sm:mb-8 pb-4 border-b-2 border-gray-200 dark:border-gray-700 overflow-x-auto;
}

.step {
  @apply flex flex-col items-center gap-2 min-w-[80px] sm:min-w-[100px] opacity-40;
}

.step.active {
  @apply opacity-100 font-semibold;
}

.step.completed {
  @apply opacity-70;
}

.step-number {
  @apply w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold text-sm sm:text-base;
}

.step.active .step-number {
  @apply bg-blue-600 text-white;
}

.step.completed .step-number {
  @apply bg-green-600 text-white;
}

.step-label {
  @apply text-xs sm:text-sm text-center;
}

.section {
  @apply mb-6 sm:mb-8 p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md;
}

.section h2 {
  @apply text-xl sm:text-2xl font-bold mb-4;
}

.step-description {
  @apply text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4;
}

.upload-area {
  @apply flex flex-col gap-4;
}

.file-input {
  @apply p-2 sm:p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded;
}

.preview img {
  @apply w-full max-h-[300px] sm:max-h-[400px] object-contain rounded-lg;
}

.analysis-section {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8;
}

.image-preview img {
  @apply w-full rounded-lg;
}

.analysis-content {
  @apply flex flex-col gap-4;
}

.analysis-text {
  @apply p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded whitespace-pre-wrap text-sm sm:text-base;
}

.subjects-list {
  @apply flex flex-col gap-3 sm:gap-4;
}

.subject-card {
  @apply p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-600;
}

.subject-header {
  @apply flex flex-col sm:flex-row sm:justify-between gap-1 mb-2;
}

.subject-position {
  @apply text-gray-600 dark:text-gray-400 text-sm;
}

.subject-description {
  @apply text-gray-700 dark:text-gray-300 m-0 text-sm sm:text-base;
}

.prompts-list {
  @apply flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8;
}

.prompt-card {
  @apply p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg;
}

.prompt-card h4 {
  @apply m-0 mb-2 text-blue-600 dark:text-blue-400 text-base sm:text-lg;
}

.prompt-text {
  @apply p-2 sm:p-3 bg-white dark:bg-gray-800 rounded text-sm sm:text-base leading-relaxed;
}

.generation-progress {
  @apply text-center;
}

.progress-bar {
  @apply w-full h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden my-4;
}

.progress-fill {
  @apply h-full bg-gradient-to-r from-blue-600 to-blue-800 transition-all duration-300;
}

.pieces-status {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8;
}

.piece-status {
  @apply p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between items-center;
}

.piece-status.generating {
  @apply bg-yellow-50 dark:bg-yellow-900/20;
}

.piece-status.complete {
  @apply bg-green-50 dark:bg-green-900/20;
}

.piece-status.error {
  @apply bg-red-50 dark:bg-red-900/20;
}

.puzzle-pieces-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8;
}

.puzzle-piece {
  @apply bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden shadow-lg;
}

.piece-header {
  @apply p-3 sm:p-4 bg-white dark:bg-gray-800 flex justify-between items-center border-b border-gray-200 dark:border-gray-600;
}

.piece-header h4 {
  @apply m-0 text-base sm:text-lg;
}

.status-badge {
  @apply px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold;
}

.status-badge.complete {
  @apply bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400;
}

.status-badge.error {
  @apply bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400;
}

.piece-image img {
  @apply w-full block;
}

.piece-error {
  @apply p-3 sm:p-4 text-red-800 dark:text-red-400 bg-red-100 dark:bg-red-900/20;
}

.piece-prompt {
  @apply p-3 sm:p-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600;
}

.actions {
  @apply flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-8;
}

.btn-primary {
  @apply px-4 sm:px-8 py-3 sm:py-3 bg-blue-600 text-white border-none rounded font-medium cursor-pointer transition-colors hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm sm:text-base;
}

.btn-primary.btn-large {
  @apply px-6 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-semibold mt-4;
}

.upload-status {
  @apply p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded text-center my-2 text-sm sm:text-base;
}

.upload-status.success {
  @apply bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-400;
}

.upload-status p {
  @apply m-0 font-semibold;
}

.btn-secondary {
  @apply px-4 sm:px-8 py-3 bg-gray-600 text-white border-none rounded cursor-pointer hover:bg-gray-700 text-sm sm:text-base;
}

.error-message {
  @apply p-3 sm:p-4 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 rounded mb-4 text-sm sm:text-base;
}

.info-section {
  @apply mt-8 sm:mt-12 p-4 sm:p-6 lg:p-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg;
}

.info-section h3 {
  @apply mt-0 text-lg sm:text-xl font-bold;
}

.info-section ol {
  @apply pl-4 sm:pl-6 leading-relaxed text-sm sm:text-base;
}

.info-section li {
  @apply mb-2 sm:mb-3;
}

.key-benefit {
  @apply mt-4 p-3 sm:p-4 bg-white dark:bg-gray-800 border-l-4 border-blue-600 rounded text-sm sm:text-base;
}
</style>
