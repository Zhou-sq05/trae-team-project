<template>
  <div class="admin-container">
    <el-container>
      <el-header>
        <div class="header-left">
          <h1>隐私保护数据采集与管理平台</h1>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              {{ user?.username || '管理员' }} <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-container>
        <el-aside width="200px">
          <el-menu :default-active="activeMenu" class="el-menu-vertical-demo" router>
            <el-menu-item index="/admin/dashboard">
              <el-icon><house /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/admin/attr-config">
              <el-icon><setting /></el-icon>
              <span>属性配置</span>
            </el-menu-item>
            <el-menu-item index="/admin/dataset">
              <el-icon><document /></el-icon>
              <span>数据集列表</span>
            </el-menu-item>
            <el-menu-item index="/admin/aggregate">
              <el-icon><data-analysis /></el-icon>
              <span>聚合结果</span>
            </el-menu-item>
            <el-menu-item index="/admin/arr-multi-user-simulation">
              <el-icon><monitor /></el-icon>
              <span>ARR 多用户上报模拟</span>
            </el-menu-item>

          </el-menu>
        </el-aside>
        <el-main>
          <div class="dashboard-content">
            <el-row :gutter="20">
              <el-col :span="6">
                <el-card shadow="hover">
                  <template #header>
                    <div class="card-header">
                      <span>总采集设备数</span>
                    </div>
                  </template>
                  <div class="card-content">
                    <div class="number">128</div>
                    <div class="desc">台设备在线</div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card shadow="hover">
                  <template #header>
                    <div class="card-header">
                      <span>今日采集数据</span>
                    </div>
                  </template>
                  <div class="card-content">
                    <div class="number">2,543</div>
                    <div class="desc">条记录</div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card shadow="hover">
                  <template #header>
                    <div class="card-header">
                      <span>数据采集率</span>
                    </div>
                  </template>
                  <div class="card-content">
                    <div class="number">98.2%</div>
                    <div class="desc">采集成功率</div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card shadow="hover">
                  <template #header>
                    <div class="card-header">
                      <span>隐私保护等级</span>
                    </div>
                  </template>
                  <div class="card-content">
                    <div class="number">A+</div>
                    <div class="desc">最高等级</div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
            <el-row :gutter="20" style="margin-top: 20px">
              <el-col :span="12">
                <el-card shadow="hover">
                  <template #header>
                    <div class="card-header">
                      <span>数据采集趋势</span>
                    </div>
                  </template>
                  <div class="chart-container" ref="trendChart"></div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card shadow="hover">
                  <template #header>
                    <div class="card-header">
                      <span>设备分布</span>
                    </div>
                  </template>
                  <div class="chart-container" ref="deviceChart"></div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { House, Setting, Document, DataAnalysis, ArrowDown, Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activeMenu = computed(() => route.path)
const trendChart = ref(null)
const deviceChart = ref(null)
const user = computed(() => userStore.user)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  // 初始化趋势图表
  const trendChartInstance = echarts.init(trendChart.value)
  trendChartInstance.setOption({
    xAxis: {
      type: 'category',
      data: ['1日', '2日', '3日', '4日', '5日', '6日', '7日']
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: [1200, 1900, 3000, 2500, 2700, 3500, 4000],
      type: 'line',
      smooth: true
    }]
  })

  // 初始化设备分布图表
  const deviceChartInstance = echarts.init(deviceChart.value)
  deviceChartInstance.setOption({
    series: [{
      type: 'pie',
      data: [
        { value: 60, name: '手环' },
        { value: 30, name: '手表' },
        { value: 10, name: '其他' }
      ]
    }]
  })
})
</script>

<style scoped>
.admin-container {
  height: 100vh;
  overflow: hidden;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left h1 {
  font-size: 20px;
  color: #409eff;
  margin: 0;
}

.user-info {
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}

.el-menu-vertical-demo {
  height: 100%;
  border-right: none;
}

.dashboard-content {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-content {
  text-align: center;
  padding: 20px 0;
}

.number {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 10px;
}

.desc {
  font-size: 14px;
  color: #606266;
}

.chart-container {
  width: 100%;
  height: 300px;
}
</style>
