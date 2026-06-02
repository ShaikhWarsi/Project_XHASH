export interface ScreenshotOptions {
  width?: number
  height?: number
  format?: 'png' | 'jpeg'
  quality?: number
  includeOverlays?: boolean
  watermark?: boolean
}

export class ChartScreenshot {
  static async capture(
    chartCanvas: HTMLCanvasElement,
    overlayCanvas?: HTMLCanvasElement,
    options?: ScreenshotOptions
  ): Promise<Blob> {
    const fmt = options?.format ?? 'png'
    const quality = options?.quality ?? 0.92
    const w = options?.width ?? chartCanvas.width
    const h = options?.height ?? chartCanvas.height

    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    const ctx = offscreen.getContext('2d')
    if (!ctx) throw new Error('Could not create offscreen canvas')

    ctx.drawImage(chartCanvas, 0, 0, w, h)

    if (overlayCanvas && options?.includeOverlays !== false) {
      ctx.drawImage(overlayCanvas, 0, 0, w, h)
    }

    if (options?.watermark !== false) {
      this.addWatermark(offscreen, 'Trademania Terminal')
    }

    return new Promise<Blob>((resolve, reject) => {
      offscreen.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob failed'))
        },
        fmt === 'jpeg' ? 'image/jpeg' : 'image/png',
        fmt === 'jpeg' ? quality : undefined
      )
    })
  }

  static async captureViewport(
    container: HTMLElement,
    options?: ScreenshotOptions
  ): Promise<Blob> {
    const fmt = options?.format ?? 'png'
    const quality = options?.quality ?? 0.92
    const w = options?.width ?? container.scrollWidth
    const h = options?.height ?? container.scrollHeight

    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    const ctx = offscreen.getContext('2d')
    if (!ctx) throw new Error('Could not create offscreen canvas')

    await this.settleRender()

    const canvases = container.querySelectorAll('canvas')
    for (const canvas of canvases) {
      try {
        ctx.drawImage(canvas, 0, 0, w, h)
      } catch {
        try {
          const rect = canvas.getBoundingClientRect()
          const containerRect = container.getBoundingClientRect()
          const x = rect.left - containerRect.left
          const y = rect.top - containerRect.top
          ctx.drawImage(canvas, x, y, rect.width, rect.height)
        } catch {}
      }
    }

    const images = container.querySelectorAll('img')
    for (const img of images) {
      try {
        const rect = img.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const x = rect.left - containerRect.left
        const y = rect.top - containerRect.top
        ctx.drawImage(img, x, y, rect.width, rect.height)
      } catch {}
    }

    if (options?.watermark !== false) {
      this.addWatermark(offscreen, 'Trademania Terminal')
    }

    return new Promise<Blob>((resolve, reject) => {
      offscreen.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Canvas toBlob failed'))
        },
        fmt === 'jpeg' ? 'image/jpeg' : 'image/png',
        fmt === 'jpeg' ? quality : undefined
      )
    })
  }

  static download(blob: Blob, filename?: string): void {
    const name = filename ?? `chart_${Date.now()}.png`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  static async copyToClipboard(blob: Blob): Promise<void> {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ])
    } catch (err) {
      throw new Error('Failed to copy image to clipboard: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  static async share(blob: Blob, title?: string): Promise<boolean> {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], title ?? 'chart.png', { type: blob.type })
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: title ?? 'Chart',
            files: [file],
          })
          return true
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return false
        }
      }
    }
    this.download(blob, title)
    return false
  }

  static addWatermark(canvas: HTMLCanvasElement, text: string): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.font = '12px JetBrains Mono, monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    const padding = 12
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    ctx.fillText(text, canvas.width - padding, canvas.height - padding)
    ctx.restore()
  }

  private static settleRender(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 100)
      })
    })
  }
}
