<template>
  <AdminLayout>
    <PageHeader title="Users Admin">
      <template #actions>
        <button @click="showCreate = true" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600">+ New User</button>
      </template>
    </PageHeader>
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <DataTable :columns="columns" :data="users" :loading="loading">
        <template #actions="{ row }">
          <button @click="deleteUser(row.id)" class="text-error-500 hover:text-error-600 text-sm">Hapus</button>
        </template>
      </DataTable>
    </div>
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showCreate = false">
      <div class="rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800 w-full max-w-sm">
        <h3 class="text-lg font-semibold mb-4">Buat User Baru</h3>
        <input v-model="form.username" placeholder="Username" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm mb-2 dark:border-gray-700 dark:bg-gray-900" />
        <input v-model="form.email" placeholder="Email" type="email" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm mb-2 dark:border-gray-700 dark:bg-gray-900" />
        <input v-model="form.password" placeholder="Password" type="password" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm mb-2 dark:border-gray-700 dark:bg-gray-900" />
        <select v-model="form.role" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm mb-4 dark:border-gray-700 dark:bg-gray-900">
          <option value="admin">Admin</option>
          <option value="operator">Operator</option>
          <option value="viewer">Viewer</option>
        </select>
        <div class="flex justify-end gap-3">
          <button @click="showCreate = false" class="rounded-lg border px-4 py-2 text-sm">Batal</button>
          <button @click="handleCreate" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">Buat</button>
        </div>
      </div>
    </div>
    <ConfirmDialog :show="showDelete" title="Hapus User" :message="'Hapus user ' + deleteTarget + '?'" danger @confirm="handleDelete" @cancel="showDelete = false" />
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/reusable/PageHeader.vue'
import DataTable from '@/components/reusable/DataTable.vue'
import ConfirmDialog from '@/components/reusable/ConfirmDialog.vue'
import api from '@/api/client'

const loading = ref(true)
const users = ref([])
const showCreate = ref(false)
const showDelete = ref(false)
const deleteTarget = ref('')
const form = ref({ username: '', email: '', password: '', role: 'operator' })

const columns = [
  { key: 'username', label: 'Username' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'created_at', label: 'Created' },
  { key: 'actions', label: '' },
]

onMounted(fetchUsers)

async function fetchUsers() {
  try {
    const res = await api.get('/api/admin/users')
    users.value = res.data || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function handleCreate() {
  try {
    await api.post('/api/auth/register', form.value)
    showCreate.value = false
    form.value = { username: '', email: '', password: '', role: 'operator' }
    await fetchUsers()
  } catch (e) { alert(e.response?.data?.error || 'Failed') }
}

function deleteUser(id) { deleteTarget.value = id; showDelete.value = true }

async function handleDelete() {
  try {
    await api.delete(`/api/admin/users/${deleteTarget.value}`)
    showDelete.value = false
    await fetchUsers()
  } catch (e) { alert(e.response?.data?.error || 'Failed') }
}
</script>
