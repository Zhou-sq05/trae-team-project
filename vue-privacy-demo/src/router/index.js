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
    path: '/register',          
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/admin/dashboard',
    name: 'AdminDashboard',
    component: () => import('../views/admin/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/scenario-overview',
    name: 'ScenarioOverview',
    component: () => import('../views/admin/ScenarioOverview.vue'),
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
    path: '/user/demo/arr-multi-client-upload',
    name: 'ArrMultiClientUploadDemo',
    component: () => import('../views/user/ArrMultiClientUploadDemo.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/demo/agrr-multi-client-upload',
    name: 'AgrrMultiClientUploadDemo',
    component: () => import('../views/user/AgrrMultiClientUploadDemo.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/demo/aoue-multi-client-upload',
    name: 'AoueMultiClientUploadDemo',
    component: () => import('../views/user/AoueMultiClientUploadDemo.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/user/demo/tsp-multi-client-upload',
    name: 'TspMultiClientUploadDemo',
    component: () => import('../views/user/TspMultiClientUploadDemo.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin/demo/arr-experiment-comparison',
    name: 'ArrExperimentComparison',
    component: () => import('../views/admin/ArrExperimentComparison.vue'),
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
