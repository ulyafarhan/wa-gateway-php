<template>
  <div class="mb-4 flex items-center justify-between">
    <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">{{ title }}</h2>
    <slot name="actions" />
  </div>
</template>

<script setup>
defineProps({ title: String })
</script>
