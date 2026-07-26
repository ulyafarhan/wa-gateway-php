<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-gray-200 dark:border-gray-800">
          <th v-for="col in columns" :key="col.key" class="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in data" :key="i" class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/5">
          <td v-for="col in columns" :key="col.key" class="px-3 py-2 text-gray-800 dark:text-white/90">
            <slot :name="col.key" :row="row">{{ formatValue(row, col) }}</slot>
          </td>
        </tr>
        <tr v-if="!data?.length">
          <td :colspan="columns.length" class="px-3 py-8 text-center text-gray-400">{{ loading ? 'Loading...' : 'No data' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
defineProps({ columns: Array, data: Array, loading: Boolean })

function formatValue(row, col) {
  const v = row[col.key]
  if (col.key === 'created_at' || col.key === 'updated_at') return new Date(v).toLocaleDateString()
  if (col.key === 'session_id' && typeof v === 'string') return v.substring(0, 16) + '...'
  return v ?? '-'
}
</script>
