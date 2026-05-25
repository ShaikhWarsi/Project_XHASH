import { describe, it, expect, vi, beforeEach } from 'vitest'
import { api, setApiKey, getApiKey, getAuthHeaders } from '../api/client'

vi.mock('axios', () => {
  const mockAxios = {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      defaults: {
        headers: {
          common: {},
        },
      },
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    })),
  }
  return { default: mockAxios }
})

describe('client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports an api instance', () => {
    expect(api).toBeDefined()
    expect(api.defaults).toBeDefined()
  })

  it('setApiKey stores key and sets auth header', () => {
    setApiKey('test-key-123')
    expect(api.defaults.headers.common['Authorization']).toBe('Bearer test-key-123')
  })

  it('setApiKey with empty key removes auth header', () => {
    setApiKey('test-key-123')
    setApiKey('')
    expect(api.defaults.headers.common['Authorization']).toBeUndefined()
  })

  it('getApiKey returns current key', () => {
    setApiKey('my-api-key')
    expect(getApiKey()).toBe('my-api-key')
  })

  it('getApiKey returns null when no key set', () => {
    setApiKey('')
    expect(getApiKey()).toBeNull()
  })

  it('getAuthHeaders returns Content-Type and Authorization when key set', () => {
    setApiKey('key-456')
    const headers = getAuthHeaders()
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Authorization']).toBe('Bearer key-456')
  })

  it('getAuthHeaders returns only Content-Type when no key', () => {
    setApiKey('')
    const headers = getAuthHeaders()
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['Authorization']).toBeUndefined()
  })
})
