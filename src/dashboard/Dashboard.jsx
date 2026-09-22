import { useEffect, useMemo, useState } from 'react'
import { getToken, clearToken } from '../shared/storage.js'
import { listAllRepositories, deleteRepository, setRepositoryPrivate, GitHubApiError } from '../shared/github-api.js'
import { formatSize } from '../shared/format.js'
import { colors, fontFamily, monoFontFamily, radii } from '../shared/theme.js'
import SupportLinks from '../shared/SupportLinks.jsx'

const PAGE_SIZE = 10
const DONUT_COLORS = ['#58a6ff', '#bc8cff', '#f778ba', '#ffa657', '#7ee787', '#79c0ff']

const SORT_FIELDS = {
  updated: { label: 'Updated', compare: (a, b) => new Date(a.updated_at) - new Date(b.updated_at) },
  size: { label: 'Size', compare: (a, b) => a.size - b.size },
  name: { label: 'Name', compare: (a, b) => a.name.localeCompare(b.name) },
}

const DEFAULT_SORT_DIRECTION = { updated: 'desc', size: 'desc', name: 'asc' }

export default function Dashboard() {
  const [token, setToken] = useState(null)
  const [repos, setRepos] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [loadedCount, setLoadedCount] = useState(0)
  const [error, setError] = useState('')
  const [errorKind, setErrorKind] = useState('') // 'auth' | 'rateLimit' | 'network' | ''
  const [actionError, setActionError] = useState('')
  const [pendingAction, setPendingAction] = useState(null) // 'delete' | 'makePrivate' | 'makePublic' | null
  const [confirmText, setConfirmText] = useState('')

  const [search, setSearch] = useState('')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [languageFilter, setLanguageFilter] = useState('all')
  const [sortRules, setSortRules] = useState([{ key: 'updated', direction: 'desc' }])
  const [page, setPage] = useState(1)

  useEffect(() => {
    getToken().then((storedToken) => {
      if (!storedToken) {
        goToConnect()
        return
      }
      setToken(storedToken)
      loadRepos(storedToken)
    })
  }, [])

  function goToConnect() {
    window.location.href = chrome.runtime.getURL('src/connect/index.html')
  }

  async function handleDisconnect() {
    await clearToken()
    goToConnect()
  }

  async function loadRepos(activeToken) {
    setLoading(true)
    setLoadedCount(0)
    setError('')
    setErrorKind('')
    try {
      const data = await listAllRepositories(activeToken, setLoadedCount)
      setRepos(data)
    } catch (err) {
      if (err instanceof GitHubApiError && err.status === 401) {
        setErrorKind('auth')
        setError('Your token is invalid or has expired. Please reconnect your account.')
      } else if (err instanceof GitHubApiError && err.rateLimited) {
        setErrorKind('rateLimit')
        setError('GitHub API rate limit reached. Please wait a few minutes and try again.')
      } else if (err instanceof GitHubApiError && err.status === 0) {
        setErrorKind('network')
        setError('Could not reach GitHub. Check your internet connection and try again.')
      } else {
        setErrorKind('')
        setError('Could not load repositories. Check your token permissions and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const languages = useMemo(() => {
    const set = new Set(repos.map((repo) => repo.language).filter(Boolean))
    return Array.from(set).sort()
  }, [repos])

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      if (search && !repo.name.toLowerCase().includes(search.toLowerCase())) return false
      if (visibilityFilter === 'public' && repo.private) return false
      if (visibilityFilter === 'private' && !repo.private) return false
      if (languageFilter !== 'all' && repo.language !== languageFilter) return false
      return true
    })
  }, [repos, search, visibilityFilter, languageFilter])

  const sortedRepos = useMemo(() => {
    return [...filteredRepos].sort((a, b) => {
      for (const rule of sortRules) {
        const cmp = SORT_FIELDS[rule.key].compare(a, b)
        if (cmp !== 0) return rule.direction === 'asc' ? cmp : -cmp
      }
      return 0
    })
  }, [filteredRepos, sortRules])

  const totalPages = Math.max(1, Math.ceil(sortedRepos.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRepos = sortedRepos.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, visibilityFilter, languageFilter, sortRules])

  function toggleSort(key) {
    setSortRules((prev) => {
      const index = prev.findIndex((rule) => rule.key === key)
      if (index === -1) {
        return [...prev, { key, direction: DEFAULT_SORT_DIRECTION[key] }]
      }
      const current = prev[index]
      if (current.direction === DEFAULT_SORT_DIRECTION[key]) {
        const next = [...prev]
        next[index] = { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        return next
      }
      return prev.filter((rule) => rule.key !== key)
    })
  }

  const metrics = useMemo(() => {
    const publicCount = repos.filter((repo) => !repo.private).length
    const privateCount = repos.length - publicCount
    const totalSizeKb = repos.reduce((sum, repo) => sum + repo.size, 0)
    return { total: repos.length, publicCount, privateCount, totalSize: formatSize(totalSizeKb) }
  }, [repos])

  const selectedRepos = repos.filter((repo) => selected.has(repo.full_name))
  const makePrivateTargets = selectedRepos.filter((repo) => !repo.private)
  const makePublicTargets = selectedRepos.filter((repo) => repo.private)
  const donutSource = selectedRepos.length > 0 ? selectedRepos : repos

  const languageDistribution = useMemo(() => {
    const counts = new Map()
    for (const repo of donutSource) {
      const key = repo.language ?? 'No language'
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  }, [donutSource])

  const donutGradient = useMemo(() => {
    if (donutSource.length === 0) return colors.border
    let cursor = 0
    const stops = languageDistribution.map((item, index) => {
      const start = cursor
      cursor += (item.count / donutSource.length) * 360
      const color = DONUT_COLORS[index % DONUT_COLORS.length]
      return `${color} ${start}deg ${cursor}deg`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [languageDistribution, donutSource])

  function toggleSelected(fullName) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(fullName) ? next.delete(fullName) : next.add(fullName)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev)
      const allSelected = pageRepos.every((repo) => next.has(repo.full_name))
      for (const repo of pageRepos) {
        allSelected ? next.delete(repo.full_name) : next.add(repo.full_name)
      }
      return next
    })
  }

  function openPendingAction(type) {
    setActionError('')
    setConfirmText('')
    setPendingAction(type)
  }

  function describeActionError(err, fallback) {
    if (err instanceof GitHubApiError && err.status === 401) {
      return 'Your token is invalid or has expired. Please reconnect your account.'
    }
    if (err instanceof GitHubApiError && err.rateLimited) {
      return 'GitHub API rate limit reached. Please wait a few minutes and try again.'
    }
    return fallback
  }

  async function handleConfirmDelete() {
    setActionError('')
    try {
      for (const repo of selectedRepos) {
        await deleteRepository(token, repo.owner.login, repo.name)
      }
      setSelected(new Set())
      setPendingAction(null)
      setConfirmText('')
      loadRepos(token)
    } catch (err) {
      setActionError(describeActionError(err, 'Failed to delete one or more repositories.'))
    }
  }

  async function handleConfirmMakePrivate() {
    setActionError('')
    try {
      for (const repo of makePrivateTargets) {
        await setRepositoryPrivate(token, repo.owner.login, repo.name, true)
      }
      setSelected(new Set())
      setPendingAction(null)
      loadRepos(token)
    } catch (err) {
      setActionError(describeActionError(err, 'Failed to make one or more repositories private.'))
    }
  }

  async function handleConfirmMakePublic() {
    setActionError('')
    try {
      for (const repo of makePublicTargets) {
        await setRepositoryPrivate(token, repo.owner.login, repo.name, false)
      }
      setSelected(new Set())
      setPendingAction(null)
      setConfirmText('')
      loadRepos(token)
    } catch (err) {
      setActionError(describeActionError(err, 'Failed to make one or more repositories public.'))
    }
  }

  function handleDownload() {
    for (const repo of selectedRepos) {
      window.open(
        `https://github.com/${repo.full_name}/archive/refs/heads/${repo.default_branch}.zip`,
        '_blank',
      )
    }
  }

  return (
    <div
      style={{
        fontFamily,
        background: colors.bgPage,
        color: colors.textPrimary,
        minHeight: '100vh',
        padding: 32,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/icons/icon48.png" alt="" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: colors.textPrimary }}>
              Clean Git Dashboard
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: radii.md,
                background: colors.successBg,
                border: `1px solid ${colors.successBorder}`,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors.success }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: colors.success }}>Token Active</span>
            </div>
            <button onClick={handleDisconnect} style={ghostButtonStyle(false)}>
              Disconnect
            </button>
          </div>
        </div>

        {loading && (
          <p style={{ color: colors.textSecondary }}>
            Loading repositories{loadedCount > 0 ? ` (${loadedCount} found so far...)` : '...'}
          </p>
        )}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <p style={{ color: colors.danger, margin: 0 }}>{error}</p>
            {errorKind === 'auth' ? (
              <button onClick={handleDisconnect} style={ghostButtonStyle(false)}>
                Reconnect
              </button>
            ) : (
              <button onClick={() => loadRepos(token)} style={ghostButtonStyle(false)}>
                Try again
              </button>
            )}
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <MetricCard label="Repositories" value={metrics.total} />
              <MetricCard label="Public" value={metrics.publicCount} />
              <MetricCard label="Private" value={metrics.privateCount} />
              <MetricCard label="Total storage" value={metrics.totalSize} />
            </div>

            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name..."
                    style={inputStyle({ flex: 1, minWidth: 160 })}
                  />
                  <select
                    value={visibilityFilter}
                    onChange={(e) => setVisibilityFilter(e.target.value)}
                    style={inputStyle({})}
                  >
                    <option value="all">All visibilities</option>
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <select
                    value={languageFilter}
                    onChange={(e) => setLanguageFilter(e.target.value)}
                    style={inputStyle({})}
                  >
                    <option value="all">All languages</option>
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: colors.textSecondary }}>Sort by:</span>
                  {Object.keys(SORT_FIELDS).map((key) => {
                    const rule = sortRules.find((r) => r.key === key)
                    const priority = sortRules.findIndex((r) => r.key === key) + 1
                    return (
                      <button
                        key={key}
                        onClick={() => toggleSort(key)}
                        style={sortButtonStyle(Boolean(rule))}
                      >
                        {SORT_FIELDS[key].label}
                        {rule && ` ${rule.direction === 'asc' ? '↑' : '↓'}${sortRules.length > 1 ? priority : ''}`}
                      </button>
                    )
                  })}
                </div>

                <div
                  style={{
                    background: colors.bgSurface,
                    border: `1px solid ${colors.border}`,
                    borderRadius: radii.lg,
                    overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: `1px solid ${colors.border}` }}>
                        <th style={{ padding: '10px 12px' }}>
                          <input
                            type="checkbox"
                            checked={pageRepos.length > 0 && pageRepos.every((repo) => selected.has(repo.full_name))}
                            onChange={toggleSelectAllOnPage}
                          />
                        </th>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Description</th>
                        <th style={thStyle}>Visibility</th>
                        <th style={thStyle}>Language</th>
                        <th style={thStyle}>Size</th>
                        <th style={thStyle}>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRepos.map((repo) => (
                        <tr key={repo.full_name} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          <td style={{ padding: '10px 12px' }}>
                            <input
                              type="checkbox"
                              checked={selected.has(repo.full_name)}
                              onChange={() => toggleSelected(repo.full_name)}
                            />
                          </td>
                          <td style={{ ...tdStyle, color: colors.textPrimary }}>{repo.full_name}</td>
                          <td
                            style={{
                              ...tdStyle,
                              maxWidth: 240,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={repo.description ?? ''}
                          >
                            {repo.description || '-'}
                          </td>
                          <td style={tdStyle}>{repo.private ? 'Private' : 'Public'}</td>
                          <td style={tdStyle}>{repo.language ?? '-'}</td>
                          <td style={tdStyle}>{formatSize(repo.size)}</td>
                          <td style={tdStyle}>{new Date(repo.updated_at).toLocaleDateString('en-US')}</td>
                        </tr>
                      ))}
                      {pageRepos.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: '16px 12px', color: colors.textSecondary }}>
                            No repositories found with the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 12,
                    fontSize: 13,
                    color: colors.textSecondary,
                  }}
                >
                  <span>{filteredRepos.length} {filteredRepos.length === 1 ? 'repository' : 'repositories'}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setPage(currentPage - 1)}
                      style={ghostButtonStyle(currentPage <= 1)}
                    >
                      Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage(currentPage + 1)}
                      style={ghostButtonStyle(currentPage >= totalPages)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              <aside
                style={{
                  width: 280,
                  flexShrink: 0,
                  background: colors.bgSurface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.lg,
                  padding: 16,
                }}
              >
                <h2 style={{ fontSize: 14, fontWeight: 600, marginTop: 0, color: colors.textPrimary }}>
                  {selectedRepos.length > 0 ? `${selectedRepos.length} selected` : 'Language distribution'}
                </h2>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                  <div style={{ width: 120, height: 120, borderRadius: '50%', background: donutGradient }} />
                </div>

                <div style={{ fontSize: 12, marginBottom: 16 }}>
                  {languageDistribution.map((item, index) => (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: DONUT_COLORS[index % DONUT_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, color: colors.textPrimary }}>{item.label}</span>
                      <span style={{ color: colors.textSecondary }}>{item.count}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  <button
                    disabled={selectedRepos.length === 0}
                    onClick={handleDownload}
                    style={solidButtonStyle(colors.accent, colors.accentText, selectedRepos.length === 0)}
                  >
                    Download
                  </button>
                  <button
                    disabled={makePrivateTargets.length === 0}
                    onClick={() => openPendingAction('makePrivate')}
                    style={ghostButtonStyle(makePrivateTargets.length === 0)}
                  >
                    Make private{makePrivateTargets.length > 0 ? ` (${makePrivateTargets.length})` : ''}
                  </button>
                  <button
                    disabled={makePublicTargets.length === 0}
                    onClick={() => openPendingAction('makePublic')}
                    style={ghostButtonStyle(makePublicTargets.length === 0)}
                  >
                    Make public{makePublicTargets.length > 0 ? ` (${makePublicTargets.length})` : ''}
                  </button>
                  <button
                    disabled={selectedRepos.length === 0}
                    onClick={() => openPendingAction('delete')}
                    style={solidButtonStyle(colors.dangerSolid, '#fff', selectedRepos.length === 0)}
                  >
                    Delete selected
                  </button>
                </div>

                <p
                  style={{
                    fontSize: 11,
                    color: colors.danger,
                    background: colors.dangerBg,
                    border: `1px solid ${colors.dangerBorder}`,
                    padding: 10,
                    borderRadius: radii.md,
                    margin: 0,
                  }}
                >
                  Delete actions are permanent and cannot be undone by GitHub.
                </p>

                <div style={{ height: 1, background: colors.border, margin: '16px 0' }} />

                <SupportLinks />
              </aside>
            </div>
          </>
        )}

        {pendingAction === 'delete' && (
          <ConfirmModal
            title="Confirm deletion"
            titleColor={colors.danger}
            description={`You are about to permanently delete ${selectedRepos.length} ${selectedRepos.length === 1 ? 'repository' : 'repositories'}:`}
            repos={selectedRepos}
            error={actionError}
            onCancel={() => setPendingAction(null)}
          >
            <p style={{ fontSize: 12, color: colors.textSecondary }}>
              Type <strong style={{ color: colors.textPrimary }}>DELETE</strong> to confirm:
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              style={{ ...inputStyle({}), width: '100%', height: 36, marginBottom: 16, fontFamily: monoFontFamily }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setPendingAction(null)} style={ghostButtonStyle(false)}>
                Cancel
              </button>
              <button
                disabled={confirmText !== 'DELETE'}
                onClick={handleConfirmDelete}
                style={solidButtonStyle(colors.dangerSolid, '#fff', confirmText !== 'DELETE')}
              >
                Delete permanently
              </button>
            </div>
          </ConfirmModal>
        )}

        {pendingAction === 'makePrivate' && (
          <ConfirmModal
            title="Make repositories private"
            titleColor={colors.textPrimary}
            description="The following public repositories will be made private:"
            repos={makePrivateTargets}
            error={actionError}
            onCancel={() => setPendingAction(null)}
          >
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setPendingAction(null)} style={ghostButtonStyle(false)}>
                Cancel
              </button>
              <button onClick={handleConfirmMakePrivate} style={solidButtonStyle(colors.accent, colors.accentText, false)}>
                Confirm
              </button>
            </div>
          </ConfirmModal>
        )}

        {pendingAction === 'makePublic' && (
          <ConfirmModal
            title="Make repositories public"
            titleColor={colors.danger}
            description="The following private repositories will become visible to anyone on the internet, including their full commit history:"
            repos={makePublicTargets}
            error={actionError}
            onCancel={() => setPendingAction(null)}
          >
            <p style={{ fontSize: 12, color: colors.textSecondary }}>
              Type <strong style={{ color: colors.textPrimary }}>PUBLIC</strong> to confirm:
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              style={{ ...inputStyle({}), width: '100%', height: 36, marginBottom: 16, fontFamily: monoFontFamily }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setPendingAction(null)} style={ghostButtonStyle(false)}>
                Cancel
              </button>
              <button
                disabled={confirmText !== 'PUBLIC'}
                onClick={handleConfirmMakePublic}
                style={solidButtonStyle(colors.dangerSolid, '#fff', confirmText !== 'PUBLIC')}
              >
                Make public
              </button>
            </div>
          </ConfirmModal>
        )}
      </div>
    </div>
  )
}

const thStyle = { padding: '10px 12px', color: colors.textSecondary, fontWeight: 600 }
const tdStyle = { padding: '10px 12px', color: colors.textSecondary }

function inputStyle(extra) {
  return {
    height: 36,
    padding: '0 12px',
    background: colors.bgPage,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.sm,
    fontSize: 13,
    fontFamily,
    color: colors.textPrimary,
    ...extra,
  }
}

function MetricCard({ label, value }) {
  return (
    <div
      style={{
        background: colors.bgSurface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 12, color: colors.textSecondary }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: colors.textPrimary }}>{value}</div>
    </div>
  )
}

function ConfirmModal({ title, titleColor, description, repos, error, onCancel, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(1, 4, 9, 0.7)',
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
          padding: 24,
          width: 420,
          fontFamily,
        }}
      >
        <h2 style={{ fontSize: 16, color: titleColor, marginTop: 0 }}>{title}</h2>
        <p style={{ fontSize: 13, color: colors.textSecondary }}>{description}</p>
        <ul style={{ fontSize: 12, maxHeight: 120, overflowY: 'auto', color: colors.textPrimary, margin: 0, paddingLeft: 18 }}>
          {repos.map((repo) => (
            <li key={repo.full_name}>{repo.full_name}</li>
          ))}
        </ul>
        {error && <p style={{ color: colors.danger, fontSize: 13 }}>{error}</p>}
        {children}
      </div>
    </div>
  )
}

function solidButtonStyle(background, textColor, disabled) {
  return {
    background,
    color: textColor,
    border: 'none',
    borderRadius: radii.sm,
    padding: '8px 14px',
    fontFamily,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}

function sortButtonStyle(active) {
  return {
    background: active ? colors.infoBg : 'transparent',
    color: active ? colors.accent : colors.textSecondary,
    border: `1px solid ${active ? colors.infoBorder : colors.border}`,
    borderRadius: radii.sm,
    padding: '6px 12px',
    fontFamily,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

function ghostButtonStyle(disabled) {
  return {
    background: 'transparent',
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: radii.sm,
    padding: '8px 14px',
    fontFamily,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
  }
}
