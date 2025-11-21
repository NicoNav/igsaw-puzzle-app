import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  type JigsawPiece,
} from '@/services/jigsawBridgeService'
import { useComfyUIStore } from './comfyui'
import { processPuzzlePiece } from '@/utils/imageProcessing'

export const useJigsawBridgeStore = defineStore('jigsawBridge', () => {
  const error = ref<string | null>(null)
  const currentImage = ref<string | null>(null)

  // Multi-piece jigsaw state
  const puzzlePieces = ref<JigsawPiece[]>([])
  const isGeneratingPieces = ref(false)
  const generationProgress = ref({ current: 0, total: 0 })
  const isGameReady = ref(false)

  const hasPuzzlePieces = computed(() => puzzlePieces.value.length > 0)
  const completedPieces = computed(() => puzzlePieces.value.filter((p) => p.status === 'complete'))
  const isProcessing = computed(() => isGeneratingPieces.value)

  /**
   * Add a manual piece prompt
   */
  function addPiece(prompt: string) {
    const id = puzzlePieces.value.length + 1
    puzzlePieces.value.push({
      id,
      subjectId: id,
      prompt,
      status: 'pending',
    })
  }

  /**
   * Remove a piece
   */
  function removePiece(id: number) {
    puzzlePieces.value = puzzlePieces.value.filter((p) => p.id !== id)
  }

  /**
   * Reset store state
   */
  function reset() {
    error.value = null
    currentImage.value = null
    puzzlePieces.value = []
    isGeneratingPieces.value = false
    generationProgress.value = { current: 0, total: 0 }
    isGameReady.value = false
  }

  /**
   * Process generated pieces for the game
   * Crops images and finds their correct coordinates
   */
  async function processPiecesForGame() {
    isGeneratingPieces.value = true
    try {
      for (const piece of puzzlePieces.value) {
        if (piece.status === 'complete' && piece.imageUrl && !piece.croppedUrl) {
          const processed = await processPuzzlePiece(piece.imageUrl)
          piece.croppedUrl = processed.croppedUrl
          piece.x = processed.x
          piece.y = processed.y
          piece.width = processed.width
          piece.height = processed.height
          piece.originalWidth = processed.originalWidth
          piece.originalHeight = processed.originalHeight
          // Initial position (random scatter)
          piece.currentX = Math.random() * 80
          piece.currentY = Math.random() * 80
          piece.isPlaced = false
        }
      }
      isGameReady.value = true
    } catch (err) {
      console.error('Failed to process pieces:', err)
      error.value = 'Failed to prepare game pieces'
    } finally {
      isGeneratingPieces.value = false
    }
  }

  /**
   * NEW WORKFLOW: Generate all puzzle pieces using ComfyUI
   * Step 4 of your envisioned workflow - calls ComfyUI X times
   */
  async function generateAllPuzzlePieces(uploadedFilename: string) {
    if (puzzlePieces.value.length === 0) {
      error.value = 'No puzzle pieces to generate. Add pieces first.'
      return []
    }

    const comfyUIStore = useComfyUIStore()
    isGeneratingPieces.value = true
    error.value = null
    generationProgress.value = { current: 0, total: puzzlePieces.value.length }

    const results: JigsawPiece[] = []

    try {
      for (let i = 0; i < puzzlePieces.value.length; i++) {
        const piece = puzzlePieces.value[i]
        if (!piece) continue

        piece.status = 'generating'
        generationProgress.value.current = i + 1

        try {
          // Call ComfyUI for each subject/piece
          // Use SAM3 Segmentation for precise cutouts
          const result = await comfyUIStore.runSAM3Segmentation({
            imageFilename: uploadedFilename,
            prompt: piece.prompt,
          })

          if (result.images && result.images.length > 0) {
            piece.status = 'complete'
            piece.imageUrl = result.images[0]
          } else {
            piece.status = 'error'
            piece.error = 'No image generated'
          }
        } catch (err) {
          piece.status = 'error'
          piece.error = err instanceof Error ? err.message : 'Generation failed'
          console.error(`Failed to generate piece ${i + 1}:`, err)
        }

        results.push(piece)
      }

      puzzlePieces.value = results
      return results
    } catch (err) {
      error.value = 'Failed to generate puzzle pieces'
      console.error('Generate all pieces error:', err)
      throw err
    } finally {
      isGeneratingPieces.value = false
    }
  }

  return {
    // State
    error,
    currentImage,
    puzzlePieces,
    isGeneratingPieces,
    generationProgress,
    isGameReady,

    // Getters
    hasPuzzlePieces,
    completedPieces,
    isProcessing,

    // Actions
    addPiece,
    removePiece,
    generateAllPuzzlePieces,
    processPiecesForGame,
    reset,
  }
})
