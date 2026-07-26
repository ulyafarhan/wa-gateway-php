<template>
  <AdminLayout>
    <PageHeader :title="'Session: ' + id">
      <template #actions>
        <router-link to="/sessions" class="text-sm text-brand-500 hover:underline">← Kembali</router-link>
      </template>
    </PageHeader>
    <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <p v-if="loading">Loading...</p>
      <div v-else class="space-y-3">
        <p><span class="font-medium">Status:</span> <StatusBadge :status="status?.status" /></p>
        <p><span class="font-medium">Sent:</span> {{ status?.msg_sent || 0 }}</p>
        <p><span class="font-medium">Failed:</span> {{ status?.msg_failed || 0 }}</p>
        <p><span class="font-medium">Reconnects:</span> {{ status?.reconnect_count || 0 }}</p>
        <button @click="refresh" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600">Refresh</button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/reusable/PageHeader.vue'
import StatusBadge from '@/components/reusable/StatusBadge.vue'
import api from '@/api/client'

const route = useRoute()
const id = route.params.id
const loading = ref(true)
const status = ref(null)

onMounted(fetchStatus)
async function fetchStatus() {
  try {
    const res = await api.get(`/api/sessions/${id}/status`)
    status.value = res.data
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}
async function refresh() { loading.value = true; await fetchStatus() }
</script>
