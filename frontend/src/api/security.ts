import { api } from './client'

export async function fetchSecurityData(): Promise<unknown> {
  const { data } = await api.get('/openalgo/security')
  return data
}

export async function banIP(ip: string, reason: string, hours = 24, permanent = false): Promise<unknown> {
  const { data } = await api.post('/openalgo/security/ban', { ip_address: ip, reason, duration_hours: hours, permanent })
  return data
}

export async function unbanIP(ip: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/security/unban', { ip_address: ip })
  return data
}

export async function banHost(hostname: string, reason: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/security/ban-host', { hostname, reason })
  return data
}

export async function clear404Tracker(ip: string): Promise<unknown> {
  const { data } = await api.post('/openalgo/security/clear-404', { ip_address: ip })
  return data
}

export async function fetchSecurityStats(): Promise<unknown> {
  const { data } = await api.get('/openalgo/security/stats')
  return data
}

export async function fetchSecuritySettings(): Promise<unknown> {
  const { data } = await api.get('/openalgo/security/settings')
  return data
}

export async function updateSecuritySettings(settings: unknown): Promise<unknown> {
  const { data } = await api.post('/openalgo/security/settings', settings)
  return data
}

export async function fetchLoginActivity(): Promise<unknown> {
  const { data } = await api.get('/openalgo/security/login-activity')
  return data
}
