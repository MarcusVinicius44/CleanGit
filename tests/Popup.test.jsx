import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Popup from '../src/popup/Popup.jsx'

describe('Popup', () => {
  it('sends a user without a token to the Connect page', async () => {
    render(<Popup />)

    await userEvent.click(await screen.findByRole('button', { name: 'Connect GitHub Account' }))

    expect(screen.getByText('Token not configured')).toBeInTheDocument()
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test-id/src/connect/index.html',
    })
  })

  it('sends a user with a saved token to the Dashboard', async () => {
    await chrome.storage.local.set({ githubToken: 'ghp_abc' })
    render(<Popup />)

    await userEvent.click(await screen.findByRole('button', { name: 'Open Clean Git Dashboard' }))

    expect(screen.getByText('Token Active')).toBeInTheDocument()
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test-id/src/dashboard/index.html',
    })
  })
})
