<template>
  <AdminLayout>
    <div class="mb-4 flex items-center gap-4">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">Message Logs</h2>
      <select v-model="filter.session" class="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90"><option value="">All Sessions</option><option v-for="s in sessionList" :key="s" :value="s">{{ s.substring(0,16) }}...</option></select>
      <select v-model="filter.status" class="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:text-white/90"><option value="">All Status</option><option value="sent">Sent</option><option value="failed">Failed</option><option value="pending">Pending</option></select>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Session</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">To</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Message</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in messages" :key="m.id" class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
              <td class="px-4 py-3 text-gray-800 dark:text-white/90 font-mono text-xs">{{ m.session_id?.substring(0,8) }}..</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ m.jid || m.to || '-' }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{{ m.content || m.text || '-' }}</td>
              <td class="px-4 py-3">
                <span :class="m.status === 'sent' ? 'text-success-600 bg-success-50' : m.status === 'failed' ? 'text-error-600 bg-error-50' : 'text-warning-600 bg-warning-50'" class="inline-block rounded-full px-2 py-0.5 text-xs font-medium">{{ m.status }}</span>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ m.type || 'text' }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{{ new Date(m.created_at).toLocaleString() }}</td>
            </tr>
            <tr v-if="!messages.length"><td colspan="6" class="px-4 py-8 text-center text-gray-400">No messages</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>

<script>
import AdminLayout from '@/components/layout/AdminLayout.vue'
import api from '@/api/client'
export default {
  components: { AdminLayout },
  data() { return { messages: [], sessionList: [], filter: { session: '', status: '' } } },
  async mounted() { await this.loadSessions(); await this.load() },
  watch: { 'filter.session'() { this.load() }, 'filter.status'() { this.load() } },
  methods: {
    async loadSessions() { try { const r = await api.get('/api/admin/sessions?status=1'); this.sessionList = (r.data || []).map(s => s.session_id) } catch {} },
    async load() {
      try {
        let url = '/api/admin/messages?limit=100'
        if (this.filter.session) url += '&session_id=' + this.filter.session
        if (this.filter.status) url += '&status=' + this.filter.status
        const r = await api.get(url); this.messages = r.data || []
      } catch {}
    }
  }
}
</script>
