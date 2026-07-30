<template>
  <section class="py-24 relative z-10 bg-slate-950 border-t border-slate-800/60">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h2 class="text-3xl md:text-5xl font-bold text-white mb-4">Dipercaya Pengembang & Bisnis</h2>
        <p class="text-slate-400 text-lg">Tim dan pengembang di seluruh Indonesia mengandalkan infrastruktur WaAceh.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="t in testimonials" :key="t.name" class="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between hover:bg-slate-800/60 transition-colors">
          <div>
            <div class="flex gap-1 mb-4 text-amber-400">
              <svg v-for="i in 5" :key="i" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
            </div>
            <p class="text-slate-300 text-sm leading-relaxed mb-6">"{{ t.quote }}"</p>
          </div>

          <div class="flex items-center gap-3 border-t border-slate-800/80 pt-4 mt-6">
            <div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
              {{ t.initials }}
            </div>
            <div>
              <div class="text-sm font-bold text-white">{{ t.name }}</div>
              <div class="text-xs text-slate-400">{{ t.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const testimonials = [
  { quote: "Sejak menggunakan WaAceh, tim CS kami bisa menangani 3x lebih banyak pesan pelanggan. Anti-ban engine benar-benar terbukti membuat sesi stabil.", name: "T. Othman", role: "Founder, Tech Startup Aceh", initials: "TO" },
  { quote: "SDK PHP sangat rapi dan mudah diintegrasikan ke Laravel. Cukup composer require, API siap digunakan dalam 5 menit.", name: "R. Fadhil", role: "Senior Developer, Medan", initials: "RF" },
  { quote: "Fitur broadcast campaign dengan priority queue luar biasa. Kirim pesan pengumuman ke ribuan pelanggan jadi sangat lancar.", name: "Cut Umra", role: "Head of Marketing, Banda Aceh", initials: "CU" },
]
</script>
