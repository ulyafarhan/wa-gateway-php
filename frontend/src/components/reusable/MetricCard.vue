<template>
  <div class="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="flex items-center justify-between">
      <span class="text-sm text-gray-500 dark:text-gray-400">{{ label }}</span>
    </div>
    <div class="mt-3 flex items-end justify-between">
      <h4 class="text-2xl font-bold text-gray-800 dark:text-white/90">{{ value }}</h4>
    </div>
  </div>
</template>

<script setup>
defineProps({ label: String, value: [Number, String], color: { type: String, default: 'brand' }, icon: String })
</script>
