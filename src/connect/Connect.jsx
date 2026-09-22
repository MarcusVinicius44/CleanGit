import { useState } from 'react'
import { setToken } from '../shared/storage.js'
import { getAuthenticatedUser, GitHubApiError } from '../shared/github-api.js'
import { colors, fontFamily, monoFontFamily, radii } from '../shared/theme.js'

export default function Connect() {
  const [token, setTokenInput] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error
  const [error, setError] = useState('')

  async function handleConnect(event) {
    event.preventDefault()
    setStatus('loading')
    setError('')

    try {
      await getAuthenticatedUser(token.trim())
      await setToken(token.trim())
      window.location.href = chrome.runtime.getURL('src/dashboard/index.html')
    } catch (err) {
      setStatus('error')
      if (err instanceof GitHubApiError && err.status === 401) {
        setError('Invalid token. Check that you pasted it correctly.')
      } else if (err instanceof GitHubApiError && err.status === 0) {
        setError('Could not reach GitHub. Check your internet connection and try again.')
      } else {
        setError('Could not connect. Make sure the token has the "repo" and "delete_repo" scopes.')
      }
    }
  }

  return (
    <div
      style={{
        fontFamily,
        background: colors.bgPage,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: colors.bgSurface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.xl,
          padding: '40px 40px 32px',
          width: 480,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <img src="/icons/icon48.png" alt="" style={{ width: 48, height: 48, borderRadius: 10 }} />

        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.textPrimary, margin: '0 0 6px' }}>
            Connect your GitHub account
          </h1>
          <p style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 1.45, margin: 0 }}>
            Clean Git needs a Personal Access Token to list and manage your repositories.
          </p>
        </div>

        <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: colors.textPrimary,
                display: 'block',
                marginBottom: 8,
              }}
            >
              Personal Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              required
              style={{
                width: '100%',
                height: 41,
                padding: '0 12px',
                boxSizing: 'border-box',
                background: colors.bgPage,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.sm,
                fontSize: 13,
                fontFamily: monoFontFamily,
                color: colors.textPrimary,
              }}
            />
            <p style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>
              Requires the &apos;repo&apos; and &apos;delete_repo&apos; scopes.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              fontSize: 11,
              color: colors.accent,
              background: colors.infoBg,
              border: `1px solid ${colors.infoBorder}`,
              padding: '10px 12px',
              borderRadius: radii.md,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent, flexShrink: 0 }} />
            <span>Your token is stored locally in your browser and never leaves your machine.</span>
          </div>

          {status === 'error' && (
            <p style={{ color: colors.danger, fontSize: 13, margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%',
              border: 'none',
              borderRadius: radii.md,
              background: colors.accent,
              color: colors.accentText,
              fontSize: 14,
              fontWeight: 600,
              fontFamily,
              padding: '13px 0',
              cursor: status === 'loading' ? 'wait' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
            }}
          >
            {status === 'loading' ? 'Connecting...' : 'Connect Account'}
          </button>
        </form>

        <a
          href="https://github.com/settings/tokens/new?scopes=repo,delete_repo&description=Clean%20Git"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, fontWeight: 600, color: colors.accent, textDecoration: 'none' }}
        >
          Don&apos;t have a token? Create one on GitHub →
        </a>
      </div>
    </div>
  )
}
