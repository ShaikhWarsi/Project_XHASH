export interface SessionConfig {
  label: string
  open: string
  close: string
  killZoneStart?: string
  killZoneEnd?: string
}

export interface SessionTemplate {
  id: string
  name: string
  description: string
  color: string
  sessions: SessionConfig[]
}

export const DEFAULT_SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: 'asia_london_ny',
    name: 'Asia / London / NY',
    description: 'Standard 3-session overlay with kill zones',
    color: '#3b82f6',
    sessions: [
      { label: 'Asia', open: '00:00', close: '09:00', killZoneStart: '02:00', killZoneEnd: '04:00' },
      { label: 'London', open: '08:00', close: '16:30', killZoneStart: '09:30', killZoneEnd: '10:30' },
      { label: 'NY', open: '13:30', close: '22:00', killZoneStart: '14:30', killZoneEnd: '15:30' },
    ],
  },
  {
    id: 'forex_3sessions',
    name: 'Forex 3-Session',
    description: 'Tokyo / London / New York',
    color: '#22c55e',
    sessions: [
      { label: 'Tokyo', open: '00:00', close: '09:00', killZoneStart: '03:00', killZoneEnd: '04:00' },
      { label: 'London', open: '08:00', close: '17:00', killZoneStart: '10:00', killZoneEnd: '11:00' },
      { label: 'NY', open: '13:00', close: '22:00', killZoneStart: '15:00', killZoneEnd: '16:00' },
    ],
  },
  {
    id: 'us_market',
    name: 'US Market',
    description: 'Pre-market / RTH / After-hours',
    color: '#a855f7',
    sessions: [
      { label: 'Pre-Market', open: '04:00', close: '09:30' },
      { label: 'RTH', open: '09:30', close: '16:00', killZoneStart: '09:30', killZoneEnd: '10:30' },
      { label: 'After-Hours', open: '16:00', close: '20:00' },
    ],
  },
  {
    id: 'crypto_24h',
    name: 'Crypto 24h',
    description: 'Binance daily session boundaries',
    color: '#f59e0b',
    sessions: [
      { label: 'Day', open: '00:00', close: '08:00' },
      { label: 'Europe', open: '08:00', close: '16:00', killZoneStart: '14:00', killZoneEnd: '16:00' },
      { label: 'US', open: '16:00', close: '24:00', killZoneStart: '16:00', killZoneEnd: '18:00' },
    ],
  },
]
