const TOKEN_KEY = 'githubToken'

export async function getToken() {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  return result[TOKEN_KEY] ?? null
}

export async function setToken(token) {
  await chrome.storage.local.set({ [TOKEN_KEY]: token })
}

export async function clearToken() {
  await chrome.storage.local.remove(TOKEN_KEY)
}
