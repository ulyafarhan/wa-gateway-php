import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, { setAccessToken, clearAccessToken } from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const ready = ref(false)
  const isAuthenticated = computed(() => !!user.value)
  const role = computed(() => user.value?.role)
  const username = computed(() => user.value?.username)

  async function initAuth() {
    if (ready.value) return
    try {
      const res = await api.get('/api/auth/refresh')
      setAccessToken(res.data.access_token)
      const me = await api.get('/api/auth/me')
      user.value = me.data
    } catch {
      user.value = null
      clearAccessToken()
    }
    ready.value = true
  }

  async function login(credentials) {
    const res = await api.post('/api/auth/login', credentials)
    setAccessToken(res.data.access_token)
    user.value = res.data.user
  }

  async function logout() {
    try { await api.post('/api/auth/logout') } catch {}
    user.value = null
    clearAccessToken()
  }

  function can(permission) {
    if (!user.value) return false
    if (user.value.role === 'superadmin') return true
    return !!(user.value.permissions?.includes(permission) || user.value.permissions?.includes('*'))
  }

  return { user, ready, isAuthenticated, role, username, login, initAuth, logout, can }
})
