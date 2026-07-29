<template>
  <div class="pricing-card" :class="{ popular: plan.popular, dark: plan.dark }">
    <h3 class="text-lg font-heading font-semibold mb-1">{{ plan.name }}</h3>
    <p class="text-sm text-slate-500 mb-6">{{ plan.tagline }}</p>
    <div class="mb-2"><span class="price-amount">{{ plan.price }}</span><span class="price-period">{{ plan.period }}</span></div>
    <div v-if="plan.yearly" class="text-sm text-emerald-600 font-medium mb-6">{{ plan.yearly }}</div>
    <div v-else class="mb-6"></div>
    <ul class="space-y-2.5 mb-8">
      <li v-for="f in plan.features" :key="f" class="feature-check">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#22c55e;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.5 12.75l6 6 9-13.5"/></svg>
        <span>{{ f }}</span>
      </li>
      <li v-for="m in plan.missing || []" :key="'x'+m" class="feature-check">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:#94a3b8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        <span class="text-slate-400">{{ m }}</span>
      </li>
    </ul>
    <component :is="plan.ctaLink.startsWith('http') ? 'a' : 'router-link'"
      :to="plan.ctaLink.startsWith('http') ? undefined : plan.ctaLink"
      :href="plan.ctaLink.startsWith('http') ? plan.ctaLink : undefined"
      :target="plan.ctaLink.startsWith('http') ? '_blank' : undefined"
      class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition"
      :class="btnClass">{{ plan.cta }}</component>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ plan: any; popular?: boolean }>()

const btnClass = computed(() => {
  if (props.plan.variant === 'primary') return 'btn-primary'
  if (props.plan.variant === 'ghost') return 'ghost-btn'
  return 'btn-secondary w-full justify-center text-center'
})
</script>

<style scoped>
.ghost-btn {
  display: flex; align-items: center; justify-content: center;
  padding: 0.75rem 1rem; border-radius: 0.75rem; font-weight: 600; font-size: 0.875rem;
  transition: all 0.25s ease; cursor: pointer; text-decoration: none;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: white;
}
.ghost-btn:hover { background: rgba(255,255,255,0.2); }
</style>
