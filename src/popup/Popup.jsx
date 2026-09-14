import { useEffect, useState } from 'react'
import { getToken } from '../shared/storage.js'
import { colors, fontFamily, radii } from '../shared/theme.js'
import SupportLinks from '../shared/SupportLinks.jsx'

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
    <div
      style={{
        fontFamily,
        background: colors.bgPage,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/icons/icon48.png" alt="Clean Git" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: colors.textPrimary }}>Clean Git</div>
          <div style={{ fontSize: 11, color: colors.textSecondary }}>Bulk Repository Manager</div>
        </div>
      </div>

      <div style={{ height: 1, background: colors.border, width: '100%' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderRadius: radii.md,
          background: hasToken ? colors.successBg : 'rgba(139, 148, 158, 0.1)',
          border: `1px solid ${hasToken ? colors.successBorder : colors.border}`,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: hasToken ? colors.success : colors.textSecondary,
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 600, color: hasToken ? colors.success : colors.textSecondary }}>
          {hasToken ? 'Token Active' : 'Token not configured'}
        </span>
      </div>

      <p style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.45, margin: 0 }}>
        Manage and clean up your GitHub repositories in bulk, right from your browser.
      </p>

      <button
        onClick={openDashboard}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: radii.md,
          background: colors.accent,
          color: colors.accentText,
          fontSize: 13,
          fontWeight: 600,
          fontFamily,
          padding: '12px 0',
          cursor: 'pointer',
        }}
      >
        {hasToken ? 'Open Clean Git Dashboard' : 'Connect GitHub Account'}
      </button>

      <div style={{ textAlign: 'center' }}>
        <SupportLinks compact />
      </div>
    </div>
  )
}
