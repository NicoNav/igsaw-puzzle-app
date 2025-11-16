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
      if (result.success && result.filename) {
        uploadedFilename.value = result.filename
      }
    } catch (error) {
      console.error('Failed to upload to ComfyUI:', error)
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
        <button
          v-if="selectedImage && uploadedFilename"
          @click="prepareMultiPiece"
          :disabled="jigsawStore.isProcessing"
          class="btn-primary"
        >
          {{ jigsawStore.isProcessing ? 'Processing...' : 'Analyze Image →' }}
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
.jigsaw-bridge-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  margin-bottom: 1rem;
}

.connections {
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-top: 1rem;
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
  background-color: #dc3545;
}

.status-indicator.connected {
  background-color: #28a745;
}

.model-config {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.model-select {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.model-select label {
  font-weight: 600;
}

.model-select input {
  padding: 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.workflow-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1rem 0;
  border-bottom: 2px solid #e9ecef;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.4;
}

.step.active {
  opacity: 1;
  font-weight: 600;
}

.step.completed {
  opacity: 0.7;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e9ecef;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.step.active .step-number {
  background: #007bff;
  color: white;
}

.step.completed .step-number {
  background: #28a745;
  color: white;
}

.section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section h2 {
  margin-bottom: 1rem;
}

.step-description {
  color: #666;
  margin-bottom: 1rem;
}

.upload-area {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.file-input {
  padding: 0.5rem;
  border: 2px dashed #dee2e6;
  border-radius: 4px;
}

.preview img {
  max-width: 100%;
  max-height: 400px;
  border-radius: 8px;
}

.analysis-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.image-preview img {
  width: 100%;
  border-radius: 8px;
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.analysis-text {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  white-space: pre-wrap;
}

.subjects-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.subject-card {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.subject-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.subject-position {
  color: #666;
  font-size: 0.9em;
}

.subject-description {
  color: #495057;
  margin: 0;
}

.prompts-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.prompt-card {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.prompt-card h4 {
  margin: 0 0 0.5rem 0;
  color: #007bff;
}

.prompt-text {
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  font-size: 0.95em;
  line-height: 1.5;
}

.generation-progress {
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 30px;
  background: #e9ecef;
  border-radius: 15px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
}

.pieces-status {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.piece-status {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.piece-status.generating {
  background: #fff3cd;
}

.piece-status.complete {
  background: #d4edda;
}

.piece-status.error {
  background: #f8d7da;
}

.puzzle-pieces-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.puzzle-piece {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.piece-header {
  padding: 1rem;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #dee2e6;
}

.piece-header h4 {
  margin: 0;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: 600;
}

.status-badge.complete {
  background: #d4edda;
  color: #155724;
}

.status-badge.error {
  background: #f8d7da;
  color: #721c24;
}

.piece-image img {
  width: 100%;
  display: block;
}

.piece-error {
  padding: 1rem;
  color: #721c24;
  background: #f8d7da;
}

.piece-prompt {
  padding: 1rem;
  font-size: 0.9em;
  color: #666;
  border-top: 1px solid #dee2e6;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.75rem 2rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #5a6268;
}

.error-message {
  padding: 1rem;
  background: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.info-section {
  margin-top: 3rem;
  padding: 2rem;
  background: #e7f3ff;
  border-radius: 8px;
}

.info-section h3 {
  margin-top: 0;
}

.info-section ol {
  padding-left: 1.5rem;
  line-height: 1.8;
}

.info-section li {
  margin-bottom: 0.5rem;
}

.key-benefit {
  margin-top: 1rem;
  padding: 1rem;
  background: white;
  border-left: 4px solid #007bff;
  border-radius: 4px;
}
</style>
