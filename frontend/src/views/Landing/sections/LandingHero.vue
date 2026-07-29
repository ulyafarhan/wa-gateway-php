<template>
  <section class="min-h-[90vh] flex items-center pt-24 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none" :style="bgGradient"></div>
    <div class="section text-center relative w-full">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy-50 border border-navy-100 text-sm text-navy-600 font-medium mb-8">Dari Aceh, untuk Indonesia</div>
      <h1 class="text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold leading-tight mb-6" style="color:#0f172a;">
        WA <span style="color:#0369a1;">Geutanyoe</span><br>Aneuk Nanggroe
      </h1>
      <p class="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
        WhatsApp Gateway untuk bisnis dan developer. Multi-session, anti-ban engine, AI chatbot, SDK lengkap — dikelola dari Aceh, untuk seluruh Indonesia.
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <router-link to="/register" class="btn-primary px-8 py-3.5 text-base">
          Mulai Gratis
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </router-link>
        <router-link to="/login" class="btn-secondary px-8 py-3.5 text-base">Lihat Dashboard</router-link>
      </div>
      <div class="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
        <div v-for="stat in stats" :key="stat.label" class="glass-card rounded-xl p-5 text-center">
          <div class="text-3xl font-heading font-bold" style="color:#0369a1;">{{ stat.value }}</div>
          <div class="text-sm text-slate-500 mt-1">{{ stat.label }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const bgGradient = 'background: radial-gradient(ellipse 600px 400px at 20% 30%, rgba(3,105,161,0.06), transparent), radial-gradient(ellipse 500px 300px at 80% 60%, rgba(15,23,42,0.04), transparent)'
const stats = [
  { value: '2+', label: 'Session Aktif' },
  { value: '99.9%', label: 'Uptime' },
  { value: '3', label: 'Tier Harga' },
  { value: 'SDK', label: 'PHP + Node.js' },
]
</script>
