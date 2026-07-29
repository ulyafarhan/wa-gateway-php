<template>
  <section class="min-h-[85vh] flex items-center pt-24 relative overflow-hidden">
    <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse 600px 400px at 20% 30%, rgba(30,58,138,0.05), transparent),radial-gradient(ellipse 500px 300px at 80% 60%, rgba(124,58,237,0.04), transparent);"></div>
    <div class="section text-center relative w-full">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-sm font-medium" style="background:rgba(30,58,138,0.06);color:#1E3A8A;border:1px solid rgba(30,58,138,0.1);">Dari Aceh untuk Indonesia</div>
      <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-5" style="color:#1E3A8A;">
        WhatsApp Gateway<br><span style="color:#7C3AED;">untuk Bisnis dan Developer</span>
      </h1>
      <p class="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style="color:#475569;">
        Kelola banyak nomor WhatsApp dari satu dashboard. Anti-ban engine, AI chatbot, SDK PHP dan Node.js. Dikelola dari Aceh.
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <router-link to="/register" class="btn-primary px-8 py-3.5 text-base gap-2.5">
          Mulai Gratis
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
        </router-link>
        <router-link to="/login" class="btn-secondary px-8 py-3.5 text-base">Lihat Dashboard</router-link>
      </div>
      <div class="mt-14 grid grid-cols-2 md:grid-cols-4 gap-5 max-w-3xl mx-auto">
        <div v-for="s in stats" :key="s.label" class="rounded-2xl p-5 text-center" style="background:rgba(255,255,255,0.55);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.5);">
          <div class="text-3xl font-bold" style="color:#1E3A8A;">{{ s.value }}</div>
          <div class="text-sm mt-1" style="color:#64748B;">{{ s.label }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const stats = [
  { value: '2+', label: 'Session Aktif' },
  { value: '99.9%', label: 'Uptime Server' },
  { value: '3', label: 'Tier Harga' },
  { value: 'SDK', label: 'PHP + Node.js' },
]
</script>
