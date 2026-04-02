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

          </el-menu>
        </el-aside>
        <el-main>
          <div class="aggregate-content">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <div>
                    <span>聚合结果</span>
                    <span class="total-count">总数据条数：{{ totalCount }}</span>
                  </div>
                  <el-select v-model="selectedData" placeholder="选择扰动数据" style="width: 200px">
                    <el-option 
                      v-for="data in perturbationData" 
                      :key="data.id" 
                      :label="data.attributeName" 
                      :value="data.id"
                    />
                  </el-select>
                </div>
              </template>
              
              <div v-if="perturbationData.length === 0" class="no-data">
                <el-empty description="暂无数据" />
                <p style="margin-top: 20px; color: #909399;">请先在用户端提交数据，然后再查看聚合结果</p>
              </div>
              <div v-else-if="currentData" class="data-detail">
                <h3>{{ currentData.attributeName }}</h3>
                
                <div class="config-info">
                  <el-row :gutter="20">
                    <el-col :span="12">
                      <el-form label-width="120px">
                        <el-form-item label="防护模式">
                          <el-input v-model="currentData.protectionMode" disabled />
                        </el-form-item>
                        <el-form-item label="使用协议">
                          <el-input v-model="currentData.algorithm" disabled />
                        </el-form-item>
                        <el-form-item label="内在不确定性">
                          <div class="uncertainty">
                            α: <el-input v-model="currentData.alpha" disabled style="width: 100px" />
                            β: <el-input v-model="currentData.beta" disabled style="width: 100px" />
                          </div>
                        </el-form-item>
                      </el-form>
                    </el-col>
                    
                    <el-col :span="12">
                      <el-form label-width="120px">
                        <el-form-item label="一致性指标">
                          <div class="consistency-indicator">
                            <el-input v-model="currentData.consistency" disabled />
                          </div>
                        </el-form-item>
                        <el-form-item label="均方误差">
                          <el-input v-model="currentData.mse" disabled />
                        </el-form-item>
                        <el-form-item label="聚合估计方差">
                          <el-input v-model="currentData.aggVariance" disabled />
                        </el-form-item>
                        <el-form-item label="平均绝对误差">
                          <el-input v-model="currentData.mae" disabled />
                        </el-form-item>
                        <el-form-item label="估计误差">
                          <el-input v-model="currentData.estimationError" disabled />
                        </el-form-item>
                        <el-form-item label="分布拟合度">
                          <el-input v-model="currentData.distributionFit" disabled />
                        </el-form-item>
                        <el-form-item label="隐私预算 ε">
                          <el-input v-model="currentData.epsilon" disabled />
                        </el-form-item>
                      </el-form>
                    </el-col>
                  </el-row>
                </div>
                
                <div class="distribution-charts">
                  <h4>真实分布（模拟）vs 聚合估计分布</h4>
                  <div class="chart-box">
                    <div class="chart-container" ref="comparisonChart"></div>
                  </div>
                </div>
              </div>
              <div v-else class="no-data">
                请选择一个扰动数据项
              </div>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { House, Setting, Document, DataAnalysis, ArrowDown, Monitor } from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'
import { getAggregateResults, getTotalDataCount } from '../../services/aggregateService'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activeMenu = computed(() => route.path)
const user = computed(() => userStore.user)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// 加载聚合数据
const loadAggregateData = () => {
  return getAggregateResults()
}

// 扰动数据
const perturbationData = ref(loadAggregateData())

// 总数据条数
const totalCount = ref(getTotalDataCount())

const selectedData = ref(1)
const comparisonChart = ref(null)
let comparisonChartInstance = null

// 当前选中的数据
const currentData = computed(() => {
  return perturbationData.value.find(item => item.id === selectedData.value)
})

// 初始化双折线图
const initComparisonChart = () => {
  if (comparisonChartInstance) {
    comparisonChartInstance.dispose()
  }
  comparisonChartInstance = echarts.init(comparisonChart.value)
  updateComparisonChart()
}

// 更新双折线图
const updateComparisonChart = () => {
  if (currentData.value) {
    comparisonChartInstance.setOption({
      title: {
        text: '真实分布（模拟）vs 聚合估计分布',
        left: 'center'
      },
      legend: {
        data: ['真实分布', '聚合估计分布'],
        top: '30px'
      },
      xAxis: {
        type: 'category',
        data: Array.from({ length: Math.max(currentData.value.originalData.length, currentData.value.perturbationData.length) }, (_, i) => i + 1)
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '真实分布',
          data: currentData.value.originalData,
          type: 'line',
          smooth: true,
          itemStyle: {
            color: '#67c23a'
          }
        },
        {
          name: '聚合估计分布',
          data: currentData.value.perturbationData,
          type: 'line',
          smooth: true,
          itemStyle: {
            color: '#409eff'
          }
        }
      ]
    })
  }
}

onMounted(() => {
  // 延迟初始化图表，确保DOM元素已渲染
  setTimeout(() => {
    initComparisonChart()
  }, 100)
  
  window.addEventListener('resize', () => {
    if (comparisonChartInstance) {
      comparisonChartInstance.resize()
    }
  })
})

watch(selectedData, () => {
  updateComparisonChart()
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

.aggregate-content {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  div {
    display: flex;
    align-items: center;
    gap: 20px;
  }
  
  .total-count {
    font-size: 14px;
    color: #606266;
    font-weight: normal;
  }
}

.data-detail {
  padding: 20px 0;
}

.data-detail h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #303133;
}

.uncertainty {
  display: flex;
  align-items: center;
  gap: 20px;
}

.consistency-indicator {
  width: 100%;
}

.distribution-charts {
  margin-top: 30px;
}

.distribution-charts h4 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #303133;
}

.chart-box {
  height: 300px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.no-data {
  text-align: center;
  padding: 50px 0;
  color: #909399;
  font-size: 16px;
}
</style>