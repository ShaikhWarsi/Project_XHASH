export async function fetchMCPOAuthClients(): Promise<any[]> {
  const res = await fetch('/api/mcp/oauth/clients')
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.clients ?? []
}

export async function registerMCPClient(name: string, redirectUris: string[]): Promise<any> {
  const res = await fetch('/api/mcp/oauth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_name: name, redirect_uris: redirectUris }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function fetchMCPDiscovery(): Promise<any> {
  const res = await fetch('/.well-known/oauth-authorization-server')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
