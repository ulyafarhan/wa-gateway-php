<template>
  <section id="faq" class="section">
    <h2 class="section-title">Pertanyaan Umum</h2>
    <p class="section-sub">Ada yang ingin ditanyakan? Mungkin jawabannya ada di bawah.</p>
    <div class="max-w-3xl mx-auto mt-8 space-y-4">
      <details v-for="(item, i) in faqs" :key="i" class="glass-card rounded-xl open:bg-white transition-all" style="cursor:pointer;">
        <summary class="px-6 py-4 font-semibold text-sm flex items-center justify-between" style="color:#0f172a;" @click.prevent="toggle(i)">
          {{ item.q }}
          <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': open[i] }" style="color:#94a3b8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </summary>
        <div v-show="open[i]" class="px-6 pb-5 text-sm text-slate-500 leading-relaxed">{{ item.a }}</div>
      </details>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref<boolean[]>([])
const faqs = [
  { q: 'Apa itu WaAceh?', a: 'WaAceh adalah WhatsApp Gateway yang memungkinkan kamu mengelola banyak nomor WhatsApp dari satu dashboard. Cocok untuk customer service, broadcast marketing, dan integrasi AI chatbot.' },
  { q: 'Apakah nomor saya bisa kena banned?', a: 'WaAceh memiliki anti-ban engine 11 tahap yang mengatur timing, volume, dan diversity pengiriman agar menyerupai perilaku manusia. Risiko banned tetap ada karena ini unofficial API, tapi kami optimasi agar nomor bertahan 6-12+ bulan dengan aktivitas normal.' },
  { q: 'Bahasa pemrograman apa yang didukung?', a: 'Kami menyediakan SDK untuk PHP (Composer) dan Node.js (npm). Jika bahasa kamu belum ada SDK-nya, kamu bisa langsung menggunakan REST API dengan API key atau JWT.' },
  { q: 'Bagaimana cara mulai menggunakan WaAceh?', a: 'Daftar akun gratis, login ke dashboard, buat session WhatsApp, scan QR code, selesai. Kamu bisa langsung kirim pesan via API dalam hitungan menit.' },
  { q: 'Apakah ada garansi uptime?', a: 'Ya, untuk paket Enterprise kami menyediakan SLA guarantee. Paket Pro dan Starter menggunakan infrastruktur yang sama dengan prioritas server yang berbeda.' },
]

function toggle(i: number) { open.value[i] = !open.value[i] }
</script>
