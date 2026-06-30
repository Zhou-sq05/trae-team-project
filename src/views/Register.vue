<template>
  <div class="register-container">
    <div class="register-form-wrapper">
      <h2>{{ pageTitle }}</h2>
      
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
          <el-button type="primary" @click="handleRegister" style="width: 100%" :loading="loading">
            注册
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
        <el-button type="text" @click="goToLogin">已有账号？去登录</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const userType = computed(() => route.query.type || 'user')
const loading = ref(false)
const errorMessage = ref('')

const pageTitle = computed(() => {
  return userType.value === 'admin' ? '服务器端注册' : '用户端注册'
})

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
    return {}
  }
}

const saveUsers = (users) => {
  localStorage.setItem('users', JSON.stringify(users))
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
      errorMessage.value = '注册成功！'
      setTimeout(() => {
        goToLogin()
      }, 1000)
    }, 500)
  } catch (error) {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}

const goToLogin = () => {
  router.push({ path: '/login', query: { type: userType.value } })
}
</script>

<style scoped>
.register-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-form-wrapper {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.register-form-wrapper h2 {
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