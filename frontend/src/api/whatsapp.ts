import { api } from './client'

export async function getWhatsAppConfig(): Promise<unknown> {
  const { data } = await api.get('/openalgo/whatsapp/config')
  return data
}

export async function updateWhatsAppConfig(config: unknown): Promise<unknown> {
  const { data } = await api.post('/openalgo/whatsapp/config', config)
  return data
}

export async function pairWhatsApp(phone: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/whatsapp/pair', { phone })
  return data
}

export async function getPairingStatus(): Promise<unknown> {
  const { data } = await api.get('/openalgo/whatsapp/pair/status')
  return data
}

export async function unlinkWhatsApp(): Promise<unknown> {
  const { data } = await api.post('/openalgo/whatsapp/unlink')
  return data
}

export async function startWhatsAppBot(): Promise<unknown> {
  const { data } = await api.post('/openalgo/whatsapp/bot/start')
  return data
}

export async function stopWhatsAppBot(): Promise<unknown> {
  const { data } = await api.post('/openalgo/whatsapp/bot/stop')
  return data
}

export async function getWhatsAppBotStatus(): Promise<unknown> {
  const { data } = await api.get('/openalgo/whatsapp/bot/status')
  return data
}

export async function getWhatsAppUsers(): Promise<unknown[]> {
  const { data } = await api.get('/openalgo/whatsapp/users')
  return data.users || []
}

export async function unlinkWhatsAppUser(jid: string): Promise<unknown> {
  const { data } = await api.post(`/openalgo/whatsapp/users/${encodeURIComponent(jid)}/unlink`)
  return data
}

export async function sendWhatsAppMessage(jid: string, text: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/whatsapp/send', { jid, text })
  return data
}

export async function broadcastWhatsApp(text: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/whatsapp/broadcast', { text })
  return data
}

export async function getWhatsAppStats(): Promise<unknown> {
  const { data } = await api.get('/openalgo/whatsapp/stats')
  return data
}
