import { useEffect, useState } from 'react'
import { getToken } from '../shared/storage.js'

export default function Popup() {
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    getToken().then((token) => setHasToken(Boolean(token)))
  }, [])

  function openDashboard() {
    const page = hasToken ? 'src/dashboard/index.html' : 'src/connect/index.html'
    chrome.tabs.create({ url: chrome.runtime.getURL(page) })
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: '#1f6feb',
          }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Clean Git</div>
          <div style={{ fontSize: 11, color: '#666' }}>Bulk Repository Manager</div>
        </div>
      </div>

      <hr style={{ margin: '18px 0', border: 'none', borderTop: '1px solid #e5e5e5' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: hasToken ? '#2ea043' : '#8b8b8b',
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: 12 }}>{hasToken ? 'Token Active' : 'Token nao configurado'}</span>
      </div>

      <p style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>
        Gerencie e limpe seus repositorios do GitHub em massa, direto do navegador.
      </p>

      <button
        onClick={openDashboard}
        style={{
          width: '100%',
          height: 40,
          marginTop: 12,
          border: 'none',
          borderRadius: 6,
          background: '#1f6feb',
          color: '#fff',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {hasToken ? 'Abrir Dashboard Clean Git' : 'Conectar conta do GitHub'}
      </button>
    </div>
  )
}
