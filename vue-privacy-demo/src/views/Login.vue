<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <h2>{{ pageTitle }}</h2>
      
      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLogin" style="width: 100%" :loading="loading">
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        style="margin-top: 20px"
      />
      
      <div class="footer-links">
        <el-button type="text" @click="goBack">返回首页</el-button>
        <el-button type="text" @click="goToRegister">没有账号？去注册</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const userType = computed(() => route.query.type || 'user')
const loading = ref(false)
const errorMessage = ref('')

const pageTitle = computed(() => {
  return userType.value === 'admin' ? '管理端登录' : '用户端登录'
})

const loginFormRef = ref(null)
const loginForm = reactive({
  username: userType.value === 'admin' ? 'admin' : '',
  password: userType.value === 'admin' ? '123456' : ''
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const getUsers = () => {
  try {
    const users = localStorage.getItem('users')
    return users ? JSON.parse(users) : {}
  } catch (error) {
    return {}
  }
}

const handleLogin = async () => {
  errorMessage.value = ''
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
    loading.value = true

    const users = getUsers()
    const userData = users[loginForm.username]

    if (!userData) {
      loading.value = false
      errorMessage.value = '用户不存在，请先注册'
      return
    }

    if (userData.password !== loginForm.password) {
      loading.value = false
      errorMessage.value = '密码错误'
      return
    }

    setTimeout(() => {
      loading.value = false
      userStore.login({
        username: loginForm.username,
        token: 'mock-token-' + Date.now(),
        type: userType.value
      })

      if (userType.value === 'admin') {
        router.push('/admin/attr-config')
      } else {
        router.push('/user/device')
      }
    }, 500)
  } catch (error) {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

const goToRegister = () => {
  router.push({ path: '/register', query: { type: userType.value } })
}
</script>

<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-form-wrapper {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.login-form-wrapper h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #303133;
}

.footer-links {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}
</style>