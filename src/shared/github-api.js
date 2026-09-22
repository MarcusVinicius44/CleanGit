const API_BASE = 'https://api.github.com'

export class GitHubApiError extends Error {
  constructor(message, status, rateLimited = false) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.rateLimited = rateLimited
  }
}

async function githubRequest(token, path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        ...options.headers,
      },
    })
  } catch (err) {
    throw new GitHubApiError('Network error while reaching GitHub.', 0)
  }

  if (!response.ok) {
    const rateLimited = response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0'
    throw new GitHubApiError(
      `GitHub API error (${response.status}): ${response.statusText}`,
      response.status,
      rateLimited,
    )
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

export async function listAllRepositories(token, onProgress) {
  const repos = []
  let page = 1

  while (true) {
    const pageRepos = await listRepositories(token, page)
    repos.push(...pageRepos)
    onProgress?.(repos.length)
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
