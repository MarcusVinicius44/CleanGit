const API_BASE = 'https://api.github.com'

async function githubRequest(token, path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`GitHub API error (${response.status}): ${response.statusText}`)
  }

  return response.status === 204 ? null : response.json()
}

export function getAuthenticatedUser(token) {
  return githubRequest(token, '/user')
}

export function listRepositories(token, page = 1) {
  return githubRequest(
    token,
    `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner`,
  )
}

export async function listAllRepositories(token) {
  const repos = []
  let page = 1

  while (true) {
    const pageRepos = await listRepositories(token, page)
    repos.push(...pageRepos)
    if (pageRepos.length < 100) break
    page += 1
  }

  return repos
}

export function deleteRepository(token, owner, repo) {
  return githubRequest(token, `/repos/${owner}/${repo}`, { method: 'DELETE' })
}

export function setRepositoryPrivate(token, owner, repo, isPrivate) {
  return githubRequest(token, `/repos/${owner}/${repo}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ private: isPrivate }),
  })
}
