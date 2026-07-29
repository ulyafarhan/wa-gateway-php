<template>
  <section class="section text-center cta-section">
    <h2 class="text-3xl md:text-4xl font-heading font-bold text-white mb-4">Siap Mulai?</h2>
    <p class="text-slate-300 max-w-lg mx-auto mb-8 text-lg">Buat akun gratis sekarang. Tidak perlu kartu kredit. Dapatkan 1 nomor WhatsApp gratis selamanya.</p>
    <div class="flex flex-wrap gap-4 justify-center">
      <router-link to="/register" class="btn-primary px-8 py-3.5 text-base" style="background:#0369a1;">
        Daftar Gratis
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
      </router-link>
      <router-link to="/login" class="cta-ghost">Masuk ke Dashboard</router-link>
    </div>
  </section>
</template>
