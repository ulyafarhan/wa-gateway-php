import { describe, it, before, after, mock } from 'node:test'
import assert from 'node:assert/strict'

process.env.VITE_API_URL = ''

let api, setAccessToken, clearAccessToken, getAccessToken, axiosMod

before(async () => {
  const mod = await import('../src/api/client.js')
  api = mod.default
  setAccessToken = mod.setAccessToken
  clearAccessToken = mod.clearAccessToken
  getAccessToken = mod.getAccessToken
  axiosMod = (await import('axios')).default
})

after(() => {
  clearAccessToken()
  mock.reset()
})

describe('token management', () => {
  it('starts null', () => {
    assert.equal(getAccessToken(), null)
  })

  it('setAccessToken / getAccessToken round-trip', () => {
    setAccessToken('tok-123')
    assert.equal(getAccessToken(), 'tok-123')
    clearAccessToken()
    assert.equal(getAccessToken(), null)
  })

  it('clearAccessToken removes token', () => {
    setAccessToken('temp')
    clearAccessToken()
    assert.equal(getAccessToken(), null)
  })
})

describe('request interceptor', () => {
  it('adds Authorization Bearer when token set', () => {
    setAccessToken('test-bearer')
    const fn = api.interceptors.request.handlers[0].fulfilled
    const config = { headers: {} }
    const out = fn(config)
    assert.equal(out.headers.Authorization, 'Bearer test-bearer')
    clearAccessToken()
  })

  it('skips Authorization when no token', () => {
    clearAccessToken()
    const fn = api.interceptors.request.handlers[0].fulfilled
    const config = { headers: {} }
    const out = fn(config)
    assert.equal(out.headers.Authorization, undefined)
  })
})

describe('response interceptor', () => {
  it('passes through 2xx', () => {
    const fn = api.interceptors.response.handlers[0].fulfilled
    const res = { data: 'ok', status: 200 }
    assert.equal(fn(res), res)
  })

  it('rejects non-401 without retry', async () => {
    const fn = api.interceptors.response.handlers[0].rejected
    const err = { response: { status: 403 }, config: {} }
    await assert.rejects(() => fn(err))
  })

  it('refreshes token on 401 and retries', async () => {
    mock.method(axiosMod, 'get', () =>
      Promise.resolve({ data: { access_token: 'refreshed-token' } })
    )

    const originalAdapter = api.defaults.adapter
    api.defaults.adapter = (cfg) =>
      Promise.resolve({ data: 'retry ok', config: cfg })

    setAccessToken('old-token')
    const fn = api.interceptors.response.handlers[0].rejected
    const err = {
      response: { status: 401 },
      config: { _retry: false, headers: {}, url: '/api/test' },
    }

    const result = await fn(err)
    assert.equal(result.data, 'retry ok')
    assert.equal(getAccessToken(), 'refreshed-token')

    api.defaults.adapter = originalAdapter
  })
})
