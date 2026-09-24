import { describe, expect, it, vi } from 'vitest'
import {
  deleteRepository,
  getAuthenticatedUser,
  GitHubApiError,
  listAllRepositories,
  setRepositoryPrivate,
} from '../src/shared/github-api.js'
import { jsonResponse, makeRepo, mockFetch } from './helpers.js'

describe('githubRequest (via getAuthenticatedUser)', () => {
  it('sends the token only to api.github.com with the GitHub headers', async () => {
    const fetchMock = mockFetch({ 'GET /user': () => jsonResponse({ login: 'octocat' }) })

    await expect(getAuthenticatedUser('ghp_abc')).resolves.toEqual({ login: 'octocat' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.github.com/user')
    expect(options.headers.Authorization).toBe('Bearer ghp_abc')
    expect(options.headers.Accept).toBe('application/vnd.github+json')
  })

  it('throws GitHubApiError with status 401 for a bad token', async () => {
    mockFetch({ 'GET /user': () => jsonResponse({}, { status: 401 }) })

    const err = await getAuthenticatedUser('bad').catch((e) => e)
    expect(err).toBeInstanceOf(GitHubApiError)
    expect(err.status).toBe(401)
    expect(err.rateLimited).toBe(false)
  })

  it('flags 403 with zero remaining quota as rate limited', async () => {
    mockFetch({
      'GET /user': () => jsonResponse({}, { status: 403, headers: { 'X-RateLimit-Remaining': '0' } }),
    })

    const err = await getAuthenticatedUser('t').catch((e) => e)
    expect(err.status).toBe(403)
    expect(err.rateLimited).toBe(true)
  })

  it('does not flag a plain 403 (missing permission) as rate limited', async () => {
    mockFetch({
      'GET /user': () => jsonResponse({}, { status: 403, headers: { 'X-RateLimit-Remaining': '42' } }),
    })

    const err = await getAuthenticatedUser('t').catch((e) => e)
    expect(err.rateLimited).toBe(false)
  })

  it('maps a network failure to status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const err = await getAuthenticatedUser('t').catch((e) => e)
    expect(err).toBeInstanceOf(GitHubApiError)
    expect(err.status).toBe(0)
  })
})

describe('listAllRepositories', () => {
  it('keeps paging while GitHub returns full pages of 100', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => makeRepo({ name: `a${i}` }))
    const page2 = [makeRepo({ name: 'last' })]
    const fetchMock = mockFetch({
      'GET /user/repos': (url) => {
        const page = new URL(url).searchParams.get('page')
        return jsonResponse(page === '1' ? page1 : page2)
      },
    })
    const onProgress = vi.fn()

    const repos = await listAllRepositories('t', onProgress)

    expect(repos).toHaveLength(101)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, 100)
    expect(onProgress).toHaveBeenNthCalledWith(2, 101)
  })

  it('only asks for repositories the user owns', async () => {
    const fetchMock = mockFetch({ 'GET /user/repos': () => jsonResponse([]) })

    await listAllRepositories('t')

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.searchParams.get('affiliation')).toBe('owner')
    expect(url.searchParams.get('per_page')).toBe('100')
  })
})

describe('repository mutations', () => {
  it('deletes with DELETE /repos/:owner/:repo and handles the empty 204 body', async () => {
    const fetchMock = mockFetch({
      'DELETE /repos/octocat/old': () => jsonResponse(null, { status: 204 }),
    })

    await expect(deleteRepository('t', 'octocat', 'old')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('changes visibility with a PATCH body of { private }', async () => {
    const fetchMock = mockFetch({
      'PATCH /repos/octocat/app': () => jsonResponse(makeRepo({ name: 'app', private: true })),
    })

    await setRepositoryPrivate('t', 'octocat', 'app', true)

    const options = fetchMock.mock.calls[0][1]
    expect(JSON.parse(options.body)).toEqual({ private: true })
    expect(options.headers['Content-Type']).toBe('application/json')
  })
})
