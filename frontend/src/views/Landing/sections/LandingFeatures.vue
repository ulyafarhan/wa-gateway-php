<template>
  <section id="features" class="section">
    <h2 class="section-title">Kenapa WaAceh?</h2>
    <p class="section-sub">Dibangun khusus untuk kebutuhan WhatsApp Gateway di Indonesia dengan teknologi anti-ban terkini.</p>
    <div class="grid md:grid-cols-3 gap-6">
      <div v-for="f in features" :key="f.title" class="glass-card rounded-2xl p-8">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style="background:rgba(3,105,161,0.1);">
          <svg class="w-6 h-6" style="color:#0369a1;" fill="none" stroke="currentColor" viewBox="0 0 24 24" v-html="f.icon"></svg>
        </div>
        <h3 class="text-xl font-heading font-semibold mb-3" style="color:#0f172a;">{{ f.title }}</h3>
        <p class="text-slate-500 text-sm leading-relaxed">{{ f.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const features = [
  { title: 'Multi-Session', desc: 'Kelola banyak nomor WhatsApp dalam satu panel. Gampang, cepat, terpusat. Cocok untuk tim CS, marketing, dan operasional.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>' },
  { title: 'AI Chatbot', desc: 'Balas otomatis dengan AI. Dukung OpenAI, Anthropic, Bedrock. Deteksi intent dan persona user secara real-time.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/>' },
  { title: 'SDK Lengkap', desc: 'Integrasi semudah install package. Tersedia untuk PHP (Composer) dan Node.js (npm). REST API dengan auth API key atau JWT.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"/>' },
  { title: 'Anti-Ban Engine', desc: 'Behavior pipeline 11 tahap: timing humanis, volume control, quiet hours, diversity check, burst protection. Nomor bertahan lebih lama.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>' },
  { title: 'Broadcast Campaign', desc: 'Kirim pesan massal ke ribuan kontak dengan prioritas (high/normal/low) dan penjadwalan. Progress tracking real-time.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"/>' },
  { title: 'Sync Multi-Target', desc: 'Sinkronisasi data ke Supabase dan Cloudflare D1 secara otomatis. Redis cache untuk performa maksimal di VPS 414MB.', icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.5 21L3 16.5m0 0L7.5 11M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/>' },
]
</script>
