<template>
  <section id="pricing" class="py-24 relative z-10 border-t border-slate-800/60 bg-slate-950">
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center max-w-3xl mx-auto mb-16">
        <h2 class="text-3xl md:text-5xl font-bold text-white mb-4">Paket Harga Transparan</h2>
        <p class="text-slate-400 text-lg">Tanpa biaya tersembunyi. Pilih paket yang pas untuk kebutuhan skala bisnis Anda.</p>
      </div>

      <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <!-- Starter Plan -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between hover:bg-slate-800/60 transition-colors">
          <div>
            <h3 class="text-xl font-bold text-white mb-2">Starter</h3>
            <p class="text-slate-400 text-xs mb-6">Untuk pemula & proyek uji coba</p>
            <div class="flex items-baseline gap-1 mb-6">
              <span class="text-4xl font-extrabold text-white">Rp 0</span>
              <span class="text-xs text-slate-400">/ bulan</span>
            </div>
            <ul class="space-y-3 text-sm text-slate-300 mb-8 list-none p-0">
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> 1 Session WhatsApp</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> 1,000 Pesan / bulan</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> Outbound Webhook</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> Basic Anti-Ban Delay</li>
            </ul>
          </div>
          <router-link to="/register" class="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-center no-underline transition-colors border border-slate-750">Mulai Gratis</router-link>
        </div>

        <!-- Pro Plan (Popular) -->
        <div class="bg-slate-900/80 border-2 border-emerald-500 rounded-3xl p-8 flex flex-col justify-between relative shadow-2xl shadow-emerald-500/10">
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider">
            Paling Populer
          </div>
          <div>
            <h3 class="text-xl font-bold text-white mb-2">Pro Business</h3>
            <p class="text-slate-400 text-xs mb-6">Untuk bisnis & UMKM berkembang</p>
            <div class="flex items-baseline gap-1 mb-6">
              <span class="text-4xl font-extrabold text-white">Rp 149rb</span>
              <span class="text-xs text-slate-400">/ bulan</span>
            </div>
            <ul class="space-y-3 text-sm text-slate-300 mb-8 list-none p-0">
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> 5 Session WhatsApp</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> Unlimited Pesan</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> Full 11-Stage Anti-Ban Engine</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> AI Chatbot Integration (OpenAI/Anthropic)</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> Priority Broadcast Queue</li>
            </ul>
          </div>
          <router-link to="/register" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl text-center no-underline transition-all">Pilih Pro Business</router-link>
        </div>

        <!-- Enterprise Plan -->
        <div class="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col justify-between hover:bg-slate-800/60 transition-colors">
          <div>
            <h3 class="text-xl font-bold text-white mb-2">Enterprise</h3>
            <p class="text-slate-400 text-xs mb-6">Untuk skala besar & instansi</p>
            <div class="flex items-baseline gap-1 mb-6">
              <span class="text-4xl font-extrabold text-white">Custom</span>
            </div>
            <ul class="space-y-3 text-sm text-slate-300 mb-8 list-none p-0">
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> Unlimited Sesi WhatsApp</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> Dedicated Proxy SOCKS5 (WARP)</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> Custom SLA 99.9% Uptime</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> On-Premise / Private VPS Deploy</li>
              <li class="flex items-center gap-2.5"><span class="text-emerald-400 font-bold">✓</span> 24/7 Dedicated Support Engineer</li>
            </ul>
          </div>
          <router-link to="/register" class="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-center no-underline transition-colors border border-slate-750">Hubungi Tim</router-link>
        </div>
      </div>
    </div>
  </section>
</template>
