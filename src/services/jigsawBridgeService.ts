export interface JigsawPiece {
  id: number
  subjectId: number
  prompt: string
  imageUrl?: string
  status: 'pending' | 'generating' | 'complete' | 'error'
  error?: string
  // Game properties
  x?: number
  y?: number
  width?: number
  height?: number
  croppedUrl?: string
  currentX?: number // Current position on board
  currentY?: number // Current position on board
  isPlaced?: boolean
}
