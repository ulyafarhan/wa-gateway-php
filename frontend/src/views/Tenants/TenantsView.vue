<template>
  <AdminLayout>
    <div class="flex items-center justify-between mb-6">
      <div><h1 class="text-title-md font-semibold">Tenants</h1><p class="text-sm text-gray-500">Kelola client / tenant</p></div>
      <button @click="showCreate = true" class="btn-primary">+ Buat Tenant</button>
    </div>
    <DataTable :columns="columns" :data="tenants" :loading="loading" @action="handleAction" />
    <!-- Modal create -->
    <Modal :show="showCreate" @close="showCreate = false" title="Buat Tenant">
      <form @submit.prevent="createTenant" class="space-y-4 p-4">
        <input v-model="form.name" placeholder="Nama tenant" class="input" required />
        <input v-model="form.slug" placeholder="Slug (misal: client-abc)" class="input" required />
        <button type="submit" class="btn-primary w-full">Buat</button>
      </form>
    </Modal>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import DataTable from '@/components/reusable/DataTable.vue'
import Modal from '@/components/ui/Modal.vue'
import api from '@/api/client'

const tenants = ref([])
const loading = ref(true)
const showCreate = ref(false)
const form = ref({ name: '', slug: '' })
const columns = [
  { key: 'name', label: 'Nama' }, { key: 'slug', label: 'Slug' },
  { key: 'api_key', label: 'API Key' }, { key: 'created_at', label: 'Dibuat' },
  { key: 'actions', label: '' }
]

async function fetchTenants() { loading.value = true; const r = await api.get('/api/admin/tenants'); tenants.value = r.data.map(t => ({ ...t, created_at: new Date(t.created_at).toLocaleDateString('id') })); loading.value = false }
async function createTenant() { await api.post('/api/admin/tenants', form.value); showCreate.value = false; form.value = { name: '', slug: '' }; fetchTenants() }
function handleAction({ action, row }) { if (action === 'delete') api.delete(`/api/admin/tenants/${row.tenant_id}`).then(fetchTenants) }
onMounted(fetchTenants)
</script>
