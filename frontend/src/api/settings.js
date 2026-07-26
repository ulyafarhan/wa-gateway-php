import api from './client'

export function getSettings() {
  return api.get('/api/settings')
}

export function updateSettings(data) {
  return api.put('/api/settings', data)
}

export function regenerateApiKey() {
  return api.post('/api/settings/api-key/regenerate')
}
