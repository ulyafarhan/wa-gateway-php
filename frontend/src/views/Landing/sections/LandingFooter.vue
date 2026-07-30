<template>
  <footer class="py-12 border-t border-slate-800/80 bg-slate-950 relative z-10">
    <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold text-sm">W</div>
        <span class="text-lg font-bold text-white">WaAceh</span>
        <span class="text-xs text-slate-500">© 2026 WaAceh Gateway. Dikelola dari Aceh, Indonesia.</span>
      </div>
      <div class="flex items-center gap-6 text-xs text-slate-400">
        <a href="#features" class="hover:text-white transition-colors no-underline">Fitur</a>
        <a href="#pricing" class="hover:text-white transition-colors no-underline">Harga</a>
        <a href="/api/docs" class="hover:text-white transition-colors no-underline">API Docs</a>
        <router-link to="/login" class="hover:text-white transition-colors no-underline">Dashboard Login</router-link>
      </div>
    </div>
  </footer>
</template>
