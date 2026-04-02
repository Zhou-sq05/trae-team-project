import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('../views/admin/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/attr-config',
    name: 'AttrConfig',
    component: () => import('../views/admin/AttrConfig.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/dataset',
    name: 'DatasetList',
    component: () => import('../views/admin/DatasetList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/aggregate',
    name: 'AggregateResult',
    component: () => import('../views/admin/AggregateResult.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/device',
    name: 'UserDevice',
    component: () => import('../views/user/UserDevice.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  const requiresAuth = to.meta.requiresAuth !== false
  
  if (requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router