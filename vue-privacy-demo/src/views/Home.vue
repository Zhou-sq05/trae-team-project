<template>
  <div class="home-container">
    <!-- 顶部：标题区（左对齐） -->
    <div class="home-header">
      <h1>基于内在不确定性的本地差分隐私演示系统</h1>
      <p class="subtitle">面向健康手环场景的数据采集、隐私扰动与聚合估计平台</p>
      <div class="protocol-tags">
        <span class="tag">ARR</span>
        <span class="tag">AGRR</span>
        <span class="tag">AOUE</span>
        <span class="tag">TSP</span>
      </div>
    </div>

    <!-- 中部：系统流程（左对齐） -->
    <div class="flow-section">
      <div class="flow-line">
        <span class="flow-item">属性配置</span>
        <span class="arrow">→</span>
        <span class="flow-item">策略下发</span>
        <span class="arrow">→</span>
        <span class="flow-item">用户端采集</span>
        <span class="arrow">→</span>
        <span class="flow-item">本地扰动上报</span>
        <span class="arrow">→</span>
        <span class="flow-item">聚合估计</span>
      </div>
      <p class="flow-desc">
        通过 ARR、AGRR、AOUE、TSP 等协议，完成健康数据的本地隐私扰动与聚合估计演示
      </p>
    </div>

    <!-- 下部：双端入口卡片（居中） -->
    <div class="cards-section">
      <div class="card">
        <div class="card-icon">📱</div>
        <h2>用户端</h2>
        <ul class="card-features">
          <li>模拟健康手环采集与本地扰动</li>
          <li>按任务动态采集</li>
          <li>单次扰动 / 连续采集</li>
        </ul>
        <el-button type="primary" class="card-btn" @click="goToLogin('user')">
          进入用户端
        </el-button>
      </div>

      <div class="card">
        <div class="card-icon">⚙️</div>
        <h2>管理端</h2>
        <ul class="card-features">
          <li>配置协议与参数</li>
          <li>下发任务</li>
          <li>查看数据列表与聚合结果</li>
        </ul>
        <el-button type="primary" class="card-btn" @click="goToLogin('admin')">
          进入管理端
        </el-button>
      </div>
    </div>

    <!-- 右下角注册入口 -->
    <div class="register-footer">
      <el-button type="text" @click="showRegisterDialog = true">注册账号</el-button>
    </div>

    <!-- 右上角校徽 Logo -->
    <div class="university-logo">
      <img src="/logo.png" alt="山东大学" />
      <span>山东大学 网络空间安全学院</span>
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
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 40px 60px;
  box-sizing: border-box;
}

/* 所有内容在正常层级 */
.home-header,
.flow-section,
.cards-section,
.register-footer {
  position: relative;
  z-index: 1;
}

/* ========== 顶部标题区（左对齐） ========== */
.home-header {
  text-align: left;
  margin-bottom: 50px;
  width: 100%;
}

.home-header h1 {
  font-size: 42px;
  color: white;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin-bottom: 16px;
}

.subtitle {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 20px;
}

.protocol-tags {
  display: flex;
  justify-content: flex-start;
  gap: 16px;
}

.tag {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  padding: 6px 18px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  letter-spacing: 1px;
}

/* ========== 中部流程区（左对齐） ========== */
.flow-section {
  text-align: left;
  margin-bottom: 60px;
  width: 100%;
  max-width: 1000px;
}

.flow-line {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.flow-item {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  padding: 8px 20px;
  border-radius: 40px;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.arrow {
  color: rgba(255, 255, 255, 0.7);
  font-size: 18px;
  font-weight: bold;
}

.flow-desc {
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  background: rgba(0, 0, 0, 0.15);
  display: inline-block;
  padding: 8px 24px;
  border-radius: 30px;
  margin-top: 8px;
}

/* ========== 下部双卡片（居中） ========== */
.cards-section {
  display: flex;
  justify-content: center;
  gap: 50px;
  flex-wrap: wrap;
  width: 100%;
}

.card {
  background: white;
  border-radius: 24px;
  padding: 32px 28px;
  width: 320px;
  text-align: center;
  box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.25);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.card:hover {
  transform: translateY(-6px);
  box-shadow: 0 25px 40px -12px rgba(0, 0, 0, 0.35);
}

.card-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.card h2 {
  font-size: 26px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
}

.card-features {
  list-style: none;
  padding: 0;
  margin: 0 0 28px 0;
  text-align: left;
}

.card-features li {
  padding: 8px 0;
  color: #4b5563;
  font-size: 14px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-features li::before {
  content: "✓";
  color: #667eea;
  font-weight: bold;
}

.card-btn {
  width: 100%;
  padding: 12px !important;
  font-size: 16px !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.card-btn:hover {
  opacity: 0.9;
}

/* ========== 右下角注册 ========== */
.register-footer {
  position: absolute;
  bottom: 24px;
  right: 30px;
}

.register-footer .el-button {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.register-footer .el-button:hover {
  color: white;
}

/* ========== 右上角校徽 Logo ========== */
.university-logo {
  position: absolute;
  top: 30px;
  right: 40px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1;
}

.university-logo img {
  width: 50px;
  height: 50px;
  opacity: 0.9;
  object-fit: cover;
}

.university-logo span {
  color: rgba(255, 255, 255, 0.85);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
}

.register-options {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  width: 100%;
}

.register-options .el-button {
  width: 80% !important;
  min-width: 180px;
  margin: 8px auto !important;
}
</style>