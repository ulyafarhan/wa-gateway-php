<template>
  <nav class="fixed top-0 left-0 right-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
    <div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-3 group no-underline">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        </div>
        <div class="flex flex-col">
          <span class="text-xl font-bold tracking-tight text-white">WaAceh</span>
          <span class="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Enterprise v4.0</span>
        </div>
      </router-link>

      <div class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
        <a href="#features" class="hover:text-emerald-400 transition-colors no-underline">Fitur Utama</a>
        <a href="#how" class="hover:text-emerald-400 transition-colors no-underline">Cara Kerja</a>
        <a href="#pricing" class="hover:text-emerald-400 transition-colors no-underline">Harga</a>
        <a href="#faq" class="hover:text-emerald-400 transition-colors no-underline">FAQ</a>
      </div>

      <div class="flex items-center gap-4">
        <router-link to="/login" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors no-underline">Masuk</router-link>
        <router-link to="/register" class="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-500/10 no-underline">Mulai Gratis</router-link>
      </div>
    </div>
  </nav>
</template>
