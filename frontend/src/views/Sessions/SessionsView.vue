<template>
  <AdminLayout>
    <PageHeader title="Sessions">
      <template #actions>
        <button @click="showCreate = true" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600">+ New Session</button>
      </template>
    </PageHeader>

    <!-- Sessions table -->
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <DataTable :columns="columns" :data="sessions" :loading="loading">
        <template #status="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #session_id="{ row }">
          <a @click.prevent="showQR(row.session_id)" href="#" class="text-brand-500 hover:underline">{{ row.session_id.substring(0,12) }}...</a>
        </template>
        <template #actions="{ row }">
          <button @click="deleteSession(row.session_id)" class="text-error-500 hover:text-error-600 text-sm">Hapus</button>
        </template>
      </DataTable>
    </div>

    <!-- Create modal -->
    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showCreate = false">
      <div class="rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800 w-full max-w-sm">
        <h3 class="text-lg font-semibold mb-4">Buat Session Baru</h3>
        <input v-model="newSessionId" placeholder="session-id" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 mb-4" />
        <div class="flex justify-end gap-3">
          <button @click="showCreate = false" class="rounded-lg border px-4 py-2 text-sm">Batal</button>
          <button @click="handleCreate" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">Buat</button>
        </div>
      </div>
    </div>

    <!-- QR modal -->
    <div v-if="qrSession" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="qrSession = null">
      <div class="rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800 text-center">
        <h3 class="text-lg font-semibold mb-2">Scan QR</h3>
        <p class="text-sm text-gray-500 mb-4">Session: {{ qrSession }}</p>
        <img v-if="qrImage" :src="qrImage" class="mx-auto" />
        <p v-else class="text-sm text-gray-400">Loading QR...</p>
        <button @click="qrSession = null" class="mt-4 rounded-lg border px-4 py-2 text-sm">Tutup</button>
      </div>
    </div>

    <ConfirmDialog :show="showDelete" title="Hapus Session" :message="'Hapus session ' + deleteTarget + '?'" danger @confirm="handleDelete" @cancel="showDelete = false" />
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/reusable/PageHeader.vue'
import DataTable from '@/components/reusable/DataTable.vue'
import StatusBadge from '@/components/reusable/StatusBadge.vue'
import ConfirmDialog from '@/components/reusable/ConfirmDialog.vue'
import api from '@/api/client'

const loading = ref(true)
const sessions = ref([])
const showCreate = ref(false)
const newSessionId = ref('')
const qrSession = ref(null)
const qrImage = ref('')
const showDelete = ref(false)
const deleteTarget = ref('')

const columns = [
  { key: 'session_id', label: 'Session' },
  { key: 'status', label: 'Status' },
  { key: 'msg_sent', label: 'Sent' },
  { key: 'msg_failed', label: 'Failed' },
  { key: 'created_at', label: 'Created' },
  { key: 'actions', label: '' },
]

onMounted(fetchSessions)

async function fetchSessions() {
  try {
    const res = await api.get('/api/sessions')
    sessions.value = res.data || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function handleCreate() {
  if (!newSessionId.value) return
  try {
    await api.post('/api/sessions', { session_id: newSessionId.value })
    showCreate.value = false
    newSessionId.value = ''
    await fetchSessions()
  } catch (e) { alert(e.response?.data?.error || 'Failed') }
}

async function showQR(id) {
  qrSession.value = id
  qrImage.value = ''
  try {
    const res = await api.get(`/api/sessions/${id}/qr`)
    if (res.data.qr) {
      const QRCode = await import('qrcode')
      qrImage.value = await QRCode.toDataURL(res.data.qr, { width: 280, margin: 2 })
    }
  } catch (e) { alert('QR error: ' + (e.response?.data?.error || e.message)) }
}

function deleteSession(id) { deleteTarget.value = id; showDelete.value = true }

async function handleDelete() {
  try {
    await api.delete(`/api/sessions/${deleteTarget.value}`)
    showDelete.value = false
    await fetchSessions()
  } catch (e) { alert(e.response?.data?.error || 'Failed') }
}
</script>
