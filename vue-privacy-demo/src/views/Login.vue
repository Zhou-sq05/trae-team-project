<template>
  <div class="login-container">
    <div class="login-form-wrapper">
      <h2>{{ pageTitle }}</h2>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="登录" name="login">
          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-width="80px">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="loginForm.username" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleLogin" style="width: 100%" :loading="loading">登录</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="注册" name="register">
          <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="80px">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="registerForm.username" placeholder="请输入用户名" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="registerForm.password" type="password" placeholder="请输入密码" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请确认密码" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleRegister" style="width: 100%" :loading="loading">注册</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        style="margin-top: 20px"
      />
      <el-button type="text" @click="goBack" style="margin-top: 10px">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const validUserTypes = ['user', 'admin']
const normalizeUserType = (type) => (validUserTypes.includes(type) ? type : 'user')

const userType = ref(normalizeUserType(route.query.type))
const activeTab = ref(route.query.tab || 'login')
const loading = ref(false)
const errorMessage = ref('')

const pageTitle = computed(() => {
  const titles = {
    user: '用户端登录',
    admin: '管理端登录'
  }
  return titles[userType.value] || '登录'
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

const registerFormRef = ref(null)
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3-20 之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const getUsers = () => {
  try {
    const users = localStorage.getItem('users')
    return users ? JSON.parse(users) : {}
  } catch (error) {
    console.error('获取用户数据失败:', error)
    return {}
  }
}

const saveUsers = (users) => {
  try {
    localStorage.setItem('users', JSON.stringify(users))
  } catch (error) {
    console.error('保存用户数据失败:', error)
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
        router.push('/admin/dashboard')
      } else {
        router.push('/user/device')
      }
    }, 1000)
  } catch (error) {
    console.error('登录校验失败:', error)
    loading.value = false
  }
}

const handleRegister = async () => {
  errorMessage.value = ''
  if (!registerFormRef.value) return

  try {
    await registerFormRef.value.validate()
    loading.value = true

    const users = getUsers()

    if (users[registerForm.username]) {
      loading.value = false
      errorMessage.value = '用户名已存在'
      return
    }

    users[registerForm.username] = {
      password: registerForm.password,
      type: userType.value,
      createdAt: new Date().toISOString()
    }
    saveUsers(users)

    setTimeout(() => {
      loading.value = false
      errorMessage.value = '注册成功，请登录'
      activeTab.value = 'login'
      registerForm.username = ''
      registerForm.password = ''
      registerForm.confirmPassword = ''
    }, 1000)
  } catch (error) {
    console.error('注册校验失败:', error)
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  userType.value = normalizeUserType(route.query.type)
  activeTab.value = route.query.tab || 'login'
})
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
</style>
