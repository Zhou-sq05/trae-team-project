<template>
  <div class="home-container">
    <div class="home-header">
      <h1>基于内在不确定性的本地差分隐私演示系统</h1>
      <div class="help-link">
        <el-button type="text">帮助 / 关于</el-button>
      </div>
    </div>
    
    <div class="home-content">
      <div class="jump-box">
        <h2>用户端</h2>
        <div class="button-group">
          <el-button type="primary" @click="goToLogin('user')">进入用户端</el-button>
        </div>
      </div>
      <div class="jump-box">
        <h2>管理端</h2>
        <div class="button-group">
          <el-button type="primary" @click="goToLogin('admin')">进入管理端</el-button>
        </div>
      </div>
    </div>

    <!-- 右下角注册按钮 -->
    <div class="register-footer">
      <el-button type="text" @click="showRegisterDialog = true">注册账号</el-button>
    </div>

    <!-- 注册类型选择弹窗 -->
    <el-dialog v-model="showRegisterDialog" title="选择注册类型" width="320px" :align-center="true">
      <div class="register-options">
        <el-button type="primary" @click="goToRegister('user')" style="width: 100%; margin-bottom: 15px;">
          注册用户端
        </el-button>
        <el-button type="success" @click="goToRegister('admin')" style="width: 100%;">
          注册管理端
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 控制弹窗显示
const showRegisterDialog = ref(false)

const goToLogin = (type) => {
  router.push({ path: '/login', query: { type } })
}

const goToRegister = (type) => {
  showRegisterDialog.value = false
  router.push({ path: '/register', query: { type } }) 
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
  position: relative;
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
  align-items: center;
  width: 100%;
}

.button-group .el-button {
  width: 100% !important;
  min-width: 120px !important;
  margin: 0 auto !important;
  display: flex !important;         
  align-items: center !important;  
  justify-content: center !important; 
  text-align: center !important;
  line-height: 1 !important;          
  height: 40px !important;            
}

/* 右下角注册按钮 */
.register-footer {
  position: absolute;
  bottom: 30px;
  right: 30px;
}

.register-footer .el-button {
  color: white;
  font-size: 14px;
  opacity: 0.8;
}

.register-footer .el-button:hover {
  opacity: 1;
}

/* 弹窗内按钮样式 */
.register-options {
  padding: 10px 0;
}
</style>