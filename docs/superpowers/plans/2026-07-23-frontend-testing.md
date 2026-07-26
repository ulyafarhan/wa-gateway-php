## Bagian 3: Frontend & Testing

### 3.1 Arsitektur Frontend

**Stack:**
- Vue 3 (Composition API + `<script setup>`)
- TailAdmin 2.3.0 (template yang sudah ada: `vue-tailwind-admin-dashboard-main/`)
- Tailwind CSS v4
- Vue Router 4 (nested routes, meta roles, guards)
- Pinia (state management: auth, sessions, broadcast)
- Axios (HTTP client dengan interceptor untuk JWT)
- vue3-apexcharts (chart dashboard)

**Struktur direktori final:**

```
frontend/src/
├── api/                    # Axios instance + endpoint modules
│   ├── client.js           # Axios create + interceptors
│   ├── auth.js             # login, logout, me
│   ├── sessions.js         # CRUD sessions, status, QR
│   ├── users.js            # CRUD users
│   ├── broadcast.js        # send, queue status
│   ├── devices.js          # device list, connect/disconnect
│   ├── logs.js             # fetch logs dengan filter
│   └── settings.js         # API keys, webhook, behavior config
├── stores/                 # Pinia stores
│   ├── auth.js             # user, token, role, permissions
│   ├── sessions.js         # session list, active filters
│   ├── broadcast.js        # queue, history
│   └── ui.js               # sidebar collapsed, theme
├── components/
│   ├── layout/             # Dari TailAdmin (sudah ada)
│   │   ├── AdminLayout.vue
│   │   ├── AppSidebar.vue
│   │   ├── AppHeader.vue
│   │   └── ...
│   ├── reusable/           # Komponen shared
│   │   ├── DataTable.vue
│   │   ├── StatusBadge.vue
│   │   ├── QRModal.vue
│   │   ├── ConfirmDialog.vue
│   │   ├── ActivityTimeline.vue
│   │   ├── MetricCard.vue
│   │   └── FilterBar.vue
│   └── widgets/            # Komponen spesifik halaman
│       ├── RecentActivity.vue
│       ├── SessionFilters.vue
│       └── MessageChart.vue
├── views/
│   ├── Dashboard/
│   │   └── DashboardView.vue
│   ├── Sessions/
│   │   └── SessionsView.vue
│   ├── Users/
│   │   └── UsersView.vue
│   ├── Devices/
│   │   └── DevicesView.vue
│   ├── Broadcast/
│   │   └── BroadcastView.vue
│   ├── Logs/
│   │   └── LogsView.vue
│   ├── Settings/
│   │   └── SettingsView.vue
│   ├── Auth/
│   │   ├── LoginView.vue
│   │   └── LogoutView.vue
│   └── Errors/
│       ├── NotFound.vue
│       └── Forbidden.vue
├── router/
│   └── index.js            # Route definitions + beforeEach guard
├── utils/
│   ├── formatters.js       # date, number formatters
│   └── validators.js       # form validation helpers
├── main.js
├── App.vue
└── style.css               # Tailwind imports + custom
```

**Perubahan pada `vue-tailwind-admin-dashboard-main/` (template existing):**

Hanya `src/router/index.ts` dan `src/main.ts` yang dimodifikasi. Layout (AdminLayout, AppSidebar, AppHeader) sudah siap pakai dari template. View dibuat baru di `src/views/`. Cukup tambahkan Pinia + axios + views baru — template sudah handle layout, sidebar toggle, dark mode, dll.

---

### 3.2 Route Design

**File:** `vue-tailwind-admin-dashboard-main/src/router/index.ts`

```typescript
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Auth/LoginView.vue'),
      meta: { title: 'Login', layout: 'fullscreen' },
    },
    {
      path: '/',
      component: () => import('../components/layout/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('../views/Dashboard/DashboardView.vue'),
          meta: { title: 'Dashboard', roles: ['superadmin', 'admin', 'manager', 'operator', 'viewer'] },
        },
        {
          path: 'sessions',
          name: 'Sessions',
          component: () => import('../views/Sessions/SessionsView.vue'),
          meta: { title: 'Sessions', roles: ['superadmin', 'admin', 'operator'] },
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('../views/Users/UsersView.vue'),
          meta: { title: 'Users', roles: ['superadmin', 'admin'] },
        },
        {
          path: 'devices',
          name: 'Devices',
          component: () => import('../views/Devices/DevicesView.vue'),
          meta: { title: 'Devices', roles: ['superadmin', 'admin', 'operator'] },
        },
        {
          path: 'broadcast',
          name: 'Broadcast',
          component: () => import('../views/Broadcast/BroadcastView.vue'),
          meta: { title: 'Broadcast', roles: ['superadmin', 'admin', 'operator'] },
        },
        {
          path: 'logs',
          name: 'Logs',
          component: () => import('../views/Logs/LogsView.vue'),
          meta: { title: 'Logs', roles: ['superadmin', 'admin', 'manager', 'operator'] },
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('../views/Settings/SettingsView.vue'),
          meta: { title: 'Settings', roles: ['superadmin', 'admin'] },
        },
        {
          path: 'forbidden',
          name: 'Forbidden',
          component: () => import('../views/Errors/Forbidden.vue'),
          meta: { title: 'Forbidden' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/Errors/NotFound.vue'),
      meta: { title: '404' },
    },
  ],
})

// ── Navigation Guard ─────────────────────────────────────────────
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) return next({ name: 'Login' })
  if (to.name === 'Login' && token) return next({ name: 'Dashboard' })

  // Role-based check
  if (to.meta.roles) {
    const userRole = JSON.parse(localStorage.getItem('user') || '{}').role
    if (!to.meta.roles.includes(userRole)) return next({ name: 'Forbidden' })
  }

  document.title = `WA Gateway | ${to.meta.title || ''}`
  next()
})

export default router
```

**Guard `beforeEach` — 3 hal:**
1. Auth check: redirect ke `/login` jika tidak ada token
2. Auto-redirect: jika sudah login dan ke `/login`, arahkan ke `/`
3. Role check: jika route punya `meta.roles`, cek apakah role user termasuk

---

### 3.3 Pinia Stores

**Store Auth** (`src/stores/auth.js`):

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
  const token = ref(localStorage.getItem('token') || '')

  const isAuthenticated = computed(() => !!token.value)
  const role = computed(() => user.value?.role || 'viewer')
  const canAccess = (...roles) => roles.includes(role.value)

  async function login(username, password) {
    const { data } = await api.post('/api/auth/login', { username, password })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { user, token, isAuthenticated, role, canAccess, login, logout }
})
```

**Store Sessions** (`src/stores/sessions.js`):

```javascript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api/client'

export const useSessionsStore = defineStore('sessions', () => {
  const list = ref([])
  const loading = ref(false)
  const filter = ref({ status: '', search: '' })

  async function fetchAll() {
    loading.value = true
    try {
      const { data } = await api.get('/api/sessions/admin')
      list.value = data
    } finally {
      loading.value = false
    }
  }

  async function connect(id) {
    await api.post(`/api/sessions/${id}/connect`)
    await fetchAll()
  }

  async function disconnect(id) {
    await api.post(`/api/sessions/${id}/disconnect`)
    await fetchAll()
  }

  const filtered = computed(() => {
    return list.value.filter(s => {
      if (filter.value.status && s.status !== filter.value.status) return false
      if (filter.value.search && !s.session_id.includes(filter.value.search)) return false
      return true
    })
  })

  return { list, loading, filter, filtered, fetchAll, connect, disconnect }
})
```

**Store UI** (`src/stores/ui.js`):

```javascript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const theme = ref(localStorage.getItem('theme') || 'light')

  function toggleSidebar() { sidebarCollapsed.value = !sidebarCollapsed.value }
  function setTheme(t) { theme.value = t; localStorage.setItem('theme', t) }

  return { sidebarCollapsed, theme, toggleSidebar, setTheme }
})
```

---

### 3.4 Axios Client

**File:** `src/api/client.js`

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
```

---

### 3.5 Reusable Components

#### DataTable.vue — wrapper tabel reusable

```vue
<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div v-if="$slots.header" class="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
      <slot name="header" />
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-white/[0.02]">
          <tr>
            <th v-for="col in columns" :key="col.key"
              class="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >{{ col.label }}</th>
            <th v-if="$slots.actions" class="px-5 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr v-for="row in data" :key="row.id || row[columns[0]?.key]"
            class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
            <td v-for="col in columns" :key="col.key" class="px-5 py-4 whitespace-nowrap">
              <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
            <td v-if="$slots.actions" class="px-5 py-4">
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="$slots.footer" class="px-5 py-3 border-t border-gray-200 dark:border-gray-800">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
defineProps({ columns: Array, data: Array })
</script>
```

#### StatusBadge.vue

```vue
<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="colorClasses">
    <span class="w-1.5 h-1.5 rounded-full" :class="dotColor"></span>
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ status: String })

const map = {
  connected:    { bg: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500', dot: 'bg-success-500' },
  disconnected: { bg: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500', dot: 'bg-error-500' },
  connecting:   { bg: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500', dot: 'bg-warning-500' },
  pending:      { bg: 'bg-warning-50 text-warning-600', dot: 'bg-warning-500' },
  sent:         { bg: 'bg-success-50 text-success-600', dot: 'bg-success-500' },
  failed:       { bg: 'bg-error-50 text-error-600', dot: 'bg-error-500' },
  queued:       { bg: 'bg-blue-50 text-blue-600', dot: 'bg-blue-500' },
}

const c = computed(() => map[props.status] || { bg: 'bg-gray-50 text-gray-600', dot: 'bg-gray-400' })
const colorClasses = computed(() => c.value.bg)
const dotColor = computed(() => c.value.dot)
const label = computed(() => props.status.charAt(0).toUpperCase() + props.status.slice(1))
</script>
```

#### QRModal.vue — modal untuk menampilkan QR code scan WhatsApp

```vue
<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" @click="$emit('close')" />
    <div class="relative bg-white dark:bg-gray-900 rounded-2xl p-6 z-10 max-w-sm w-full mx-4 shadow-xl">
      <button @click="$emit('close')" class="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
        ✕
      </button>
      <h3 class="text-lg font-semibold mb-4">Scan QR Code</h3>
      <div v-if="qr" class="flex justify-center">
        <img :src="qr" alt="WhatsApp QR" class="rounded-lg" />
      </div>
      <p v-else class="text-center text-gray-500 py-8">QR not available. Status: {{ status }}</p>
      <p class="text-center text-sm text-gray-500 mt-3">Scan dengan WhatsApp > Linked Devices</p>
    </div>
  </div>
</template>

<script setup>
defineProps({ show: Boolean, qr: String, status: String })
defineEmits(['close'])
</script>
```

#### ConfirmDialog.vue

```vue
<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="fixed inset-0 bg-black/50" @click="$emit('cancel')" />
    <div class="relative bg-white dark:bg-gray-900 rounded-2xl p-6 z-10 max-w-sm w-full mx-4">
      <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
      <p class="text-sm text-gray-500 mb-6">{{ message }}</p>
      <div class="flex justify-end gap-3">
        <button @click="$emit('cancel')"
          class="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">Cancel</button>
        <button @click="$emit('confirm')"
          class="px-4 py-2 text-sm rounded-lg bg-error-500 text-white hover:bg-error-600">Confirm</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ show: Boolean, title: String, message: String })
defineEmits(['confirm', 'cancel'])
</script>
```

#### MetricCard.vue

```vue
<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ label }}</p>
        <h4 class="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
          {{ loading ? '...' : value }}
        </h4>
      </div>
      <div class="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
        <component :is="icon" class="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </div>
    </div>
    <div v-if="change !== undefined" class="mt-4 flex items-center gap-1 text-sm"
      :class="change >= 0 ? 'text-success-600' : 'text-error-600'">
      <span>{{ change >= 0 ? '+' : '' }}{{ change }}%</span>
      <span class="text-gray-400">vs yesterday</span>
    </div>
  </div>
</template>

<script setup>
defineProps({ label: String, value: [String, Number], icon: [Object, Function], loading: Boolean, change: Number })
</script>
```

#### FilterBar.vue

```vue
<template>
  <div class="flex flex-wrap items-center gap-3">
    <input v-model="search" type="text" placeholder="Search..."
      class="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900" />
    <select v-model="status"
      class="h-10 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900">
      <option value="">All Status</option>
      <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
    </select>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ modelValue: Object, options: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue'])

const search = computed({ get: () => props.modelValue.search, set: v => emit('update:modelValue', { ...props.modelValue, search: v }) })
const status = computed({ get: () => props.modelValue.status, set: v => emit('update:modelValue', { ...props.modelValue, status: v }) })
</script>
```

---

### 3.6 Role-Based Sidebar

Modifikasi `AppSidebar.vue` — filter `menuGroups` berdasarkan role user:

```javascript
// Di script setup AppSidebar.vue
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const allMenuGroups = [
  {
    title: 'MENU',
    items: [
      { icon: GridIcon, name: 'Dashboard', path: '/' },
      { icon: ChatIcon, name: 'Sessions', path: '/sessions' },
      { icon: UserCircleIcon, name: 'Users', path: '/users' },
      { icon: BoxCubeIcon, name: 'Devices', path: '/devices' },
      { icon: MailIcon, name: 'Broadcast', path: '/broadcast' },
      { icon: DocsIcon, name: 'Logs', path: '/logs' },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { icon: PlugInIcon, name: 'Settings', path: '/settings' },
    ],
  },
]

const roleMenuMap = {
  superadmin: allMenuGroups,
  admin: allMenuGroups,
  operator: [
    { title: 'MENU', items: [
      { icon: GridIcon, name: 'Dashboard', path: '/' },
      { icon: ChatIcon, name: 'Sessions', path: '/sessions' },
      { icon: MailIcon, name: 'Broadcast', path: '/broadcast' },
      { icon: DocsIcon, name: 'Logs', path: '/logs' },
    ]},
  ],
  manager: [
    { title: 'MENU', items: [
      { icon: GridIcon, name: 'Dashboard', path: '/' },
      { icon: DocsIcon, name: 'Logs', path: '/logs' },
    ]},
  ],
  viewer: [
    { title: 'MENU', items: [
      { icon: GridIcon, name: 'Dashboard', path: '/' },
    ]},
  ],
  api: [], // No UI — hanya API access
}

const menuGroups = computed(() => roleMenuMap[auth.role] || [])
```

---

### 3.7 Halaman Detail

#### DashboardView.vue

4 MetricCards (total sessions, devices online, messages today, errors) + ApexChart messages per day + RecentActivity table.

```vue
<template>
  <admin-layout>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
      <MetricCard label="Total Sessions" :value="stats.totalSessions" :icon="ChatIcon" />
      <MetricCard label="Devices Online" :value="stats.onlineDevices" :icon="BoxCubeIcon" />
      <MetricCard label="Messages Today" :value="stats.messagesToday" :icon="MailIcon" />
      <MetricCard label="Errors" :value="stats.errors" :icon="AlertIcon" :change="-12" />
    </div>

    <div class="mt-6 grid grid-cols-12 gap-4 md:gap-6">
      <div class="col-span-12 xl:col-span-8">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-4 font-semibold text-gray-800 dark:text-white/90">Messages per Day</h3>
          <apexchart type="bar" height="300" :options="chartOptions" :series="chartSeries" />
        </div>
      </div>
      <div class="col-span-12 xl:col-span-4">
        <ActivityTimeline :items="recentActivity" />
      </div>
    </div>
  </admin-layout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MetricCard from '@/components/reusable/MetricCard.vue'
import ActivityTimeline from '@/components/reusable/ActivityTimeline.vue'
import api from '@/api/client'
import { ChatIcon, BoxCubeIcon, MailIcon, AlertIcon } from '@/icons'

const stats = ref({ totalSessions: 0, onlineDevices: 0, messagesToday: 0, errors: 0 })
const recentActivity = ref([])

const chartOptions = {
  chart: { type: 'bar', toolbar: { show: false } },
  xaxis: { type: 'datetime' },
  colors: ['#3C50E0'],
}
const chartSeries = ref([{ name: 'Messages', data: [] }])

onMounted(async () => {
  const { data } = await api.get('/api/admin/dashboard')
  stats.value = data.stats
  recentActivity.value = data.recentActivity
  chartSeries.value = [{ name: 'Messages', data: data.messagesPerDay }]
})
</script>
```

#### SessionsView.vue

DataTable + FilterBar + tombol Connect/Disconnect inline + QRModal.

```vue
<template>
  <admin-layout>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-gray-800 dark:text-white/90">Sessions</h1>
      <button @click="showCreate = true"
        class="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
        + New Session
      </button>
    </div>

    <FilterBar v-model="store.filter" :options="['connected','disconnected','connecting']" />

    <DataTable :columns="columns" :data="store.filtered" class="mt-4">
      <template #cell-status="{ value }">
        <StatusBadge :status="value" />
      </template>
      <template #cell-qr="{ row }">
        <button @click="openQR(row)" class="text-brand-500 hover:underline text-sm">Show QR</button>
      </template>
      <template #cell-actions="{ row }">
        <button v-if="row.status === 'disconnected'" @click="store.connect(row.session_id)"
          class="text-sm text-success-600 hover:underline">Connect</button>
        <button v-else @click="store.disconnect(row.session_id)"
          class="text-sm text-error-600 hover:underline ml-3">Disconnect</button>
        <button @click="confirmDelete(row)" class="text-sm text-gray-400 hover:text-error-600 ml-3">Delete</button>
      </template>
    </DataTable>

    <QRModal :show="qrModal.show" :qr="qrModal.qr" :status="qrModal.status" @close="qrModal.show = false" />
    <ConfirmDialog :show="deleteDialog.show" title="Delete Session" :message="`Delete ${deleteDialog.id}?`"
      @confirm="doDelete" @cancel="deleteDialog.show = false" />
  </admin-layout>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import DataTable from '@/components/reusable/DataTable.vue'
import StatusBadge from '@/components/reusable/StatusBadge.vue'
import FilterBar from '@/components/reusable/FilterBar.vue'
import QRModal from '@/components/reusable/QRModal.vue'
import ConfirmDialog from '@/components/reusable/ConfirmDialog.vue'
import { useSessionsStore } from '@/stores/sessions'
import api from '@/api/client'

const store = useSessionsStore()
const columns = [
  { key: 'session_id', label: 'Session ID' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'last_active', label: 'Last Active' },
  { key: 'qr', label: 'QR' },
]

const qrModal = reactive({ show: false, qr: '', status: '' })
const deleteDialog = reactive({ show: false, id: '' })

async function openQR(row) {
  const { data } = await api.get(`/api/sessions/${row.session_id}/qr`)
  qrModal.qr = data.qr
  qrModal.status = data.status
  qrModal.show = true
}

function confirmDelete(row) { deleteDialog.id = row.session_id; deleteDialog.show = true }
async function doDelete() { await api.delete(`/api/sessions/${deleteDialog.id}`); deleteDialog.show = false; store.fetchAll() }

onMounted(store.fetchAll)
</script>
```

#### BroadcastView.vue

Form compose (message input + contacts selector + schedule picker) + daftar queue status.

```vue
<template>
  <admin-layout>
    <div class="grid grid-cols-12 gap-6">
      <div class="col-span-12 lg:col-span-5">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 class="text-lg font-semibold mb-4">New Broadcast</h2>
          <form @submit.prevent="sendBroadcast">
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Session</label>
              <select v-model="form.sessionId" class="w-full h-10 rounded-lg border border-gray-300 px-4 text-sm">
                <option v-for="s in sessions" :key="s.session_id" :value="s.session_id">{{ s.session_id }}</option>
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Contacts (one per line)</label>
              <textarea v-model="form.contacts" rows="5" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
                placeholder="62812xxxx&#10;62813xxxx"></textarea>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Message</label>
              <textarea v-model="form.message" rows="4" class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm"
                placeholder="Type your message..."></textarea>
            </div>
            <div class="mb-4">
              <label class="block text-sm font-medium mb-1">Schedule (optional)</label>
              <input v-model="form.scheduleAt" type="datetime-local"
                class="w-full h-10 rounded-lg border border-gray-300 px-4 text-sm" />
            </div>
            <button type="submit" :disabled="sending"
              class="w-full px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50">
              {{ sending ? 'Sending...' : 'Send Broadcast' }}
            </button>
          </form>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-7">
        <DataTable :columns="broadcastColumns" :data="queue">
          <template #cell-status="{ value }">
            <StatusBadge :status="value" />
          </template>
        </DataTable>
      </div>
    </div>
  </admin-layout>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import DataTable from '@/components/reusable/DataTable.vue'
import StatusBadge from '@/components/reusable/StatusBadge.vue'
import api from '@/api/client'

const sessions = ref([])
const queue = ref([])
const sending = ref(false)
const form = reactive({ sessionId: '', contacts: '', message: '', scheduleAt: '' })
const broadcastColumns = [
  { key: 'id', label: 'ID' },
  { key: 'total_targets', label: 'Targets' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Created' },
]

async function sendBroadcast() {
  sending.value = true
  try {
    const numbers = form.contacts.split('\n').map(s => s.trim()).filter(Boolean)
    await api.post(`/api/sessions/${form.sessionId}/broadcast`, {
      numbers, message: form.message, schedule_at: form.scheduleAt || null,
    })
    form.contacts = ''; form.message = ''; form.scheduleAt = ''
    await fetchQueue()
  } finally { sending.value = false }
}

async function fetchQueue() {
  const { data } = await api.get('/api/admin/broadcasts')
  queue.value = data
}

onMounted(async () => {
  const { data } = await api.get('/api/sessions')
  sessions.value = data
  await fetchQueue()
})
</script>
```

#### LogsView.vue

Table with level filter, date range picker, search, auto-refresh toggle.

```vue
<template>
  <admin-layout>
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-semibold">Logs</h1>
      <label class="flex items-center gap-2 text-sm">
        <input type="checkbox" v-model="autoRefresh" /> Auto-refresh (10s)
      </label>
    </div>

    <FilterBar v-model="filters" :options="['info','warn','error','debug']">
      <input v-model="filters.dateFrom" type="date" class="h-10 rounded-lg border border-gray-300 px-4 text-sm" />
      <input v-model="filters.dateTo" type="date" class="h-10 rounded-lg border border-gray-300 px-4 text-sm" />
    </FilterBar>

    <DataTable :columns="logColumns" :data="logs" class="mt-4">
      <template #cell-level="{ value }"><StatusBadge :status="value" /></template>
      <template #cell-timestamp="{ value }">{{ new Date(value).toLocaleString() }}</template>
    </DataTable>
  </admin-layout>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import DataTable from '@/components/reusable/DataTable.vue'
import StatusBadge from '@/components/reusable/StatusBadge.vue'
import FilterBar from '@/components/reusable/FilterBar.vue'
import api from '@/api/client'

const logs = ref([])
const autoRefresh = ref(false)
const filters = ref({ search: '', status: '', dateFrom: '', dateTo: '' })
const logColumns = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'level', label: 'Level' },
  { key: 'message', label: 'Message' },
  { key: 'source', label: 'Source' },
]

let interval
watch(autoRefresh, v => {
  if (v) interval = setInterval(fetchLogs, 10000)
  else clearInterval(interval)
})

async function fetchLogs() {
  const params = new URLSearchParams(filters.value)
  const { data } = await api.get(`/api/admin/logs?${params}`)
  logs.value = data
}

watch(filters, fetchLogs, { deep: true })
onMounted(fetchLogs)
onUnmounted(() => clearInterval(interval))
</script>
```

---

### 3.8 Testing Strategy

**Constraints (VPS 414MB):**
- Tidak bisa jalankan browser E2E tests di VPS (Playwright/Puppeteer makan memory)
- CI/CD bisa pakai GitHub Actions (runner gratis, cukup untuk unit + integration)
- Pre-deploy hook: jalankan test di VPS sebelum restart service

**Pilihan:**

| Layer | Tool | Lokasi | Pemicu |
|-------|------|--------|--------|
| Unit test (backend) | Vitest + Supertest | GitHub Actions | `git push` |
| Unit test (frontend) | Vitest + @vue/test-utils | GitHub Actions | `git push` |
| Integration (API) | Supertest + in-memory SQLite | GitHub Actions | `git push` |
| Pre-deploy smoke | curl + assert status | VPS (deploy hook) | `deploy.sh` |

**Kenapa Vitest?** Sudah di ecosystem Vite/Vue 3. Satu tool untuk frontend + backend. Lebih cepat dari Jest. Zero-config untuk Vue.

**Direktori test:**

```
tests/
├── unit/
│   ├── auth.test.js         # login, token verify, RBAC
│   ├── broadcast.test.js    # enqueue, schedule, rate limit
│   ├── backup.test.js       # backup logic
│   └── validators.test.js   # form validation helpers
├── integration/
│   ├── api-auth.test.js     # POST /api/auth/login, middleware
│   ├── api-sessions.test.js # CRUD sessions, connect/disconnect
│   ├── api-broadcast.test.js# send broadcast, queue status
│   └── api-webhook.test.js  # webhook delivery
└── setup.js                 # in-memory DB, seed data
```

**`tests/setup.js`:**

```javascript
import Database from 'better-sqlite3'
import { execSync } from 'child_process'
import path from 'path'

// Use in-memory DB for tests
const db = new Database(':memory:')
// Run schema
execSync('node src/db.js', { env: { ...process.env, DB_PATH: ':memory:' } })

export { db }
```

---

### 3.9 Test Plan

**Priority matrix:**

| Priority | Area | Test | Why |
|----------|------|------|-----|
| **P0** | Auth | Login with valid credentials returns token | Security critical |
| **P0** | Auth | Login with invalid password returns 401 | Security critical |
| **P0** | Auth | Missing token returns 401 | Security critical |
| **P0** | Auth | Expired token returns 401 | Security critical |
| **P0** | Sessions | Create session with valid data returns 200 | Core feature |
| **P0** | Sessions | Delete session cleans up DB + socket | Data integrity |
| **P0** | Broadcast | Enqueue broadcast returns broadcast_id | Core feature |
| **P0** | Broadcast | Rate limiting works (1.5s between sends) | Anti-ban |
| **P1** | Auth | RBAC: operator cannot access /api/users | Authorization |
| **P1** | Auth | RBAC: superadmin can access all | Authorization |
| **P1** | Sessions | GET /api/sessions returns only user's sessions | Multi-tenant |
| **P1** | Sessions | QR endpoint returns QR or status message | UX critical |
| **P1** | Broadcast | Scheduled broadcast stored with status=scheduled | Feature |
| **P1** | Broadcast | Broadcast with invalid numbers returns error | Input validation |
| **P2** | Messages | Send text message enqueues correctly | Core feature |
| **P2** | Webhook | Webhook delivery logs captured | Observability |
| **P2** | Logs | Logs filtered by level works | Diagnostics |
| **P2** | Backup | Backup script creates valid archive | Disaster recovery |

#### Contoh Test: Auth

```javascript
import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'

// Assume server exported as app
import app from '../../server.mjs'

describe('POST /api/auth/login', () => {
  it('returns 200 + token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body.user.role).toBeDefined()
  })

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrongpass' })
    expect(res.status).toBe(401)
  })

  it('returns 401 when no token in protected route', async () => {
    const res = await request(app).get('/api/sessions')
    expect(res.status).toBe(401)
  })
})

describe('RBAC Middleware', () => {
  it('blocks operator from accessing /api/users', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'operator', password: 'password123' })
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${login.body.token}`)
    expect(res.status).toBe(403)
  })
})
```

#### Contoh Test: Broadcast

```javascript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../server.mjs'

describe('POST /api/sessions/:id/broadcast', () => {
  let token, sessionId

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'password123' })
    token = login.body.token
    const create = await request(app)
      .post('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ session_id: 'test-broadcast' })
    sessionId = create.body.session_id
  })

  it('enqueues broadcast and returns broadcast_id', async () => {
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/broadcast`)
      .set('Authorization', `Bearer ${token}`)
      .send({ numbers: ['62812xxxx', '62813xxxx'], message: 'Hello' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('broadcast_id')
    expect(res.body.total_targets).toBe(2)
    expect(res.body.status).toBe('queued')
  })

  it('rejects broadcast without numbers', async () => {
    const res = await request(app)
      .post(`/api/sessions/${sessionId}/broadcast`)
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Hello' })
    expect(res.status).toBe(400)
  })
})
```

---

### 3.10 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
```

**Scripts di `package.json`:**

```json
{
  "scripts": {
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test": "npm run test:unit && npm run test:integration",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "supertest": "^7.0.0",
    "@vue/test-utils": "^2.4.0"
  }
}
```

**Pre-deploy smoke test (`deploy.sh`):**

```bash
#!/bin/bash
# After deploy, verify service is up
sleep 3
curl -s http://localhost:3000/api/health | grep -q '"status":"ok"' && echo "✓ Health check passed" || { echo "✗ Health check failed"; exit 1; }

# Test login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"'$ADMIN_PASS'"}' | jq -r '.token')
[ -n "$TOKEN" ] && echo "✓ Auth works" || { echo "✗ Auth failed"; exit 1; }

# Test sessions endpoint
curl -s http://localhost:3000/api/sessions -H "Authorization: Bearer $TOKEN" | jq '. | length' > /dev/null && echo "✓ API responds" || { echo "✗ API failed"; exit 1; }
```
