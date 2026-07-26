<template>
  <AdminLayout>
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">Sessions</h2>
      <button @click="createSession" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">+ New Session</button>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">ID</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Sent</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Failed</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Created</th>
              <th class="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in sessions" :key="s.session_id" class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
              <td class="px-4 py-3 text-gray-800 dark:text-white/90 font-mono text-xs">{{ s.session_id.substring(0,16) }}...</td>
              <td class="px-4 py-3">
                <span :class="s.status === 'connected' ? 'text-success-600 bg-success-50 dark:bg-success-500/15' : 'text-warning-600 bg-warning-50 dark:bg-warning-500/15'" class="inline-block rounded-full px-2 py-0.5 text-xs font-medium">{{ s.status }}</span>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ s.session_type || 'default' }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ s.msg_sent || 0 }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ s.msg_failed || 0 }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ new Date(s.created_at).toLocaleDateString() }}</td>
              <td class="px-4 py-3 text-right">
                <button @click="showQR(s.session_id)" class="mr-2 text-brand-500 hover:text-brand-600 text-sm">QR</button>
                <button @click="deleteSession(s.session_id)" class="text-error-500 hover:text-error-600 text-sm">Delete</button>
              </td>
            </tr>
            <tr v-if="!sessions.length"><td colspan="7" class="px-4 py-8 text-center text-gray-400">No sessions. Click "+ New Session" to start.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="qrData" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="qrData=null">
      <div class="w-full max-w-sm rounded-xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Scan QR</h3>
        <p class="mb-4 text-sm text-gray-500">Open WhatsApp on phone → scan this QR</p>
        <div v-if="qrLoading" class="py-8 text-center text-gray-400">Loading QR...</div>
        <img v-if="qrData && !qrLoading" :src="qrData" class="mx-auto w-64" />
        <p v-if="qrStatus === 'connected'" class="mt-2 text-center text-sm font-medium text-success-600">Connected!</p>
        <button @click="qrData=null" class="mt-4 w-full rounded-lg bg-gray-200 px-4 py-2 text-sm dark:bg-gray-700 dark:text-white/90">Close</button>
      </div>
    </div>
  </AdminLayout>
</template>

<script>
import AdminLayout from '@/components/layout/AdminLayout.vue'
import api from '@/api/client'
export default {
  components: { AdminLayout },
  data() { return { sessions: [], qrData: null, qrStatus: '', qrLoading: false } },
  async mounted() { await this.load() },
  methods: {
    async load() { try { const r = await api.get('/api/admin/sessions?status=1'); this.sessions = r.data || [] } catch {} },
    async createSession() {
      const id = 'sig-' + Math.random().toString(36).substring(2, 8)
      try { await api.post('/api/sessions', { session_id: id }); await this.load() } catch (e) { alert(e.response?.data?.error || 'Error') }
    },
    async showQR(id) {
      this.qrLoading = true; this.qrData = null
      try { const r = await api.get('/api/sessions/' + id + '/status'); this.qrStatus = r.data.status; this.qrData = r.data.qr || 'data:image/png;base64,' } catch {}
      finally { this.qrLoading = false }
    },
    async deleteSession(id) { if (!confirm('Delete?')) return; try { await api.delete('/api/sessions/' + id); await this.load() } catch {} }
  }
}
</script>
