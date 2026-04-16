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
              {{ user?.username || '管理员' }} <el-icon class="el-icon--right"><ArrowDown /></el-icon>
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
              <el-icon><House /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/admin/attr-config">
              <el-icon><Setting /></el-icon>
              <span>属性配置</span>
            </el-menu-item>
            <el-menu-item index="/admin/dataset">
              <el-icon><Document /></el-icon>
              <span>数据集列表</span>
            </el-menu-item>
            <el-menu-item index="/admin/aggregate">
              <el-icon><DataAnalysis /></el-icon>
              <span>聚合结果</span>
            </el-menu-item>
          </el-menu>
        </el-aside>
        <el-main>
          <div class="aggregate-content">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <div class="header-title-group">
                    <span class="page-title">聚合结果</span>
                    <span class="total-count">样本总数：{{ totalCount }}</span>
                  </div>
                  <div class="header-actions">
                    <span class="task-select-label">任务 ID</span>
                    <el-select v-model="selectedTaskId" placeholder="选择任务ID" style="width: 220px">
                      <el-option
                        v-for="task in tasks"
                        :key="task.id"
                        :label="task.id"
                        :value="task.id"
                      />
                    </el-select>
                  </div>
                </div>
              </template>

              <div v-if="perturbationData.length === 0" class="no-data">
                <el-empty description="暂无聚合结果" />
                <p class="empty-tip">请先完成用户端连续采集并上报 ARR 数据，再查看聚合结果。</p>
              </div>

              <template v-else-if="currentData">
                <section class="summary-section summary-section--compact">
                  <div class="section-heading">
                    <h3>任务摘要</h3>
                    <p>将任务信息、协议参数和样本规模压缩到同一层，先快速看清本次恢复对象。</p>
                  </div>
                  <div class="summary-strip">
                    <div class="summary-card summary-card--adaptive" v-for="item in compactSummaryCards" :key="item.label">
                      <div class="summary-label">{{ item.label }}</div>
                      <div class="summary-value">{{ item.value }}</div>
                    </div>
                  </div>
                </section>

                <section class="summary-section">
                  <div class="section-heading">
                    <h3>核心结果指标</h3>
                    <p>优先看样本规模和频率恢复误差，快速判断这次估计效果。</p>
                  </div>
                  <div class="summary-grid core-grid">
                    <div class="core-card" :class="item.cardClass" v-for="item in coreMetricCards" :key="item.label">
                      <div class="summary-label metric-title-row">
                        <span>{{ item.label }}</span>
                        <el-tooltip
                          v-if="item.tooltip"
                          placement="top"
                          effect="light"
                        >
                          <template #content>
                            <div class="formula-tooltip">
                              <div class="formula-line">{{ item.tooltip.formula }}</div>
                              <div class="formula-line" v-for="line in item.tooltip.notes" :key="line">{{ line }}</div>
                            </div>
                          </template>
                          <el-icon class="metric-info-icon"><QuestionFilled /></el-icon>
                        </el-tooltip>
                      </div>
                      <div class="core-value">{{ item.value }}</div>
                      <div v-if="item.isStatus" class="status-chip">{{ item.value }}</div>
                      <div class="core-subtext">{{ item.helper }}</div>
                    </div>
                  </div>
                  <div class="metric-tip metric-tip--highlight">{{ currentData.metricDescription }}</div>
                </section>

                <section class="summary-section">
                  <div class="section-heading">
                    <h3>真实与聚合估计对照</h3>
                    <p>对比 ARR 两种状态下的真实分布与聚合恢复结果。</p>
                  </div>
                  <div class="compare-layout">
                    <div class="compare-panel compare-panel--table">
                    <table class="compare-table">
                      <thead>
                        <tr class="group-header">
                          <th rowspan="2">状态</th>
                          <th colspan="3">计数</th>
                          <th colspan="3">频率</th>
                        </tr>
                        <tr>
                          <th>真实值</th>
                          <th>聚合估计值</th>
                          <th>计数误差</th>
                          <th>真实频率</th>
                          <th>估计频率</th>
                          <th>频率误差</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in currentData.compareRows" :key="row.label">
                          <td>{{ row.label }}</td>
                          <td>{{ formatMetric(row.realValue) }}</td>
                          <td>{{ formatMetric(row.estimatedValue) }}</td>
                          <td :class="['error-text', row.error > 0 ? 'increase' : row.error < 0 ? 'decrease' : 'neutral']">
                            {{ formatArrowDelta(row.error) }}
                          </td>
                          <td>{{ formatFrequency(row.realFrequency) }}</td>
                          <td>{{ formatFrequency(row.estimatedFrequency) }}</td>
                          <td :class="['error-text', row.frequencyError > 0 ? 'increase' : row.frequencyError < 0 ? 'decrease' : 'neutral']">
                            {{ formatFrequencyArrowDelta(row.frequencyError) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    </div>

                    <div class="compare-panel compare-panel--chart">
                      <div class="mini-chart-title">真实频率 vs 估计频率</div>
                      <div class="mini-chart-box">
                        <div class="chart-container" ref="comparisonChart"></div>
                      </div>
                    </div>
                  </div>
                </section>

                <section class="summary-section source-section">
                  <div class="section-heading">
                    <h3>结果说明</h3>
                    <p>{{ currentData.sourceDescription }}</p>
                  </div>
                </section>

                <section class="summary-section compact-section">
                  <div class="section-heading">
                    <h3>详细指标</h3>
                    <p>这些指标用于补充评估，不作为页面的第一视觉重点。</p>
                  </div>
                  <div class="detail-metrics">
                    <div class="detail-item" v-for="item in detailMetricCards" :key="item.label">
                      <span class="detail-item-label">{{ item.label }}</span>
                      <span class="detail-item-value">{{ item.value }}</span>
                    </div>
                  </div>
                </section>
              </template>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { House, Setting, Document, DataAnalysis, ArrowDown, QuestionFilled } from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'
import { getAggregateResults, getTotalDataCount } from '../../services/taskAggregateService'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activeMenu = computed(() => route.path)
const user = computed(() => userStore.user)

const tasks = ref([])
const selectedTaskId = ref('')
const perturbationData = ref([])
const totalCount = ref(0)
const selectedData = ref(1)
const comparisonChart = ref(null)
let comparisonChartInstance = null

const currentData = computed(() => perturbationData.value.find(item => item.id === selectedData.value) || null)

const compactSummaryCards = computed(() => {
  if (!currentData.value) return []
  return [
    { label: '任务名称', value: currentData.value.attributeName },
    { label: '任务 ID', value: currentData.value.taskId || selectedTaskId.value || '--' },
    { label: '协议', value: currentData.value.algorithm },
    { label: '防护模式', value: currentData.value.protectionMode },
    { label: '样本量', value: String(currentData.value.sampleCount || totalCount.value || 0) },
    { label: '隐私预算 ε', value: currentData.value.epsilon },
    { label: 'α', value: currentData.value.alpha },
    { label: 'β', value: currentData.value.beta }
  ]
})

const coreMetricCards = computed(() => {
  if (!currentData.value) return []
  return [
    {
      label: '样本总数',
      value: String(currentData.value.sampleCount || totalCount.value || 0),
      helper: '本次参与 ARR 聚合的扰动样本数量',
      cardClass: ''
    },
    {
      label: '频率 MSE',
      value: currentData.value.mse,
      helper: '按论文定义计算的平均平方频率误差',
      cardClass: 'core-card--highlight',
      tooltip: {
        formula: 'MSE_f = (1 / |Ω_A|) * Σ_i (f_i - f̂_i)^2',
        notes: [
          'f_i = 真实频率',
          'f̂_i = 聚合估计频率',
          '当前 ARR 场景中 |Ω_A| = 2',
          'f_i = true_count_i / N',
          'f̂_i = estimated_count_i / N'
        ]
      }
    },
    {
      label: '频率 MAE',
      value: currentData.value.mae,
      helper: '按论文定义计算的平均绝对频率误差',
      cardClass: 'core-card--highlight core-card--soft',
      tooltip: {
        formula: 'MAE_f = (1 / |Ω_A|) * Σ_i |f_i - f̂_i|',
        notes: [
          'f_i = 真实频率',
          'f̂_i = 聚合估计频率',
          '当前 ARR 场景中 |Ω_A| = 2',
          'f_i = true_count_i / N',
          'f̂_i = estimated_count_i / N'
        ]
      }
    },

  ]
})

const detailMetricCards = computed(() => {
  if (!currentData.value) return []
  return [
    { label: '计数均方误差（Count-MSE）', value: currentData.value.countMse },
    { label: '计数平均绝对误差（Count-MAE）', value: currentData.value.countMae },
    { label: '聚合估计方差', value: currentData.value.aggVariance },
    { label: '估计误差上界', value: currentData.value.estimationError },
    { label: '分布拟合说明', value: currentData.value.distributionFit }
  ]
})

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

function loadTasks() {
  try {
    const items = JSON.parse(localStorage.getItem('tasks') || '[]')
    tasks.value = items.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime()
      const timeB = new Date(b.createdAt || 0).getTime()
      return timeB - timeA
    })
  } catch (error) {
    console.error('加载任务失败:', error)
    tasks.value = []
  }
}

function loadAggregateData() {
  perturbationData.value = getAggregateResults(selectedTaskId.value)
  totalCount.value = getTotalDataCount(selectedTaskId.value)
  selectedData.value = perturbationData.value.length > 0 ? perturbationData.value[0].id : null
}

function formatMetric(value) {
  return Number(value).toFixed(4)
}

function formatDelta(value) {
  const numericValue = Number(value)
  return numericValue > 0 ? `+${numericValue.toFixed(4)}` : numericValue.toFixed(4)
}

function formatArrowDelta(value) {
  const numericValue = Number(value)
  if (numericValue > 0) return `↑ ${numericValue.toFixed(4)}`
  if (numericValue < 0) return `↓ ${Math.abs(numericValue).toFixed(4)}`
  return '0.0000'
}

function formatFrequency(value) {
  return Number(value).toFixed(6)
}

function formatFrequencyDelta(value) {
  const numericValue = Number(value)
  return numericValue > 0 ? `+${numericValue.toFixed(6)}` : numericValue.toFixed(6)
}

function formatFrequencyArrowDelta(value) {
  const numericValue = Number(value)
  if (numericValue > 0) return `↑ ${numericValue.toFixed(6)}`
  if (numericValue < 0) return `↓ ${Math.abs(numericValue).toFixed(6)}`
  return '0.000000'
}

function initComparisonChart() {
  if (!comparisonChart.value) return
  if (comparisonChartInstance) {
    comparisonChartInstance.dispose()
  }
  comparisonChartInstance = echarts.init(comparisonChart.value)
  updateComparisonChart()
}

function updateComparisonChart() {
  if (!comparisonChartInstance || !currentData.value) return

  comparisonChartInstance.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['真实分布', '聚合估计分布'],
      top: 0
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '6%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: currentData.value.compareRows.map(row => row.label),
      axisTick: { alignWithLabel: true }
    },
    yAxis: {
      type: 'value',
      name: '样本数'
    },
    series: [
      {
        name: '真实频率',
        type: 'bar',
        barGap: '20%',
        data: currentData.value.compareRows.map(row => row.realFrequency),
        itemStyle: { color: '#67c23a', borderRadius: [6, 6, 0, 0] }
      },
      {
        name: '估计频率',
        type: 'bar',
        data: currentData.value.compareRows.map(row => row.estimatedFrequency),
        itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
      }
    ]
  })
}

onMounted(async () => {
  loadTasks()
  if (tasks.value.length > 0) {
    selectedTaskId.value = tasks.value[0].id
  }
  loadAggregateData()
  await nextTick()
  initComparisonChart()
  window.addEventListener('resize', () => {
    if (comparisonChartInstance) {
      comparisonChartInstance.resize()
    }
  })
})

watch(selectedTaskId, async () => {
  loadAggregateData()
  await nextTick()
  updateComparisonChart()
})

watch(selectedData, async () => {
  await nextTick()
  updateComparisonChart()
})
</script>

<style scoped>
.admin-container {
  height: 100vh;
  overflow: hidden;
}

.el-container {
  height: 100%;
}

.el-main {
  height: calc(100vh - 60px);
  overflow: hidden;
  padding: 0;
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
  overflow-x: hidden;
  box-sizing: border-box;
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
}

.aggregate-content::-webkit-scrollbar {
  width: 10px;
}

.aggregate-content::-webkit-scrollbar-track {
  background: #eef3f8;
  border-radius: 999px;
}

.aggregate-content::-webkit-scrollbar-thumb {
  background: #c2d2e6;
  border-radius: 999px;
}

.aggregate-content::-webkit-scrollbar-thumb:hover {
  background: #9eb7d4;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2d3d;
}

.total-count {
  color: #6b7a90;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.task-select-label {
  color: #607086;
  font-size: 14px;
}

.summary-section {
  margin-bottom: 26px;
}

.summary-section--compact {
  margin-bottom: 18px;
}

.compact-section {
  border-top: 1px solid #edf2f8;
  padding-top: 22px;
}

.section-heading {
  margin-bottom: 16px;
}

.section-heading h3 {
  margin: 0 0 6px;
  font-size: 18px;
  color: #1f2d3d;
}

.section-heading p {
  margin: 0;
  color: #7c8ca3;
  font-size: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
}

.summary-grid--adaptive {
  grid-template-columns: repeat(auto-fit, minmax(128px, max-content));
  justify-content: flex-start;
  align-items: stretch;
}

.summary-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.summary-card,
.core-card {
  background: #f7fbff;
  border: 1px solid #e5eef8;
  border-radius: 14px;
  padding: 16px 18px;
}

.summary-card--adaptive {
  min-width: 128px;
  width: fit-content;
  max-width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
}

.summary-label {
  font-size: 13px;
  color: #7b8aa0;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 20px;
  line-height: 1.35;
  font-weight: 700;
  color: #183153;
  word-break: break-word;
}

.summary-card--adaptive .summary-value {
  width: fit-content;
  max-width: 240px;
  font-size: 16px;
}

.tag-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.metric-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 999px;
  background: #f2f7fc;
  border: 1px solid #dfe9f4;
}

.metric-pill-label {
  font-size: 13px;
  color: #6f8097;
}

.metric-pill-value {
  font-size: 18px;
  font-weight: 700;
  color: #23415f;
}

.core-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.metric-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.metric-info-icon {
  color: #7a93b1;
  cursor: pointer;
  font-size: 14px;
}

.formula-tooltip {
  max-width: 280px;
  line-height: 1.6;
}

.formula-line:first-child {
  font-weight: 700;
  color: #1d3557;
  margin-bottom: 6px;
}

.core-card--highlight {
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
  border-color: #cfe0f5;
  box-shadow: 0 8px 20px rgba(64, 158, 255, 0.08);
}

.core-card--soft {
  background: linear-gradient(180deg, #fbfcff 0%, #f3f7ff 100%);
}

.core-card--highlight .core-value {
  color: #0f5db8;
}

.core-card--status {
  background: #fbfdff;
}

.core-value {
  font-size: 28px;
  font-weight: 800;
  color: #17406d;
  margin-bottom: 8px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: #eef5ff;
  color: #275ea8;
  font-weight: 700;
  margin-bottom: 8px;
  width: fit-content;
}

.core-subtext {
  font-size: 13px;
  color: #7c8ca3;
  line-height: 1.5;
}

.metric-tip--highlight {
  margin-top: 14px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #f5f9ff;
  border: 1px solid #d8e7fb;
  color: #58718f;
}

.compare-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.85fr);
  gap: 16px;
  align-items: stretch;
}

.compare-panel {
  border: 1px solid #e7eef7;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}

.compare-panel--table {
  overflow-x: auto;
}

.compare-panel--chart {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.mini-chart-title {
  font-size: 14px;
  font-weight: 700;
  color: #27405f;
  margin-bottom: 10px;
}

.mini-chart-box {
  flex: 1;
  min-height: 280px;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.compare-table th,
.compare-table td {
  padding: 14px 16px;
  border-bottom: 1px solid #eef3f8;
  text-align: left;
}

.compare-table th {
  background: #f7fbff;
  color: #5b6f86;
  font-weight: 700;
}

.compare-table .group-header th {
  background: #edf4fb;
  color: #48627f;
  border-bottom: 1px solid #dbe7f4;
  text-align: center;
}

.error-text.increase {
  color: #d9485f;
  font-weight: 700;
}

.error-text.decrease {
  color: #1f9d55;
  font-weight: 700;
}

.error-text.neutral {
  color: #607086;
  font-weight: 700;
}

.chart-box {
  height: 360px;
  border: 1px solid #e6edf7;
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f3f8fd 100%);
  padding: 12px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.source-section {
  background: #f8fbff;
  border: 1px solid #e4edf7;
  border-radius: 14px;
  padding: 18px;
}

.detail-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f7f9fc;
  border: 1px solid #e8eef5;
}

.detail-item-label {
  color: #6f8097;
}

.detail-item-value {
  color: #1f2d3d;
  font-weight: 700;
}

.no-data {
  text-align: center;
  padding: 60px 0;
}

.empty-tip {
  margin-top: 20px;
  color: #909399;
}

@media (max-width: 1200px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .compare-layout {
    grid-template-columns: 1fr;
  }
}
</style>
