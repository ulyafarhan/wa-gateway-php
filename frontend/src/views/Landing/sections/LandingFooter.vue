<template>
  <footer style="background:#F8FAFC;border-top:1px solid #E2E8F0;">
    <div class="max-w-6xl mx-auto px-6 py-12">
      <div class="grid md:grid-cols-4 gap-8">
        <div>
          <div class="flex items-center gap-2.5 text-lg font-bold mb-4" style="color:#1E3A8A;">
            <svg class="w-7 h-7" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#1E3A8A" fill-opacity="0.12"/><path d="M16 6c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10S21.5 6 16 6z" fill="#1E3A8A"/><path d="M16 10c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6z" fill="white"/></svg>
            WaAceh
          </div>
          <p class="text-sm leading-relaxed" style="color:#64748B;">WhatsApp Gateway untuk Aceh dan Indonesia. Dikelola dari Aceh untuk negeri.</p>
        </div>
        <div>
          <h4 class="font-semibold text-sm mb-4" style="color:#1E293B;">Produk</h4>
          <ul class="space-y-2.5 text-sm" style="color:#64748B;">
            <li><a href="#features" class="hover:underline" style="color:#64748B;">Fitur</a></li>
            <li><a href="#pricing" class="hover:underline" style="color:#64748B;">Harga</a></li>
            <li><router-link to="/login" class="hover:underline" style="color:#64748B;">Dashboard</router-link></li>
            <li><a href="/api/health" class="hover:underline" style="color:#64748B;">Status Server</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold text-sm mb-4" style="color:#1E293B;">SDK</h4>
          <ul class="space-y-2.5 text-sm" style="color:#64748B;">
            <li>PHP (Composer)</li>
            <li>Node.js (npm)</li>
            <li>Python (pip)</li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold text-sm mb-4" style="color:#1E293B;">Kontak</h4>
          <ul class="space-y-2.5 text-sm">
            <li><a href="mailto:sales@waaceh.id" class="hover:underline" style="color:#3B82F6;">sales@waaceh.id</a></li>
            <li style="color:#64748B;">Aceh, Indonesia</li>
          </ul>
        </div>
      </div>
      <div class="border-t pt-6 mt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm" style="border-color:#E2E8F0;color:#94A3B8;">
        <span>&copy; 2026 WaAceh. Dibangun dari Aceh.</span>
        <div class="flex gap-6">
          <router-link to="/login" class="hover:underline" style="color:#94A3B8;">Masuk</router-link>
          <router-link to="/register" class="hover:underline" style="color:#94A3B8;">Daftar</router-link>
          <a href="/api/health" class="hover:underline" style="color:#94A3B8;">Health</a>
        </div>
      </div>
    </div>
  </footer>
</template>
