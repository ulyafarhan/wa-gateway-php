<template>
  <section id="how" class="section" style="background:#F1F5F9;">
    <div style="max-width:1200px;margin:0 auto;">
      <h2 class="section-title">Mulai dalam Tiga Langkah</h2>
      <p class="section-sub">Dari pendaftaran ke pesan pertama tidak lebih dari lima menit.</p>
      <div class="grid md:grid-cols-3 gap-8 mt-12">
        <div v-for="(s, i) in steps" :key="i" class="text-center">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style="background:rgba(30,58,138,0.08);">
            <span class="text-xl font-bold" style="color:#1E3A8A;">{{ i + 1 }}</span>
          </div>
          <h3 class="text-lg font-semibold mb-2" style="color:#1E293B;">{{ s.title }}</h3>
          <p class="text-sm leading-relaxed" style="color:#64748B;">{{ s.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const steps = [
  { title: 'Buat Akun', desc: 'Daftar gratis, pilih paket sesuai kebutuhan. Tidak perlu kartu kredit.' },
  { title: 'Hubungkan WhatsApp', desc: 'Buat sesi via dashboard. Scan QR code dengan WhatsApp kamu. Sesi otomatis terhubung.' },
  { title: 'Integrasi dan Kirim', desc: 'Gunakan SDK atau REST API. Pasang webhook untuk menerima pesan masuk secara real-time.' },
]
</script>
