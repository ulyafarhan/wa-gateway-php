<template>
  <section id="faq" class="section">
    <h2 class="section-title">Pertanyaan Umum</h2>
    <p class="section-sub">Temukan jawaban untuk pertanyaan yang paling sering diajukan.</p>
    <div class="max-w-3xl mx-auto mt-8 space-y-3">
      <div v-for="(item, i) in faqs" :key="i" class="rounded-xl overflow-hidden transition-all" :class="open[i] ? 'shadow-sm' : ''" style="background:rgba(255,255,255,0.5);backdrop-filter:blur(8px);border:1px solid rgba(226,232,240,0.7);">
        <button @click="toggle(i)" class="w-full px-6 py-4 flex items-center justify-between text-left font-medium text-sm" style="color:#1E293B;">
          {{ item.q }}
          <svg class="w-4 h-4 transition-transform duration-200 flex-shrink-0 ml-4" :class="{ 'rotate-180': open[i] }" style="color:#94A3B8;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <div v-show="open[i]" class="px-6 pb-5 text-sm leading-relaxed" style="color:#64748B;">{{ item.a }}</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref<boolean[]>([])
const faqs = [
  { q: 'Apa itu WaAceh?', a: 'WaAceh adalah platform WhatsApp Gateway yang memungkinkan Anda mengelola banyak nomor WhatsApp dari satu dashboard. Cocok untuk customer service, broadcast marketing, dan integrasi AI chatbot.' },
  { q: 'Apakah nomor WhatsApp bisa kena banned?', a: 'WaAceh memiliki anti-ban engine 11 tahap yang mengatur timing, volume, dan diversity pengiriman agar menyerupai perilaku manusia. Risiko banned tetap ada karena ini unofficial API, namun kami optimasi agar nomor bertahan 6 hingga 12 bulan dengan aktivitas normal.' },
  { q: 'Bahasa pemrograman apa yang didukung?', a: 'Kami menyediakan SDK untuk PHP (Composer) dan Node.js (npm). Tersedia juga Python SDK dan REST API yang bisa digunakan dari bahasa pemrograman apapun.' },
  { q: 'Bagaimana cara memulai?', a: 'Daftar akun gratis, login ke dashboard, buat sesi WhatsApp, scan QR code. Anda bisa langsung mengirim pesan melalui API dalam hitungan menit.' },
  { q: 'Apakah ada garansi uptime?', a: 'Untuk paket Enterprise kami menyediakan SLA guarantee. Paket Pro dan Starter berjalan di infrastruktur yang sama dengan prioritas berbeda.' },
]
function toggle(i: number) { open.value[i] = !open.value[i] }
</script>
