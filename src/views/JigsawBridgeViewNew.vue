<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useJigsawBridgeStore } from '@/stores/jigsawBridge'
import { useComfyUIStore } from '@/stores/comfyui'

const jigsawStore = useJigsawBridgeStore()
const comfyUIStore = useComfyUIStore()

const selectedImage = ref<string | null>(null)
const selectedImageDisplay = ref<string | null>(null)
const uploadedFilename = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const newPiecePrompt = ref('')

// Workflow modes
const currentStep = ref<1 | 2 | 3 | 4>(1)

// Game State
const gameBoardRef = ref<HTMLElement | null>(null)
const draggingPiece = ref<number | null>(null)
const dragOffset = ref({ x: 0, y: 0 })

onMounted(async () => {
  await comfyUIStore.checkConnection()
})

const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    isUploading.value = true
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
    } finally {
      isUploading.value = false
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

const addPiece = () => {
  if (newPiecePrompt.value.trim()) {
    jigsawStore.addPiece(newPiecePrompt.value.trim())
    newPiecePrompt.value = ''
  }
}

const removePiece = (id: number) => {
  jigsawStore.removePiece(id)
}

const generatePieces = async () => {
  if (!uploadedFilename.value) {
    alert('Please upload image to ComfyUI first')
    return
  }

  try {
    currentStep.value = 3
    await jigsawStore.generateAllPuzzlePieces(uploadedFilename.value)
    
    // Check if any pieces failed
    const failedPieces = jigsawStore.puzzlePieces.filter(p => p.status === 'error')
    if (failedPieces.length > 0) {
      alert(`Warning: ${failedPieces.length} pieces failed to generate. Check console for details.`)
    }
  } catch (error) {
    console.error('Failed to generate pieces:', error)
    alert('Failed to generate pieces. Please check if ComfyUI is running and has the required nodes installed.')
  }
}

const startGame = async () => {
  await jigsawStore.processPiecesForGame()
  if (jigsawStore.isGameReady) {
    currentStep.value = 4
  }
}

// ...existing code...
const onMouseDown = (event: MouseEvent, pieceId: number) => {
  const piece = jigsawStore.puzzlePieces.find(p => p.id === pieceId)
  if (!piece || piece.isPlaced) return

  // Get container dimensions
  const container = gameBoardRef.value?.querySelector('.game-board-wrapper') as HTMLElement
  if (!container) return
  const rect = container.getBoundingClientRect()

  draggingPiece.value = pieceId
  
  // Calculate offset in percentages relative to container
  // We need to know where the mouse is relative to the piece's top-left corner
  // piece.currentX is in %, so convert to pixels first
  const pieceXPixels = (piece.currentX || 0) / 100 * rect.width
  const pieceYPixels = (piece.currentY || 0) / 100 * rect.height
  
  const mouseXRelative = event.clientX - rect.left
  const mouseYRelative = event.clientY - rect.top
  
  dragOffset.value = {
    x: mouseXRelative - pieceXPixels,
    y: mouseYRelative - pieceYPixels
  }
  
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (event: MouseEvent) => {
  if (draggingPiece.value === null) return
  
  const piece = jigsawStore.puzzlePieces.find(p => p.id === draggingPiece.value)
  if (!piece) return

  const container = gameBoardRef.value?.querySelector('.game-board-wrapper') as HTMLElement
  if (!container) return
  const rect = container.getBoundingClientRect()

  const mouseXRelative = event.clientX - rect.left
  const mouseYRelative = event.clientY - rect.top

  const newXPixels = mouseXRelative - dragOffset.value.x
  const newYPixels = mouseYRelative - dragOffset.value.y

  // Convert back to percentage
  piece.currentX = (newXPixels / rect.width) * 100
  piece.currentY = (newYPixels / rect.height) * 100
}

const onMouseUp = () => {
  if (draggingPiece.value === null) return

  const piece = jigsawStore.puzzlePieces.find(p => p.id === draggingPiece.value)
  if (piece && piece.originalWidth && piece.originalHeight) {
    // Check snap
    // Target position in %
    const targetXPercent = (piece.x || 0) / piece.originalWidth * 100
    const targetYPercent = (piece.y || 0) / piece.originalHeight * 100
    
    const thresholdPercent = 5 // 5% tolerance

    if (
      Math.abs((piece.currentX || 0) - targetXPercent) < thresholdPercent &&
      Math.abs((piece.currentY || 0) - targetYPercent) < thresholdPercent
    ) {
      piece.currentX = targetXPercent
      piece.currentY = targetYPercent
      piece.isPlaced = true
    }
  }

  draggingPiece.value = null
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}
// ...existing code...

const resetWorkflow = () => {
  jigsawStore.reset()
  selectedImage.value = null
  selectedImageDisplay.value = null
  uploadedFilename.value = null
  isUploading.value = false
  currentStep.value = 1
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="jigsaw-bridge-view">
    <div class="header">
      <h1>🧩 Jigsaw Puzzle Bridge - SAM3 Workflow</h1>
      <p class="subtitle">
        AI-powered jigsaw puzzle generation: Upload → Define Pieces → SAM3 Segmentation → Playable puzzle
      </p>
      <div class="connections">
        <div class="connection-status">
          <span :class="['status-indicator', { connected: comfyUIStore.isConnected }]"></span>
          <span>ComfyUI: {{ comfyUIStore.isConnected ? 'Connected' : 'Disconnected' }}</span>
        </div>
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
        <div class="step-label">Define Pieces</div>
      </div>
      <div :class="['step', { active: currentStep === 3 }]">
        <div class="step-number">3</div>
        <div class="step-label">Generate</div>
      </div>
      <div :class="['step', { active: currentStep === 4 }]">
        <div class="step-number">4</div>
        <div class="step-label">Play</div>
      </div>
    </div>

    <!-- Step 1: Upload -->
    <div v-if="currentStep === 1" class="section">
      <h2>Step 1: Upload Your Image</h2>
      <p class="step-description">
        Upload an image to start.
      </p>
      <div class="upload-area">
        <div class="upload-area" @click="fileInput?.click()">
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleImageUpload"
          />
          <div v-if="!selectedImageDisplay" class="upload-placeholder">
            <div class="icon">📁</div>
            <p>Click to upload a puzzle image</p>
            <p class="text-sm text-gray-500">Supports JPG, PNG</p>
          </div>
          <div v-else class="image-preview">
            <img :src="selectedImageDisplay" alt="Preview" />
            <div v-if="isUploading" class="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              Uploading...
            </div>
            <div v-else class="change-overlay">
              <span>Click to change</span>
            </div>
          </div>
        </div>
        
        <!-- Upload status message -->
        <div v-if="isUploading" class="upload-status">
          <p>⏳ Uploading image to ComfyUI...</p>
        </div>
        <div v-else-if="uploadedFilename" class="upload-status success">
          <p>✅ Image uploaded successfully: {{ uploadedFilename }}</p>
        </div>
        
        <!-- Next step button -->
        <button
          v-if="selectedImage && uploadedFilename"
          @click="currentStep = 2"
          class="btn-primary btn-large"
        >
          Next: Define Pieces →
        </button>
      </div>
    </div>

    <!-- Step 2: Define Pieces -->
    <div v-if="currentStep === 2" class="section">
      <h2>Step 2: Define Puzzle Pieces</h2>
      <p class="step-description">
        Enter text prompts for the objects you want to cut out (e.g., "cat", "person", "tree").
      </p>
      
      <div class="flex gap-2 mb-4">
        <input 
          v-model="newPiecePrompt" 
          @keyup.enter="addPiece"
          placeholder="Enter object name (e.g. 'cat')"
          class="flex-1 p-2 border rounded"
        />
        <button @click="addPiece" class="btn-primary">Add</button>
      </div>

      <div class="prompts-list">
        <div v-for="piece in jigsawStore.puzzlePieces" :key="piece.id" class="prompt-card flex justify-between items-center">
          <span>{{ piece.prompt }}</span>
          <button @click="removePiece(piece.id)" class="text-red-500 hover:text-red-700">✕</button>
        </div>
        <div v-if="jigsawStore.puzzlePieces.length === 0" class="text-gray-500 text-center py-4">
          No pieces defined yet. Add some above!
        </div>
      </div>

      <div class="actions">
        <button @click="currentStep = 1" class="btn-secondary">← Back</button>
        <button 
          @click="generatePieces" 
          :disabled="jigsawStore.puzzlePieces.length === 0"
          class="btn-primary"
        >
          Generate Pieces →
        </button>
      </div>
    </div>

    <!-- Step 3: Generate & Play -->
    <div v-if="currentStep === 3" class="section">
      <h2>Step 3: Generation Results</h2>
      
      <div v-if="jigsawStore.isGeneratingPieces" class="generation-progress">
        <p>Generating piece {{ jigsawStore.generationProgress.current }} of {{ jigsawStore.generationProgress.total }}...</p>
        <div class="progress-bar">
          <div 
            class="progress-fill"
            :style="{ width: `${(jigsawStore.generationProgress.current / jigsawStore.generationProgress.total) * 100}%` }"
          ></div>
        </div>
      </div>

      <div class="pieces-status">
        <div v-for="piece in jigsawStore.puzzlePieces" :key="piece.id" :class="['piece-status', piece.status]">
          <div class="piece-info">
            <span class="font-bold">{{ piece.prompt }}</span>
            <span class="text-sm ml-2 status-badge" :class="piece.status">{{ piece.status }}</span>
          </div>
          <div v-if="piece.imageUrl" class="piece-preview mt-2">
            <img :src="piece.imageUrl" class="w-20 h-20 object-cover rounded" />
          </div>
        </div>
      </div>

      <div class="actions mt-8">
        <button @click="resetWorkflow" class="btn-secondary">Start Over</button>
        <button 
          v-if="!jigsawStore.isGeneratingPieces && jigsawStore.completedPieces.length > 0"
          @click="startGame" 
          class="btn-primary"
        >
          Play Game →
        </button>
      </div>
    </div>

    <!-- Step 4: Play Game -->
    <div v-if="currentStep === 4" class="section game-section" ref="gameBoardRef">
      <div class="flex justify-between items-center mb-4">
        <h2>Step 4: Play Your Game</h2>
        <div class="text-sm text-gray-500">
          Drag pieces to their correct location on the image!
        </div>
      </div>
      
      <div v-if="!jigsawStore.isGameReady" class="text-center py-8">
        <p class="text-xl mb-2">Preparing your game...</p>
        <p class="text-gray-500">Processing puzzle pieces</p>
      </div>

      <div v-else class="game-container">
        <!-- Game Board (Original Image) -->
        <div class="game-board-wrapper relative mx-auto" :style="{ maxWidth: '100%' }">
          <img 
            v-if="selectedImageDisplay" 
            :src="selectedImageDisplay" 
            class="game-background opacity-50 pointer-events-none select-none block w-full h-auto"
            draggable="false"
          />
          
          <!-- Pieces Layer -->
          <!-- pointer-events-none on container lets clicks pass through empty areas -->
          <div class="pieces-layer absolute inset-0 pointer-events-none">
            <div 
              v-for="piece in jigsawStore.puzzlePieces" 
              :key="piece.id" 
              class="game-piece absolute cursor-move select-none transition-transform duration-75 pointer-events-auto"
              :class="{ 'placed': piece.isPlaced, 'dragging': draggingPiece === piece.id }"
              :style="{
                left: `${piece.currentX}%`,
                top: `${piece.currentY}%`,
                width: `${(piece.width || 0) / (piece.originalWidth || 1) * 100}%`,
                height: `${(piece.height || 0) / (piece.originalHeight || 1) * 100}%`,
                zIndex: draggingPiece === piece.id ? 100 : (piece.isPlaced ? 1 : 10)
              }"
              @mousedown.prevent="(e) => onMouseDown(e, piece.id)"
            >
              <img 
                v-if="piece.croppedUrl" 
                :src="piece.croppedUrl" 
                class="w-full h-full object-contain pointer-events-none"
                draggable="false"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="actions mt-8">
        <button @click="resetWorkflow" class="btn-secondary">Start Over</button>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
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

.upload-placeholder {
  @apply flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors;
}

.upload-placeholder .icon {
  @apply text-4xl mb-2;
}

.image-preview {
  @apply relative rounded-lg overflow-hidden;
}

.image-preview img {
  @apply w-full max-h-[300px] sm:max-h-[400px] object-contain;
}

.change-overlay {
  @apply absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white font-semibold;
}

.upload-status {
  @apply p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded text-center my-2 text-sm sm:text-base;
}

.upload-status.success {
  @apply bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-400;
}

.btn-primary {
  @apply px-4 sm:px-8 py-3 sm:py-3 bg-blue-600 text-white border-none rounded font-medium cursor-pointer transition-colors hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm sm:text-base;
}

.btn-primary.btn-large {
  @apply px-6 sm:px-10 py-3 sm:py-4 text-base sm:text-lg font-semibold mt-4 w-full sm:w-auto self-center;
}

.btn-secondary {
  @apply px-4 sm:px-8 py-3 bg-gray-600 text-white border-none rounded cursor-pointer hover:bg-gray-700 text-sm sm:text-base;
}

.prompts-list {
  @apply flex flex-col gap-3 sm:gap-4 mb-6 sm:mb-8;
}

.prompt-card {
  @apply p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg;
}

.actions {
  @apply flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-8;
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
  @apply p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg flex flex-col;
}

.piece-status.generating {
  @apply bg-yellow-50 dark:bg-yellow-900/20;
}

.piece-status.complete {
  @apply bg-green-50 dark:bg-green-900/20;
}

.status-badge {
  @apply px-2 py-1 rounded text-xs font-bold uppercase;
}

.status-badge.pending {
  @apply bg-gray-200 text-gray-700;
}
.status-badge.generating {
  @apply bg-yellow-200 text-yellow-800;
}
.status-badge.complete {
  @apply bg-green-200 text-green-800;
}
.status-badge.error {
  @apply bg-red-200 text-red-800;
}

.game-piece {
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.game-piece.dragging {
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4));
  transform: scale(1.05);
}

.game-piece.placed {
  filter: none;
  cursor: default;
}
</style>
