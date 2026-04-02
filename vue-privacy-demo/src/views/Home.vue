<template>
  <div class="home-container">
    <div class="home-header">
      <h1>基于内在不确定性的本地差分隐私演示系统</h1>
      <div class="help-link">
        <el-button type="text">帮助/关于</el-button>
      </div>
    </div>
    <div class="home-content">
      <div class="jump-box">
        <h2>用户端</h2>
        <div class="button-group">
          <el-button type="primary" @click="goToRegister('user')">注册</el-button>
          <el-button @click="goToLogin('user')">登录</el-button>
        </div>
      </div>
      <div class="jump-box">
        <h2>管理端</h2>
        <div class="button-group">
          <el-button type="primary" @click="goToRegister('admin')">注册</el-button>
          <el-button @click="goToLogin('admin')">登录</el-button>
        </div>
      </div>
      <div class="jump-box">
        <h2>设置端</h2>
        <div class="button-group">
          <el-button type="primary" @click="goToRegister('setting')">注册</el-button>
          <el-button @click="goToLogin('setting')">登录</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goToLogin = (type) => {
  // 跳转到登录页面，可以通过query参数传递类型
  router.push({ path: '/login', query: { type } })
}

const goToRegister = (type) => {
  // 跳转到注册页面，可以通过query参数传递类型
  router.push({ path: '/login', query: { type, tab: 'register' } })
}
</script>

<style scoped>
.home-container {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  padding: 40px;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 80px;
}

.home-header h1 {
  font-size: 28px;
  color: white;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.help-link {
  color: white;
}

.home-content {
  display: flex;
  justify-content: center;
  gap: 60px;
  flex: 1;
  align-items: center;
}

.jump-box {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  width: 280px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.jump-box:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
}

.jump-box h2 {
  margin-bottom: 30px;
  color: #303133;
  font-size: 20px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.button-group .el-button {
  width: 100%;
  padding: 12px;
  font-size: 16px;
}
</style>