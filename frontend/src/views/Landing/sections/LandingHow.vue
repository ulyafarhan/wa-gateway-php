<template>
  <section id="how" class="section" style="background:#f1f5f9;">
    <div style="max-width:1200px;margin:0 auto;">
      <h2 class="section-title">Cara Kerja</h2>
      <p class="section-sub">Dari daftar sampai terhubung, hanya perlu beberapa menit.</p>
      <div class="grid md:grid-cols-3 gap-8 mt-12">
        <div v-for="(step, i) in steps" :key="i" class="text-center">
          <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style="background:rgba(3,105,161,0.1);">
            <span class="text-2xl font-heading font-bold" style="color:#0369a1;">{{ i + 1 }}</span>
          </div>
          <h3 class="text-lg font-heading font-semibold mb-2">{{ step.title }}</h3>
          <p class="text-slate-500 text-sm leading-relaxed">{{ step.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const steps = [
  { title: 'Daftar Akun', desc: 'Buat akun gratis. Pilih paket yang sesuai — Free, Starter, atau Pro. Tanpa kartu kredit.' },
  { title: 'Buat Session', desc: 'Buat session WhatsApp via dashboard. Scan QR code dengan WhatsApp kamu. Sesi otomatis terhubung.' },
  { title: 'Integrasi & Kirim', desc: 'Gunakan SDK atau REST API untuk kirim pesan. Pasang webhook untuk menerima pesan masuk. Selesai.' },
]
</script>
