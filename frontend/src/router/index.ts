import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, _from, savedPosition) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'Landing',
      component: () => import('../views/Landing/LandingPage.vue'),
      meta: { title: 'WaAceh — WhatsApp Gateway Indonesia' },
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Auth/Signin.vue'),
      meta: { title: 'Login', layout: 'fullscreen', guest: true },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/Auth/Signup.vue'),
      meta: { title: 'Register', layout: 'fullscreen', guest: true },
    },
    {
      path: '/forgot-password',
      name: 'forgotPassword',
      component: () => import('../views/Auth/ForgotPassword.vue'),
      meta: { title: 'Forgot Password', layout: 'fullscreen', guest: true },
    },
    {
      path: '/reset-password',
      name: 'resetPassword',
      component: () => import('../views/Auth/ResetPassword.vue'),
      meta: { title: 'Reset Password', layout: 'fullscreen', guest: true },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/Ecommerce.vue'),
      meta: { requiresAuth: true, title: 'Dashboard', roles: ['superadmin', 'admin', 'manager', 'operator', 'viewer'] },
    },
    {
      path: '/sessions',
      name: 'Sessions',
      component: () => import('../views/Sessions/SessionsView.vue'),
      meta: { requiresAuth: true, title: 'Sessions', roles: ['superadmin', 'admin', 'operator'] },
    },
    {
      path: '/sessions/:id',
      name: 'SessionDetail',
      component: () => import('../views/Sessions/SessionDetailView.vue'),
      meta: { requiresAuth: true, title: 'Session Detail', roles: ['superadmin', 'admin', 'operator'] },
    },
    {
      path: '/users',
      name: 'Users',
      component: () => import('../views/Users/UsersView.vue'),
      meta: { requiresAuth: true, title: 'Users', roles: ['superadmin', 'admin'] },
    },
    {
      path: '/tenants',
      name: 'Tenants',
      component: () => import('../views/Tenants/TenantsView.vue'),
      meta: { requiresAuth: true, title: 'Tenants', roles: ['superadmin', 'admin'] },
    },
    {
      path: '/inbox',
      name: 'Inbox',
      component: () => import('../views/Inbox/InboxView.vue'),
      meta: { requiresAuth: true, title: 'Inbox', roles: ['superadmin', 'admin', 'operator'] },
    },
    {
      path: '/inbox/:sessionId',
      name: 'InboxSession',
      component: () => import('../views/Inbox/InboxView.vue'),
      meta: { requiresAuth: true, title: 'Inbox', roles: ['superadmin', 'admin', 'operator'] },
    },
    {
      path: '/broadcast',
      name: 'Broadcast',
      component: () => import('../views/Broadcast/BroadcastView.vue'),
      meta: { requiresAuth: true, title: 'Broadcast', roles: ['superadmin', 'admin', 'operator'] },
    },
    {
      path: '/logs',
      name: 'Logs',
      component: () => import('../views/Tables/Logs.vue'),
      meta: { requiresAuth: true, title: 'Logs', roles: ['superadmin', 'admin', 'manager', 'operator'] },
    },
    {
      path: '/contacts',
      name: 'Contacts',
      component: () => import('../views/Tables/Contacts.vue'),
      meta: { requiresAuth: true, title: 'Contacts', roles: ['superadmin', 'admin', 'manager', 'operator'] },
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('../views/Others/Settings.vue'),
      meta: { requiresAuth: true, title: 'Settings', roles: ['superadmin', 'admin'] },
    },
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('../views/Others/UserProfile.vue'),
      meta: { requiresAuth: true, title: 'Profile', roles: ['superadmin', 'admin', 'manager', 'operator', 'viewer'] },
    },
    {
      path: '/forbidden',
      name: 'Forbidden',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: { title: 'Forbidden' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/Errors/FourZeroFour.vue'),
      meta: { title: '404' },
    },
  ],
})

let authReady = false
router.beforeEach(async (to, _from, next) => {
  const { useAuthStore } = await import('../stores/auth')
  const auth = useAuthStore()

  // Wait for auth initialization on first run
  if (!authReady) {
    await auth.initAuth()
    authReady = true
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) return next({ name: 'Login' })
  if (to.meta.guest && auth.isAuthenticated) return next({ name: 'Dashboard' })

  if (to.meta.roles && auth.role) {
    const roles = to.meta.roles as string[]
    if (!roles.includes(auth.role)) return next({ name: 'Forbidden' })
  }

  document.title = `WaAceh | ${(to.meta.title as string) || ''}`
  next()
})

export default router
