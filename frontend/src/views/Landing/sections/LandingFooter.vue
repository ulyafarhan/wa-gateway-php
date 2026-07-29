<template>
  <footer style="background:#f8fafc;border-top:1px solid #e2e8f0;">
    <div class="max-w-6xl mx-auto px-6 py-12">
      <div class="grid md:grid-cols-4 gap-8">
        <div>
          <div class="flex items-center gap-2.5 text-lg font-heading font-bold mb-4" style="color:#0f172a;">
            <svg class="w-7 h-7" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#0369a1" fill-opacity="0.15"/><path d="M16 6c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10S21.5 6 16 6z" fill="#0369a1"/><path d="M16 10c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6z" fill="white"/></svg>
            WaAceh
          </div>
          <p class="text-sm text-slate-500 leading-relaxed">WhatsApp Gateway untuk Aceh dan Indonesia. Dikelola dari Aceh, untuk negeri.</p>
        </div>
        <div>
          <h4 class="font-heading font-semibold text-sm mb-4" style="color:#0f172a;">Produk</h4>
          <ul class="space-y-2.5 text-sm text-slate-500">
            <li><a href="#features" class="hover:text-blue-600 transition">Fitur</a></li>
            <li><a href="#pricing" class="hover:text-blue-600 transition">Harga</a></li>
            <li><router-link to="/login" class="hover:text-blue-600 transition">Dashboard</router-link></li>
            <li><a href="https://waaceh.biz.id/api/health" class="hover:text-blue-600 transition">Health</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-heading font-semibold text-sm mb-4" style="color:#0f172a;">SDK</h4>
          <ul class="space-y-2.5 text-sm text-slate-500">
            <li><span class="text-slate-400">PHP (Composer)</span></li>
            <li><span class="text-slate-400">Node.js (npm)</span></li>
            <li><span class="text-slate-400">REST API</span></li>
          </ul>
        </div>
        <div>
          <h4 class="font-heading font-semibold text-sm mb-4" style="color:#0f172a;">Kontak</h4>
          <ul class="space-y-2.5 text-sm text-slate-500">
            <li><a href="mailto:sales@waaceh.id" class="hover:text-blue-600 transition">sales@waaceh.id</a></li>
            <li><span class="text-slate-400">Aceh, Indonesia</span></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-slate-200 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
        <span>© 2026 WaAceh. Dibangun dari Aceh.</span>
        <div class="flex gap-6">
          <router-link to="/login" class="hover:text-slate-600 transition">Masuk</router-link>
          <router-link to="/register" class="hover:text-slate-600 transition">Daftar</router-link>
          <span class="text-slate-300">|</span>
          <a href="/api/health" class="hover:text-slate-600 transition">Health</a>
        </div>
      </div>
    </div>
  </footer>
</template>
