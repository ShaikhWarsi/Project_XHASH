import '@testing-library/jest-dom'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

if (typeof globalThis.WebSocket === 'undefined') {
  class MockWebSocket {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3
    readyState = 1
    onopen: ((event: any) => void) | null = null
    onclose: ((event: any) => void) | null = null
    onerror: ((event: any) => void) | null = null
    onmessage: ((event: any) => void) | null = null
    url: string
    constructor(url: string) { this.url = url; queueMicrotask(() => this.onopen?.(new Event('open'))) }
    close() { queueMicrotask(() => this.onclose?.(new Event('close'))) }
    send() {}
  }
  Object.defineProperty(globalThis, 'WebSocket', { writable: true, value: MockWebSocket })
}
