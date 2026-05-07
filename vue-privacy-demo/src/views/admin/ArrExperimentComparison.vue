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
              {{ user?.username || '管理员' }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
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
        <el-aside width="220px">
          <el-menu :default-active="activeMenu" class="el-menu-vertical-demo" router>
            <el-menu-item index="/admin/dashboard">
              <el-icon><House /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/admin/scenario-overview">
              <el-icon><Document /></el-icon>
              <span>场景说明</span>
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
            <el-sub-menu index="/admin/demo">
              <template #title>
                <el-icon><Monitor /></el-icon>
                <span>演示与验证</span>
              </template>
              <el-menu-item index="/admin/demo/arr-experiment-comparison">
                实验效果对比
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>

        <el-main>
          <div class="comparison-content">
            <el-card shadow="hover" class="experiment-card">
              <template #header>
                <div class="page-header">
                  <div>
                    <div class="page-title">实验效果对比</div>
                    <div class="page-desc">
                      用于模拟实验效果验证，真实值仅来自模拟数据生成过程。
                    </div>
                  </div>
                  <div class="header-actions">
                    <div class="task-picker">
                      <span class="task-select-label">协议 / 任务</span>
                      <el-select v-model="selectedTaskId" placeholder="选择实验任务" style="width: 300px">
                        <el-option
                          v-for="task in experimentTasks"
                          :key="task.id"
                          :label="formatTaskOption(task)"
                          :value="task.id"
                        />
                      </el-select>
                    </div>
                    <el-button @click="refreshExperiment">刷新实验数据</el-button>
                  </div>
                </div>
              </template>

              <section class="notice-section">
                <div class="notice-card">
                  本页面仅用于模拟实验效果验证。真实分布来自模拟数据生成过程，用于评估聚合估计效果；真实系统中服务器无法获得用户原始真实值，也不会获得用户敏感属性。
                </div>
                <div class="notice-card notice-card--blue">
                  聚合端页面表示真实系统中的服务器视角，只能看到扰动后上报值和聚合估计结果；本页面是模拟实验验证视角，可以读取模拟数据生成时保存的真实值，用于评估估计误差。
                </div>
              </section>

              <el-empty
                v-if="!currentResult"
                class="empty-panel"
                :description="emptyText"
              />

              <template v-else>
                <section class="metric-section">
                  <div class="block-heading">
                    <h3>指标概览</h3>
                    <span>当前任务的样本、预算、扰动参数与估计误差</span>
                  </div>
                  <div class="metric-grid">
                    <div v-for="item in metricCards" :key="item.label" class="metric-card">
                      <span>{{ item.label }}</span>
                      <strong>{{ item.value }}</strong>
                    </div>
                  </div>
                </section>

                <section class="result-section">
                  <el-card shadow="never" class="result-card">
                    <template #header>
                      <div class="block-heading block-heading--compact">
                        <h3>估计结果明细</h3>
                        <span>表格完整展示当前任务的所有类别，便于从上到下对比讲解</span>
                      </div>
                    </template>
                    <div class="table-explain-card">
                      本表用于模拟实验验证。真实计数仅来自模拟数据生成过程；新方案和传统方案均为聚合估计结果。为突出估计效果，误差列展示估计值与真实计数之间的绝对误差。
                    </div>
                    <el-table :data="comparisonRows" border style="width: 100%">
                      <el-table-column prop="label" label="类别" min-width="150" fixed />
                      <el-table-column prop="trueCount" label="真实计数" min-width="120" align="center" />
                      <el-table-column prop="reportCount" label="扰动后观测计数" min-width="150" align="center">
                        <template #default="scope">
                          <span class="muted-count">{{ scope.row.reportCount }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column prop="newEstimate" label="新方案聚合估计值" min-width="170" align="center">
                        <template #default="scope">
                          <span class="new-estimate-value">{{ formatNumber(scope.row.newEstimate) }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column prop="newError" label="新方案绝对误差" min-width="150" align="center">
                        <template #default="scope">{{ formatAbsoluteError(scope.row.newError) }}</template>
                      </el-table-column>
                      <el-table-column prop="traditionalEstimate" label="传统方案估计值" min-width="160" align="center">
                        <template #default="scope">{{ formatOptionalNumber(scope.row.traditionalEstimate) }}</template>
                      </el-table-column>
                      <el-table-column prop="traditionalError" label="传统方案绝对误差" min-width="150" align="center">
                        <template #default="scope">{{ formatOptionalAbsoluteError(scope.row.traditionalError) }}</template>
                      </el-table-column>
                      <el-table-column label="误差降低" min-width="130" align="center">
                        <template #default="scope">{{ formatErrorReduction(scope.row) }}</template>
                      </el-table-column>
                    </el-table>
                    <div v-if="hasNegativeTraditionalEstimate" class="table-footnote">
                      传统方案估计值可能因随机扰动校正产生负估计，表格保留原始计算结果用于对比；实际应用中可根据任务需求进行非负截断或归一化处理。
                    </div>
                  </el-card>

                  <el-card shadow="never" class="result-card">
                    <template #header>
                      <div class="block-heading block-heading--compact">
                        <h3>分布拟合对比图</h3>
                        <span>主图聚焦真实分布、新方案聚合估计分布和传统方案估计分布</span>
                      </div>
                    </template>
                    <div class="chart-conclusion-card">
                      {{ chartConclusionText }}
                    </div>
                    <div ref="chartRef" class="chart-box"></div>
                    <div class="chart-note">
                      扰动后观测分布作为中间观测结果保留在表格中。传统方案估计值可能因噪声校正出现负值，图中保留原始估计结果用于对比。
                    </div>
                  </el-card>

                  <el-card shadow="never" class="result-card">
                    <template #header>
                      <div class="block-heading block-heading--compact">
                        <h3>估计误差对比</h3>
                        <span>使用表格中已有误差字段的绝对值，突出不同方案的估计偏差</span>
                      </div>
                    </template>
                    <div ref="errorChartRef" class="chart-box chart-box--error"></div>
                  </el-card>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as echarts from 'echarts';
import {
  ArrowDown,
  DataAnalysis,
  Document,
  House,
  Monitor,
  Setting
} from '@element-plus/icons-vue';
import { useUserStore } from '../../store/user';
import { useTaskStore } from '../../store/task';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import { getAggregateResults } from '../../services/taskAggregateMetricsService';
import {
  buildArrErrorMetrics,
  buildArrExperimentRows,
  getArrParams,
  getArrRecords
} from '../../utils/arrDemoUtils';

const PROTOCOL_ATTRIBUTE_LABELS = {
  ARR: '是否触发睡眠异常提醒',
  AGRR: '日均站立时长分档',
  AOUE: '每日步数分桶',
  TSP: '睡眠质量评分'
};

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const selectedTaskId = ref('');
const currentResult = ref(null);
const chartRef = ref(null);
const errorChartRef = ref(null);
let chartInstance = null;
let errorChartInstance = null;

const activeMenu = computed(() => route.path);
const user = computed(() => userStore.user);
const experimentTasks = computed(() => taskStore.taskList.filter(task => {
  const protocol = getTaskProtocol(task);
  return ['ARR', 'AGRR', 'AOUE', 'TSP'].includes(protocol);
}));
const selectedTask = computed(() => experimentTasks.value.find(task => String(task.id) === String(selectedTaskId.value)) || null);
const currentProtocol = computed(() => getTaskProtocol(selectedTask.value));
const comparisonRows = computed(() => buildComparisonRows());
const metricCards = computed(() => buildMetricCards());
const hasTraditionalEstimate = computed(() => comparisonRows.value.some(row => row.traditionalEstimate != null));
const hasNegativeTraditionalEstimate = computed(() => comparisonRows.value.some(row => Number(row.traditionalEstimate) < 0));
const chartConclusionText = computed(() => {
  if (!currentResult.value) {
    return '';
  }
  const rows = comparisonRows.value;
  const newMae = average(rows.map(row => Math.abs(Number(row.newError))));
  const traditionalMae = average(
    rows
      .filter(row => row.traditionalError != null)
      .map(row => Math.abs(Number(row.traditionalError)))
  );

  if (traditionalMae == null) {
    return `当前任务暂未配置传统方案估计结果，仅展示新方案估计效果。新方案 MAE = ${formatOptionalNumber(newMae)}。`;
  }
  return `当前任务下，新方案聚合估计结果更接近真实分布。新方案 MAE = ${formatOptionalNumber(newMae)}，传统方案 MAE = ${formatOptionalNumber(traditionalMae)}。`;
});
const emptyText = computed(() => {
  if (!experimentTasks.value.length) {
    return '暂无可对比任务，请先在属性配置页下发 ARR、AGRR、AOUE 或 TSP 任务。';
  }
  const protocol = currentProtocol.value || '当前协议';
  return `暂无 ${protocol} 模拟数据，请先在用户端运行对应多客户端上报模拟。`;
});

function getTaskProtocol(task) {
  return String(task?.protocol || task?.attributes?.[0]?.algorithm || task?.algorithm || '').toUpperCase();
}

function formatTaskOption(task) {
  const protocol = getTaskProtocol(task);
  const attributeName = PROTOCOL_ATTRIBUTE_LABELS[protocol] || task?.attributes?.[0]?.name || task?.title || '未知属性';
  return `${protocol}：${attributeName}（${task.id}）`;
}

function getArrTraditionalRows() {
  if (currentProtocol.value !== 'ARR' || !selectedTask.value) {
    return [];
  }
  const records = getArrRecords(selectedTask.value.id);
  const params = getArrParams(selectedTask.value, attributeConfigStore);
  return buildArrExperimentRows(records, params);
}

function buildComparisonRows() {
  if (!currentResult.value) {
    return [];
  }

  const traditionalRows = getArrTraditionalRows();
  return currentResult.value.compareRows.map((row, index) => {
    const traditionalRow = traditionalRows.find(item => item.label === row.label);
    const traditionalEstimate = traditionalRow?.traditionalEstimate ?? null;
    return {
      label: row.label,
      trueCount: row.trueCount,
      reportCount: Number(currentResult.value.reportCounts?.[index] ?? 0),
      newEstimate: row.estimatedCount,
      traditionalEstimate,
      newError: row.countError,
      traditionalError: traditionalEstimate == null ? null : Number((traditionalEstimate - row.trueCount).toFixed(4))
    };
  });
}

function average(values) {
  const numericValues = values.filter(value => Number.isFinite(Number(value))).map(Number);
  if (!numericValues.length) {
    return null;
  }
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function calculateTraditionalMetrics() {
  if (currentProtocol.value !== 'ARR') {
    return null;
  }
  const rows = getArrTraditionalRows();
  const metrics = buildArrErrorMetrics(rows);
  return {
    mae: metrics.find(item => item.label === '传统方案 MAE')?.value ?? '--',
    mse: metrics.find(item => item.label === '传统方案 MSE')?.value ?? '--'
  };
}

function formatParamCard() {
  const params = currentResult.value?.perturbParams || {};
  if (currentProtocol.value === 'TSP') {
    return `p1=${formatNumber(params.p1)}，q1=${formatNumber(params.q1)}；p2=${formatNumber(params.p2)}，q2=${formatNumber(params.q2)}`;
  }
  return `p=${formatNumber(params.p)}，q=${formatNumber(params.q)}`;
}

function buildMetricCards() {
  if (!currentResult.value) {
    return [];
  }

  const rows = comparisonRows.value;
  const newErrors = rows.map(row => Number(row.newError));
  const newMae = average(newErrors.map(Math.abs));
  const newMse = average(newErrors.map(value => value ** 2));
  const traditional = calculateTraditionalMetrics();

  const cards = [
    { label: '样本规模', value: String(currentResult.value.sampleCount || 0) },
    { label: '隐私预算 epsilon', value: String(currentResult.value.epsilon ?? '--') },
    { label: '扰动参数 p/q', value: formatParamCard() },
    { label: '新方案 MAE', value: formatOptionalNumber(newMae) },
    { label: '新方案 MSE', value: formatOptionalNumber(newMse) }
  ];

  if (traditional) {
    cards.push(
      { label: '传统方案 MAE', value: traditional.mae },
      { label: '传统方案 MSE', value: traditional.mse }
    );
  } else {
    cards.push(
      { label: '传统方案 MAE', value: '--' },
      { label: '传统方案 MSE', value: '--' }
    );
  }

  return cards;
}

function refreshExperiment() {
  if (!selectedTask.value) {
    currentResult.value = null;
    renderChart();
    return;
  }
  currentResult.value = getAggregateResults(selectedTask.value.id)?.[0] || null;
  renderChart();
}

function renderChart() {
  nextTick(() => {
    if (!chartRef.value || !currentResult.value) {
      chartInstance?.clear();
      errorChartInstance?.clear();
      return;
    }

    if (!chartInstance) {
      chartInstance = echarts.init(chartRef.value);
    }
    if (errorChartRef.value && !errorChartInstance) {
      errorChartInstance = echarts.init(errorChartRef.value);
    }
    chartInstance.resize();
    errorChartInstance?.resize();

    const rows = comparisonRows.value;
    const series = [
      {
        name: '真实分布',
        type: 'bar',
        barGap: '0%',
        barMaxWidth: 34,
        data: rows.map(row => Number(row.trueCount || 0)),
        itemStyle: { color: '#67c23a', borderRadius: [6, 6, 0, 0] }
      },
      {
        name: '新方案聚合估计分布',
        type: 'bar',
        barGap: '0%',
        barMaxWidth: 34,
        data: rows.map(row => Number(row.newEstimate || 0)),
        itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
      }
    ];

    if (hasTraditionalEstimate.value) {
      series.push({
        name: '传统方案估计分布',
        type: 'bar',
        barGap: '0%',
        barMaxWidth: 34,
        data: rows.map(row => row.traditionalEstimate == null ? 0 : Number(row.traditionalEstimate)),
        itemStyle: { color: '#909399', borderRadius: [6, 6, 0, 0] }
      });
    }

    chartInstance.setOption({
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { top: 48, left: 52, right: 24, bottom: 48 },
      xAxis: {
        type: 'category',
        data: rows.map(row => row.label),
        axisLabel: { interval: 0 }
      },
      yAxis: { type: 'value' },
      series
    }, true);

    const errorSeries = [
      {
        name: '新方案绝对误差',
        type: 'bar',
        barGap: '0%',
        barMaxWidth: 34,
        data: rows.map(row => Math.abs(Number(row.newError || 0))),
        itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] }
      }
    ];

    if (hasTraditionalEstimate.value) {
      errorSeries.push({
        name: '传统方案绝对误差',
        type: 'bar',
        barGap: '0%',
        barMaxWidth: 34,
        data: rows.map(row => row.traditionalError == null ? 0 : Math.abs(Number(row.traditionalError))),
        itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] }
      });
    }

    errorChartInstance?.setOption({
      tooltip: { trigger: 'axis' },
      legend: { top: 0 },
      grid: { top: 48, left: 52, right: 24, bottom: 48 },
      xAxis: {
        type: 'category',
        data: rows.map(row => row.label),
        axisLabel: { interval: 0 }
      },
      yAxis: { type: 'value', name: '绝对误差' },
      series: errorSeries
    }, true);
  });
}

function formatNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return numeric.toFixed(4);
}

function formatOptionalNumber(value) {
  return value == null ? '--' : formatNumber(value);
}

function formatAbsoluteError(value) {
  const numeric = Math.abs(Number(value || 0));
  return Number.isFinite(numeric) ? numeric.toFixed(2) : '--';
}

function formatOptionalAbsoluteError(value) {
  if (value == null) {
    return '--';
  }
  return formatAbsoluteError(value);
}

function getAbsoluteErrors(row) {
  const newError = Math.abs(Number(row?.newError ?? 0));
  const traditionalError = row?.traditionalError == null ? null : Math.abs(Number(row.traditionalError));
  return {
    newError: Number.isFinite(newError) ? newError : 0,
    traditionalError: Number.isFinite(traditionalError) ? traditionalError : null
  };
}

function formatErrorReduction(row) {
  const { newError, traditionalError } = getAbsoluteErrors(row);
  if (traditionalError == null || traditionalError <= 0) {
    return '--';
  }
  const reduction = ((traditionalError - newError) / traditionalError) * 100;
  return reduction >= 0 ? `降低 ${reduction.toFixed(2)}%` : `增加 ${Math.abs(reduction).toFixed(2)}%`;
}

function formatSigned(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `+${numeric.toFixed(4)}` : numeric.toFixed(4);
}

function formatOptionalSigned(value) {
  return value == null ? '--' : formatSigned(value);
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

watch(selectedTaskId, refreshExperiment);
watch(comparisonRows, renderChart);

onMounted(() => {
  taskStore.loadFromLocalStorage();
  attributeConfigStore.loadFromLocalStorage();
  if (experimentTasks.value.length > 0) {
    selectedTaskId.value = experimentTasks.value[0].id;
  }
  refreshExperiment();
  window.addEventListener('resize', renderChart);
});

onUnmounted(() => {
  window.removeEventListener('resize', renderChart);
  chartInstance?.dispose();
  errorChartInstance?.dispose();
  chartInstance = null;
  errorChartInstance = null;
});
</script>

<style scoped>
.admin-container {
  height: 100vh;
  overflow: hidden;
}

.admin-container :deep(.el-container) {
  height: 100%;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
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

.el-main {
  background: #f0f2f5;
  padding: 0;
  overflow: hidden;
}

.comparison-content {
  height: calc(100vh - 60px);
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 32px;
}

.experiment-card {
  min-height: 100%;
  border-radius: 10px;
}

.experiment-card > :deep(.el-card__header) {
  padding: 16px 18px;
}

.experiment-card > :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px 24px;
  overflow-y: visible;
  overflow-x: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.page-desc {
  max-width: 760px;
  color: #4b5563;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 0 0 auto;
}

.task-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-select-label {
  color: #64748b;
  font-size: 13px;
}

.notice-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  flex: 0 0 auto;
}

.notice-card {
  min-height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #4b5563;
  line-height: 1.6;
  padding: 10px 12px;
  font-size: 13px;
}

.notice-card--blue {
  border-color: #dbeafe;
  background: #f8fbff;
  color: #1e3a8a;
}

.empty-panel {
  flex: 1;
  min-height: 280px;
}

.metric-section {
  flex: 0 0 auto;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
}

.metric-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  min-height: 78px;
  padding: 12px 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.metric-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 6px;
}

.metric-card strong {
  display: block;
  color: #111827;
  font-size: 17px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.result-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.result-card {
  border-radius: 10px;
  overflow: visible;
}

.result-card > :deep(.el-card__header) {
  padding: 12px 14px;
  background: #fbfdff;
}

.result-card > :deep(.el-card__body) {
  padding: 14px;
}

.result-card :deep(.el-table__header th) {
  background: #eef6ff;
  color: #365a7c;
  font-weight: 700;
}

.block-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.block-heading h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
}

.block-heading span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.block-heading--compact h3 {
  font-size: 16px;
}

.table-explain-card {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  color: #4b5563;
  font-size: 13px;
  line-height: 1.6;
}

.muted-count {
  color: #64748b;
  font-weight: 500;
}

.new-estimate-value {
  color: #0f5db8;
  font-weight: 800;
}

.table-footnote {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  color: #9a3412;
  font-size: 13px;
  line-height: 1.6;
}

.chart-conclusion-card {
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
  color: #1e3a8a;
  font-size: 13px;
  line-height: 1.6;
  font-weight: 600;
}

.chart-box {
  height: 360px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.chart-box--error {
  height: 320px;
}

.chart-note {
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 1100px) {
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .notice-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .header-actions,
  .task-picker {
    align-items: stretch;
    width: 100%;
  }

  .task-picker {
    flex-direction: column;
  }
}
</style>
