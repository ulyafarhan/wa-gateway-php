<template>
  <section class="section text-center" style="background:linear-gradient(135deg,#1E3A8A 0%,#312E81 100%);border-radius:24px;margin:0 1.5rem 3rem;max-width:1200px;padding:4rem 2rem;">
    <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Siap Memulai?</h2>
    <p class="max-w-lg mx-auto mb-8 text-lg" style="color:rgba(255,255,255,0.8);">Buat akun gratis sekarang. Tidak perlu kartu kredit. Satu nomor WhatsApp gratis selamanya.</p>
    <div class="flex flex-wrap gap-4 justify-center">
      <router-link to="/register" class="btn-primary px-8 py-3.5 text-base gap-2.5" style="background:#7C3AED;">
        Daftar Gratis
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
      </router-link>
      <router-link to="/login" class="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm transition" style="border:1px solid rgba(255,255,255,0.25);color:white;" @mouseenter="$event.target.style.background='rgba(255,255,255,0.1)'" @mouseleave="$event.target.style.background='transparent'">Masuk ke Dashboard</router-link>
    </div>
  </section>
</template>
