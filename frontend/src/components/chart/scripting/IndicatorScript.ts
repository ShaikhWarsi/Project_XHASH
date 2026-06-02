import type { CandlestickData, Time } from 'lightweight-charts'

export interface ScriptIndicator {
  name: string
  description: string
  inputs: ScriptInput[]
  formula: string
  style: 'line' | 'histogram' | 'overlay'
  color: string
}

export interface ScriptInput {
  name: string
  type: 'number' | 'select'
  default: number | string
  options?: string[]
}

type NumericArray = number[]

type TokenType = 'NUMBER' | 'STRING' | 'IDENTIFIER' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'OPERATOR' | 'EOF'

interface Token {
  type: TokenType
  value: string
  numberValue?: number
}

type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'identifier'; name: string }
  | { type: 'call'; name: string; args: ASTNode[] }
  | { type: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; op: string; operand: ASTNode }

function sma(data: NumericArray, period: number): NumericArray {
  const result: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
      continue
    }
    let sum = 0
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j]
    }
    result.push(sum / period)
  }
  return result
}

function ema(data: NumericArray, period: number): NumericArray {
  const result: NumericArray = []
  const k = 2 / (period + 1)
  let prevEma = NaN

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i])
      prevEma = data[i]
    } else {
      const val = data[i] * k + prevEma * (1 - k)
      result.push(val)
      prevEma = val
    }
  }
  return result
}

function rsi(data: NumericArray, period: number): NumericArray {
  const result: NumericArray = []
  if (data.length < 2) return data.map(() => NaN)

  let gain = 0
  let loss = 0

  for (let i = 1; i <= period; i++) {
    const diff = data[i] - data[i - 1]
    if (diff > 0) gain += diff
    else loss -= diff
  }

  let avgGain = gain / period
  let avgLoss = loss / period

  result.push(NaN)
  for (let i = 1; i <= period; i++) result.push(NaN)

  if (avgLoss === 0) {
    result.push(100)
  } else {
    const rs = avgGain / avgLoss
    result.push(100 - 100 / (1 + rs))
  }

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1]
    gain = diff > 0 ? diff : 0
    loss = diff < 0 ? -diff : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    if (avgLoss === 0) {
      result.push(100)
    } else {
      const rs = avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    }
  }

  return result
}

function macd(
  data: NumericArray,
  fast: number,
  slow: number,
  signal: number,
): NumericArray {
  const fastEma = ema(data, fast)
  const slowEma = ema(data, slow)

  const macdLine: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (isNaN(fastEma[i]) || isNaN(slowEma[i])) {
      macdLine.push(NaN)
    } else {
      macdLine.push(fastEma[i] - slowEma[i])
    }
  }

  const signalLine = ema(macdLine, signal)
  const histogram: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN)
    } else {
      histogram.push(macdLine[i] - signalLine[i])
    }
  }

  return histogram
}

function bollinger(data: NumericArray, period: number, stdDev: number): NumericArray {
  const mid = sma(data, period)
  const result: NumericArray = []

  for (let i = 0; i < data.length; i++) {
    if (isNaN(mid[i])) {
      result.push(NaN)
      continue
    }

    let sumSq = 0
    let count = 0
    for (let j = Math.max(0, i - period + 1); j <= i; j++) {
      sumSq += (data[j] - mid[i]) ** 2
      count++
    }
    const std = Math.sqrt(sumSq / count)
    result.push(mid[i] + stdDev * std)
  }

  return result
}

function atr(data: CandlestickData[], period: number): NumericArray {
  const tr: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low)
    } else {
      const hl = data[i].high - data[i].low
      const hc = Math.abs(data[i].high - data[i - 1].close)
      const lc = Math.abs(data[i].low - data[i - 1].close)
      tr.push(Math.max(hl, hc, lc))
    }
  }
  return ema(tr, period)
}

function highest(data: NumericArray, period: number): NumericArray {
  const result: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
      continue
    }
    let max = -Infinity
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] > max) max = data[j]
    }
    result.push(max)
  }
  return result
}

function lowest(data: NumericArray, period: number): NumericArray {
  const result: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
      continue
    }
    let min = Infinity
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] < min) min = data[j]
    }
    result.push(min)
  }
  return result
}

function crossOver(data: NumericArray, other: NumericArray): NumericArray {
  const result: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(0)
    } else {
      result.push(data[i] > other[i] && data[i - 1] <= other[i - 1] ? 1 : 0)
    }
  }
  return result
}

function crossUnder(data: NumericArray, other: NumericArray): NumericArray {
  const result: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(0)
    } else {
      result.push(data[i] < other[i] && data[i - 1] >= other[i - 1] ? 1 : 0)
    }
  }
  return result
}

function cross(data: NumericArray, other: NumericArray): NumericArray {
  const result: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(0)
    } else {
      const d1 = data[i] - other[i]
      const d0 = data[i - 1] - other[i - 1]
      result.push((d1 > 0 && d0 <= 0) || (d1 < 0 && d0 >= 0) ? 1 : 0)
    }
  }
  return result
}

function abs(data: NumericArray): NumericArray {
  return data.map((v) => Math.abs(v))
}

function min(data: NumericArray): NumericArray {
  return data.map((v) => Math.min(v, 0))
}

function max(data: NumericArray): NumericArray {
  return data.map((v) => Math.max(v, 0))
}

function sum(data: NumericArray, period: number): NumericArray {
  const result: NumericArray = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN)
      continue
    }
    let s = 0
    for (let j = i - period + 1; j <= i; j++) {
      s += data[j]
    }
    result.push(s)
  }
  return result
}

export class IndicatorScriptEngine {
  private functions: Map<string, (...args: any[]) => NumericArray> = new Map()

  constructor() {
    this.registerBuiltins()
  }

  private registerBuiltins(): void {
    this.functions.set('SMA', sma)
    this.functions.set('EMA', ema)
    this.functions.set('RSI', rsi)
    this.functions.set('MACD', macd)
    this.functions.set('BOLLINGER', bollinger)
    this.functions.set('ATR', atr)
    this.functions.set('HIGHEST', highest)
    this.functions.set('LOWEST', lowest)
    this.functions.set('CROSS', cross)
    this.functions.set('CROSSOVER', crossOver)
    this.functions.set('CROSSUNDER', crossUnder)
    this.functions.set('ABS', abs)
    this.functions.set('MIN', min)
    this.functions.set('MAX', max)
    this.functions.set('SUM', sum)
  }

  evaluate(
    script: string,
    data: CandlestickData[],
    inputs?: Record<string, number>,
  ): { values: number[]; errors?: string[] } {
    const errors: string[] = []

    try {
      const tokens = this.tokenize(script)
      const ast = this.parse(tokens)
      const resolvedInputs: Record<string, number> = { ...inputs }

      const result: number[] = []
      this.evaluateAST(ast, data, resolvedInputs, result, errors)

      if (errors.length > 0) {
        return { values: [], errors }
      }

      return { values: result }
    } catch (e) {
      return {
        values: [],
        errors: [(e as Error).message || 'Unknown error during evaluation'],
      }
    }
  }

  tokenize(expr: string): Token[] {
    const tokens: Token[] = []
    let i = 0

    while (i < expr.length) {
      const ch = expr[i]

      if (/\s/.test(ch)) {
        i++
        continue
      }

      if (ch >= '0' && ch <= '9' || ch === '.' && i + 1 < expr.length && expr[i + 1] >= '0' && expr[i + 1] <= '9') {
        let num = ''
        while (i < expr.length && (expr[i] >= '0' && expr[i] <= '9' || expr[i] === '.')) {
          num += expr[i]
          i++
        }
        tokens.push({ type: 'NUMBER', value: num, numberValue: parseFloat(num) })
        continue
      }

      if (ch === '"' || ch === "'") {
        const quote = ch
        i++
        let str = ''
        while (i < expr.length && expr[i] !== quote) {
          str += expr[i]
          i++
        }
        if (i < expr.length) i++
        tokens.push({ type: 'STRING', value: str })
        continue
      }

      if (ch >= 'a' && ch <= 'z' || ch >= 'A' && ch <= 'Z' || ch === '_') {
        let id = ''
        while (i < expr.length && (expr[i] >= 'a' && expr[i] <= 'z' || expr[i] >= 'A' && expr[i] <= 'Z' || expr[i] >= '0' && expr[i] <= '9' || expr[i] === '_')) {
          id += expr[i]
          i++
        }
        tokens.push({ type: 'IDENTIFIER', value: id })
        continue
      }

      if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue }
      if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue }
      if (ch === ',') { tokens.push({ type: 'COMMA', value: ',' }); i++; continue }

      if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
        tokens.push({ type: 'OPERATOR', value: ch })
        i++
        continue
      }

      throw new Error(`Unexpected character: '${ch}' at position ${i}`)
    }

    tokens.push({ type: 'EOF', value: '' })
    return tokens
  }

  parse(tokens: Token[]): ASTNode {
    let pos = 0

    const peek = (): Token => tokens[pos] || { type: 'EOF', value: '' }
    const consume = (): Token => tokens[pos++] || { type: 'EOF', value: '' }
    const expect = (type: TokenType): Token => {
      const token = peek()
      if (token.type !== type) {
        throw new Error(`Expected ${type} but got ${token.type} ('${token.value}')`)
      }
      return consume()
    }

    const parsePrimary = (): ASTNode => {
      const token = peek()

      if (token.type === 'NUMBER') {
        consume()
        return { type: 'number', value: token.numberValue! }
      }

      if (token.type === 'IDENTIFIER') {
        const name = token.value
        consume()

        if (peek().type === 'LPAREN') {
          consume()
          const args: ASTNode[] = []
          while (peek().type !== 'RPAREN') {
            args.push(parseExpr())
            if (peek().type === 'COMMA') consume()
          }
          expect('RPAREN')
          return { type: 'call', name, args }
        }

        return { type: 'identifier', name }
      }

      if (token.type === 'LPAREN') {
        consume()
        const node = parseExpr()
        expect('RPAREN')
        return node
      }

      if (token.type === 'OPERATOR' && (token.value === '-' || token.value === '+')) {
        const op = consume().value
        const operand = parsePrimary()
        return { type: 'unary', op, operand }
      }

      throw new Error(`Unexpected token: ${token.type} ('${token.value}')`)
    }

    const parseMultiplicative = (): ASTNode => {
      let left = parsePrimary()
      while (peek().type === 'OPERATOR' && (peek().value === '*' || peek().value === '/')) {
        const op = consume().value
        const right = parsePrimary()
        left = { type: 'binary', op, left, right }
      }
      return left
    }

    const parseExpr = (): ASTNode => {
      let left = parseMultiplicative()
      while (peek().type === 'OPERATOR' && (peek().value === '+' || peek().value === '-')) {
        const op = consume().value
        const right = parseMultiplicative()
        left = { type: 'binary', op, left, right }
      }
      return left
    }

    const result = parseExpr()

    if (peek().type !== 'EOF') {
      throw new Error(`Unexpected token after expression: ${peek().type} ('${peek().value}')`)
    }

    return result
  }

  evaluateAST(
    node: ASTNode,
    data: CandlestickData[],
    inputs: Record<string, number>,
    output: number[],
    errors: string[],
  ): void {
    switch (node.type) {
      case 'number': {
        const val = node.value
        if (output.length === 0) {
          for (let i = 0; i < data.length; i++) output.push(val)
        } else {
          for (let i = 0; i < output.length; i++) output[i] = val
        }
        break
      }

      case 'identifier': {
        if (node.name === 'close') {
          if (output.length === 0) {
            for (const d of data) output.push(d.close)
          } else {
            for (let i = 0; i < output.length; i++) output[i] = data[i].close
          }
        } else if (node.name === 'open') {
          if (output.length === 0) {
            for (const d of data) output.push(d.open)
          } else {
            for (let i = 0; i < output.length; i++) output[i] = data[i].open
          }
        } else if (node.name === 'high') {
          if (output.length === 0) {
            for (const d of data) output.push(d.high)
          } else {
            for (let i = 0; i < output.length; i++) output[i] = data[i].high
          }
        } else if (node.name === 'low') {
          if (output.length === 0) {
            for (const d of data) output.push(d.low)
          } else {
            for (let i = 0; i < output.length; i++) output[i] = data[i].low
          }
        } else if (node.name === 'volume') {
          if (output.length === 0) {
            for (const d of data) output.push((d as any).volume ?? 0)
          } else {
            for (let i = 0; i < output.length; i++) output[i] = (data[i] as any).volume ?? 0
          }
        } else if (node.name in inputs) {
          const val = inputs[node.name]
          if (output.length === 0) {
            for (let i = 0; i < data.length; i++) output.push(val)
          } else {
            for (let i = 0; i < output.length; i++) output[i] = val
          }
        } else {
          errors.push(`Unknown identifier: ${node.name}`)
        }
        break
      }

      case 'call': {
        const func = this.functions.get(node.name)
        if (!func) {
          errors.push(`Unknown function: ${node.name}`)
          return
        }

        const argOutputs: NumericArray[] = []
        for (const arg of node.args) {
          const argResult: number[] = []
          this.evaluateAST(arg, data, inputs, argResult, errors)
          if (errors.length > 0) return
          argOutputs.push(argResult)
        }

        const isPeriodFunc = ['SMA', 'EMA', 'RSI', 'HIGHEST', 'LOWEST', 'SUM', 'BOLLINGER'].includes(node.name)
        const isATR = node.name === 'ATR'
        const isMACD = node.name === 'MACD'

        if (isATR) {
          const period = argOutputs[0]?.[0] ?? 14
          const result = func(data, period)
          if (output.length === 0) {
            for (const v of result) output.push(v)
          } else {
            for (let i = 0; i < Math.min(output.length, result.length); i++) output[i] = result[i]
          }
        } else if (isMACD) {
          const series = argOutputs[0]
          const fast = argOutputs[1]?.[0] ?? 12
          const slow = argOutputs[2]?.[0] ?? 26
          const sigPeriod = argOutputs[3]?.[0] ?? 9
          const result = func(series, fast, slow, sigPeriod)
          if (output.length === 0) {
            for (const v of result) output.push(v)
          } else {
            for (let i = 0; i < Math.min(output.length, result.length); i++) output[i] = result[i]
          }
        } else if (isPeriodFunc) {
          const series = argOutputs[0]
          const period = argOutputs[1]?.[0] ?? 14
          const extra = argOutputs[2]?.[0]
          const result = extra != null ? func(series, period, extra) : func(series, period)
          if (output.length === 0) {
            for (const v of result) output.push(v)
          } else {
            for (let i = 0; i < Math.min(output.length, result.length); i++) output[i] = result[i]
          }
        } else if (node.name === 'CROSS' || node.name === 'CROSSOVER' || node.name === 'CROSSUNDER') {
          const series1 = argOutputs[0]
          const series2 = argOutputs[1]
          const result = func(series1, series2)
          if (output.length === 0) {
            for (const v of result) output.push(v)
          } else {
            for (let i = 0; i < Math.min(output.length, result.length); i++) output[i] = result[i]
          }
        } else if (['ABS', 'MIN', 'MAX'].includes(node.name)) {
          const series = argOutputs[0]
          const result = func(series)
          if (output.length === 0) {
            for (const v of result) output.push(v)
          } else {
            for (let i = 0; i < Math.min(output.length, result.length); i++) output[i] = result[i]
          }
        } else {
          const result = func(...argOutputs)
          if (output.length === 0) {
            for (const v of result) output.push(v)
          } else {
            for (let i = 0; i < Math.min(output.length, result.length); i++) output[i] = result[i]
          }
        }
        break
      }

      case 'binary': {
        const left: number[] = []
        const right: number[] = []
        this.evaluateAST(node.left, data, inputs, left, errors)
        this.evaluateAST(node.right, data, inputs, right, errors)
        if (errors.length > 0) return

        const len = Math.max(left.length, right.length)
        if (output.length === 0) {
          for (let i = 0; i < len; i++) {
            const l = left[i] ?? left[left.length - 1] ?? 0
            const r = right[i] ?? right[right.length - 1] ?? 0
            switch (node.op) {
              case '+': output.push(l + r); break
              case '-': output.push(l - r); break
              case '*': output.push(l * r); break
              case '/': output.push(r !== 0 ? l / r : NaN); break
            }
          }
        } else {
          for (let i = 0; i < output.length; i++) {
            const l = left[i] ?? left[left.length - 1] ?? 0
            const r = right[i] ?? right[right.length - 1] ?? 0
            switch (node.op) {
              case '+': output[i] = l + r; break
              case '-': output[i] = l - r; break
              case '*': output[i] = l * r; break
              case '/': output[i] = r !== 0 ? l / r : NaN; break
            }
          }
        }
        break
      }

      case 'unary': {
        const operand: number[] = []
        this.evaluateAST(node.operand, data, inputs, operand, errors)
        if (output.length === 0) {
          for (const v of operand) {
            output.push(node.op === '-' ? -v : v)
          }
        } else {
          for (let i = 0; i < output.length; i++) {
            output[i] = node.op === '-' ? -(operand[i] ?? 0) : (operand[i] ?? 0)
          }
        }
        break
      }
    }
  }
}

export const SCRIPT_PRESETS: ScriptIndicator[] = [
  {
    name: 'MACD Histogram',
    description: 'MACD line minus signal line',
    formula: 'MACD(close, 12, 26, 9)',
    style: 'histogram',
    color: '#3b82f6',
    inputs: [
      { name: 'fast', type: 'number', default: 12 },
      { name: 'slow', type: 'number', default: 26 },
      { name: 'signal', type: 'number', default: 9 },
    ],
  },
  {
    name: 'Price Oscillator',
    description: 'Fast SMA minus Slow SMA',
    formula: 'SMA(close, fastPeriod) - SMA(close, slowPeriod)',
    style: 'histogram',
    color: '#a855f7',
    inputs: [
      { name: 'fastPeriod', type: 'number', default: 10 },
      { name: 'slowPeriod', type: 'number', default: 30 },
    ],
  },
  {
    name: 'RSI Divergence',
    description: 'RSI(14) - SMA(RSI(14), 5)',
    formula: 'RSI(close, 14) - SMA(RSI(close, 14), 5)',
    style: 'histogram',
    color: '#f97316',
    inputs: [],
  },
  {
    name: 'Bollinger Width',
    description: '(Upper - Lower) / Middle * 100',
    formula: 'BOLLINGER(close, 20, 2) - BOLLINGER(close, 20, -2)',
    style: 'line',
    color: '#10b981',
    inputs: [
      { name: 'period', type: 'number', default: 20 },
      { name: 'stdDev', type: 'number', default: 2 },
    ],
  },
  {
    name: 'ATR Trailing',
    description: 'ATR(14) as volatility measure',
    formula: 'ATR(close, 14)',
    style: 'line',
    color: '#ffd54f',
    inputs: [
      { name: 'period', type: 'number', default: 14 },
    ],
  },
]
