import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/admin-layout.css'
import * as ldpAlgorithms from './utils/ldpAlgorithms'
import { useUserStore } from './store/user'
import { useTaskStore } from './store/task'

const app = createApp(App)

app.use(router)
app.use(pinia)
app.use(ElementPlus)

// 挂载 ldpAlgorithms 到全局
app.config.globalProperties.$ldp = ldpAlgorithms

// 初始化用户信息
const userStore = useUserStore()
userStore.initUser()

// 初始化任务数据
const taskStore = useTaskStore()
taskStore.loadFromLocalStorage()

app.mount('#app')
