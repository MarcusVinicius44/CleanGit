import { describe, expect, it } from 'vitest'
import { formatSize } from '../src/shared/format.js'

describe('formatSize', () => {
  it('keeps values under 1 MB in KB', () => {
    expect(formatSize(0)).toBe('0 KB')
    expect(formatSize(1023)).toBe('1023 KB')
  })

  it('converts to MB with one decimal', () => {
    expect(formatSize(1024)).toBe('1.0 MB')
    expect(formatSize(1536)).toBe('1.5 MB')
  })

  it('converts to GB with two decimals', () => {
    expect(formatSize(1024 * 1024)).toBe('1.00 GB')
    expect(formatSize(1024 * 1024 * 2.5)).toBe('2.50 GB')
  })
})
