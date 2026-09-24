import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Connect from '../src/connect/Connect.jsx'
import { jsonResponse, mockFetch } from './helpers.js'

async function submitToken(token) {
  render(<Connect />)
  await userEvent.type(screen.getByPlaceholderText(/^ghp_/), token)
  await userEvent.click(screen.getByRole('button', { name: 'Connect Account' }))
}

describe('Connect', () => {
  it('validates the token, saves it trimmed, and opens the Dashboard', async () => {
    const fetchMock = mockFetch({ 'GET /user': () => jsonResponse({ login: 'octocat' }) })

    await submitToken('  ghp_valid  ')

    await vi.waitFor(() =>
      expect(window.location.href).toBe('chrome-extension://test-id/src/dashboard/index.html'),
    )
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer ghp_valid')
    expect(await chrome.storage.local.get('githubToken')).toEqual({ githubToken: 'ghp_valid' })
  })

  it('does not save the token when GitHub rejects it', async () => {
    mockFetch({ 'GET /user': () => jsonResponse({}, { status: 401 }) })

    await submitToken('ghp_bad')

    expect(await screen.findByText(/Invalid token/)).toBeInTheDocument()
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('explains a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await submitToken('ghp_any')

    expect(await screen.findByText(/Could not reach GitHub/)).toBeInTheDocument()
  })

  it('points to missing scopes for other errors', async () => {
    mockFetch({ 'GET /user': () => jsonResponse({}, { status: 403 }) })

    await submitToken('ghp_noscope')

    expect(await screen.findByText(/"repo" and "delete_repo" scopes/)).toBeInTheDocument()
  })
})
