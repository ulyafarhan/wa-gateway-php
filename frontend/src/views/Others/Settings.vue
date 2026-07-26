<template>
  <AdminLayout>
    <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">Settings</h2>
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Server Config</h3>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Port</span><span class="text-gray-800 dark:text-white/90">{{ config.port }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Rate Limit</span><span class="text-gray-800 dark:text-white/90">{{ config.rateLimitMs }}ms</span></div>
          <div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Log Level</span><span class="text-gray-800 dark:text-white/90">{{ config.logLevel }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Node Version</span><span class="text-gray-800 dark:text-white/90">{{ config.nodeVersion }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Uptime</span><span class="text-gray-800 dark:text-white/90">{{ config.uptime }}s</span></div>
        </dl>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Usage</h3>
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Tenants</span><span class="text-gray-800 dark:text-white/90">{{ config.totalTenants }}</span></div>
          <div class="flex justify-between"><span class="text-gray-500 dark:text-gray-400">Sessions</span><span class="text-gray-800 dark:text-white/90">{{ config.totalSessions }}</span></div>
        </dl>
      </div>
    </div>
  </AdminLayout>
</template>

<script>
import AdminLayout from '@/components/layout/AdminLayout.vue'
import api from '@/api/client'
export default {
  components: { AdminLayout },
  data() { return { config: {} } },
  async mounted() { try { const r = await api.get('/api/admin/settings'); this.config = r.data } catch {} }
}
</script>
