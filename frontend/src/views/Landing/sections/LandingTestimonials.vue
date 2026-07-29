<template>
  <section class="section" style="background:#f1f5f9;">
    <div style="max-width:1200px;margin:0 auto;">
      <h2 class="section-title">Digunakan oleh</h2>
      <p class="section-sub">WaAceh telah dipercaya oleh berbagai tim di Indonesia.</p>
      <div class="grid md:grid-cols-3 gap-6 mt-8">
        <div v-for="t in testimonials" :key="t.name" class="glass-card rounded-2xl p-7">
          <div class="flex gap-1 mb-4"><svg v-for="i in 5" :key="i" class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg></div>
          <p class="text-slate-600 text-sm leading-relaxed mb-5">"{{ t.quote }}"</p>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-sm font-bold text-navy-700">{{ t.initials }}</div>
            <div><div class="text-sm font-semibold">{{ t.name }}</div><div class="text-xs text-slate-500">{{ t.role }}</div></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const testimonials = [
  { quote: 'Sejak pake WaAceh, tim CS kami bisa handle 3x lebih banyak chat. Anti-ban engine-nya bikin tenang.', name: 'T. Othman', role: 'Founder, Startup Aceh', initials: 'TO' },
  { quote: 'SDK PHP-nya bikin integrasi cuma 15 menit. Tinggal composer install, langsung jalan.', name: 'R. Fadhil', role: 'Developer, Medan', initials: 'RF' },
  { quote: 'Broadcast campaign fitur paling saya suka. Bisa kirim promosi ke ribuan pelanggan dengan timing yang diatur otomatis.', name: 'Cut Umra', role: 'Marketing, Banda Aceh', initials: 'CU' },
]
</script>
