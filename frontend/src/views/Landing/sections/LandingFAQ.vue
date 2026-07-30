<template>
  <section id="faq" class="py-24 relative z-10 bg-slate-950 border-t border-slate-800/60">
    <div class="max-w-4xl mx-auto px-6">
      <div class="text-center mb-16">
        <h2 class="text-3xl md:text-5xl font-bold text-white mb-4">Pertanyaan Umum (FAQ)</h2>
        <p class="text-slate-400 text-lg">Segala hal yang perlu Anda ketahui tentang WaAceh.</p>
      </div>

      <div class="space-y-4">
        <div v-for="(item, i) in faqs" :key="i" class="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden transition-all">
          <button @click="toggle(i)" class="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-base text-white hover:bg-slate-800/50 transition-colors">
            {{ item.q }}
            <svg class="w-5 h-5 transition-transform duration-200 flex-shrink-0 ml-4 text-slate-400" :class="{ 'rotate-180 text-emerald-400': open[i] }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <div v-show="open[i]" class="px-6 pb-6 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 pt-4">
            {{ item.a }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue"

const open = ref<boolean[]>([true, false, false, false, false])
const faqs = [
  { q: "Apakah nomor WhatsApp saya aman dari pemblokiran (banned)?", a: "WaAceh dilengkapi dengan 11-stage Anti-Ban Behavior Engine yang menyimulasikan jeda pengiriman alami seperti manusia, kontrol volume pesan (token bucket), dan pencegahan pengiriman mendadak. Namun, kepatuhan terhadap kebijakan privasi WhatsApp tetap disarankan." },
  { q: "Bagaimana cara mengintegrasikan WaAceh dengan Laravel / PHP?", a: "Anda dapat menginstal SDK resmi kami via Composer (composer require wagateway/sdk-php). Cukup masukkan API Key yang Anda dapatkan di dashboard untuk mulai mengirim pesan dalam hitungan baris kode." },
  { q: "Apakah bisa menggunakan AI Chatbot otomatis?", a: "Ya, WaAceh mendukung pengiriman balasan otomatis berbasis FAQ, Template, maupun penyambungan langsung ke API OpenAI (ChatGPT), Anthropic Claude, atau AWS Bedrock." },
  { q: "Bahasa pemrograman apa saja yang didukung oleh SDK WaAceh?", a: "Kami menyediakan SDK native resmi untuk PHP (Composer / Laravel) dan Node.js / TypeScript. Selain itu, REST API WaAceh dapat diakses dari Python, Go, Java, atau cURL biasa." },
  { q: "Apakah WaAceh memiliki garansi Uptime?", a: "Ya, infrastruktur WaAceh menjamin server uptime 99.9% yang dipantau 24/7 dengan arsitektur memori rendah yang dioptimalkan." }
]

function toggle(i: number) { open.value[i] = !open.value[i] }
</script>
