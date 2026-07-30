<template>
  <section class="relative pt-36 pb-20 md:pt-44 md:pb-32 overflow-hidden bg-slate-950">
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-slate-950 to-slate-950"></div>
    <div class="max-w-7xl mx-auto px-6 text-center relative z-10">
      
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-xs font-semibold text-emerald-400 mb-8">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Dari Aceh untuk Indonesia
      </div>

      <h1 class="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight max-w-5xl mx-auto mb-6 text-white">
        WhatsApp Gateway Multi-Session & <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">AI Engine Terandal</span>
      </h1>

      <p class="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
        Kelola puluhan nomor WhatsApp dari satu dashboard tanpa khawatir terblokir. Dilengkapi <strong class="text-slate-200">11-stage anti-ban engine</strong>, AI chatbot otomatis, integrasi SDK 5 menit, dan infrastruktur berkecepatan tinggi.
      </p>

      <div class="flex flex-wrap gap-4 justify-center mb-20">
        <router-link to="/register" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 no-underline">
          Coba Gratis Sekarang
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </router-link>
        <a href="#features" class="bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-semibold text-lg px-8 py-4 rounded-xl transition-all no-underline">
          Pelajari Lebih Lanjut
        </a>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
        <div v-for="s in stats" :key="s.label" class="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 text-center hover:bg-slate-800/50 transition-colors">
          <div class="text-3xl md:text-4xl font-extrabold mb-1" :class="s.colorClass">{{ s.value }}</div>
          <div class="text-xs md:text-sm text-slate-400 font-medium">{{ s.label }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const stats = [
  { value: "99.9%", label: "Server Uptime", colorClass: "text-white" },
  { value: "<100ms", label: "API Latency", colorClass: "text-emerald-400" },
  { value: "11-Stage", label: "Anti-Ban Engine", colorClass: "text-teal-400" },
  { value: "100%", label: "Native WebSocket", colorClass: "text-cyan-400" },
]
</script>
