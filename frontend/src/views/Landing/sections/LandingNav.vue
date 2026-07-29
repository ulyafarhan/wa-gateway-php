<template>
  <nav class="fixed top-0 left-0 right-0 z-50" style="background:rgba(255,255,255,0.72);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-bottom:1px solid rgba(226,232,240,0.5);">
    <div class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
      <router-link to="/" class="flex items-center gap-2.5 text-lg font-bold no-underline" style="color:#1E3A8A;">
        <svg class="w-8 h-8" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#1E3A8A" fill-opacity="0.12"/><path d="M16 6c-5.5 0-10 4.5-10 10s4.5 10 10 10 10-4.5 10-10S21.5 6 16 6z" fill="#1E3A8A"/><path d="M16 10c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6z" fill="white"/></svg>
        WaAceh
      </router-link>
      <div class="hidden md:flex items-center gap-1">
        <a href="#features" class="nav-link">Fitur</a>
        <a href="#pricing" class="nav-link">Harga</a>
        <a href="#how" class="nav-link">Cara Kerja</a>
        <a href="#faq" class="nav-link">FAQ</a>
      </div>
      <div class="flex items-center gap-3">
        <router-link to="/login" class="nav-link hidden sm:inline-flex">Masuk</router-link>
        <router-link to="/register" class="btn-primary text-sm py-2.5 px-5">Daftar Gratis</router-link>
      </div>
    </div>
  </nav>
</template>
