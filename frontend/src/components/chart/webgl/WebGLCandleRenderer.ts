import type { Time, CandlestickData } from 'lightweight-charts'
import type { DeltaBar } from '../delta/DeltaCalculator'

const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  uniform vec2 u_resolution;
  void main() {
    vec2 zeroToOne = a_position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0.0, 1.0);
  }
`

const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    gl_FragColor = u_color;
  }
`

export interface WebGLRendererOptions {
  canvas: HTMLCanvasElement
  theme: { up: string; down: string; bg: string }
}

export interface WebGLCandle {
  x: number
  bodyTop: number
  bodyBottom: number
  wickHigh: number
  wickLow: number
  bodyWidth: number
  wickWidth: number
  r: number
  g: number
  b: number
  a: number
  volume: number
  volumeHeight: number
  isUp: boolean
}

function hexToNormalized(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

const UP_RGB: [number, number, number] = [0x22 / 255, 0xc5 / 255, 0x5e / 255]
const DOWN_RGB: [number, number, number] = [0xef / 255, 0x44 / 255, 0x44 / 255]

export class WebGLCandleRenderer {
  private gl: WebGLRenderingContext | null = null
  private program: WebGLProgram | null = null
  private positionBuffer: WebGLBuffer | null = null
  private colorBuffer: WebGLBuffer | null = null
  private candleCount = 0
  private canvasWidth = 0
  private canvasHeight = 0
  private resolutionUniform: WebGLUniformLocation | null = null
  private colorUniform: WebGLUniformLocation | null = null
  private positionLoc: number = -1
  private canvas: HTMLCanvasElement

  constructor(options: WebGLRendererOptions) {
    this.canvas = options.canvas
    this.canvas.width = options.canvas.width || 800
    this.canvas.height = options.canvas.height || 600
    this.canvasWidth = this.canvas.width
    this.canvasHeight = this.canvas.height
  }

  private init(): boolean {
    const gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext | null
    if (!gl) return false
    this.gl = gl

    const vs = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE)
    const fs = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE)
    if (!vs || !fs) return false

    this.program = this.createProgram(vs, fs)
    if (!this.program) return false

    this.positionLoc = gl.getAttribLocation(this.program, 'a_position')
    this.resolutionUniform = gl.getUniformLocation(this.program, 'u_resolution')
    this.colorUniform = gl.getUniformLocation(this.program, 'u_color')

    this.positionBuffer = gl.createBuffer()
    this.colorBuffer = gl.createBuffer()

    gl.viewport(0, 0, this.canvasWidth, this.canvasHeight)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    return true
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl
    if (!gl) return null
    const shader = gl.createShader(type)
    if (!shader) return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  private createProgram(vsSource: WebGLShader, fsSource: WebGLShader): WebGLProgram | null {
    const gl = this.gl
    if (!gl) return null
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vsSource)
    gl.attachShader(program, fsSource)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      return null
    }
    return program
  }

  render(candles: WebGLCandle[], layout: { width: number; height: number; padding: { top: number; bottom: number; left: number; right: number } }): void {
    const gl = this.gl
    if (!gl) return

    try {
      const needsInit = !this.program
      if (needsInit) {
        const ok = this.init()
        if (!ok) return
      }

      this.canvasWidth = layout.width
      this.canvasHeight = layout.height
      this.canvas.width = layout.width
      this.canvas.height = layout.height
      gl.viewport(0, 0, layout.width, layout.height)

      const count = candles.length
      if (count === 0) {
        gl.clear(gl.COLOR_BUFFER_BIT)
        return
      }

      const { padding, width, height } = layout
      const chartLeft = padding.left
      const chartBottom = height - padding.bottom
      const chartTop = padding.top
      const chartHeight = chartBottom - chartTop
      const volumeAreaHeight = chartHeight * 0.15
      const candleAreaBottom = chartBottom - volumeAreaHeight

      const vertsPerCandle = 18
      const totalVerts = count * vertsPerCandle
      const positions = new Float32Array(totalVerts * 2)
      const colors = new Float32Array(totalVerts * 2)

      for (let i = 0; i < count; i++) {
        const c = candles[i]
        const base = i * vertsPerCandle

        const bodyTopPx = chartTop + (1 - c.bodyTop) * chartHeight
        const bodyBottomPx = chartTop + (1 - c.bodyBottom) * chartHeight
        const wickHighPx = chartTop + (1 - c.wickHigh) * chartHeight
        const wickLowPx = chartTop + (1 - c.wickLow) * chartHeight
        const centerX = chartLeft + c.x * (width - padding.left - padding.right)

        const bodyHalfW = c.bodyWidth * (width - padding.left - padding.right) * 0.5
        const wickHalfW = Math.max(1, c.wickWidth * (width - padding.left - padding.right) * 0.5)

        const bodyTop = Math.min(bodyTopPx, bodyBottomPx)
        const bodyBottom = Math.max(bodyTopPx, bodyBottomPx)

        const colR = c.r
        const colG = c.g
        const colB = c.b
        const colA = c.a

        const getCol = (alphaMult: number): [number, number, number, number] => [colR, colG, colB, colA * alphaMult]

        const wickLeft = centerX - wickHalfW
        const wickRight = centerX + wickHalfW
        const bodyLeft = centerX - bodyHalfW
        const bodyRight = centerX + bodyHalfW

        const volBarHeight = c.volumeHeight * (candleAreaBottom || 0)
        const volBarTop = candleAreaBottom - volBarHeight
        const volBarLeft = centerX - bodyHalfW * 0.8
        const volBarRight = centerX + bodyHalfW * 0.8

        const wickColor = getCol(0.8)
        positions[base * 2 + 0] = wickLeft;    positions[base * 2 + 1] = wickHighPx
        positions[base * 2 + 2] = wickRight;   positions[base * 2 + 3] = wickHighPx
        positions[base * 2 + 4] = wickRight;   positions[base * 2 + 5] = wickLowPx
        positions[base * 2 + 6] = wickLeft;    positions[base * 2 + 7] = wickHighPx
        positions[base * 2 + 8] = wickRight;   positions[base * 2 + 9] = wickLowPx
        positions[base * 2 + 10] = wickLeft;   positions[base * 2 + 11] = wickLowPx

        for (let j = 0; j < 6; j++) {
          colors[(base + j) * 2 + 0] = wickColor[0]
          colors[(base + j) * 2 + 1] = wickColor[1]
          colors[(base + j) * 2 + 2] = wickColor[2]
          colors[(base + j) * 2 + 3] = wickColor[3]
        }

        const bodyColor = getCol(1.0)
        const bo = base + 6
        positions[bo * 2 + 0] = bodyLeft;    positions[bo * 2 + 1] = bodyTop
        positions[bo * 2 + 2] = bodyRight;   positions[bo * 2 + 3] = bodyTop
        positions[bo * 2 + 4] = bodyRight;   positions[bo * 2 + 5] = bodyBottom
        positions[bo * 2 + 6] = bodyLeft;    positions[bo * 2 + 7] = bodyTop
        positions[bo * 2 + 8] = bodyRight;   positions[bo * 2 + 9] = bodyBottom
        positions[bo * 2 + 10] = bodyLeft;   positions[bo * 2 + 11] = bodyBottom

        for (let j = 0; j < 6; j++) {
          colors[(bo + j) * 2 + 0] = bodyColor[0]
          colors[(bo + j) * 2 + 1] = bodyColor[1]
          colors[(bo + j) * 2 + 2] = bodyColor[2]
          colors[(bo + j) * 2 + 3] = bodyColor[3]
        }

        const volColor = c.isUp
          ? [UP_RGB[0], UP_RGB[1], UP_RGB[2], 0.4]
          : [DOWN_RGB[0], DOWN_RGB[1], DOWN_RGB[2], 0.4]
        const vo = base + 12
        positions[vo * 2 + 0] = volBarLeft;   positions[vo * 2 + 1] = volBarTop
        positions[vo * 2 + 2] = volBarRight;  positions[vo * 2 + 3] = volBarTop
        positions[vo * 2 + 4] = volBarRight;  positions[vo * 2 + 5] = candleAreaBottom
        positions[vo * 2 + 6] = volBarLeft;   positions[vo * 2 + 7] = volBarTop
        positions[vo * 2 + 8] = volBarRight;  positions[vo * 2 + 9] = candleAreaBottom
        positions[vo * 2 + 10] = volBarLeft;  positions[vo * 2 + 11] = candleAreaBottom

        for (let j = 0; j < 6; j++) {
          colors[(vo + j) * 2 + 0] = volColor[0]
          colors[(vo + j) * 2 + 1] = volColor[1]
          colors[(vo + j) * 2 + 2] = volColor[2]
          colors[(vo + j) * 2 + 3] = volColor[3]
        }
      }

      gl.useProgram(this.program)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
      gl.enableVertexAttribArray(this.positionLoc)
      gl.vertexAttribPointer(this.positionLoc, 2, gl.FLOAT, false, 0, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW)
      gl.uniform2f(this.resolutionUniform, width, height)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, totalVerts)
      this.candleCount = count
    } catch {
      console.debug('[WebGLCandleRenderer] render failed, falling back')
    }
  }

  updateColors(candles: WebGLCandle[]): void {
    const gl = this.gl
    if (!gl || !this.program) return

    try {
      const count = candles.length
      const totalVerts = count * 18
      const colors = new Float32Array(totalVerts * 2)

      for (let i = 0; i < count; i++) {
        const c = candles[i]
        const base = i * 18
        const colR = c.r
        const colG = c.g
        const colB = c.b
        const colA = c.a

        const wickColor = [colR, colG, colB, colA * 0.8]
        for (let j = 0; j < 6; j++) {
          colors[(base + j) * 2 + 0] = wickColor[0]
          colors[(base + j) * 2 + 1] = wickColor[1]
          colors[(base + j) * 2 + 2] = wickColor[2]
          colors[(base + j) * 2 + 3] = wickColor[3]
        }

        const bodyColor = [colR, colG, colB, colA]
        const bo = base + 6
        for (let j = 0; j < 6; j++) {
          colors[(bo + j) * 2 + 0] = bodyColor[0]
          colors[(bo + j) * 2 + 1] = bodyColor[1]
          colors[(bo + j) * 2 + 2] = bodyColor[2]
          colors[(bo + j) * 2 + 3] = bodyColor[3]
        }

        const volColor = c.isUp
          ? [UP_RGB[0], UP_RGB[1], UP_RGB[2], 0.4]
          : [DOWN_RGB[0], DOWN_RGB[1], DOWN_RGB[2], 0.4]
        const vo = base + 12
        for (let j = 0; j < 6; j++) {
          colors[(vo + j) * 2 + 0] = volColor[0]
          colors[(vo + j) * 2 + 1] = volColor[1]
          colors[(vo + j) * 2 + 2] = volColor[2]
          colors[(vo + j) * 2 + 3] = volColor[3]
        }
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW)
      gl.uniform2f(this.resolutionUniform, this.canvasWidth, this.canvasHeight)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, totalVerts)
    } catch {
      console.debug('[WebGLCandleRenderer] updateColors failed')
    }
  }

  destroy(): void {
    const gl = this.gl
    if (!gl) return
    if (this.program) gl.deleteProgram(this.program)
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer)
    if (this.colorBuffer) gl.deleteBuffer(this.colorBuffer)
    this.gl = null
    this.program = null
    this.positionBuffer = null
    this.colorBuffer = null
    this.candleCount = 0
  }

  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas')
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  }
}

export function convertCandlesToWebGL(
  candles: CandlestickData[],
  deltas?: DeltaBar[],
  width?: number,
  height?: number
): WebGLCandle[] {
  if (candles.length === 0) return []

  const prices = candles.flatMap((d) => [d.high, d.low, d.open, d.close])
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1

  const maxVolume = Math.max(...candles.map((d) => (d as any).volume ?? 0), 1)

  const deltaMap = new Map<Time, DeltaBar>()
  if (deltas) {
    for (const d of deltas) {
      deltaMap.set(d.time, d)
    }
  }

  return candles.map((candle) => {
    const vol = (candle as any).volume ?? 0
    const isUp = candle.close >= candle.open

    let r: number, g: number, b: number
    const delta = deltaMap.get(candle.time)
    if (delta) {
      const ratio = delta.buyRatio
      if (ratio > 0.65) { r = 0x22 / 255; g = 0xc5 / 255; b = 0x5e / 255 }
      else if (ratio > 0.55) { r = 0x4a / 255; g = 0xde / 255; b = 0x80 / 255 }
      else if (ratio < 0.35) { r = 0xef / 255; g = 0x44 / 255; b = 0x44 / 255 }
      else if (ratio < 0.45) { r = 0xf8 / 255; g = 0x71 / 255; b = 0x71 / 255 }
      else { r = 0x6b / 255; g = 0x72 / 255; b = 0x80 / 255 }
    } else {
      r = isUp ? UP_RGB[0] : DOWN_RGB[0]
      g = isUp ? UP_RGB[1] : DOWN_RGB[1]
      b = isUp ? UP_RGB[2] : DOWN_RGB[2]
    }

    const x = (candle.time as number) / (candles[candles.length - 1].time as number)

    const normHigh = (candle.high - minPrice) / priceRange
    const normLow = (candle.low - minPrice) / priceRange
    const normOpen = (candle.open - minPrice) / priceRange
    const normClose = (candle.close - minPrice) / priceRange

    return {
      x,
      bodyTop: Math.max(normOpen, normClose),
      bodyBottom: Math.min(normOpen, normClose),
      wickHigh: normHigh,
      wickLow: normLow,
      bodyWidth: 0.008,
      wickWidth: 0.003,
      r,
      g,
      b,
      a: isUp ? 1.0 : 1.0,
      volume: vol,
      volumeHeight: vol / maxVolume,
      isUp,
    }
  })
}
