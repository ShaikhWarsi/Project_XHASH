import type { DrawingTool } from './DrawingTool'
import type { CoordMapper } from '../CoordMapper'

export interface SupportResistanceLevel {
  id: string
  price: number
  type: 'support' | 'resistance' | 'trendline'
  sourceDrawingId: string
  sourceType: string
  strength: number
  color: string
  label: string
}

export class LevelsManager {
  private levels: SupportResistanceLevel[] = []
  private onChanged: (() => void) | null = null

  setOnChanged(cb: (() => void) | null) { this.onChanged = cb }

  getLevels(): SupportResistanceLevel[] {
    return [...this.levels]
  }

  detectLevelsFromDrawings(drawings: DrawingTool[], mapper: CoordMapper): void {
    const newLevels: SupportResistanceLevel[] = []
    let idCounter = 0

    for (const drawing of drawings) {
      if (!drawing.visible) continue
      const type = drawing.type

      if (type === 'horizontal_line') {
        const data = drawing.toJSON()
        if (data.points.length < 1) continue
        const price = data.points[0].price
        if (price == null) continue
        newLevels.push({
          id: `level_${idCounter++}`,
          price: price as number,
          type: data.points[0].time ? 'resistance' : 'support',
          sourceDrawingId: drawing.id,
          sourceType: type,
          strength: this.calculateStrength(price as number, drawings),
          color: '#3b82f6',
          label: `H-Line ${(price as number).toFixed(2)}`,
        })
      }

      if (type === 'trendline') {
        const data = drawing.toJSON()
        if (data.points.length < 2) continue
        const p1 = data.points[0]
        const p2 = data.points[1]
        if (p1.price == null || p2.price == null) continue

        const slope = ((p2.price as number) - (p1.price as number)) /
          ((p2.time as number) - (p1.time as number) || 1)

        const isResistance = slope < 0
        const price = p2.price as number
        newLevels.push({
          id: `level_${idCounter++}`,
          price,
          type: isResistance ? 'resistance' : 'support',
          sourceDrawingId: drawing.id,
          sourceType: type,
          strength: this.calculateStrength(price, drawings),
          color: isResistance ? '#ef5350' : '#26a69a',
          label: `${isResistance ? 'Resistance' : 'Support'} ${price.toFixed(2)} (slope: ${slope.toFixed(6)})`,
        })
      }

      if (type === 'channel') {
        const data = drawing.toJSON()
        if (data.points.length < 2) continue
        for (const pt of data.points) {
          if (pt.price == null) continue
          newLevels.push({
            id: `level_${idCounter++}`,
            price: pt.price as number,
            type: 'support',
            sourceDrawingId: drawing.id,
            sourceType: type,
            strength: 0.5,
            color: '#8b5cf6',
            label: `Channel ${(pt.price as number).toFixed(2)}`,
          })
        }
      }
    }

    this.levels = newLevels
    this.onChanged?.()
  }

  private calculateStrength(price: number, drawings: DrawingTool[]): number {
    let touches = 0
    for (const drawing of drawings) {
      if (!drawing.visible) continue
      const data = drawing.toJSON()
      for (const pt of data.points) {
        if (pt.price == null) continue
        const diff = Math.abs((pt.price as number) - price)
        if (diff / price < 0.01) {
          touches++
        }
      }
    }
    return Math.min(touches / 5, 1)
  }

  addLevel(price: number, type: 'support' | 'resistance', sourceDrawingId: string, label: string): SupportResistanceLevel {
    const level: SupportResistanceLevel = {
      id: `level_manual_${Date.now()}`,
      price,
      type,
      sourceDrawingId,
      sourceType: 'manual',
      strength: 0.8,
      color: type === 'resistance' ? '#ef5350' : '#26a69a',
      label,
    }
    this.levels.push(level)
    this.onChanged?.()
    return level
  }

  removeLevel(id: string): void {
    this.levels = this.levels.filter((l) => l.id !== id)
    this.onChanged?.()
  }

  clear(): void {
    this.levels = []
    this.onChanged?.()
  }

  destroy(): void {
    this.levels = []
    this.onChanged = null
  }
}
