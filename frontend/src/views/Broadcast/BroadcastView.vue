<template>
  <AdminLayout>
    <PageHeader title="Broadcast" />
    <div class="grid grid-cols-12 gap-4 md:gap-6">
      <div class="col-span-12 lg:col-span-5">
        <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-4 text-lg font-semibold">Kirim Broadcast</h3>
          <div class="space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium">Session</label>
              <select v-model="sessionId" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
                <option value="">Pilih session...</option>
                <option v-for="s in sessions" :key="s.session_id" :value="s.session_id">{{ s.session_id }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium">Nomor (pisahkan dengan koma)</label>
              <textarea v-model="numbers" rows="3" placeholder="628123456789, 628987654321" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"></textarea>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium">Pesan</label>
              <textarea v-model="message" rows="4" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"></textarea>
            </div>
            <button @click="sendBroadcast" :disabled="sending" class="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50">
              {{ sending ? 'Mengirim...' : 'Kirim Broadcast' }}
            </button>
            <p v-if="result" class="text-sm text-gray-500">{{ result }}</p>
          </div>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-7">
        <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-4 text-lg font-semibold">Riwayat Broadcast</h3>
          <DataTable :columns="broadcastCols" :data="broadcasts" :loading="broadcastLoading" />
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/reusable/PageHeader.vue'
import DataTable from '@/components/reusable/DataTable.vue'
import api from '@/api/client'

const sessions = ref([])
const sessionId = ref('')
const numbers = ref('')
const message = ref('')
const sending = ref(false)
const result = ref('')
const broadcasts = ref([])
const broadcastLoading = ref(true)

const broadcastCols = [
  { key: 'session_id', label: 'Session' },
  { key: 'total_targets', label: 'Targets' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Sent' },
]

onMounted(async () => {
  try {
    const [sRes, bRes] = await Promise.all([
      api.get('/api/admin/stats/sessions'),
      api.get('/api/admin/webhooks', { params: { status: 'delivered' } })
    ])
    sessions.value = sRes.data || []
    broadcasts.value = (bRes.data || []).slice(0, 20)
  } catch (e) { console.error(e) }
  finally { broadcastLoading.value = false }
})

async function sendBroadcast() {
  if (!sessionId.value || !numbers.value || !message.value) return alert('Isi semua field')
  sending.value = true
  result.value = ''
  try {
    const nums = numbers.value.split(',').map(n => n.trim()).filter(Boolean)
    const res = await api.post(`/api/sessions/${sessionId.value}/broadcast`, { numbers: nums, message: message.value })
    result.value = `Broadcast terkirim! ${res.data.total_targets} target`
    numbers.value = ''
    message.value = ''
  } catch (e) { result.value = 'Error: ' + (e.response?.data?.error || e.message) }
  finally { sending.value = false }
}
</script>
