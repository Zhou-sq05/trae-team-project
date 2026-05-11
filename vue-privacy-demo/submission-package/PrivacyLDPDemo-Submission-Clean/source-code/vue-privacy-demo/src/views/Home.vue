<template>
  <div class="home-container">
    <header class="topbar">
      <div class="brand">
        <img src="/logo.png" alt="山东大学" />
        <div class="school-name">山东大学 网络空间安全学院</div>
      </div>
      <el-button text class="register-link" @click="showRegisterDialog = true">注册账号</el-button>
    </header>

    <main class="home-main">
      <section class="intro-section">
        <p class="eyebrow">智能手环健康数据场景</p>
        <h1>隐私保护健康数据采集与管理平台</h1>
        <p class="subtitle">
          支持采集任务配置、协议参数下发、采集端本地扰动上报与管理端聚合结果分析。
        </p>
        <div class="workflow" aria-label="系统流程">
          <span>配置采集任务</span>
          <el-icon><ArrowRight /></el-icon>
          <span>下发协议参数</span>
          <el-icon><ArrowRight /></el-icon>
          <span>采集端填报</span>
          <el-icon><ArrowRight /></el-icon>
          <span>本地扰动上报</span>
          <el-icon><ArrowRight /></el-icon>
          <span>聚合分析</span>
        </div>
      </section>

      <section class="entry-section">
        <article class="entry-card">
          <div class="entry-icon entry-icon--collector">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="entry-copy">
            <h2>采集端</h2>
            <p>接收管理端下发的采集任务，模拟智能手环健康数据采集，并在本地完成隐私扰动后上报。</p>
          </div>
          <ul class="feature-list">
            <li>查看当前绑定任务</li>
            <li>填写或模拟健康数据</li>
            <li>本地扰动后提交</li>
          </ul>
          <el-button type="primary" class="entry-button" @click="goToLogin('user')">进入采集端</el-button>
        </article>

        <article class="entry-card">
          <div class="entry-icon entry-icon--admin">
            <el-icon><Setting /></el-icon>
          </div>
          <div class="entry-copy">
            <h2>管理控制台</h2>
            <p>配置待采集属性、选择隐私保护协议与参数，查看上报数据和聚合估计结果。</p>
          </div>
          <ul class="feature-list">
            <li>配置采集任务</li>
            <li>下发协议参数</li>
            <li>查看数据与聚合结果</li>
          </ul>
          <el-button type="primary" class="entry-button" @click="goToLogin('admin')">进入管理控制台</el-button>
        </article>
      </section>

      <section class="protocol-strip" aria-label="支持协议">
        <span class="protocol-label">支持协议</span>
        <span v-for="protocol in protocols" :key="protocol" class="protocol-tag">{{ protocol }}</span>
      </section>
    </main>

    <el-dialog v-model="showRegisterDialog" title="选择注册类型" width="320px" :align-center="true">
      <div class="register-options">
        <el-button type="primary" @click="goToRegister('user')">注册采集端账号</el-button>
        <el-button @click="goToRegister('admin')">注册管理账号</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Monitor, Setting } from '@element-plus/icons-vue'

const router = useRouter()
const showRegisterDialog = ref(false)
const protocols = ['ARR', 'AGRR', 'AOUE', 'TSP']

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
  width: 100%;
  min-height: 100vh;
  background: #f3f6fa;
  color: #172033;
  box-sizing: border-box;
}

.topbar {
  height: 76px;
  padding: 0 40px;
  background: #20344f;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.brand {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand img {
  width: 58px;
  height: 58px;
  object-fit: contain;
}

.school-name {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.register-link {
  color: #dce8f8;
  font-size: 14px;
}

.register-link:hover {
  color: #ffffff;
}

.home-main {
  width: min(1180px, calc(100% - 48px));
  margin: 0 auto;
  padding: 64px 0 40px;
  box-sizing: border-box;
}

.intro-section {
  max-width: 900px;
  text-align: left;
}

.eyebrow {
  margin: 0 0 10px;
  color: var(--brand-primary);
  font-size: 14px;
  font-weight: 700;
}

.intro-section h1 {
  margin: 0;
  font-size: 40px;
  line-height: 1.18;
  font-weight: 800;
  color: #162033;
  letter-spacing: 0;
}

.subtitle {
  margin: 16px 0 0;
  max-width: 760px;
  font-size: 17px;
  line-height: 1.75;
  color: #526176;
}

.workflow {
  margin-top: 24px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #526176;
  font-size: 14px;
}

.workflow span {
  padding: 7px 12px;
  border: 1px solid #d7e1ec;
  border-radius: 8px;
  background: #ffffff;
}

.workflow .el-icon {
  color: #8aa0b8;
}

.entry-section {
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}

.entry-card {
  min-height: 360px;
  padding: 28px;
  border: 1px solid #dfe7f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(32, 52, 79, 0.08);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.entry-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
}

.entry-icon--collector,
.entry-icon--admin {
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
}

.entry-copy h2 {
  margin: 22px 0 10px;
  font-size: 26px;
  line-height: 1.25;
  font-weight: 800;
  color: #172033;
  letter-spacing: 0;
}

.entry-copy p {
  margin: 0;
  min-height: 58px;
  color: #5c6a7d;
  font-size: 15px;
  line-height: 1.7;
  text-align: left;
}

.feature-list {
  margin: 24px 0 28px;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 12px;
}

.feature-list li {
  position: relative;
  padding-left: 22px;
  color: #2d3b4f;
  font-size: 15px;
  line-height: 1.4;
}

.feature-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand-primary);
}

.entry-button {
  width: 100%;
  margin-top: auto;
  height: 42px;
  border: none;
  background: var(--brand-primary);
  font-size: 15px;
  font-weight: 700;
}

.entry-button:hover {
  background: var(--brand-primary-hover);
}

.protocol-strip {
  margin-top: 24px;
  padding: 16px 18px;
  border: 1px solid #dfe7f0;
  border-radius: 8px;
  background: #ffffff;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.protocol-label {
  margin-right: 4px;
  color: #526176;
  font-size: 14px;
  font-weight: 700;
}

.protocol-tag {
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  font-size: 13px;
  font-weight: 700;
}

.register-options {
  display: grid;
  gap: 12px;
  padding: 6px 0 2px;
}

.register-options .el-button {
  width: 100%;
}

@media (max-width: 900px) {
  .topbar {
    height: auto;
    min-height: 72px;
    padding: 14px 20px;
    gap: 16px;
  }

  .school-name {
    font-size: 15px;
  }

  .home-main {
    width: min(100% - 32px, 720px);
    padding-top: 36px;
  }

  .intro-section h1 {
    font-size: 30px;
  }

  .entry-section {
    grid-template-columns: 1fr;
  }
}
</style>
