<template>
  <FullScreenLayout>
    <div class="flex items-center justify-center min-h-screen px-4 bg-white dark:bg-gray-900">
      <div class="w-full max-w-md">
        <h1 class="mb-2 font-semibold text-gray-800 dark:text-white/90 text-title-sm sm:text-title-md">Reset Password</h1>
        <p class="mb-6 text-sm text-gray-500 dark:text-gray-400">Buat password baru untuk akun kamu</p>
        <div v-if="success" class="rounded-lg bg-success-500/10 border border-success-500/20 px-4 py-3 text-sm text-success-500 mb-4">Password berhasil direset. <router-link to="/login" class="underline">Masuk sekarang</router-link></div>
        <form v-else @submit.prevent="handleSubmit">
          <div v-if="error" class="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-500 mb-4">{{ error }}</div>
          <div class="mb-5">
            <label for="password" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Password Baru</label>
            <input v-model="password" type="password" id="password" placeholder="Minimal 8 karakter" class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" required minlength="8" />
          </div>
          <div class="mb-5">
            <label for="confirm" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Konfirmasi Password</label>
            <input v-model="confirm" type="password" id="confirm" placeholder="Ulangi password" class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" required minlength="8" />
          </div>
          <button type="submit" :disabled="loading" class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-50">{{ loading ? 'Menyimpan...' : 'Reset Password' }}</button>
        </form>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import api from '@/api/client'

const route = useRoute()
const token = computed(() => route.query.token)
const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)
const success = ref(false)

if (!token.value) error.value = 'Token reset tidak ditemukan'

async function handleSubmit() {
  if (password.value !== confirm.value) { error.value = 'Password tidak cocok'; return }
  if (password.value.length < 8) { error.value = 'Password minimal 8 karakter'; return }
  error.value = ''
  loading.value = true
  try {
    await api.post('/api/auth/reset-password', { token: token.value, password: password.value })
    success.value = true
  } catch (e) {
    error.value = e.response?.data?.error || 'Token tidak valid atau kadaluarsa'
  } finally {
    loading.value = false
  }
}
</script>
