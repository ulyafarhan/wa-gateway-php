<template>
  <AdminLayout>
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">Users</h2>
      <button @click="showCreate = true" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New User</button>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Username</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Email</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Role</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Created</th>
              <th class="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
              <td class="px-4 py-3 text-gray-800 dark:text-white/90">{{ u.username }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ u.email }}</td>
              <td class="px-4 py-3">
                <span :class="u.role === 'superadmin' ? 'text-brand-600 bg-brand-50 dark:bg-brand-500/15' : 'text-gray-600 bg-gray-100 dark:bg-white/10'" class="inline-block rounded-full px-2 py-0.5 text-xs font-medium">{{ u.role }}</span>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ new Date(u.created_at).toLocaleDateString() }}</td>
              <td class="px-4 py-3 text-right">
                <button v-if="u.role !== 'superadmin'" @click="deleteUser(u.id)" class="text-error-500 hover:text-error-600 text-sm">Delete</button>
              </td>
            </tr>
            <tr v-if="!users.length">
              <td colspan="5" class="px-4 py-8 text-center text-gray-400">No users</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showCreate=false">
      <div class="w-full max-w-md rounded-xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Create User</h3>
        <div v-if="createError" class="mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-500">{{ createError }}</div>
        <div class="space-y-4">
          <div><label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">Username</label><input v-model="form.username" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:text-white/90" /></div>
          <div><label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">Email</label><input v-model="form.email" type="email" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:text-white/90" /></div>
          <div><label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">Password</label><input v-model="form.password" type="password" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:text-white/90" /></div>
          <div><label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-400">Role</label>
            <select v-model="form.role" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:text-white/90"><option value="admin">Admin</option><option value="manager">Manager</option><option value="operator">Operator</option><option value="viewer">Viewer</option></select>
          </div>
          <button @click="createUser" :disabled="loading" class="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600">{{ loading ? 'Creating...' : 'Create User' }}</button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script>
import AdminLayout from '@/components/layout/AdminLayout.vue'
import api from '@/api/client'
export default {
  components: { AdminLayout },
  data() {
    return { users: [], showCreate: false, loading: false, createError: '', form: { username: '', email: '', password: '', role: 'operator' } }
  },
  async mounted() { await this.load() },
  methods: {
    async load() { try { const r = await api.get('/api/admin/users'); this.users = r.data } catch {} },
    async createUser() {
      this.loading = true; this.createError = ''
      try { await api.post('/api/auth/register', this.form); this.showCreate = false; this.form = { username: '', email: '', password: '', role: 'operator' }; await this.load() }
      catch (e) { this.createError = e.response?.data?.error || 'Error' }
      finally { this.loading = false }
    },
    async deleteUser(id) { if (!confirm('Delete user?')) return; try { await api.delete('/api/admin/users/' + id); await this.load() } catch {} }
  }
}
</script>
