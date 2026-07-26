import api from './client'

export function getUsers() {
  return api.get('/api/admin/users')
}

export function getUser(id) {
  return api.get(`/api/admin/users/${id}`)
}

export function createUser(data) {
  return api.post('/api/admin/users', data)
}

export function updateUser(id, data) {
  return api.put(`/api/admin/users/${id}`, data)
}

export function deleteUser(id) {
  return api.delete(`/api/admin/users/${id}`)
}
