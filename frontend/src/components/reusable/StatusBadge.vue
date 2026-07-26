<template>
  <span :class="badgeClass" class="inline-block rounded-full px-2 py-0.5 text-xs font-medium">{{ status }}</span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ status: String })
const badgeClass = computed(() => {
  const map = { connected: 'text-success-600 bg-success-50 dark:bg-success-500/15', disconnected: 'text-error-600 bg-error-50 dark:bg-error-500/15', waiting_qr: 'text-warning-600 bg-warning-50 dark:bg-warning-500/15', reconnecting: 'text-warning-600 bg-warning-50 dark:bg-warning-500/15', connecting: 'text-brand-600 bg-brand-50 dark:bg-brand-500/15' }
  return map[props.status] || 'text-gray-600 bg-gray-50 dark:bg-gray-500/15'
})
</script>
