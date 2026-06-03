import React, { useEffect, useRef, useState } from 'react'

const POPULAR_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY', 'QQQ', 'BTC/USD', 'ETH/USD']

interface SymbolSearchProps {
  onSelect: (symbol: string) => void
  onClose: () => void
}

export function SymbolSearch({ onSelect, onClose }: SymbolSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = query
    ? POPULAR_SYMBOLS.filter((s) => s.toLowerCase().includes(query.toLowerCase()))
    : POPULAR_SYMBOLS

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) {
        onSelect(filtered[0])
      }
    }
  }

  const handleSelect = (symbol: string) => {
    onSelect(symbol)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: '280px',
        background: 'rgba(7,11,17,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid #3b82f6',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        fontFamily: "'JetBrains Mono', monospace",
        overflow: 'hidden',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder="Search symbols..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid #1a2744',
          color: '#e2e8f0',
          fontSize: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
        {filtered.map((symbol) => (
          <div
            key={symbol}
            onClick={() => handleSelect(symbol)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', symbol)
              e.dataTransfer.setData('application/x-symbol', JSON.stringify({ symbol }))
              e.dataTransfer.effectAllowed = 'copy'
            }}
            style={{
              padding: '6px 12px',
              cursor: 'grab',
              color: '#e2e8f0',
              fontSize: '10px',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(26,39,68,0.5)',
              transition: 'background 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span>{symbol}</span>
            <span
              style={{
                fontSize: '8px',
                color: '#8892a6',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {symbol.includes('/') ? 'Crypto' : 'Stock'}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              padding: '12px',
              color: '#8892a6',
              fontSize: '10px',
              textAlign: 'center',
            }}
          >
            No symbols found
          </div>
        )}
      </div>
    </div>
  )
}
