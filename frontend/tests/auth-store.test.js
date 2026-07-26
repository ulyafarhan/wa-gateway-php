import { describe, it, after, mock } from 'node:test'
import assert from 'node:assert/strict'

process.env.VITE_API_URL = ''

let postImpl = () => Promise.resolve({ data: {} })
let getImpl = () => Promise.resolve({ data: {} })

const mockApi = {
  get: mock.fn((...args) => getImpl(...args)),
  post: mock.fn((...args) => postImpl(...args)),
  interceptors: { request: { use: mock.fn() }, response: { use: mock.fn() } },
}

after(() => mock.reset())

async function makeStore() {
  const axiosMod = (await import('axios')).default
  mock.method(axiosMod, 'create', () => mockApi)
  const { createPinia, setActivePinia } = await import('pinia')
  setActivePinia(createPinia())
  const { useAuthStore } = await import('../src/stores/auth.js')
  return useAuthStore()
}

describe('useAuthStore', () => {
  describe('initial state', () => {
    it('user is null', async () => {
      const store = await makeStore()
      assert.equal(store.$state.user, null)
    })

    it('isAuthenticated is false', async () => {
      const store = await makeStore()
      assert.equal(store.isAuthenticated, false)
    })

    it('ready is false', async () => {
      const store = await makeStore()
      assert.equal(store.ready, false)
    })

    it('role is undefined (null?.role)', async () => {
      const store = await makeStore()
      assert.equal(store.role, undefined)
    })

    it('username is undefined (null?.username)', async () => {
      const store = await makeStore()
      assert.equal(store.username, undefined)
    })
  })

  describe('can()', () => {
    it('returns false when no user', async () => {
      const store = await makeStore()
      assert.equal(store.can('anything'), false)
    })

    it('returns true for superadmin', async () => {
      const store = await makeStore()
      store.user = { role: 'superadmin' }
      assert.equal(store.can('any.action'), true)
    })

    it('checks permissions array', async () => {
      const store = await makeStore()
      store.user = { role: 'admin', permissions: ['messages.send'] }
      assert.equal(store.can('messages.send'), true)
      assert.equal(store.can('messages.delete'), false)
    })

    it('returns true for wildcard', async () => {
      const store = await makeStore()
      store.user = { role: 'admin', permissions: ['*'] }
      assert.equal(store.can('anything'), true)
    })

    it('returns false when no permissions field', async () => {
      const store = await makeStore()
      store.user = { role: 'operator' }
      assert.equal(store.can('anything'), false)
    })
  })

  describe('login()', () => {
    it('sets user and token', async () => {
      postImpl = () => Promise.resolve({
        data: { access_token: 'tok', user: { username: 'alice', role: 'admin' } },
      })
      const store = await makeStore()
      await store.login({ username: 'alice', password: 'secret' })
      assert.equal(store.isAuthenticated, true)
      assert.equal(store.user.username, 'alice')
      assert.equal(store.user.role, 'admin')
    })

    it('rejects on invalid credentials', async () => {
      postImpl = () => Promise.reject(new Error('401'))
      const store = await makeStore()
      await assert.rejects(() => store.login({ username: 'bad', password: 'bad' }))
      assert.equal(store.isAuthenticated, false)
    })

    it('posts correct URL and body', async () => {
      let postedUrl, postedBody
      postImpl = (url, body) => {
        postedUrl = url; postedBody = body
        return Promise.resolve({ data: { access_token: 't', user: { username: 'test', role: 'admin' } } })
      }
      const store = await makeStore()
      await store.login({ username: 'u', password: 'p' })
      assert.equal(postedUrl, '/api/auth/login')
      assert.deepEqual(postedBody, { username: 'u', password: 'p' })
    })
  })

  describe('logout()', () => {
    it('clears user and token', async () => {
      postImpl = () => Promise.resolve({ data: {} })
      const store = await makeStore()
      store.user = { username: 'alice', role: 'admin' }
      await store.logout()
      assert.equal(store.user, null)
      assert.equal(store.isAuthenticated, false)
    })

    it('posts to /api/auth/logout', async () => {
      let posted = false
      postImpl = () => { posted = true; return Promise.resolve({ data: {} }) }
      const store = await makeStore()
      store.user = { username: 'alice', role: 'admin' }
      await store.logout()
      assert.equal(posted, true)
    })

    it('clears state even when API fails', async () => {
      postImpl = () => Promise.reject(new Error('network error'))
      const store = await makeStore()
      store.user = { username: 'alice', role: 'admin' }
      await store.logout()
      assert.equal(store.user, null)
    })
  })

  describe('initAuth()', () => {
    it('skips if already ready', async () => {
      const store = await makeStore()
      store.ready = true
      store.user = { username: 'existing' }
      await store.initAuth()
      assert.equal(store.user.username, 'existing')
    })

    it('sets user on successful refresh', async () => {
      let callCount = 0
      getImpl = () => {
        callCount++
        if (callCount === 1) return Promise.resolve({ data: { access_token: 'refreshed' } })
        return Promise.resolve({ data: { username: 'loaded', role: 'admin' } })
      }
      const store = await makeStore()
      await store.initAuth()
      assert.equal(store.isAuthenticated, true)
      assert.equal(store.user.username, 'loaded')
      assert.equal(store.ready, true)
    })

    it('clears auth on refresh failure', async () => {
      getImpl = () => Promise.reject(new Error('401'))
      const store = await makeStore()
      store.user = { username: 'stale' }
      await store.initAuth()
      assert.equal(store.user, null)
      assert.equal(store.isAuthenticated, false)
      assert.equal(store.ready, true)
    })
  })
})
