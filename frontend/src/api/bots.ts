export interface BotStatus {
  name: string
  type: 'discord' | 'slack' | 'telegram' | 'sms' | 'email' | 'twitter' | 'tradingview'
  enabled: boolean
  connected: boolean
  last_active?: string
  config: Record<string, any>
}

export async function fetchBots(): Promise<{ bots: BotStatus[] }> {
  const res = await fetch('/api/integrations/bots')
  if (!res.ok) throw new Error('Failed to fetch bots')
  return res.json()
}

export async function toggleBot(name: string, enabled: boolean): Promise<{ success: boolean }> {
  const res = await fetch(`/api/integrations/bots/${name}/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  if (!res.ok) throw new Error(`Failed to toggle bot ${name}`)
  return res.json()
}

export async function testBot(name: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/integrations/bots/${name}/test`)
  if (!res.ok) throw new Error(`Failed to test bot ${name}`)
  return res.json()
}
