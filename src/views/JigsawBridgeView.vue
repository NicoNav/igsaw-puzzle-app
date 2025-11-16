<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useJigsawBridgeStore } from '@/stores/jigsawBridge'
import { useOllamaStore } from '@/stores/ollama'

const jigsawStore = useJigsawBridgeStore()
const ollamaStore = useOllamaStore()
const userIntent = ref('')
const selectedImage = ref<string | null>(null)
const selectedImageDisplay = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const visionModel = ref('qwen2-vl:4b')
const editModel = ref('qwen2.5')
const enablePeopleDetection = ref(false)
const generateCutPattern = ref(false) // New: option to generate cut pattern

// Workflow steps
const currentStep = ref<'upload' | 'analyze' | 'prompt' | 'edit' | 'complete'>('upload')

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
      selectedImageDisplay.value = result
      // Remove data URL prefix to get base64
      const base64Data = result.split(',')[1]
      selectedImage.value = base64Data || null
    }
    reader.readAsDataURL(file)
  }
}

const analyzeImage = async () => {
  if (!selectedImage.value) return

  try {
    await jigsawStore.analyzeJigsaw(selectedImage.value, enablePeopleDetection.value)
    currentStep.value = 'analyze'
  } catch (error) {
    console.error('Failed to analyze image:', error)
  }
}

const generatePrompt = async () => {
  if (!userIntent.value.trim() && !generateCutPattern.value) {
    alert('Please enter what you want to do with the puzzle or enable cut pattern generation')
    return
  }

  try {
    if (generateCutPattern.value) {
      // Generate jigsaw cut pattern
      await jigsawStore.generateJigsawCutPattern({
        pieceSize: 'medium',
        cutStyle: 'traditional',
        preserveIndividuals: true,
      })
    } else {
      // Generate context-aware prompt
      await jigsawStore.generateEditPrompt(userIntent.value)
    }
    currentStep.value = 'prompt'
  } catch (error) {
    console.error('Failed to generate prompt:', error)
  }
}

const executeEdit = async () => {
  try {
    await jigsawStore.executeEdit()
    currentStep.value = 'complete'
  } catch (error) {
    console.error('Failed to execute edit:', error)
  }
}

const processComplete = async () => {
  if (!selectedImage.value || !userIntent.value.trim()) {
    alert('Please upload an image and specify your intent')
    return
  }

  try {
    await jigsawStore.processJigsaw(selectedImage.value, userIntent.value)
    currentStep.value = 'complete'
  } catch (error) {
    console.error('Failed to process jigsaw:', error)
  }
}

const resetWorkflow = () => {
  jigsawStore.reset()
  selectedImage.value = null
  selectedImageDisplay.value = null
  userIntent.value = ''
  currentStep.value = 'upload'
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const updateModels = () => {
  jigsawStore.setModels(visionModel.value, editModel.value)
}
</script>

<template>
  <div class="jigsaw-bridge-view">
    <div class="header">
      <h1>🧩 Jigsaw Puzzle Bridge</h1>
      <p class="subtitle">
        Context-aware workflow: Qwen Vision analyzes your puzzle → Qwen Edit applies changes
      </p>
      <div class="connection-status">
        <span :class="['status-indicator', { connected: ollamaStore.isConnected }]"></span>
        <span>{{ ollamaStore.isConnected ? 'Ollama Connected' : 'Ollama Disconnected' }}</span>
      </div>
    </div>

    <!-- Model Configuration -->
    <div class="model-config">
      <div class="model-select">
        <label>Vision Model:</label>
        <input v-model="visionModel" @change="updateModels" placeholder="qwen2-vl:4b" />
      </div>
      <div class="model-select">
        <label>Edit Model:</label>
        <input v-model="editModel" @change="updateModels" placeholder="qwen2.5" />
      </div>
    </div>

    <!-- Workflow Steps Indicator -->
    <div class="workflow-steps">
      <div
        :class="['step', { active: currentStep === 'upload', completed: currentStep !== 'upload' }]"
      >
        <div class="step-number">1</div>
        <div class="step-label">Upload Image</div>
      </div>
      <div
        :class="[
          'step',
          {
            active: currentStep === 'analyze',
            completed: ['prompt', 'edit', 'complete'].includes(currentStep),
          },
        ]"
      >
        <div class="step-number">2</div>
        <div class="step-label">Analyze Puzzle</div>
      </div>
      <div
        :class="[
          'step',
          {
            active: currentStep === 'prompt',
            completed: ['edit', 'complete'].includes(currentStep),
          },
        ]"
      >
        <div class="step-number">3</div>
        <div class="step-label">Generate Prompt</div>
      </div>
      <div :class="['step', { active: currentStep === 'edit' || currentStep === 'complete' }]">
        <div class="step-number">4</div>
        <div class="step-label">Execute Edit</div>
      </div>
    </div>

    <!-- Step 1: Upload Image -->
    <div v-if="currentStep === 'upload'" class="section">
      <h2>Step 1: Upload Jigsaw Puzzle Image</h2>
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

        <!-- People Detection Option -->
        <div class="detection-option">
          <label>
            <input type="checkbox" v-model="enablePeopleDetection" />
            Detect people/individuals in image (for family photos, group pictures)
          </label>
          <p class="help-text">
            Enable this to identify individuals and create custom jigsaw cuts around them
          </p>
        </div>

        <button
          v-if="selectedImage"
          @click="analyzeImage"
          :disabled="!ollamaStore.isConnected || jigsawStore.isAnalyzing"
          class="btn-primary"
        >
          {{ jigsawStore.isAnalyzing ? 'Analyzing...' : 'Analyze Puzzle →' }}
        </button>
      </div>
    </div>

    <!-- Step 2: Analysis Results -->
    <div v-if="currentStep === 'analyze' && jigsawStore.hasAnalysis" class="section">
      <h2>Step 2: Puzzle Analysis</h2>
      <div class="analysis-results">
        <div class="image-preview">
          <img v-if="selectedImageDisplay" :src="selectedImageDisplay" alt="Puzzle" />
        </div>
        <div class="analysis-content">
          <h3>Vision Analysis:</h3>
          <p class="analysis-text">{{ jigsawStore.currentAnalysis?.context }}</p>

          <!-- Show detected people if any -->
          <div v-if="jigsawStore.hasPeople" class="people-detection">
            <h3>✅ Detected {{ jigsawStore.peopleCount }} Individual(s):</h3>
            <div class="people-list">
              <div
                v-for="person in jigsawStore.currentAnalysis?.detectedPeople"
                :key="person.id"
                class="person-card"
              >
                <strong>Person {{ person.id }}:</strong>
                {{ person.description }}
                <br />
                <span class="person-detail">Position: {{ person.position }}</span>
                <span v-if="person.clothing" class="person-detail">{{ person.clothing }}</span>
              </div>
            </div>

            <!-- Option to generate jigsaw cut pattern -->
            <div class="cut-pattern-option">
              <label>
                <input type="checkbox" v-model="generateCutPattern" />
                Generate jigsaw cut pattern along detected individuals
              </label>
              <p class="help-text">
                Creates cutting instructions that preserve each person's form in the puzzle
              </p>
            </div>
          </div>

          <h3>{{ generateCutPattern ? 'Preferences:' : 'Your Intent:' }}</h3>
          <textarea
            v-if="!generateCutPattern"
            v-model="userIntent"
            placeholder="What do you want to do with this puzzle? (e.g., 'make it more colorful', 'add a vintage filter', 'enhance the contrast')"
            rows="3"
          ></textarea>
          <p v-else class="info-text">
            The system will generate a jigsaw cutting pattern that cuts along the contours of the
            {{ jigsawStore.peopleCount }} detected individual(s).
          </p>

          <button
            @click="generatePrompt"
            :disabled="jigsawStore.isGeneratingPrompt || !userIntent.trim()"
            class="btn-primary"
          >
            {{
              jigsawStore.isGeneratingPrompt ? 'Generating...' : 'Generate Context-Aware Prompt →'
            }}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 3: Context-Aware Prompt or Jigsaw Cut Pattern -->
    <div v-if="currentStep === 'prompt' && (jigsawStore.hasPrompt || jigsawStore.jigsawCutPattern)" class="section">
      <h2>Step 3: {{ generateCutPattern ? 'Jigsaw Cut Pattern' : 'Context-Aware Edit Prompt' }}</h2>
      <div class="prompt-section">
        <div class="prompt-display">
          <h3 v-if="generateCutPattern">Generated Jigsaw Cutting Pattern:</h3>
          <h3 v-else>Generated Prompt (with context from vision analysis):</h3>
          <div class="prompt-text">
            {{ generateCutPattern ? jigsawStore.jigsawCutPattern : jigsawStore.contextAwarePrompt }}
          </div>
        </div>

        <div v-if="generateCutPattern && jigsawStore.hasPeople" class="people-summary">
          <h4>🎯 Cutting Strategy:</h4>
          <p>
            This pattern creates {{ jigsawStore.peopleCount }} distinct sections, one for each
            detected individual, with cuts following their contours.
          </p>
        </div>

        <div class="prompt-actions">
          <button v-if="!generateCutPattern" @click="executeEdit" :disabled="jigsawStore.isEditing" class="btn-primary">
            {{ jigsawStore.isEditing ? 'Processing...' : 'Execute Edit →' }}
          </button>
          <button v-else @click="currentStep = 'complete'" class="btn-primary">
            View Complete Pattern →
          </button>
          <button @click="currentStep = 'analyze'" class="btn-secondary">
            ← Back to {{ generateCutPattern ? 'Options' : 'Edit Intent' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 4: Edit Results -->
    <div v-if="currentStep === 'complete'" class="section">
      <h2>Step 4: Edit Results</h2>
      <div class="results">
        <div class="result-content">
          <h3>Edit Response:</h3>
          <p class="response-text">{{ jigsawStore.editResponse }}</p>

          <div v-if="jigsawStore.hasSuggestions" class="suggestions">
            <h3>Suggestions:</h3>
            <ul>
              <li v-for="(suggestion, index) in jigsawStore.suggestions" :key="index">
                {{ suggestion }}
              </li>
            </ul>
          </div>
        </div>

        <div class="workflow-actions">
          <button @click="resetWorkflow" class="btn-primary">Start New Workflow</button>
          <button @click="currentStep = 'prompt'" class="btn-secondary">← Back to Prompt</button>
        </div>
      </div>
    </div>

    <!-- Quick Complete Workflow Button -->
    <div v-if="currentStep === 'upload' && selectedImage" class="quick-action">
      <h3>Or Skip Steps:</h3>
      <textarea
        v-model="userIntent"
        placeholder="Enter your intent and process everything at once..."
        rows="2"
      ></textarea>
      <button
        @click="processComplete"
        :disabled="jigsawStore.isProcessing || !userIntent.trim()"
        class="btn-quick"
      >
        {{ jigsawStore.isProcessing ? 'Processing...' : '⚡ Analyze & Edit in One Go' }}
      </button>
    </div>

    <!-- Error Display -->
    <div v-if="jigsawStore.error" class="error-message">
      {{ jigsawStore.error }}
    </div>

    <!-- Info Box -->
    <div class="info-box">
      <h3>ℹ️ How It Works</h3>
      <ol>
        <li><strong>Upload:</strong> Select your jigsaw puzzle image</li>
        <li>
          <strong>Analyze:</strong> Qwen Vision examines the puzzle and provides detailed context
        </li>
        <li>
          <strong>Intent:</strong> Tell us what you want to do (the bridge generates a context-aware
          prompt)
        </li>
        <li>
          <strong>Edit:</strong> Qwen Edit receives the context-aware prompt and processes your
          request
        </li>
      </ol>
      <p>
        <strong>Key Benefit:</strong> The edit model already knows about your puzzle's
        characteristics, making edits more accurate and contextually appropriate.
      </p>
    </div>
  </div>
</template>

<style scoped>
.jigsaw-bridge-view {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.subtitle {
  color: var(--color-text-mute, #666);
  margin-bottom: 1rem;
}

.connection-status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--color-background-soft);
  border-radius: 20px;
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

.model-config {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: var(--color-background-soft);
  border-radius: 8px;
}

.model-select {
  flex: 1;
}

.model-select label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.model-select input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.workflow-steps {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: var(--color-background-soft);
  border-radius: 8px;
}

.step {
  flex: 1;
  text-align: center;
  position: relative;
  opacity: 0.4;
}

.step.active {
  opacity: 1;
}

.step.completed {
  opacity: 0.7;
}

.step-number {
  width: 40px;
  height: 40px;
  line-height: 40px;
  margin: 0 auto 0.5rem;
  border-radius: 50%;
  background-color: var(--color-background);
  border: 2px solid var(--color-border);
  font-weight: bold;
}

.step.active .step-number {
  background-color: var(--color-primary, #42b983);
  color: white;
  border-color: var(--color-primary, #42b983);
}

.step.completed .step-number {
  background-color: #4caf50;
  color: white;
  border-color: #4caf50;
}

.step-label {
  font-size: 0.875rem;
}

.section {
  margin-bottom: 2rem;
  padding: 2rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background-color: var(--color-background);
}

.section h2 {
  margin-top: 0;
  color: var(--color-primary, #42b983);
}

.upload-area {
  text-align: center;
}

.file-input {
  display: block;
  margin: 1rem auto;
  padding: 0.5rem;
}

.preview {
  margin: 1rem 0;
}

.preview img {
  max-width: 400px;
  max-height: 400px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.analysis-results {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.image-preview img {
  width: 100%;
  border-radius: 8px;
}

.analysis-content h3 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.analysis-content h3:first-child {
  margin-top: 0;
}

.analysis-text {
  padding: 1rem;
  background-color: var(--color-background-soft);
  border-radius: 4px;
  white-space: pre-wrap;
  line-height: 1.6;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 1rem;
}

.btn-primary,
.btn-secondary,
.btn-quick {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  margin-right: 0.5rem;
}

.btn-primary {
  background-color: var(--color-primary, #42b983);
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-quick {
  background-color: #ff6b6b;
  color: white;
  font-weight: bold;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prompt-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.prompt-display {
  background-color: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 8px;
}

.prompt-text {
  padding: 1rem;
  background-color: var(--color-background);
  border-radius: 4px;
  border-left: 4px solid var(--color-primary, #42b983);
  white-space: pre-wrap;
  line-height: 1.6;
  font-family: monospace;
}

.prompt-actions {
  display: flex;
  gap: 1rem;
}

.results {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.result-content {
  background-color: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 8px;
}

.response-text {
  padding: 1rem;
  background-color: var(--color-background);
  border-radius: 4px;
  white-space: pre-wrap;
  line-height: 1.6;
}

.suggestions {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #e3f2fd;
  border-radius: 4px;
}

.suggestions ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
}

.suggestions li {
  margin: 0.5rem 0;
}

.workflow-actions {
  display: flex;
  gap: 1rem;
}

.quick-action {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background-color: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 8px;
}

.quick-action h3 {
  margin-top: 0;
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
  padding: 1.5rem;
  background-color: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}

.info-box h3 {
  margin-top: 0;
  color: #1976d2;
}

.info-box ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.info-box li {
  margin: 0.75rem 0;
}

.detection-option {
  margin: 1rem 0;
  padding: 1rem;
  background-color: #f0f8ff;
  border-radius: 4px;
  text-align: left;
}

.detection-option label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  cursor: pointer;
}

.detection-option input[type='checkbox'] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.help-text {
  margin: 0.5rem 0 0 0;
  font-size: 0.875rem;
  color: #666;
  font-style: italic;
}

.people-detection {
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: #e8f5e9;
  border-radius: 8px;
  border-left: 4px solid #4caf50;
}

.people-list {
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.person-card {
  padding: 0.75rem;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #c8e6c9;
}

.person-detail {
  display: block;
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.cut-pattern-option {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #fff9c4;
  border-radius: 4px;
}

.cut-pattern-option label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: bold;
  cursor: pointer;
}

.cut-pattern-option input[type='checkbox'] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.info-text {
  padding: 1rem;
  background-color: #e3f2fd;
  border-radius: 4px;
  margin: 0.5rem 0;
}

.people-summary {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #e8f5e9;
  border-radius: 4px;
  border-left: 4px solid #4caf50;
}

.people-summary h4 {
  margin-top: 0;
  color: #2e7d32;
}

@media (max-width: 768px) {
  .analysis-results {
    grid-template-columns: 1fr;
  }

  .workflow-steps {
    flex-wrap: wrap;
  }

  .step {
    min-width: 120px;
  }
}
</style>
