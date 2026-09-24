import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Minimal in-memory stand-in for the chrome.* APIs the extension uses.
function createChromeMock() {
  const store = {}
  return {
    storage: {
      local: {
        get: vi.fn(async (key) => (key in store ? { [key]: store[key] } : {})),
        set: vi.fn(async (items) => Object.assign(store, items)),
        remove: vi.fn(async (key) => delete store[key]),
      },
    },
    runtime: {
      getURL: vi.fn((path) => `chrome-extension://test-id/${path}`),
    },
    tabs: {
      create: vi.fn(),
    },
  }
}

beforeEach(() => {
  globalThis.chrome = createChromeMock()
  // jsdom can't navigate, so replace location with a plain writable object.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { href: 'chrome-extension://test-id/current' },
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
