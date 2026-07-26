<template>
  <AdminLayout>
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">Contacts</h2>
    </div>
    <div class="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">JID</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Session</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Persona</th>
              <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Last Seen</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in contacts" :key="c.jid + c.session_id" class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
              <td class="px-4 py-3 text-gray-800 dark:text-white/90 font-mono text-xs">{{ c.jid }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ c.name || '-' }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{{ c.session_id?.substring(0,12) }}..</td>
              <td class="px-4 py-3"><span class="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium dark:bg-white/10">{{ c.persona || 'default' }}</span></td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{{ c.updated_at ? new Date(c.updated_at).toLocaleString() : '-' }}</td>
            </tr>
            <tr v-if="!contacts.length"><td colspan="5" class="px-4 py-8 text-center text-gray-400">No contacts yet</td></tr>
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
  data() { return { contacts: [] } },
  async mounted() { try { const r = await api.get('/api/admin/contacts'); this.contacts = r.data || [] } catch {} }
}
</script>
