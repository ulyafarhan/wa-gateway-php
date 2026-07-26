import api from './client'

export function getBroadcasts() {
  return api.get('/api/broadcast')
}

export function sendBroadcast(data) {
  return api.post('/api/broadcast/send', data)
}

export function getBroadcastQueue() {
  return api.get('/api/broadcast/queue')
}

export function cancelBroadcast(id) {
  return api.delete(`/api/broadcast/queue/${id}`)
}
