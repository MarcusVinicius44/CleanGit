import { donationLinks } from './donationLinks.js'
import { colors, radii } from './theme.js'

export default function SupportLinks({ compact = false }) {
  const items = [
    donationLinks.githubSponsors && { label: 'GitHub Sponsors', url: donationLinks.githubSponsors },
    donationLinks.buyMeACoffee && { label: 'Buy Me a Coffee', url: donationLinks.buyMeACoffee },
  ].filter(Boolean)

  if (items.length === 0) return null

  if (compact) {
    return (
      <a
        href={items[0].url}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 11, color: colors.textSecondary, textDecoration: 'none' }}
      >
        ♥ Support this project
      </a>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: colors.textPrimary }}>Support CleanGit</h2>
      <p style={{ fontSize: 11, color: colors.textSecondary, margin: 0 }}>
        CleanGit is free and always will be. If it saves you time, consider supporting development.
      </p>
      {items.map((item) => (
        <a
          key={item.label}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            padding: '8px 0',
            borderRadius: radii.sm,
            border: `1px solid ${colors.border}`,
            color: colors.textPrimary,
            textDecoration: 'none',
          }}
        >
          {item.label}
        </a>
      ))}
    </div>
  )
}
