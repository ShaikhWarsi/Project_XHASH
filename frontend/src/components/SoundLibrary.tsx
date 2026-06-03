import { useState, useRef, useCallback, useEffect } from 'react'
import { useAudio } from '../contexts/AudioAlertContext'

interface CustomSound {
  id: string
  name: string
  dataUrl: string
  duration: number
}

const STORAGE_KEY = 'custom-alert-sounds'

function loadSounds(): CustomSound[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveSounds(sounds: CustomSound[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sounds))
}

export default function SoundLibrary() {
  const [sounds, setSounds] = useState<CustomSound[]>(loadSounds)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { playSuccess, playError, playAlert } = useAudio()

  useEffect(() => {
    audioRef.current = new Audio()
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('audio/')) {
      playError()
      return
    }

    if (file.size > 1024 * 1024) {
      playError()
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const audio = new Audio(dataUrl)
      audio.addEventListener('loadedmetadata', () => {
        const newSound: CustomSound = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          duration: Math.round(audio.duration * 10) / 10,
        }
        const updated = [...sounds, newSound]
        setSounds(updated)
        saveSounds(updated)
        playSuccess()
      })
      audio.addEventListener('error', () => playError())
    }
    reader.readAsDataURL(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [sounds, playSuccess, playError])

  const playSound = useCallback((sound: CustomSound) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    const audio = new Audio(sound.dataUrl)
    audioRef.current = audio
    setPlayingId(sound.id)
    audio.play().then(() => {
      audio.addEventListener('ended', () => setPlayingId(null))
    }).catch(() => setPlayingId(null))
  }, [])

  const deleteSound = useCallback((id: string) => {
    const updated = sounds.filter(s => s.id !== id)
    setSounds(updated)
    saveSounds(updated)
  }, [sounds])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          padding: '2px 6px', fontSize: 9, cursor: 'pointer',
          background: 'var(--bg-card, #0d1117)', border: '1px solid var(--border-color, #1a2332)',
          color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', borderRadius: 3,
        }}
      >
        🔊 Sounds ({sounds.length})
      </button>
    )
  }

  return (
    <div style={{
      fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
      background: 'var(--bg-card, #0d1117)',
      border: '1px solid var(--border-color, #1a2332)',
      borderRadius: 6, padding: 8, width: 260,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 10 }}>
          Sound Library {sounds.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({sounds.length})</span>}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 10 }}
        >
          ▾
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: '100%', padding: '4px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
            background: 'var(--accent-blue, #3b82f6)', border: 'none', color: '#fff', fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          + Upload Sound
        </button>
        <div style={{ color: 'var(--text-muted)', fontSize: 7, marginTop: 2 }}>MP3, WAV, OGG — max 1MB</div>
      </div>

      {sounds.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 8, textAlign: 'center', padding: '12px 0' }}>
          No custom sounds yet. Upload some!
        </div>
      ) : (
        <div style={{ maxHeight: 200, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {sounds.map(sound => (
            <div
              key={sound.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 6px', borderRadius: 4,
                background: playingId === sound.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
                border: playingId === sound.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
              }}
            >
              <button
                onClick={() => playSound(sound)}
                title="Play"
                style={{
                  width: 24, height: 24, borderRadius: '50%', fontSize: 10, cursor: 'pointer',
                  background: playingId === sound.id ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)',
                  border: 'none', color: playingId === sound.id ? '#000' : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {playingId === sound.id ? '■' : '▶'}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--text-primary)', fontSize: 9, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sound.name}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 7 }}>
                  {formatDuration(sound.duration)}
                </div>
              </div>
              <button
                onClick={() => deleteSound(sound.id)}
                title="Delete"
                style={{
                  width: 18, height: 18, borderRadius: '50%', fontSize: 8, cursor: 'pointer',
                  background: 'transparent', border: 'none', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
