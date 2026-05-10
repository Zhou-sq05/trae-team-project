<template>
  <div class="login-page">
    <section class="brand-panel">
      <div class="brand">
        <img src="/logo.png" alt="山东大学" />
        <div>
          <div class="system-name">隐私保护健康数据采集与管理平台</div>
          <div class="school-name">山东大学 网络空间安全学院</div>
        </div>
      </div>

      <div class="intro-copy">
        <p class="eyebrow">{{ roleLabel }}</p>
        <h1>{{ pageTitle }}</h1>
        <p>{{ roleDesc }}</p>
      </div>

      <div class="process-list">
        <span v-for="item in processItems" :key="item">{{ item }}</span>
      </div>
    </section>

    <section class="login-card">
      <div class="panel-header">
        <h2>{{ pageTitle }}</h2>
      </div>

      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="loginForm.password" :type="showPassword ? 'text' : 'password'">
            <template #suffix>
              <el-icon class="password-toggle" @click="showPassword = !showPassword">
                <View v-if="showPassword" />
                <Hide v-else />
              </el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-button type="primary" class="login-button" :loading="loading" @click="handleLogin">登录</el-button>
      </el-form>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        show-icon
        class="error-alert"
      />

      <div class="footer-links">
        <el-button text @click="goBack">返回平台首页</el-button>
        <el-button text @click="goToRegister">注册账号</el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Hide, View } from '@element-plus/icons-vue'
import { useUserStore } from '../store/user'

const DEFAULT_ACCOUNTS = {
  user: { username: '用户001', password: 'password', type: 'user' },
  admin: { username: '管理001', password: 'password', type: 'admin' }
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const userType = computed(() => (route.query.type === 'admin' ? 'admin' : 'user'))
const loading = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)
const loginFormRef = ref(null)

const loginForm = reactive({
  username: DEFAULT_ACCOUNTS[userType.value].username,
  password: DEFAULT_ACCOUNTS[userType.value].password
})

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const pageTitle = computed(() => (userType.value === 'admin' ? '管理控制台登录' : '采集端登录'))
const roleLabel = computed(() => (userType.value === 'admin' ? '管理控制台' : '采集端'))
const roleDesc = computed(() =>
  userType.value === 'admin'
    ? '配置采集任务、下发协议参数，并查看数据列表与聚合估计结果。'
    : '查看绑定任务，完成健康数据采集，并在本地扰动后提交上报。'
)
const processItems = computed(() =>
  userType.value === 'admin'
    ? ['配置采集任务', '下发协议参数', '聚合分析']
    : ['查看当前绑定任务', '填写或模拟健康数据', '本地扰动后提交']
)

watch(userType, (type) => {
  loginForm.username = DEFAULT_ACCOUNTS[type].username
  loginForm.password = DEFAULT_ACCOUNTS[type].password
  errorMessage.value = ''
})

const getUsers = () => {
  const defaults = {
    [DEFAULT_ACCOUNTS.user.username]: DEFAULT_ACCOUNTS.user,
    [DEFAULT_ACCOUNTS.admin.username]: DEFAULT_ACCOUNTS.admin
  }

  try {
    const users = localStorage.getItem('users')
    return { ...defaults, ...(users ? JSON.parse(users) : {}) }
  } catch (error) {
    return defaults
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
        token: `mock-token-${Date.now()}`,
        type: userType.value
      })

      router.push(userType.value === 'admin' ? '/admin/scenario-overview' : '/user/device')
    }, 300)
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
.login-page {
  min-height: 100vh;
  padding: 70px;
  background: #f3f6fa;
  display: grid;
  grid-template-columns: minmax(420px, 1.25fr) minmax(360px, 0.75fr);
  gap: 52px;
  align-items: center;
  box-sizing: border-box;
}

.brand-panel {
  min-height: 560px;
  padding: 36px;
  border-radius: 8px;
  background: #20344f;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand img {
  width: 62px;
  height: 62px;
  object-fit: contain;
}

.system-name {
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.35;
}

.school-name {
  margin-top: 3px;
  color: #c9d7e8;
  font-size: 13px;
  line-height: 1.4;
}

.intro-copy {
  margin-top: auto;
  margin-bottom: auto;
}

.eyebrow {
  margin: 0 0 12px;
  color: #a7d7d0;
  font-size: 14px;
  font-weight: 700;
}

.intro-copy h1 {
  margin: 0;
  color: #ffffff;
  font-size: 44px;
  line-height: 1.18;
  font-weight: 800;
  letter-spacing: 0;
}

.intro-copy p {
  margin: 24px 0 0;
  max-width: 680px;
  color: #dce8f8;
  font-size: 20px;
  line-height: 1.75;
}

.process-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.process-list span {
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid rgba(220, 232, 248, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #eef5ff;
  display: flex;
  align-items: center;
}

.login-card {
  padding: 44px 44px 36px;
  border: 1px solid #dfe7f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 44px rgba(32, 52, 79, 0.12);
  box-sizing: border-box;
}

.panel-header {
  margin-bottom: 28px;
}

.panel-header h2 {
  margin: 0;
  color: #172033;
  font-size: 32px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0;
}

.password-toggle {
  cursor: pointer;
}

.login-button {
  width: 100%;
  height: 42px;
  border: none;
  background: var(--brand-primary);
  font-weight: 700;
}

.login-button:hover {
  background: var(--brand-primary-hover);
}

.error-alert {
  margin-top: 14px;
}

.footer-links {
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.footer-links .el-button {
  color: var(--brand-primary);
  font-weight: 700;
}

@media (max-width: 1040px) {
  .login-page {
    grid-template-columns: 1fr;
    padding: 32px;
  }

  .brand-panel {
    min-height: 420px;
  }
}

@media (max-width: 640px) {
  .login-page {
    padding: 16px;
  }

  .brand-panel,
  .login-card {
    padding: 28px 22px;
  }

  .intro-copy h1 {
    font-size: 34px;
  }

  .process-list {
    grid-template-columns: 1fr;
  }
}
</style>
