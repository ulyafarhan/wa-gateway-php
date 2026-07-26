import api from './client'

export function getDevices() {
  return api.get('/api/devices')
}

export function connectDevice(id) {
  return api.post(`/api/devices/${id}/connect`)
}

export function disconnectDevice(id) {
  return api.post(`/api/devices/${id}/disconnect`)
}
