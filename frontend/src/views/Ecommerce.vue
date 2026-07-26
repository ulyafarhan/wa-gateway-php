<template>
  <AdminLayout>
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      <span class="ml-3 text-gray-500">Memuat data...</span>
    </div>
    <div v-else class="grid grid-cols-12 gap-4 md:gap-6">
      <div class="col-span-12 sm:col-span-6 xl:col-span-3" v-for="card in cards" :key="card.label">
        <MetricCard :label="card.label" :value="card.value" :color="card.color" :icon="card.icon" />
      </div>
      <div class="col-span-12">
        <PageHeader title="Dashboard" />
        <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Recent Sessions</h3>
          <DataTable :columns="columns" :data="sessions" :loading="loading" />
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '../components/layout/AdminLayout.vue'
import MetricCard from '../components/reusable/MetricCard.vue'
import DataTable from '../components/reusable/DataTable.vue'
import PageHeader from '../components/reusable/PageHeader.vue'
import api from '../api/client'

const loading = ref(true)
const stats = ref({})
const sessions = ref([])

const cards = [
  { label: 'Total Sessions', value: 0, color: 'brand', icon: 'layers' },
  { label: 'Online', value: 0, color: 'success', icon: 'activity' },
  { label: 'Messages Sent', value: 0, color: 'brand', icon: 'message' },
  { label: 'Tenants', value: 0, color: 'brand', icon: 'users' },
]

const columns = [
  { key: 'session_id', label: 'Session ID' },
  { key: 'status', label: 'Status' },
  { key: 'msg_sent', label: 'Sent' },
  { key: 'msg_failed', label: 'Failed' },
  { key: 'created_at', label: 'Created' },
]

onMounted(async () => {
  try {
    const [s, ss] = await Promise.all([
      api.get('/api/admin/stats'),
      api.get('/api/admin/stats/sessions')
    ])
    stats.value = s.data
    sessions.value = (ss.data || []).slice(0, 10)
    cards[0].value = stats.value.totalSessions || 0
    cards[1].value = stats.value.onlineSessions || 0
    cards[2].value = stats.value.totalMessages || 0
    cards[3].value = stats.value.totalTenants || 0
  } catch (e) {
    console.error('Dashboard error:', e)
  } finally {
    loading.value = false
  }
})
</script>
