<template>
  <section id="features" class="section">
    <h2 class="section-title">Platform untuk Kebutuhan WhatsApp Anda</h2>
    <p class="section-sub">Dari broadcast marketing hingga AI chatbot — semua dalam satu platform terpadu.</p>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div v-for="f in features" :key="f.title" class="rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1" style="background:rgba(255,255,255,0.5);backdrop-filter:blur(8px);border:1px solid rgba(226,232,240,0.7);">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style="background:rgba(30,58,138,0.08);">
          <svg class="w-5.5 h-5.5" style="color:#1E3A8A;" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="f.icon"></svg>
        </div>
        <h3 class="text-lg font-semibold mb-2" style="color:#1E293B;">{{ f.title }}</h3>
        <p class="text-sm leading-relaxed" style="color:#64748B;">{{ f.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const features = [
  { title: 'Multi-Session', desc: 'Jalankan banyak nomor WhatsApp dalam satu proses. Setiap sesi independen dengan anti-ban engine otomatis.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>' },
  { title: 'AI Chatbot', desc: 'Balas pesan otomatis dengan AI. Deteksi intent, persona, dan konteks percakapan secara real-time.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/>' },
  { title: 'SDK PHP dan Node.js', desc: 'Integrasi semudah composer install atau npm install. REST API dengan API key dan JWT auth.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/>' },
  { title: 'Anti-Ban Engine', desc: 'Pipeline 11 tahap mengatur timing, volume, dan diversity pengiriman agar menyerupai perilaku manusia.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>' },
  { title: 'Broadcast Campaign', desc: 'Kirim pesan massal dengan prioritas dan penjadwalan. Progress tracking dan analitik real-time.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"/>' },
  { title: 'Groups dan Labels', desc: 'Kelola grup WhatsApp, invite code, atur peserta. Labels untuk organisasi chat dan contact groups.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7.5 21L3 16.5m0 0L7.5 11M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>' },
  { title: 'Interaktif: Buttons dan List', desc: 'Kirim pesan interaktif dengan tombol dan daftar pilihan. Cocok untuk menu CS dan katalog produk.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6.75 3.744l-.753-1.38a1.5 1.5 0 00-2.46 1.243l.083 2.298m4.88-.532l.682-1.348a1.5 1.5 0 012.464-.282l1.678 1.678m-5.002 6.99l.637 1.34a1.5 1.5 0 002.373.81l1.263-.966m-4.82 3.196l.002.002m0 0a.5.5 0 01-.5.5h-1.5a.5.5 0 01-.5-.5v0a.5.5 0 01.5-.5h1.5a.5.5 0 01.5.5zm-1.316-.006c.04.17.133.321.257.435m.643-.435l.002.002a.56.56 0 00.257.435"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17.25 11.25l1.5 1.5-1.5 1.5M14.25 11.25L12.75 9M12 14.25c1.5 0 2.25-.75 4.5-.75"/>' },
  { title: 'Webhook dan API', desc: 'Integrasi dengan sistem kamu via webhook real-time. HMAC signature, auto-retry 10x, dead letter queue.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6.75 12l-4.5 3.75L6.75 3 12 9.75 6.75 12zm0 0l3.75 5.25M12 9.75L20.25 3 12 15 6.75 12"/>' },
]
</script>
