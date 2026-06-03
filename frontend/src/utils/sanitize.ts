export function sanitizeText(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

export function sanitizeErrorMessage(message: string): string {
  if (!message) return ''
  return message
    .replace(/(api[_-]?key|token|secret|password|authorization|bearer)\s*[=:]\s*\S+/gi, '$1=***')
    .replace(/https?:\/\/[^\s]+key=[^\s&]+/gi, (match) => {
      return match.replace(/(key=)[^&\s]+/, '$1***')
    })
    .replace(/[A-Za-z0-9_-]{20,}/g, (match) => {
      if (/[A-Za-z0-9_-]{20,}/.test(match)) return match.slice(0, 4) + '***' + match.slice(-4)
      return match
    })
}
