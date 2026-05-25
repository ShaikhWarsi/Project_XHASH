export default function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: 12 }}>
      <div
        style={{
          width: size,
          height: size,
          border: '2px solid var(--border-color)',
          borderTopColor: 'var(--accent-blue)',
          borderRadius: '50%',
          animation: 'spinner-rotate 0.6s linear infinite',
        }}
      />
      {label && <span style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>}
    </div>
  )
}
