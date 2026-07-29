<template>
  <section id="pricing" class="section">
    <h2 class="section-title">Pilih Paket yang Tepat</h2>
    <p class="section-sub">Semua paket sudah termasuk anti-ban engine dan dashboard monitoring. Upgrade atau turun kapan saja.</p>
    <div class="grid md:grid-cols-4 gap-4 lg:gap-6 mt-8 max-w-6xl mx-auto">
      <PricingCard v-for="(plan, i) in plans" :key="plan.name" :plan="plan" :popular="i === 1" />
    </div>
  </section>
</template>

<script setup lang="ts">
import PricingCard from '@/components/landing/PricingCard.vue'

const plans = [
  {
    name: 'Free', tagline: 'Coba gratis selamanya',
    price: 'Rp0', period: '/bln',
    features: ['1 nomor WhatsApp', '50 pesan per hari', 'Dashboard monitoring'],
    missing: ['AI chatbot', 'Broadcast', 'API'],
    cta: 'Mulai Gratis', ctaLink: '/register', variant: 'secondary'
  },
  {
    name: 'Starter', tagline: 'Untuk bisnis kecil dan UKM',
    price: 'Rp50rb', period: '/bln', yearly: 'Rp42rb per bln (bayar tahunan)',
    features: ['3 nomor WhatsApp', '500 pesan per hari', 'AI chatbot 100x per hari', 'FAQ otomatis', 'Webhook API dan SDK'],
    cta: 'Pilih Starter', ctaLink: '/register', variant: 'primary', popular: true
  },
  {
    name: 'Pro', tagline: 'Untuk bisnis berkembang',
    price: 'Rp150rb', period: '/bln', yearly: 'Rp125rb per bln (bayar tahunan)',
    features: ['10 nomor WhatsApp', '5.000 pesan per hari', 'AI chatbot 1.000x per hari', 'Multi-provider AI', 'Broadcast dan Analytics'],
    cta: 'Pilih Pro', ctaLink: '/register', variant: 'secondary'
  },
  {
    name: 'Enterprise', tagline: 'Untuk skala besar',
    price: 'Custom', period: '', dark: true,
    features: ['Unlimited sessions', 'Dedicated proxy dan IP', 'Custom AI model', 'SLA guarantee', 'Dedicated support'],
    cta: 'Hubungi Sales', ctaLink: 'mailto:sales@waaceh.id', variant: 'ghost'
  }
]
</script>
