<template>
  <section id="features" class="py-24 relative z-10 border-t border-slate-800/60 bg-slate-950">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h2 class="text-3xl md:text-5xl font-bold text-white mb-4">Kenapa Memilih WaAceh?</h2>
        <p class="text-slate-400 text-lg">Platform WhatsApp Gateway kelas enterprise yang dirancang khusus untuk kecepatan, kestabilan, dan keamanan nomor Anda.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="f in features" :key="f.title" class="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/60 transition-all hover:-translate-y-1">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" :class="f.bgClass">
            <component :is="f.icon" class="w-7 h-7" :class="f.iconClass" />
          </div>
          <h3 class="text-xl font-bold text-white mb-3">{{ f.title }}</h3>
          <p class="text-slate-400 text-sm leading-relaxed">{{ f.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { h } from "vue"

const ShieldIcon = () => h("svg", { fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, [
  h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" })
])
const LayersIcon = () => h("svg", { fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, [
  h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" })
])
const CpuIcon = () => h("svg", { fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, [
  h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M13 10V3L4 14h7v7l9-11h-7z" })
])
const CodeIcon = () => h("svg", { fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, [
  h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" })
])
const SendIcon = () => h("svg", { fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, [
  h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" })
])
const SyncIcon = () => h("svg", { fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, [
  h("path", { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" })
])

const features = [
  {
    title: "11-Stage Anti-Ban Engine",
    description: "Proteksi cerdas dengan timing menyerupai manusia (log-normal delay, token bucket, K-Means persona) untuk menjaga kesehatan sesi nomor WhatsApp Anda.",
    icon: ShieldIcon,
    bgClass: "bg-emerald-500/10 border border-emerald-500/20",
    iconClass: "text-emerald-400"
  },
  {
    title: "Multi-Session Centralized",
    description: "Hubungkan dan kelola banyak nomor WhatsApp bisnis secara bersamaan dari satu dashboard terpusat yang intuitif dan cepat.",
    icon: LayersIcon,
    bgClass: "bg-teal-500/10 border border-teal-500/20",
    iconClass: "text-teal-400"
  },
  {
    title: "AI Chatbot Automations",
    description: "Respons pesan otomatis 24/7 menggunakan pipeline FAQ, Template, atau koneksi langsung ke OpenAI, Anthropic, dan Bedrock LLM.",
    icon: CpuIcon,
    bgClass: "bg-cyan-500/10 border border-cyan-500/20",
    iconClass: "text-cyan-400"
  },
  {
    title: "Native PHP & Node.js SDK",
    description: "Integrasi aplikasi Anda kurang dari 5 menit menggunakan SDK PHP (Composer/Laravel) dan Node.js yang sudah terdistribusi resmi.",
    icon: CodeIcon,
    bgClass: "bg-emerald-500/10 border border-emerald-500/20",
    iconClass: "text-emerald-400"
  },
  {
    title: "Broadcast & Priority Queue",
    description: "Kirim pesan masal terjadwal dengan sistem antrean prioritas (high/normal/low) dan pemantauan status pengiriman real-time.",
    icon: SendIcon,
    bgClass: "bg-teal-500/10 border border-teal-500/20",
    iconClass: "text-teal-400"
  },
  {
    title: "Webhook & Multi-Cloud Sync",
    description: "Outbound webhook otomatis dengan mekanisme retry & dead-letter queue, serta sinkronisasi backup instan ke Supabase & Cloudflare D1.",
    icon: SyncIcon,
    bgClass: "bg-cyan-500/10 border border-cyan-500/20",
    iconClass: "text-cyan-400"
  }
]
</script>
