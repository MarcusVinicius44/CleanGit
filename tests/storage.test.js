import { describe, expect, it } from 'vitest'
import { clearToken, getToken, setToken } from '../src/shared/storage.js'

describe('token storage', () => {
  it('returns null when no token was saved', async () => {
    expect(await getToken()).toBeNull()
  })

  it('saves and reads back the token from chrome.storage.local', async () => {
    await setToken('ghp_abc')
    expect(await getToken()).toBe('ghp_abc')
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ githubToken: 'ghp_abc' })
  })

  it('clears the token', async () => {
    await setToken('ghp_abc')
    await clearToken()
    expect(await getToken()).toBeNull()
  })
})
