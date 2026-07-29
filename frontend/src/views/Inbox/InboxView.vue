<template>
  <AdminLayout>
    <div class="flex h-[calc(100vh-120px)] gap-4">
      <!-- Chat List -->
      <div class="w-80 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
        <div class="p-4 border-b"><h2 class="font-semibold">Inbox</h2></div>
        <div class="flex-1 overflow-y-auto">
          <div v-for="chat in chats" :key="chat.id" @click="selected = chat"
            class="p-4 border-b hover:bg-gray-50 cursor-pointer" :class="{ 'bg-brand-50': selected?.id === chat.id }">
            <div class="flex justify-between"><span class="font-medium text-sm">{{ chat.name }}</span><span class="text-xs text-gray-400">{{ chat.time }}</span></div>
            <p class="text-xs text-gray-500 truncate mt-1">{{ chat.last_msg }}</p>
          </div>
        </div>
      </div>
      <!-- Conversation -->
      <div class="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col">
        <div v-if="selected" class="flex-1 flex flex-col">
          <div class="p-4 border-b font-medium text-sm">{{ selected.name }}</div>
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <div v-for="msg in selected.messages" :key="msg.id"
              class="max-w-[70%] p-3 rounded-xl text-sm" :class="msg.fromMe ? 'ml-auto bg-brand-500 text-white' : 'bg-gray-100'">
              {{ msg.text }}
            </div>
          </div>
          <div class="p-4 border-t flex gap-2">
            <input v-model="replyText" @keyup.enter="sendReply" placeholder="Ketik pesan..." class="flex-1 input" />
            <button @click="sendReply" class="btn-primary px-4">Kirim</button>
          </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center text-gray-400 text-sm">Pilih chat untuk mulai</div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import api from '@/api/client'

const chats = ref([])
const selected = ref(null)
const replyText = ref('')

// Mock data — nanti diganti real webhook listener
onMounted(() => {
  chats.value = [
    { id: '1', name: 'Budi Santoso', time: '5m', last_msg: 'Masih ready stok?', messages: [
      { id: '1', fromMe: false, text: 'Masih ready stok?' },
      { id: '2', fromMe: true, text: 'Masih ada kak, mau berapa?' },
    ]},
    { id: '2', name: 'Siti Wijaya', time: '12m', last_msg: 'Mau tanya ongkir', messages: [
      { id: '3', fromMe: false, text: 'Mau tanya ongkir ke Bandung' },
    ]},
  ]
})

function sendReply() {
  if (!replyText.value || !selected.value) return
  selected.value.messages.push({ id: Date.now().toString(), fromMe: true, text: replyText.value })
  replyText.value = ''
}
</script>
