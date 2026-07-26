import api from './client'

export function getLogs(params = {}) {
  return api.get('/api/logs', { params })
}

export function getLogStats() {
  return api.get('/api/logs/stats')
}
