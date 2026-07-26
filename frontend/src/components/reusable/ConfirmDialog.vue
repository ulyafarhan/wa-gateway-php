<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="$emit('cancel')">
    <div class="rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800 w-full max-w-sm">
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">{{ title }}</h3>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ message }}</p>
      <div class="mt-4 flex justify-end gap-3">
        <button @click="$emit('cancel')" class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300">Batal</button>
        <button @click="$emit('confirm')" :class="confirmClass" class="rounded-lg px-4 py-2 text-sm text-white">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ show: Boolean, title: { type: String, default: 'Konfirmasi' }, message: { type: String, default: 'Yakin?' }, confirmText: { type: String, default: 'Hapus' }, danger: Boolean })
defineEmits(['confirm', 'cancel'])
import { computed } from 'vue'
const confirmClass = computed(() => props.danger ? 'bg-error-500 hover:bg-error-600' : 'bg-brand-500 hover:bg-brand-600')
</script>
