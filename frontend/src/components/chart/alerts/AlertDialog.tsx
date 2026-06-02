import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChartAlertSystem } from './ChartAlertSystem'

interface AlertDialogProps {
  open: boolean
  onClose: () => void
  alertSystem: ChartAlertSystem
  symbol: string
  initialPrice?: number
  initialType?: 'above' | 'below' | 'cross'
}

type AlertTypeOption = 'price_above' | 'price_below' | 'price_cross'

const ALERT_TYPE_LABELS: Record<AlertTypeOption, string> = {
  price_above: 'Price Above',
  price_below: 'Price Below',
  price_cross: 'Price Cross',
}

export function AlertDialog({ open, onClose, alertSystem, symbol, initialPrice, initialType }: AlertDialogProps) {
  const [alertType, setAlertType] = useState<AlertTypeOption>(
    initialType ? `price_${initialType}` as AlertTypeOption : 'price_above'
  )
  const [price, setPrice] = useState(initialPrice?.toString() ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const priceRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setAlertType(initialType ? `price_${initialType}` as AlertTypeOption : 'price_above')
      setPrice(initialPrice?.toString() ?? '')
      setNote('')
      setError('')
      setTimeout(() => priceRef.current?.focus(), 100)
    }
  }, [open, initialPrice, initialType])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTypeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleCreate = useCallback(() => {
    const priceNum = parseFloat(price)
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be a valid positive number')
      return
    }

    const type = alertType === 'price_above' ? 'above'
      : alertType === 'price_below' ? 'below'
      : 'cross'

    const alert = alertSystem.createPriceAlert(symbol, priceNum, type)
    if (note.trim()) {
      alert.note = note.trim()
    }
    alertSystem.saveToStorage()
    onClose()
  }, [alertType, price, note, alertSystem, symbol, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && !e.shiftKey) handleCreate()
  }, [onClose, handleCreate])

  if (!open) return null

  const typeOptions: AlertTypeOption[] = ['price_above', 'price_below', 'price_cross']

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
        }}
        onClick={onClose}
      />

      <div
        style={{
          position: 'relative',
          background: '#0d1117',
          border: '1px solid #1a2332',
          borderRadius: 8,
          padding: '20px 24px',
          width: 320,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 'bold', color: '#e8eaed', marginBottom: 16 }}>
          Create Alert — {symbol}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#5d6b7e', marginBottom: 4 }}>ALERT TYPE</div>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: '#0a0e14',
                border: '1px solid #1a2332',
                borderRadius: 4,
                color: '#e8eaed',
                fontSize: 11,
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{ALERT_TYPE_LABELS[alertType]}</span>
              <span style={{ color: '#5d6b7e' }}>▾</span>
            </button>
            {showTypeDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#0a0e14',
                  border: '1px solid #1a2332',
                  borderRadius: 4,
                  zIndex: 10,
                  marginTop: 2,
                }}
              >
                {typeOptions.map((opt) => (
                  <div
                    key={opt}
                    onClick={() => { setAlertType(opt); setShowTypeDropdown(false) }}
                    style={{
                      padding: '8px 10px',
                      cursor: 'pointer',
                      color: opt === alertType ? '#3b82f6' : '#e8eaed',
                      fontSize: 11,
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#1a2332')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {ALERT_TYPE_LABELS[opt]}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#5d6b7e', marginBottom: 4 }}>PRICE</div>
          <input
            ref={priceRef}
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => { setPrice(e.target.value); setError('') }}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: '#0a0e14',
              border: `1px solid ${error ? '#ef5350' : '#1a2332'}`,
              borderRadius: 4,
              color: '#e8eaed',
              fontSize: 13,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <div style={{ color: '#ef5350', fontSize: 10, marginTop: 4 }}>{error}</div>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#5d6b7e', marginBottom: 4 }}>NOTE (optional)</div>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Resistance breakout"
            style={{
              width: '100%',
              padding: '8px 10px',
              background: '#0a0e14',
              border: '1px solid #1a2332',
              borderRadius: 4,
              color: '#e8eaed',
              fontSize: 11,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #1a2332',
              borderRadius: 4,
              color: '#5d6b7e',
              fontSize: 11,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              fontSize: 11,
              fontFamily: 'inherit',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
