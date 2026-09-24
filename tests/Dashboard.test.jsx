import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '../src/dashboard/Dashboard.jsx'
import { jsonResponse, makeRepo, mockFetch } from './helpers.js'

const REPOS = [
  makeRepo({ name: 'alpha', language: 'JavaScript', private: false, updated_at: '2026-03-01T00:00:00Z' }),
  makeRepo({ name: 'beta', language: 'Python', private: true, updated_at: '2026-02-01T00:00:00Z' }),
  makeRepo({ name: 'gamma', language: 'Python', private: false, updated_at: '2026-01-01T00:00:00Z' }),
]

function row(fullName) {
  return screen.getByRole('cell', { name: fullName }).closest('tr')
}

function tableNames() {
  const rows = screen.getAllByRole('row').slice(1) // skip header
  return rows.map((r) => within(r).getAllByRole('cell')[1].textContent)
}

async function renderLoaded(extraRoutes = {}) {
  const fetchMock = mockFetch({ 'GET /user/repos': () => jsonResponse(REPOS), ...extraRoutes })
  render(<Dashboard />)
  await screen.findByRole('cell', { name: 'octocat/alpha' })
  return fetchMock
}

async function select(...fullNames) {
  for (const name of fullNames) {
    await userEvent.click(within(row(name)).getByRole('checkbox'))
  }
}

function confirmInput() {
  return screen.getByText(/to confirm:/).nextElementSibling
}

function requestsTo(fetchMock, method) {
  return fetchMock.mock.calls
    .filter(([, options = {}]) => (options.method ?? 'GET') === method)
    .map(([url]) => new URL(url).pathname)
}

beforeEach(async () => {
  await chrome.storage.local.set({ githubToken: 'ghp_saved' })
})

describe('Dashboard: loading', () => {
  it('redirects to Connect when there is no saved token', async () => {
    await chrome.storage.local.remove('githubToken')
    const fetchMock = mockFetch({})

    render(<Dashboard />)

    await vi.waitFor(() =>
      expect(window.location.href).toBe('chrome-extension://test-id/src/connect/index.html'),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lists repositories newest first by default', async () => {
    await renderLoaded()

    expect(tableNames()).toEqual(['octocat/alpha', 'octocat/beta', 'octocat/gamma'])
    expect(screen.getByText('3 repositories')).toBeInTheDocument()
  })

  it('offers Reconnect when the token has expired', async () => {
    mockFetch({ 'GET /user/repos': () => jsonResponse({}, { status: 401 }) })
    render(<Dashboard />)

    expect(await screen.findByText(/token is invalid or has expired/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reconnect' }))

    await vi.waitFor(() =>
      expect(window.location.href).toBe('chrome-extension://test-id/src/connect/index.html'),
    )
    expect(await chrome.storage.local.get('githubToken')).toEqual({})
  })

  it('offers Try again when rate limited', async () => {
    mockFetch({
      'GET /user/repos': () => jsonResponse({}, { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }),
    })
    render(<Dashboard />)

    expect(await screen.findByText(/rate limit reached/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})

describe('Dashboard: filters and sorting', () => {
  it('filters by name search', async () => {
    await renderLoaded()

    await userEvent.type(screen.getByPlaceholderText('Search by name...'), 'GAM')

    expect(tableNames()).toEqual(['octocat/gamma'])
  })

  it('filters by visibility and language together', async () => {
    await renderLoaded()
    const [visibility, language] = screen.getAllByRole('combobox')

    await userEvent.selectOptions(visibility, 'public')
    await userEvent.selectOptions(language, 'Python')

    expect(tableNames()).toEqual(['octocat/gamma'])
  })

  it('shows an empty-state message when nothing matches', async () => {
    await renderLoaded()

    await userEvent.type(screen.getByPlaceholderText('Search by name...'), 'nope')

    expect(screen.getByText('No repositories found with the current filters.')).toBeInTheDocument()
  })

  it('sorts by name after removing the default Updated rule', async () => {
    await renderLoaded()

    // Updated: desc -> asc -> removed. Then add Name (asc) and flip it to desc.
    await userEvent.click(screen.getByRole('button', { name: /^Updated/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Updated/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Name/ }))
    await userEvent.click(screen.getByRole('button', { name: /^Name/ }))

    expect(tableNames()).toEqual(['octocat/gamma', 'octocat/beta', 'octocat/alpha'])
  })
})

describe('Dashboard: bulk actions', () => {
  it('disables every bulk action until something is selected', async () => {
    await renderLoaded()

    expect(screen.getByRole('button', { name: 'Download' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Make private/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /^Make public/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeDisabled()
  })

  it('only counts repos that would actually change visibility', async () => {
    await renderLoaded()

    await select('octocat/alpha', 'octocat/beta')

    expect(screen.getByRole('button', { name: 'Make private (1)' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Make public (1)' })).toBeEnabled()
  })

  it('requires typing DELETE exactly before deleting', async () => {
    const fetchMock = await renderLoaded({
      'DELETE /repos/octocat/alpha': () => jsonResponse(null, { status: 204 }),
      'DELETE /repos/octocat/gamma': () => jsonResponse(null, { status: 204 }),
    })
    await select('octocat/alpha', 'octocat/gamma')
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }))

    const confirmButton = screen.getByRole('button', { name: 'Delete permanently' })
    expect(confirmButton).toBeDisabled()
    await userEvent.type(confirmInput(), 'delete')
    expect(confirmButton).toBeDisabled()
    expect(requestsTo(fetchMock, 'DELETE')).toEqual([])

    await userEvent.clear(confirmInput())
    await userEvent.type(confirmInput(), 'DELETE')
    await userEvent.click(confirmButton)

    await vi.waitFor(() =>
      expect(requestsTo(fetchMock, 'DELETE')).toEqual(['/repos/octocat/alpha', '/repos/octocat/gamma']),
    )
  })

  it('sends nothing when the delete modal is cancelled', async () => {
    const fetchMock = await renderLoaded()
    await select('octocat/alpha')
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }))

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Confirm deletion')).not.toBeInTheDocument()
    expect(requestsTo(fetchMock, 'DELETE')).toEqual([])
  })

  it('shows an error in the modal when a delete fails', async () => {
    await renderLoaded({
      'DELETE /repos/octocat/alpha': () => jsonResponse({}, { status: 403 }),
    })
    await select('octocat/alpha')
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }))
    await userEvent.type(confirmInput(), 'DELETE')
    await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText('Failed to delete one or more repositories.')).toBeInTheDocument()
  })

  it('makes only the public selected repos private', async () => {
    const fetchMock = await renderLoaded({
      'PATCH /repos/octocat/alpha': () => jsonResponse({}),
    })
    await select('octocat/alpha', 'octocat/beta')
    await userEvent.click(screen.getByRole('button', { name: 'Make private (1)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await vi.waitFor(() => expect(requestsTo(fetchMock, 'PATCH')).toEqual(['/repos/octocat/alpha']))
    const patch = fetchMock.mock.calls.find(([, o = {}]) => o.method === 'PATCH')
    expect(JSON.parse(patch[1].body)).toEqual({ private: true })
  })

  it('requires typing PUBLIC before exposing private repos', async () => {
    const fetchMock = await renderLoaded({
      'PATCH /repos/octocat/beta': () => jsonResponse({}),
    })
    await select('octocat/beta')
    await userEvent.click(screen.getByRole('button', { name: 'Make public (1)' }))

    const confirmButton = screen.getByRole('button', { name: 'Make public' })
    expect(confirmButton).toBeDisabled()

    await userEvent.type(confirmInput(), 'PUBLIC')
    await userEvent.click(confirmButton)

    await vi.waitFor(() => expect(requestsTo(fetchMock, 'PATCH')).toEqual(['/repos/octocat/beta']))
    const patch = fetchMock.mock.calls.find(([, o = {}]) => o.method === 'PATCH')
    expect(JSON.parse(patch[1].body)).toEqual({ private: false })
  })

  it('opens one zip download per selected repo', async () => {
    await renderLoaded()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    await select('octocat/alpha', 'octocat/gamma')

    await userEvent.click(screen.getByRole('button', { name: 'Download' }))

    expect(openSpy.mock.calls.map(([url]) => url)).toEqual([
      'https://github.com/octocat/alpha/archive/refs/heads/main.zip',
      'https://github.com/octocat/gamma/archive/refs/heads/main.zip',
    ])
  })
})
