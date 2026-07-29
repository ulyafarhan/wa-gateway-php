<template>
  <div class="font-body bg-slate-50 text-slate-700 min-h-screen">
    <LandingNav />
    <LandingHero />
    <LandingFeatures />
    <LandingHow />
    <LandingPricing />
    <LandingTestimonials />
    <LandingFAQ />
    <LandingCTA />
    <LandingFooter />
  </div>
</template>

<script setup lang="ts">
import LandingNav from './sections/LandingNav.vue'
import LandingHero from './sections/LandingHero.vue'
import LandingFeatures from './sections/LandingFeatures.vue'
import LandingHow from './sections/LandingHow.vue'
import LandingPricing from './sections/LandingPricing.vue'
import LandingTestimonials from './sections/LandingTestimonials.vue'
import LandingFAQ from './sections/LandingFAQ.vue'
import LandingCTA from './sections/LandingCTA.vue'
import LandingFooter from './sections/LandingFooter.vue'
</script>
