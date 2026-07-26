import api from './client'

export function getSessions(params = {}) {
  return api.get('/api/sessions', { params })
}

export function getSession(id) {
  return api.get(`/api/sessions/${id}`)
}

export function createSession(data) {
  return api.post('/api/sessions', data)
}

export function updateSession(id, data) {
  return api.put(`/api/sessions/${id}`, data)
}

export function deleteSession(id) {
  return api.delete(`/api/sessions/${id}`)
}

export function connectSession(id) {
  return api.post(`/api/sessions/${id}/connect`)
}

export function disconnectSession(id) {
  return api.post(`/api/sessions/${id}/disconnect`)
}

export function getSessionQR(id) {
  return api.get(`/api/sessions/${id}/qr`)
}
