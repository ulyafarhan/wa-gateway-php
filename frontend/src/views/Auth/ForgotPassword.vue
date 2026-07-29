<template>
  <FullScreenLayout>
    <div class="flex items-center justify-center min-h-screen px-4 bg-white dark:bg-gray-900">
      <div class="w-full max-w-md">
        <router-link to="/login" class="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-8">
          <svg class="stroke-current mr-1" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.7083 5L7.5 10.2083L12.7083 15.4167" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Back to login
        </router-link>
        <h1 class="mb-2 font-semibold text-gray-800 dark:text-white/90 text-title-sm sm:text-title-md">Lupa Password</h1>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">Masukkan email kamu untuk menerima link reset password</p>
        <div v-if="sent" class="rounded-lg bg-success-500/10 border border-success-500/20 px-4 py-3 text-sm text-success-500 mb-4">Cek email kamu untuk link reset password</div>
        <form v-else @submit.prevent="handleSubmit">
          <div v-if="error" class="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-500 mb-4">{{ error }}</div>
          <div class="mb-5">
            <label for="email" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Email</label>
            <input v-model="email" type="email" id="email" placeholder="admin@example.com" class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" required />
          </div>
          <button type="submit" :disabled="loading" class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50">{{ loading ? 'Mengirim...' : 'Kirim Link Reset' }}</button>
        </form>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup>
import { ref } from 'vue'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import api from '@/api/client'

const email = ref('')
const error = ref('')
const loading = ref(false)
const sent = ref(false)

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await api.post('/api/auth/forgot-password', { email: email.value })
    sent.value = true
  } catch (e) {
    error.value = e.response?.data?.error || 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}
</script>
