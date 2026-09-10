import { useEffect, useState } from 'react'
import { getToken } from '../shared/storage.js'
import { listRepositories, deleteRepository } from '../shared/github-api.js'

export default function Dashboard() {
  const [token, setToken] = useState(null)
  const [repos, setRepos] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmStep, setConfirmStep] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    getToken().then((storedToken) => {
      if (!storedToken) {
        window.location.href = chrome.runtime.getURL('src/connect/index.html')
        return
      }
      setToken(storedToken)
      loadRepos(storedToken)
    })
  }, [])

  async function loadRepos(activeToken) {
    setLoading(true)
    setError('')
    try {
      const data = await listRepositories(activeToken)
      setRepos(data)
    } catch (err) {
      setError('Nao foi possivel carregar os repositorios. Verifique o token.')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelected(fullName) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(fullName) ? next.delete(fullName) : next.add(fullName)
      return next
    })
  }

  async function handleConfirmDelete() {
    const targets = repos.filter((repo) => selected.has(repo.full_name))
    for (const repo of targets) {
      await deleteRepository(token, repo.owner.login, repo.name)
    }
    setSelected(new Set())
    setConfirmStep(false)
    setConfirmText('')
    loadRepos(token)
  }

  const selectedRepos = repos.filter((repo) => selected.has(repo.full_name))

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22 }}>Clean Git Dashboard</h1>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 24 }}>
        {repos.length} repositorio(s) encontrados.
      </p>

      {loading && <p>Carregando repositorios...</p>}
      {error && <p style={{ color: '#cf222e' }}>{error}</p>}

      {!loading && !error && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e5e5' }}>
              <th style={{ padding: '8px 4px' }}></th>
              <th style={{ padding: '8px 4px' }}>Nome</th>
              <th style={{ padding: '8px 4px' }}>Visibilidade</th>
              <th style={{ padding: '8px 4px' }}>Linguagem</th>
              <th style={{ padding: '8px 4px' }}>Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => (
              <tr key={repo.full_name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px 4px' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(repo.full_name)}
                    onChange={() => toggleSelected(repo.full_name)}
                  />
                </td>
                <td style={{ padding: '8px 4px' }}>{repo.full_name}</td>
                <td style={{ padding: '8px 4px' }}>{repo.private ? 'Privado' : 'Publico'}</td>
                <td style={{ padding: '8px 4px' }}>{repo.language ?? '-'}</td>
                <td style={{ padding: '8px 4px' }}>
                  {new Date(repo.updated_at).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected.size > 0 && !confirmStep && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#24292f',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span>{selected.size} selecionado(s)</span>
          <button
            onClick={() => setConfirmStep(true)}
            style={{
              background: '#cf222e',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 14px',
              cursor: 'pointer',
            }}
          >
            Apagar selecionados
          </button>
        </div>
      )}

      {confirmStep && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 420 }}>
            <h2 style={{ fontSize: 16, color: '#cf222e' }}>Confirmar exclusao</h2>
            <p style={{ fontSize: 13, color: '#444' }}>
              Voce esta prestes a apagar permanentemente {selectedRepos.length} repositorio(s):
            </p>
            <ul style={{ fontSize: 12, maxHeight: 120, overflowY: 'auto' }}>
              {selectedRepos.map((repo) => (
                <li key={repo.full_name}>{repo.full_name}</li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: '#666' }}>
              Digite <strong>DELETE</strong> para confirmar:
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              style={{ width: '100%', height: 36, boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmStep(false)}>Cancelar</button>
              <button
                disabled={confirmText !== 'DELETE'}
                onClick={handleConfirmDelete}
                style={{
                  background: '#cf222e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '8px 14px',
                  cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                  opacity: confirmText === 'DELETE' ? 1 : 0.5,
                }}
              >
                Apagar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
