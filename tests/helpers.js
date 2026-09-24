import { vi } from 'vitest'

export function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers,
  })
}

export function makeRepo(overrides = {}) {
  const name = overrides.name ?? 'repo'
  return {
    name,
    full_name: `octocat/${name}`,
    owner: { login: 'octocat' },
    description: null,
    private: false,
    language: 'JavaScript',
    size: 100,
    updated_at: '2026-01-01T00:00:00Z',
    default_branch: 'main',
    ...overrides,
  }
}

// Routes fetch calls by "METHOD path" so each test only declares the endpoints it needs.
export function mockFetch(routes) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const method = options.method ?? 'GET'
    const path = new URL(url).pathname
    const handler = routes[`${method} ${path}`]
    if (!handler) throw new Error(`Unexpected request: ${method} ${path}`)
    return handler(url, options)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
