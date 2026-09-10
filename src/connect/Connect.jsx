import { useState } from 'react'
import { setToken } from '../shared/storage.js'
import { getAuthenticatedUser } from '../shared/github-api.js'

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
      setError('Token invalido ou sem as permissoes necessarias.')
    }
  }

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 480,
        margin: '80px auto',
        border: '1px solid #e5e5e5',
        borderRadius: 12,
        padding: 40,
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Connect your GitHub account</h1>
      <p style={{ fontSize: 14, color: '#555', marginBottom: 24 }}>
        Clean Git needs a Personal Access Token to list and manage your repositories.
      </p>

      <form onSubmit={handleConnect}>
        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
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
            border: '1px solid #ccc',
            borderRadius: 6,
            fontSize: 13,
          }}
        />
        <p style={{ fontSize: 12, color: '#777', marginTop: 6 }}>
          Requires the &apos;repo&apos; and &apos;delete_repo&apos; scopes.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 12,
            color: '#666',
            background: '#f6f8fa',
            padding: 12,
            borderRadius: 6,
            margin: '16px 0',
          }}
        >
          <span>🔒</span>
          <span>Your token is stored locally in your browser and never leaves your machine.</span>
        </div>

        {status === 'error' && (
          <p style={{ color: '#cf222e', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          style={{
            width: '100%',
            height: 43,
            border: 'none',
            borderRadius: 6,
            background: '#1f6feb',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {status === 'loading' ? 'Conectando...' : 'Connect Account'}
        </button>
      </form>

      <a
        href="https://github.com/settings/tokens/new?scopes=repo,delete_repo&description=Clean%20Git"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 13, color: '#1f6feb', display: 'inline-block', marginTop: 16 }}
      >
        Don&apos;t have a token? Create one on GitHub →
      </a>
    </div>
  )
}
