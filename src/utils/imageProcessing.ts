export interface ProcessedPiece {
  croppedUrl: string
  x: number
  y: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
}

export const processPuzzlePiece = (imageUrl: string): Promise<ProcessedPiece> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Could not get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      let minX = canvas.width
      let minY = canvas.height
      let maxX = 0
      let maxY = 0
      let found = false

      // Scan for non-transparent pixels
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3]
          if (alpha !== undefined && alpha > 0) {
            if (x < minX) minX = x
            if (x > maxX) maxX = x
            if (y < minY) minY = y
            if (y > maxY) maxY = y
            found = true
          }
        }
      }

      if (!found) {
        // Empty image
        resolve({
          croppedUrl: imageUrl,
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
          originalWidth: img.width,
          originalHeight: img.height
        })
        return
      }

      const width = maxX - minX + 1
      const height = maxY - minY + 1

      // Create cropped canvas
      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = width
      croppedCanvas.height = height
      const croppedCtx = croppedCanvas.getContext('2d')
      if (!croppedCtx) {
        reject(new Error('Could not get cropped canvas context'))
        return
      }

      croppedCtx.drawImage(img, minX, minY, width, height, 0, 0, width, height)

      resolve({
        croppedUrl: croppedCanvas.toDataURL(),
        x: minX,
        y: minY,
        width,
        height,
        originalWidth: img.width,
        originalHeight: img.height
      })
    }
    img.onerror = (err) => reject(err)
    img.src = imageUrl
  })
}
