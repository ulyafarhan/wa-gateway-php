import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

globalThis.document = { title: '' }

function createGuard(auth) {
  let authReady = false
  return async function guard(to, _from, next) {
    if (!authReady) {
      await auth.initAuth()
      authReady = true
    }
    if (to.meta?.requiresAuth && !auth.isAuthenticated) return next({ name: 'Login' })
    if (to.meta?.guest && auth.isAuthenticated) return next({ name: 'Dashboard' })
    if (to.meta?.roles && auth.role) {
      if (!to.meta.roles.includes(auth.role)) return next({ name: 'Forbidden' })
    }
    document.title = `WaAceh | ${to.meta?.title || ''}`
    next()
  }
}

function makeRoute(meta) {
  return { meta: meta || {} }
}

describe('router beforeEach guard', () => {
  describe('auth initialization', () => {
    it('calls initAuth on first run', async () => {
      let called = false
      const auth = { isAuthenticated: false, role: null, initAuth: async () => { called = true } }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute(), null, next)
      assert.equal(called, true)
      assert.equal(nextArg, undefined)
    })

    it('does not call initAuth on subsequent runs', async () => {
      let count = 0
      const auth = { isAuthenticated: false, role: null, initAuth: async () => { count++ } }
      const guard = createGuard(auth)
      const next = () => {}
      await guard(makeRoute(), null, next)
      await guard(makeRoute(), null, next)
      assert.equal(count, 1)
    })
  })

  describe('requiresAuth', () => {
    it('redirects to Login when not authenticated', async () => {
      const auth = { isAuthenticated: false, role: null, initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({ requiresAuth: true }), null, next)
      assert.deepEqual(nextArg, { name: 'Login' })
    })

    it('allows access when authenticated', async () => {
      const auth = { isAuthenticated: true, role: 'admin', initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({ requiresAuth: true }), null, next)
      assert.equal(nextArg, undefined)
    })

    it('allows access to public routes without auth', async () => {
      const auth = { isAuthenticated: false, role: null, initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({}), null, next)
      assert.equal(nextArg, undefined)
    })
  })

  describe('guest routes', () => {
    it('redirects authenticated user to Dashboard', async () => {
      const auth = { isAuthenticated: true, role: 'admin', initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({ guest: true }), null, next)
      assert.deepEqual(nextArg, { name: 'Dashboard' })
    })

    it('allows unauthenticated user to guest route', async () => {
      const auth = { isAuthenticated: false, role: null, initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({ guest: true }), null, next)
      assert.equal(nextArg, undefined)
    })
  })

  describe('role-based access', () => {
    it('redirects to Forbidden when role not in allowed roles', async () => {
      const auth = { isAuthenticated: true, role: 'viewer', initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({ requiresAuth: true, roles: ['superadmin', 'admin'] }), null, next)
      assert.deepEqual(nextArg, { name: 'Forbidden' })
    })

    it('allows access when role is in allowed roles', async () => {
      const auth = { isAuthenticated: true, role: 'operator', initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({ requiresAuth: true, roles: ['superadmin', 'admin', 'operator'] }), null, next)
      assert.equal(nextArg, undefined)
    })

    it('skips role check when route has no roles meta', async () => {
      const auth = { isAuthenticated: true, role: 'viewer', initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({ requiresAuth: true }), null, next)
      assert.equal(nextArg, undefined)
    })

    it('skips role check when user has no role', async () => {
      const auth = { isAuthenticated: true, role: null, initAuth: async () => {} }
      const guard = createGuard(auth)
      let nextArg
      const next = (arg) => { nextArg = arg }
      await guard(makeRoute({ requiresAuth: true, roles: ['admin'] }), null, next)
      assert.equal(nextArg, undefined)
    })
  })

  describe('title', () => {
    it('sets document title', async () => {
      const auth = { isAuthenticated: false, role: null, initAuth: async () => {} }
      const guard = createGuard(auth)
      const next = () => {}
      await guard(makeRoute({ title: 'Login' }), null, next)
      assert.equal(document.title, 'WaAceh | Login')
    })
  })
})
