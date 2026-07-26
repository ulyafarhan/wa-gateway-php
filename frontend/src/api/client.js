import axios from 'axios'

let accessToken = null
let refreshPromise = null

const api = axios.create({
  baseURL: (import.meta.env?.VITE_API_URL || process.env.VITE_API_URL) || '',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

async function refreshAccessToken() {
  const { data } = await axios.get('/api/auth/refresh', { withCredentials: true })
  accessToken = data.access_token
  return accessToken
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true
      if (!refreshPromise) refreshPromise = refreshAccessToken().catch(() => { accessToken = null; refreshPromise = null; throw err })
      try {
        const token = await refreshPromise
        accessToken = token
        err.config.headers.Authorization = `Bearer ${token}`
        return api(err.config)
      } finally { refreshPromise = null }
    }
    return Promise.reject(err)
  },
)

export function setAccessToken(token) { accessToken = token }
export function clearAccessToken() { accessToken = null }
export function getAccessToken() { return accessToken }
export { refreshAccessToken }
export default api
