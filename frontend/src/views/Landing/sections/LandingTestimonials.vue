<template>
  <section class="section" style="background:#F1F5F9;">
    <div style="max-width:1200px;margin:0 auto;">
      <h2 class="section-title">Dipercaya oleh</h2>
      <p class="section-sub">Tim dan bisnis di seluruh Indonesia menggunakan WaAceh.</p>
      <div class="grid md:grid-cols-3 gap-6 mt-8">
        <div v-for="t in testimonials" :key="t.name" class="rounded-2xl p-7" style="background:rgba(255,255,255,0.55);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.5);">
          <div class="flex gap-1 mb-4">
            <svg v-for="i in 5" :key="i" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style="color:#F59E0B;"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
          </div>
          <p class="text-sm leading-relaxed mb-5" style="color:#475569;">{{ t.quote }}</p>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style="background:rgba(30,58,138,0.08);color:#1E3A8A;">{{ t.initials }}</div>
            <div><div class="text-sm font-semibold" style="color:#1E293B;">{{ t.name }}</div><div class="text-xs" style="color:#64748B;">{{ t.role }}</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const testimonials = [
  { quote: 'Sejak menggunakan WaAceh, tim CS kami bisa menangani tiga kali lebih banyak chat. Anti-ban engine membuat kami tenang.', name: 'T. Othman', role: 'Founder, Startup Aceh', initials: 'TO' },
  { quote: 'SDK PHP memudahkan integrasi. Cukup composer install, semua berjalan dalam 15 menit.', name: 'R. Fadhil', role: 'Developer, Medan', initials: 'RF' },
  { quote: 'Fitur broadcast campaign paling saya sukai. Kirim promosi ke ribuan pelanggan dengan penjadwalan otomatis.', name: 'Cut Umra', role: 'Marketing, Banda Aceh', initials: 'CU' },
]
</script>
