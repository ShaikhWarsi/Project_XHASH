import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/Skeleton'
import { useToastStore } from '../store/toast'
import { api } from '../api/client'
import {
  Play, Terminal, Send, Clock, Wifi, History, ChevronDown, ChevronRight,
  Copy, Trash2, RefreshCw, Code, BookOpen, Search, X, Loader, Download,
  Upload, FileText, Link, Server, Globe, Shield, Zap, ChevronLeft,
  ExternalLink, Filter, Settings, Check, AlertTriangle, Info, Layers,
  Minimize2, Maximize2, Hash, Quote, Braces, Brackets, Eye, EyeOff,
  Scissors, Share2, HelpCircle, Plus, Minus, ToggleLeft, ToggleRight,
  Bookmark, Star, Sliders, Grid3X3, FolderOpen, Save, List, Plug,
} from 'lucide-react'

interface ApiEndpoint {
  path: string
  method: string
  category: string
  description: string
  params: Record<string, string>
}

interface Broker {
  id: string
  name: string
  type: string
}

interface HistoryEntry {
  id: string
  method: string
  url: string
  body: string
  timestamp: number
  status?: number
  timeMs?: number
}

interface WsMessage {
  id: string
  direction: 'sent' | 'received'
  content: string
  timestamp: number
}

interface SymbolResult {
  symbol: string
  name: string
  exchange: string
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Orders: <Layers size={10} />,
  Data: <FileText size={10} />,
  Quotes: <Quote size={10} />,
  Historical: <Clock size={10} />,
  Options: <Braces size={10} />,
  GTT: <Clock size={10} />,
  'Advanced Orders': <Zap size={10} />,
  Panic: <AlertTriangle size={10} />,
}

const CATEGORY_COLORS: Record<string, string> = {
  Orders: 'var(--accent-cyan)',
  Data: 'var(--accent-blue)',
  Quotes: 'var(--accent-green)',
  Historical: 'var(--accent-yellow)',
  Options: 'var(--accent-purple)',
  GTT: 'var(--accent-orange)',
  'Advanced Orders': 'var(--accent-pink)',
  Panic: 'var(--accent-red)',
}

const TEMPLATES: Record<string, { method: string; url: string; body: string }> = {
  'Place Market Order (BUY)': {
    method: 'POST',
    url: '/api/v1/placeorder',
    body: JSON.stringify({ apikey: '{{API_KEY}}', strategy: 'playground', symbol: 'RELIANCE', exchange: 'NSE', action: 'BUY', quantity: 10, pricetype: 'MARKET', product: 'MIS' }, null, 2),
  },
  'Place Market Order (SELL)': {
    method: 'POST',
    url: '/api/v1/placeorder',
    body: JSON.stringify({ apikey: '{{API_KEY}}', strategy: 'playground', symbol: 'TCS', exchange: 'NSE', action: 'SELL', quantity: 5, pricetype: 'MARKET', product: 'MIS' }, null, 2),
  },
  'Place Limit Order': {
    method: 'POST',
    url: '/api/v1/placeorder',
    body: JSON.stringify({ apikey: '{{API_KEY}}', strategy: 'playground', symbol: 'HDFCBANK', exchange: 'NSE', action: 'BUY', quantity: 10, pricetype: 'LIMIT', product: 'CNC', price: 1650.0 }, null, 2),
  },
  'Cancel Order': {
    method: 'POST',
    url: '/api/v1/cancelorder',
    body: JSON.stringify({ apikey: '{{API_KEY}}', order_id: 'ORDER12345' }, null, 2),
  },
  'Modify Order': {
    method: 'POST',
    url: '/api/v1/modifyorder',
    body: JSON.stringify({ apikey: '{{API_KEY}}', order_id: 'ORDER12345', symbol: 'RELIANCE', exchange: 'NSE', quantity: 15, price: 2500.0, pricetype: 'LIMIT' }, null, 2),
  },
  'Get Orderbook': {
    method: 'POST',
    url: '/api/v1/orderbook',
    body: JSON.stringify({ apikey: '{{API_KEY}}' }, null, 2),
  },
  'Get Positions': {
    method: 'POST',
    url: '/api/v1/positionbook',
    body: JSON.stringify({ apikey: '{{API_KEY}}' }, null, 2),
  },
  'Get Holdings': {
    method: 'POST',
    url: '/api/v1/holdings',
    body: JSON.stringify({ apikey: '{{API_KEY}}' }, null, 2),
  },
  'Get Funds': {
    method: 'POST',
    url: '/api/v1/funds',
    body: JSON.stringify({ apikey: '{{API_KEY}}' }, null, 2),
  },
  'Get Tradebook': {
    method: 'POST',
    url: '/api/v1/tradebook',
    body: JSON.stringify({ apikey: '{{API_KEY}}' }, null, 2),
  },
  'Get Quote': {
    method: 'POST',
    url: '/api/v1/quote',
    body: JSON.stringify({ apikey: '{{API_KEY}}', symbol: 'RELIANCE', exchange: 'NSE' }, null, 2),
  },
  'Get Multi Quotes': {
    method: 'POST',
    url: '/api/v1/multiquotes',
    body: JSON.stringify({ apikey: '{{API_KEY}}', symbols: 'RELIANCE,TCS,HDFCBANK', exchange: 'NSE' }, null, 2),
  },
  'Get Historical Data': {
    method: 'POST',
    url: '/api/v1/historical',
    body: JSON.stringify({ apikey: '{{API_KEY}}', symbol: 'RELIANCE', exchange: 'NSE', interval: '1d', from_date: '2025-01-01', to_date: '2025-12-31' }, null, 2),
  },
  'Get Option Chain': {
    method: 'POST',
    url: '/api/v1/optionchain',
    body: JSON.stringify({ apikey: '{{API_KEY}}', symbol: 'NIFTY', exchange: 'NFO', expiry: '2025-06-26' }, null, 2),
  },
  'Get Option Greeks': {
    method: 'POST',
    url: '/api/v1/optiongreeks',
    body: JSON.stringify({ apikey: '{{API_KEY}}', symbol: 'NIFTY', exchange: 'NFO', expiry: '2025-06-26', strike: 23500, option_type: 'CE', underlying_price: 23450 }, null, 2),
  },
  'Place GTT Order': {
    method: 'POST',
    url: '/openalgo/gtt/place',
    body: JSON.stringify({ apikey: '{{API_KEY}}', strategy: 'playground', trigger_type: 'SINGLE', exchange: 'NSE', symbol: 'RELIANCE', action: 'BUY', product: 'CNC', quantity: 10, price: 2450.0 }, null, 2),
  },
  'Modify GTT Order': {
    method: 'POST',
    url: '/openalgo/gtt/modify',
    body: JSON.stringify({ apikey: '{{API_KEY}}', trigger_id: 'GTT123', strategy: 'playground', trigger_type: 'SINGLE', exchange: 'NSE', symbol: 'RELIANCE', action: 'BUY', product: 'CNC', quantity: 15, price: 2500.0 }, null, 2),
  },
  'Cancel GTT Order': {
    method: 'POST',
    url: '/openalgo/gtt/cancel',
    body: JSON.stringify({ apikey: '{{API_KEY}}', trigger_id: 'GTT123' }, null, 2),
  },
  'GTT Orderbook': {
    method: 'POST',
    url: '/openalgo/gtt/orderbook',
    body: JSON.stringify({ apikey: '{{API_KEY}}' }, null, 2),
  },
  'Split Order': {
    method: 'POST',
    url: '/api/v1/split-order',
    body: JSON.stringify({ apikey: '{{API_KEY}}', symbol: 'RELIANCE', exchange: 'NSE', action: 'BUY', quantity: 100, splitsize: 10, pricetype: 'MARKET', product: 'MIS' }, null, 2),
  },
  'Smart Order': {
    method: 'POST',
    url: '/api/v1/smart-order',
    body: JSON.stringify({ apikey: '{{API_KEY}}', symbol: 'RELIANCE', exchange: 'NSE', action: 'BUY', quantity: 50, pricetype: 'MARKET', product: 'MIS', squareoff: 1.5, trailing_sl: 0.5 }, null, 2),
  },
  'Basket Order': {
    method: 'POST',
    url: '/api/v1/basket-order',
    body: JSON.stringify({ apikey: '{{API_KEY}}', orders: [{ symbol: 'RELIANCE', exchange: 'NSE', action: 'BUY', quantity: 10, pricetype: 'MARKET', product: 'MIS' }, { symbol: 'TCS', exchange: 'NSE', action: 'SELL', quantity: 5, pricetype: 'LIMIT', product: 'CNC', price: 3800.0 }] }, null, 2),
  },
  'Panic Button': {
    method: 'POST',
    url: '/risk/panic',
    body: JSON.stringify({}, null, 2),
  },
  'Cancel All Orders': {
    method: 'POST',
    url: '/risk/cancel-all',
    body: JSON.stringify({}, null, 2),
  },
  'Close All Positions': {
    method: 'POST',
    url: '/risk/close-positions',
    body: JSON.stringify({}, null, 2),
  },
}

const TEMPLATE_CATEGORIES: Record<string, string[]> = {
  'Order Operations': ['Place Market Order (BUY)', 'Place Market Order (SELL)', 'Place Limit Order', 'Cancel Order', 'Modify Order'],
  'Data Retrieval': ['Get Orderbook', 'Get Positions', 'Get Holdings', 'Get Funds', 'Get Tradebook'],
  'Market Data': ['Get Quote', 'Get Multi Quotes', 'Get Historical Data'],
  'Options': ['Get Option Chain', 'Get Option Greeks'],
  'GTT': ['Place GTT Order', 'Modify GTT Order', 'Cancel GTT Order', 'GTT Orderbook'],
  'Advanced': ['Split Order', 'Smart Order', 'Basket Order'],
  'Risk / Panic': ['Panic Button', 'Cancel All Orders', 'Close All Positions'],
}

function formatJson(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input), null, 2)
  } catch {
    return input
  }
}

function minifyJson(input: string): string {
  try {
    return JSON.stringify(JSON.parse(input))
  } catch {
    return input
  }
}

function isValidJson(input: string): boolean {
  if (!input.trim()) return true
  try { JSON.parse(input); return true } catch { return false }
}

function getStatusColor(code: number): string {
  if (code >= 200 && code < 300) return 'var(--accent-green)'
  if (code >= 300 && code < 400) return 'var(--accent-cyan)'
  if (code >= 400 && code < 500) return 'var(--accent-yellow)'
  return 'var(--accent-red)'
}

function getStatusLabel(code: number): string {
  const labels: Record<number, string> = {
    200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content',
    301: 'Moved', 302: 'Found', 304: 'Not Modified',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict',
    422: 'Unprocessable', 429: 'Too Many Requests',
    500: 'Server Error', 502: 'Bad Gateway', 503: 'Unavailable',
  }
  return labels[code] || ''
}

function ResponseStatusDot({ code }: { code: number }) {
  return <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: getStatusColor(code), marginRight: 4 }} />
}

function CollapsibleGroup({ label, icon, color, defaultOpen = false, count, children }: {
  label: string; icon?: React.ReactNode; color?: string; defaultOpen?: boolean; count?: number; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 6px', background: 'none', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer',
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase', letterSpacing: '0.05em',
          borderRadius: 3, transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon && <span style={{ color: color || 'var(--text-muted)' }}>{icon}</span>}
        <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
        {count !== undefined && (
          <span className="text-[8px]" style={{ color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '0 4px', borderRadius: 4 }}>
            {count}
          </span>
        )}
      </button>
      {open && <div style={{ paddingLeft: 8 }}>{children}</div>}
    </div>
  )
}

function KeyIcon({ size, style }: { size: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <circle cx="8" cy="15" r="4" />
      <line x1="10.85" y1="12.15" x2="19" y2="4" />
      <line x1="18" y1="5" x2="20" y2="7" />
      <line x1="15" y1="8" x2="17" y2="10" />
    </svg>
  )
}

function SearchInput({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div style={{ position: 'relative' }}>
      <Search size={10} style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
          color: 'var(--text-primary)', padding: '4px 6px 4px 22px', borderRadius: 3,
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", outline: 'none',
        }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          <X size={10} />
        </button>
      )}
    </div>
  )
}

export default function Playground() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('playground_api_key') || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [method, setMethod] = useState('POST')
  const [url, setUrl] = useState('/api/v1/placeorder')
  const [body, setBody] = useState('{\n  \n}')
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('playground_base_url') || '/api')
  const [responseData, setResponseData] = useState<{ status: number; headers: Record<string, string>; body: string; timeMs: number } | null>(null)
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('playground_history') || '[]') } catch { return [] }
  })
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([])
  const [loadingEndpoints, setLoadingEndpoints] = useState(true)
  const [endpointSearch, setEndpointSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'response' | 'history' | 'websocket'>('response')
  const [copied, setCopied] = useState(false)
  const [wsUrl, setWsUrl] = useState('ws://localhost:8000/ws')
  const [wsConnected, setWsConnected] = useState(false)
  const [wsMessages, setWsMessages] = useState<WsMessage[]>([])
  const [wsInput, setWsInput] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const responseRef = useRef<HTMLDivElement>(null)
  const [symbolSearch, setSymbolSearch] = useState('')
  const [symbolResults, setSymbolResults] = useState<SymbolResult[]>([])
  const [searchingSymbols, setSearchingSymbols] = useState(false)
  const [showSymbolSearch, setShowSymbolSearch] = useState(false)
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [loadingBrokers, setLoadingBrokers] = useState(false)
  const [showBrokerModal, setShowBrokerModal] = useState(false)
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const [responseHeadersExpanded, setResponseHeadersExpanded] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTemplateCategory, setActiveTemplateCategory] = useState<string>('Order Operations')
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [collections, setCollections] = useState<{ name: string; method: string; url: string; body: string; savedAt: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem('playground_collections') || '[]') } catch { return [] }
  })
  const [showCollections, setShowCollections] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => { localStorage.setItem('playground_api_key', apiKey) }, [apiKey])
  useEffect(() => { localStorage.setItem('playground_base_url', baseUrl) }, [baseUrl])
  useEffect(() => { localStorage.setItem('playground_history', JSON.stringify(history.slice(0, 100))) }, [history])
  useEffect(() => { localStorage.setItem('playground_collections', JSON.stringify(collections)) }, [collections])
  useEffect(() => { localStorage.setItem('playground_base_url', baseUrl) }, [baseUrl])
  useEffect(() => { localStorage.setItem('playground_history', JSON.stringify(history.slice(0, 100))) }, [history])

  useEffect(() => {
    api.get('/openalgo/playground/api-docs').then((res) => {
      const data = res.data?.data
      if (data?.endpoints) setEndpoints(data.endpoints)
    }).catch((err) => console.warn('[Playground] failed:', err)).finally(() => setLoadingEndpoints(false))
  }, [])

  useEffect(() => {
    if (!symbolSearch.trim()) { setSymbolResults([]); return }
    setSearchingSymbols(true)
    const timer = setTimeout(() => {
      api.get('/openalgo/playground/symbol-search', { params: { q: symbolSearch } })
        .then((res) => setSymbolResults(res.data?.data?.symbols || []))
        .catch(() => setSymbolResults([]))
        .finally(() => setSearchingSymbols(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [symbolSearch])

  useEffect(() => {
    setLoadingBrokers(true)
    api.get('/openalgo/playground/brokers').then((res) => {
      setBrokers(res.data?.data?.brokers || [])
    }).catch((err) => console.warn('[Playground] failed:', err)).finally(() => setLoadingBrokers(false))
  }, [])

  const categories = useMemo(() => [...new Set(endpoints.map((e) => e.category))], [endpoints])

  const filteredEndpoints = useMemo(() => {
    if (!endpointSearch.trim()) return endpoints
    const q = endpointSearch.toLowerCase()
    return endpoints.filter((e) =>
      e.path.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q)
    )
  }, [endpoints, endpointSearch])

  const handleSend = useCallback(async () => {
    if (!url.trim()) { addToast('Please enter a URL', 'error'); return }
    setSending(true)
    setResponseData(null)
    const startTime = performance.now()
    try {
      let parsedBody: Record<string, unknown> | undefined
      if (body.trim() && method !== 'GET') {
        try { parsedBody = JSON.parse(body) } catch { addToast('Invalid JSON body', 'error'); setSending(false); return }
      }
      const config: Record<string, unknown> = {
        method: method.toLowerCase(),
        url: baseUrl + url,
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-API-Key': apiKey, 'Authorization': `Bearer ${apiKey}` } : {}) },
      }
      if (parsedBody) config.data = parsedBody
      const res = await api(config)
      const timeMs = Math.round(performance.now() - startTime)
      const bodyStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2)
      const headers: Record<string, string> = {}
      if (res.headers) res.headers.forEach((v: string, k: string) => { headers[k] = v })
      setResponseData({ status: res.status, headers, body: bodyStr, timeMs })
      setHistory((prev) => [{ id: Date.now().toString(), method, url, body, timestamp: Date.now(), status: res.status, timeMs }, ...prev].slice(0, 100))
    } catch (err: any) {
      const timeMs = Math.round(performance.now() - startTime)
      const resp = err?.response
      const status = resp?.status || 0
      const bodyStr = resp?.data ? (typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2)) : err.message
      const headers: Record<string, string> = {}
      if (resp?.headers) resp.headers.forEach((v: string, k: string) => { headers[k] = v })
      setResponseData({ status, headers, body: bodyStr, timeMs })
      setHistory((prev) => [{ id: Date.now().toString(), method, url, body, timestamp: Date.now(), status, timeMs }, ...prev].slice(0, 100))
    } finally { setSending(false) }
  }, [method, url, body, baseUrl, apiKey, addToast])

  const handleEndpointClick = (ep: ApiEndpoint) => {
    setMethod(ep.method)
    setUrl(ep.path)
    const defaultBody: Record<string, string> = {}
    for (const [key] of Object.entries(ep.params)) {
      if (key === 'apikey') defaultBody[key] = apiKey || 'YOUR_API_KEY'
      else defaultBody[key] = ''
    }
    setBody(formatJson(JSON.stringify(defaultBody, null, 2)))
    if (ep.category === 'Orders' || ep.category === 'GTT' || ep.category === 'Advanced Orders') {
      setActiveTemplateCategory('Order Operations')
    } else if (ep.category === 'Data') {
      setActiveTemplateCategory('Data Retrieval')
    } else if (ep.category === 'Quotes' || ep.category === 'Historical') {
      setActiveTemplateCategory('Market Data')
    } else if (ep.category === 'Options') {
      setActiveTemplateCategory('Options')
    } else if (ep.category === 'Panic') {
      setActiveTemplateCategory('Risk / Panic')
    }
  }

  const handleTemplateSelect = (key: string) => {
    const t = TEMPLATES[key]
    if (!t) return
    setMethod(t.method)
    setUrl(t.url)
    setBody(t.body.replace(/"\{\{API_KEY\}\}"/g, apiKey ? `"${apiKey}"` : '"YOUR_API_KEY"'))
  }

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      addToast('Copied to clipboard', 'success')
    } catch { addToast('Failed to copy', 'error') }
  }

  const handleClearHistory = () => {
    setHistory([])
    addToast('History cleared', 'success')
  }

  const handleFormatBody = () => setBody(formatJson(body))
  const handleMinifyBody = () => setBody(minifyJson(body))

  const handleWsConnect = () => {
    if (!wsUrl.trim()) { addToast('Please enter a WebSocket URL', 'error'); return }
    try {
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => {
        setWsConnected(true)
        addToast('WebSocket connected', 'success')
        setWsMessages((prev) => [...prev, { id: Date.now().toString(), direction: 'received', content: '--- Connected ---', timestamp: Date.now() }])
      }
      ws.onmessage = (event) => {
        setWsMessages((prev) => [...prev, { id: Date.now().toString(), direction: 'received', content: event.data, timestamp: Date.now() }])
      }
      ws.onclose = () => {
        setWsConnected(false)
        setWsMessages((prev) => [...prev, { id: Date.now().toString(), direction: 'received', content: '--- Disconnected ---', timestamp: Date.now() }])
      }
      ws.onerror = () => addToast('WebSocket error', 'error')
      wsRef.current = ws
    } catch (err: any) { addToast(`Failed to connect: ${err.message}`, 'error') }
  }

  const handleWsDisconnect = () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    setWsConnected(false)
  }

  const handleWsSend = () => {
    if (!wsInput.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(wsInput)
    setWsMessages((prev) => [...prev, { id: Date.now().toString(), direction: 'sent', content: wsInput, timestamp: Date.now() }])
    setWsInput('')
  }

  useEffect(() => {
    return () => { if (wsRef.current) wsRef.current.close() }
  }, [])

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSend() }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); handleFormatBody() }
  }

  const handleSaveRequest = () => {
    if (!saveName.trim()) { addToast('Please enter a name', 'error'); return }
    setCollections((prev) => {
      const filtered = prev.filter((c) => c.name !== saveName.trim())
      return [{ name: saveName.trim(), method, url, body, savedAt: Date.now() }, ...filtered].slice(0, 50)
    })
    setShowSaveModal(false)
    setSaveName('')
    addToast('Request saved', 'success')
  }

  const handleLoadCollection = (item: { method: string; url: string; body: string }) => {
    setMethod(item.method)
    setUrl(item.url)
    setBody(item.body)
    setShowCollections(false)
    addToast('Request loaded', 'success')
  }

  const handleDeleteCollection = (name: string) => {
    setCollections((prev) => prev.filter((c) => c.name !== name))
    addToast('Request deleted', 'success')
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, handleFormatBody])

  const methodColors: Record<string, string> = {
    GET: 'var(--accent-green)', POST: 'var(--accent-cyan)',
    PUT: 'var(--accent-yellow)', DELETE: 'var(--accent-red)', PATCH: 'var(--accent-purple)',
  }

  const editorHeight = bodyExpanded ? 300 : undefined

  const insertSymbolIntoSymbolInput = (symbol: string) => {
    try {
      const parsed = JSON.parse(body)
      parsed.symbol = symbol
      setBody(JSON.stringify(parsed, null, 2))
    } catch {}
    setShowSymbolSearch(false)
    setSymbolSearch('')
  }

  return (
    <div className="flex flex-col gap-1.5" style={{ height: 'calc(100vh - 48px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between shrink-0" style={{ paddingBottom: 2 }}>
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
            <Terminal size={12} className="inline mr-1" /> API Playground
          </h2>
          <Badge label="Bruno-style" variant="info" />
          <span className="text-[9px]" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            Ctrl+Enter to send
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowCollections(true)} title="Saved requests">
            <FolderOpen size={10} /> Saved ({collections.length})
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setSaveName(url.split('/').pop() || 'request'); setShowSaveModal(true) }} title="Save current request">
            <Save size={10} /> Save
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowBrokerModal(true)} title="View supported brokers">
            <Server size={10} /> Brokers
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleCopyToClipboard(`curl -X ${method} '${baseUrl}${url}' -H 'Content-Type: application/json'${apiKey ? ` -H 'X-API-Key: ${apiKey}'` : ''} -d '${body}'`)} title="Copy as cURL">
            <Terminal size={10} /> cURL
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowHelpModal(true)} title="Keyboard shortcuts">
            <HelpCircle size={10} /> ?
          </Button>
          <Select
            options={[
              { value: '', label: 'Load Template...' },
              ...Object.entries(TEMPLATE_CATEGORIES).flatMap(([cat, keys]) => [
                { value: `__cat__${cat}`, label: `── ${cat} ──` },
                ...keys.map((k) => ({ value: k, label: `  ${k}` })),
              ]),
            ]}
            value=""
            onChange={(e) => {
              const val = e.target.value
              if (val && !val.startsWith('__cat__')) handleTemplateSelect(val)
              e.target.value = ''
            }}
            style={{ width: 200, fontSize: 10, padding: '3px 6px' }}
          />
        </div>
      </div>

      <div className="flex gap-1.5" style={{ flex: 1, minHeight: 0 }}>
        {/* ── Left Sidebar ── */}
        {sidebarCollapsed ? (
          <button
            onClick={() => setSidebarCollapsed(false)}
            style={{
              width: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 3, color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ChevronRight size={12} />
          </button>
        ) : (
          <div
            className="flex flex-col gap-0.5 overflow-y-auto shrink-0"
            style={{ width: 230, borderRight: '1px solid var(--border-color)', paddingRight: 6 }}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                <BookOpen size={10} className="inline mr-1" /> Endpoints
              </span>
              <div className="flex items-center gap-0.5">
                <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{endpoints.length}</span>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 1, display: 'flex' }}
                >
                  <ChevronLeft size={10} />
                </button>
              </div>
            </div>
            <SearchInput placeholder="Search endpoints..." value={endpointSearch} onChange={setEndpointSearch} />
            <div className="flex flex-col gap-0.5 mt-1" style={{ flex: 1, overflow: 'auto' }}>
              {loadingEndpoints ? (
                <div className="flex flex-col gap-1">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} height={16} variant="rect" />)}</div>
              ) : filteredEndpoints.length === 0 ? (
                <div className="text-[9px] p-2 text-center" style={{ color: 'var(--text-muted)' }}>No endpoints found</div>
              ) : endpointSearch ? (
                filteredEndpoints.map((ep, i) => (
                  <EndpointButton key={i} ep={ep} active={url === ep.path} methodColors={methodColors} onClick={handleEndpointClick} />
                ))
              ) : (
                categories.map((cat) => {
                  const catEndpoints = filteredEndpoints.filter((e) => e.category === cat)
                  if (!catEndpoints.length) return null
                  return (
                    <CollapsibleGroup
                      key={cat}
                      label={cat}
                      icon={CATEGORY_ICONS[cat]}
                      color={CATEGORY_COLORS[cat]}
                      defaultOpen={cat === 'Orders'}
                      count={catEndpoints.length}
                    >
                      {catEndpoints.map((ep, i) => (
                        <EndpointButton key={i} ep={ep} active={url === ep.path} methodColors={methodColors} onClick={handleEndpointClick} />
                      ))}
                    </CollapsibleGroup>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── Right Panel ── */}
        <div className="flex flex-col gap-1.5" style={{ flex: 1, minWidth: 0 }}>
          {/* API Key Bar */}
          <div
            className="flex items-center gap-1.5 p-1.5 rounded-sm"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
          >
            <KeyIcon size={10} style={{ color: 'var(--text-muted)' }} />
            <input
              type={showApiKey ? 'text' : 'password'}
              placeholder="API Key (stored in localStorage)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              }}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2 }}
            >
              {showApiKey ? <EyeOff size={10} /> : <Eye size={10} />}
            </button>
            <Badge label={apiKey ? 'Key Set' : 'No Key'} variant={apiKey ? 'success' : 'warning'} />
            <span className="text-[8px]" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              Base: {baseUrl}
            </span>
          </div>

          {/* URL + Method Row */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  color: methodColors[method] || 'var(--text-primary)',
                  padding: '5px 8px', borderRadius: 3, fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                  outline: 'none', cursor: 'pointer',
                }}
              >
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => (
                  <option key={m} value={m} style={{ color: methodColors[m] }}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, position: 'relative', display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/api/v1/placeorder"
                style={{
                  flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', padding: '5px 8px', borderRadius: 3,
                  fontSize: 10, fontFamily: "'JetBrains Mono', monospace", outline: 'none',
                }}
              />
              <button
                onClick={() => setShowSymbolSearch(true)}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 3,
                  fontSize: 9, cursor: 'pointer', whiteSpace: 'nowrap',
                  fontFamily: "'JetBrains Mono', monospace", display: 'flex', alignItems: 'center', gap: 3,
                }}
                title="Search and insert symbol"
              >
                <Search size={9} /> Symbol
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={handleSend} loading={sending} style={{ minWidth: 60, padding: '5px 14px' }}>
              {sending ? <Loader size={10} /> : <Send size={10} />}
              {sending ? '' : ' Send'}
            </Button>
          </div>

          {/* Body Editor + Response Split */}
          <div className="flex gap-1.5" style={{ flex: 1, minHeight: 0 }}>
            {/* Body Editor */}
            <div className="flex flex-col gap-0.5" style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  <Code size={10} /> Request Body
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[8px]" style={{ color: isValidJson(body) ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {isValidJson(body) ? 'Valid JSON' : 'Invalid JSON'}
                  </span>
                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>|</span>
                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{body.split('\n').length} lines</span>
                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{new Blob([body]).size} B</span>
                  <button
                    onClick={handleFormatBody}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 1 }}
                    title="Format JSON (Ctrl+B)"
                  >
                    <Braces size={9} />
                  </button>
                  <button
                    onClick={handleMinifyBody}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 1 }}
                    title="Minify JSON"
                  >
                    <Hash size={9} />
                  </button>
                  <button
                    onClick={() => setBodyExpanded(!bodyExpanded)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 1 }}
                    title={bodyExpanded ? 'Collapse' : 'Expand'}
                  >
                    {bodyExpanded ? <Minimize2 size={9} /> : <Maximize2 size={9} />}
                  </button>
                </div>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                style={{
                  flex: 1, background: 'var(--bg-card)', border: isValidJson(body) ? '1px solid var(--border-color)' : '1px solid var(--accent-red)',
                  color: 'var(--text-primary)', padding: 8, borderRadius: 3,
                  fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                  outline: 'none', resize: 'none',
                  lineHeight: '1.5em', tabSize: 2,
                  height: bodyExpanded ? 400 : undefined,
                }}
                spellCheck={false}
              />
            </div>

            {/* Response Panel */}
            <div className="flex flex-col gap-0.5" style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-3">
                <span className="text-[9px] uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  <Play size={10} /> Response
                </span>
              </div>

              {/* Sub-tabs */}
              <div className="flex items-center gap-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
                {([
                  { k: 'response' as const, label: 'Response', icon: <Play size={10} /> },
                  ...(history.length > 0 ? [{ k: 'history' as const, label: `History (${history.length})`, icon: <History size={10} /> }] : []),
                  { k: 'websocket' as const, label: 'WebSocket', icon: <Wifi size={10} /> },
                ]).map((tab) => (
                  <button
                    key={tab.k}
                    onClick={() => setActiveTab(tab.k)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      padding: '4px 8px', background: 'none', border: 'none',
                      borderBottom: activeTab === tab.k ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                      color: activeTab === tab.k ? 'var(--text-primary)' : 'var(--text-muted)',
                      cursor: 'pointer', fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
                {responseData && (
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button
                      onClick={() => handleCopyToClipboard(responseData.body)}
                      style={{ background: 'none', border: 'none', color: copied ? 'var(--accent-green)' : 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'flex' }}
                      title="Copy response"
                    >
                      <Copy size={9} />
                    </button>
                    <span className="text-[8px]" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {responseData.timeMs}ms
                    </span>
                  </div>
                )}
              </div>

              {/* Tab Content */}
              <div
                className="flex flex-col"
                style={{
                  flex: 1, overflow: 'auto', background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)', borderRadius: 3, minHeight: 200,
                }}
              >
                {/* Response Tab */}
                {activeTab === 'response' && (
                  <div ref={responseRef} className="flex flex-col" style={{ minHeight: '100%' }}>
                    {!responseData && !sending && (
                      <div className="flex flex-col items-center justify-center gap-2 p-6" style={{ color: 'var(--text-muted)' }}>
                        <Play size={24} opacity={0.2} />
                        <span className="text-[10px]">Select an endpoint and click Send</span>
                        <span className="text-[8px]">or press Ctrl+Enter</span>
                      </div>
                    )}
                    {sending && (
                      <div className="flex flex-col items-center justify-center gap-2 p-6">
                        <Loader size={16} style={{ color: 'var(--accent-cyan)' }} />
                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Sending request to {url}...</span>
                      </div>
                    )}
                    {responseData && !sending && (
                      <div className="flex flex-col" style={{ minHeight: '100%' }}>
                        {/* Status Bar */}
                        <div
                          className="flex items-center gap-1.5 p-1.5"
                          style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
                        >
                          <ResponseStatusDot code={responseData.status} />
                          <span className="text-[10px] font-bold font-mono" style={{ color: getStatusColor(responseData.status) }}>
                            {responseData.status} {getStatusLabel(responseData.status)}
                          </span>
                          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                            {responseData.timeMs}ms
                          </span>
                          <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                            | {responseData.body.length.toLocaleString()} chars
                          </span>
                        </div>
                        {/* Response Headers (collapsible) */}
                        {Object.keys(responseData.headers).length > 0 && (
                          <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <button
                              onClick={() => setResponseHeadersExpanded(!responseHeadersExpanded)}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 4,
                                padding: '3px 6px', background: 'none', border: 'none',
                                color: 'var(--text-muted)', cursor: 'pointer', fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                              }}
                            >
                              {responseHeadersExpanded ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                              Response Headers ({Object.keys(responseData.headers).length})
                            </button>
                            {responseHeadersExpanded && (
                              <div className="flex flex-col" style={{ maxHeight: 150, overflow: 'auto', padding: '2px 6px 4px 18px' }}>
                                {Object.entries(responseData.headers).slice(0, 30).map(([k, v]) => (
                                  <div key={k} className="flex gap-1 text-[8px] font-mono" style={{ wordBreak: 'break-all', lineHeight: '1.6em' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>
                                    <span style={{ color: 'var(--text-muted)' }}>{v}</span>
                                  </div>
                                ))}
                                {Object.keys(responseData.headers).length > 30 && (
                                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                                    ... and {Object.keys(responseData.headers).length - 30} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Response Body */}
                        <div style={{ flex: 1, overflow: 'auto', padding: 6 }}>
                          {(() => {
                            const content = responseData.body
                            if (content.length > 100000) {
                              return (
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2 p-2 rounded-sm" style={{ background: 'var(--bg-primary)' }}>
                                    <AlertTriangle size={10} style={{ color: 'var(--accent-yellow)' }} />
                                    <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }}>
                                      Response is large ({content.length.toLocaleString()} chars). Showing first 100,000 characters.
                                    </span>
                                  </div>
                                  <pre style={{
                                    margin: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                                    lineHeight: '1.5em', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                    color: 'var(--text-primary)',
                                  }}>
                                    {content.slice(0, 100000)}
                                  </pre>
                                </div>
                              )
                            }
                            return (
                              <pre style={{
                                margin: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                                lineHeight: '1.5em', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                color: 'var(--text-primary)',
                              }}>
                                {content}
                              </pre>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                  <div className="flex flex-col" style={{ minHeight: '100%' }}>
                    <div className="flex items-center justify-between p-1.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <span className="text-[9px] uppercase flex items-center gap-1" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <Clock size={10} /> Recent Requests ({history.length})
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyToClipboard(JSON.stringify(history.slice(0, 10), null, 2))}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2 }}
                          title="Export history"
                        >
                          <Download size={9} />
                        </button>
                        <button
                          onClick={handleClearHistory}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 2, gap: 2 }}
                          title="Clear history"
                        >
                          <Trash2 size={9} /> Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col overflow-auto" style={{ flex: 1 }}>
                      {history.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-2 p-6" style={{ color: 'var(--text-muted)' }}>
                          <History size={20} opacity={0.3} />
                          <span className="text-[10px]">No requests yet</span>
                        </div>
                      )}
                      {history.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => { setMethod(entry.method); setUrl(entry.url); setBody(entry.body) }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px',
                            background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)',
                            color: 'var(--text-primary)', cursor: 'pointer', width: '100%',
                            fontFamily: "'JetBrains Mono', monospace", fontSize: 9, textAlign: 'left',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <span style={{ color: methodColors[entry.method] || 'var(--text-muted)', fontWeight: 600, minWidth: 32, fontSize: 8 }}>
                            {entry.method}
                          </span>
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.url}
                          </span>
                          {entry.status !== undefined && (
                            <span style={{ color: getStatusColor(entry.status), fontSize: 8, minWidth: 28 }}>
                              {entry.status}
                            </span>
                          )}
                          {entry.timeMs !== undefined && (
                            <span className="text-[8px]" style={{ color: 'var(--text-muted)', minWidth: 32 }}>
                              {entry.timeMs}ms
                            </span>
                          )}
                          <span className="text-[7px]" style={{ color: 'var(--text-muted)', minWidth: 50, textAlign: 'right' }}>
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* WebSocket Tab */}
                {activeTab === 'websocket' && (
                  <div className="flex flex-col" style={{ minHeight: '100%' }}>
                    {/* Connection Bar */}
                    <div className="flex items-center gap-1.5 p-1.5" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <Wifi size={10} style={{ color: wsConnected ? 'var(--accent-green)' : 'var(--text-muted)' }} />
                      <input
                        value={wsUrl}
                        onChange={(e) => setWsUrl(e.target.value)}
                        placeholder="ws://localhost:8000/ws"
                        style={{
                          flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)', padding: '3px 6px', borderRadius: 3,
                          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", outline: 'none',
                        }}
                        disabled={wsConnected}
                      />
                      {wsConnected ? (
                        <Button variant="danger" size="sm" onClick={handleWsDisconnect}>
                          <X size={10} /> Disconnect
                        </Button>
                      ) : (
                        <Button variant="primary" size="sm" onClick={handleWsConnect}>
                          <Plug size={10} /> Connect
                        </Button>
                      )}
                      <Badge
                        label={wsConnected ? 'Connected' : 'Disconnected'}
                        variant={wsConnected ? 'success' : 'error'}
                      />
                      {wsConnected && <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>{wsMessages.filter(m => m.direction === 'received').length} msgs</span>}
                    </div>

                    {/* Messages Log */}
                    <div className="flex flex-col overflow-auto" style={{ flex: 1, minHeight: 80 }}>
                      {wsMessages.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-2 p-6" style={{ color: 'var(--text-muted)' }}>
                          <Wifi size={24} opacity={0.2} />
                          <span className="text-[10px]">Connect to a WebSocket endpoint to see messages</span>
                          <span className="text-[8px]">Try ws://localhost:8000/ws for the local stream</span>
                        </div>
                      )}
                      {wsMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="flex items-start gap-1 p-1"
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            background: msg.direction === 'sent' ? 'rgba(0,200,150,0.03)' : 'none',
                          }}
                        >
                          <span className="text-[8px] font-mono shrink-0" style={{ color: msg.direction === 'sent' ? 'var(--accent-cyan)' : 'var(--accent-green)', minWidth: 24 }}>
                            {msg.direction === 'sent' ? '>>' : '<<'}
                          </span>
                          <pre style={{
                            margin: 0, fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                            color: 'var(--text-primary)', lineHeight: '1.4em', whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all', flex: 1,
                          }}>
                            {msg.content}
                          </pre>
                          <span className="text-[7px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Message Input */}
                    <div className="flex items-center gap-1 p-1.5" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <input
                        value={wsInput}
                        onChange={(e) => setWsInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleWsSend() }}
                        placeholder="Type a JSON message to send..."
                        style={{
                          flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)', padding: '4px 6px', borderRadius: 3,
                          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", outline: 'none',
                        }}
                        disabled={!wsConnected}
                      />
                      <Button variant="primary" size="sm" onClick={handleWsSend} disabled={!wsConnected || !wsInput.trim()}>
                        <Send size={10} /> Send
                      </Button>
                      <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                        {wsMessages.filter(m => m.direction === 'sent').length} sent
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Symbol Search Modal */}
      <Modal open={showSymbolSearch} onClose={() => { setShowSymbolSearch(false); setSymbolSearch('') }} title="Search Symbols" width={500}>
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Search by symbol or name..."
            value={symbolSearch}
            onChange={(e) => setSymbolSearch(e.target.value)}
            autoFocus
          />
          <div className="flex flex-col gap-0.5" style={{ maxHeight: 300, overflow: 'auto' }}>
            {searchingSymbols && (
              <div className="flex items-center justify-center gap-2 p-4">
                <Loader size={12} style={{ color: 'var(--accent-cyan)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Searching...</span>
              </div>
            )}
            {!searchingSymbols && symbolResults.length === 0 && symbolSearch.trim() && (
              <div className="flex flex-col items-center p-4" style={{ color: 'var(--text-muted)' }}>
                <Search size={16} opacity={0.3} />
                <span className="text-[10px] mt-1">No symbols found</span>
              </div>
            )}
            {symbolResults.map((s, i) => (
              <button
                key={i}
                onClick={() => insertSymbolIntoSymbolInput(s.symbol)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 6px',
                  background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', cursor: 'pointer', width: '100%',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <span style={{ fontWeight: 600, color: 'var(--accent-cyan)', minWidth: 80 }}>{s.symbol}</span>
                <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9 }}>
                  {s.name}
                </span>
                <Badge label={s.exchange} variant="info" />
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Save Request Modal */}
      <Modal open={showSaveModal} onClose={() => setShowSaveModal(false)} title="Save Request" width={400}>
        <div className="flex flex-col gap-3">
          <Input
            label="Request Name"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="e.g. Place RELIANCE Market Order"
            autoFocus
          />
          <div className="flex items-center gap-2 p-1.5 rounded-sm" style={{ background: 'var(--bg-primary)' }}>
            <span className="text-[9px] font-mono shrink-0" style={{ color: methodColors[method], fontWeight: 600 }}>{method}</span>
            <span className="text-[9px] font-mono" style={{ color: 'var(--text-secondary)' }}>{url}</span>
          </div>
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setShowSaveModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveRequest} disabled={!saveName.trim()}>
              <Save size={10} /> Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Collections Modal */}
      <Modal open={showCollections} onClose={() => setShowCollections(false)} title={`Saved Requests (${collections.length})`} width={500}>
        <div className="flex flex-col gap-1">
          {collections.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6" style={{ color: 'var(--text-muted)' }}>
              <FolderOpen size={20} opacity={0.3} />
              <span className="text-[10px]">No saved requests yet</span>
              <span className="text-[8px]">Use the Save button to store requests for later use</span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5" style={{ maxHeight: 350, overflow: 'auto' }}>
              {collections.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 p-1.5"
                  style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                  <span className="text-[10px] font-mono font-semibold shrink-0" style={{ color: methodColors[item.method], minWidth: 36 }}>{item.method}</span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                    <span className="text-[8px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{item.url}</span>
                  </div>
                  <span className="text-[7px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {new Date(item.savedAt).toLocaleDateString()}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => handleLoadCollection(item)} title="Load request">
                    <Upload size={9} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteCollection(item.name)} title="Delete">
                    <Trash2 size={9} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Help Modal */}
      <Modal open={showHelpModal} onClose={() => setShowHelpModal(false)} title="Keyboard Shortcuts" width={400}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between p-1.5 rounded-sm" style={{ background: 'var(--bg-primary)' }}>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>Send Request</span>
            <Badge label="Ctrl + Enter" variant="info" />
          </div>
          <div className="flex items-center justify-between p-1.5 rounded-sm" style={{ background: 'var(--bg-primary)' }}>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-primary)' }}>Format JSON</span>
            <Badge label="Ctrl + B" variant="info" />
          </div>
          <div className="text-[9px] p-2" style={{ color: 'var(--text-muted)' }}>
            Tips:
            <ul className="mt-1 flex flex-col gap-0.5" style={{ paddingLeft: 12 }}>
              <li>Click any endpoint in the sidebar to pre-fill the request</li>
              <li>Use the template dropdown for common operations</li>
              <li>API key is stored in localStorage and sent as X-API-Key header</li>
              <li>Use the Symbol search button to find and insert instrument symbols</li>
              <li>Response headers can be expanded by clicking the headers section</li>
              <li>Save frequently used requests via the Save button</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Brokers Modal */}
      <Modal open={showBrokerModal} onClose={() => setShowBrokerModal(false)} title="Supported Brokers & Exchanges" width={450}>
        <div className="flex flex-col gap-2">
          {loadingBrokers ? (
            <div className="flex flex-col gap-1">{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={24} variant="rect" />)}</div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-1.5 rounded-sm" style={{ background: 'var(--bg-primary)' }}>
                <Badge label={`${brokers.length} total`} variant="info" />
              </div>
              <div className="flex flex-col gap-0.5" style={{ maxHeight: 300, overflow: 'auto' }}>
                {brokers.map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-1.5"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                  >
                    <div className="flex items-center gap-2">
                      <Server size={10} style={{ color: b.type === 'exchange' ? 'var(--accent-cyan)' : 'var(--accent-green)' }} />
                      <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</span>
                    </div>
                    <Badge label={b.type} variant={b.type === 'exchange' ? 'info' : 'default'} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

function EndpointButton({ ep, active, methodColors, onClick }: {
  ep: ApiEndpoint; active: boolean; methodColors: Record<string, string>; onClick: (ep: ApiEndpoint) => void
}) {
  return (
    <button
      onClick={() => onClick(ep)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, width: '100%',
        padding: '3px 6px', background: active ? 'var(--bg-hover)' : 'none',
        border: 'none', borderLeft: active ? '2px solid var(--accent-cyan)' : '2px solid transparent',
        color: active ? 'var(--accent-cyan)' : 'var(--text-primary)',
        cursor: 'pointer', borderRadius: 2, fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace", textAlign: 'left',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'none' }}
      title={ep.description}
    >
      <span style={{
        color: methodColors[ep.method] || 'var(--text-muted)', fontWeight: 600,
        fontSize: 7, minWidth: 32, letterSpacing: '0.03em',
      }}>
        {ep.method}
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 9 }}>
        {ep.path.split('/').pop() || ep.path}
      </span>
    </button>
  )
}
