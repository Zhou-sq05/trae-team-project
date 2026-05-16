<template>
  <div class="admin-container">
    <el-container>
      <el-header>
        <div class="header-left">
          <h1>演示与验证</h1>
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
        <el-aside width="240px">
          <div class="sidebar-brand">
            <div class="sidebar-brand-title">隐私保护平台</div>
            <div class="sidebar-brand-subtitle">数据采集与管理</div>
          </div>
          <el-menu :default-active="activeMenu" class="el-menu-vertical-demo" router>
            <el-menu-item index="/admin/scenario-overview">
              <el-icon><Document /></el-icon>
              <span>场景说明</span>
            </el-menu-item>
            <el-menu-item index="/admin/attr-config">
              <el-icon><Setting /></el-icon>
              <span>任务配置</span>
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
                误差评估
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
                    <div class="page-title">误差评估</div>
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

              <el-empty
                v-if="!currentResult"
                class="empty-panel"
                :description="emptyText"
              />

              <template v-else>
                <section class="comparison-summary-section">
                  <div v-if="!isTspExperiment" class="conclusion-banner">
                    {{ chartConclusionText }}
                  </div>
                  <div class="comparison-metric-grid">
                    <div
                      v-for="item in comparisonMetricCards"
                      :key="item.label"
                      class="comparison-metric-card"
                      :class="`comparison-metric-card--${item.type}`"
                    >
                      <span>{{ item.label }}</span>
                      <strong>
                        <el-tag
                          v-if="item.isTag"
                          :type="item.value === '新方案' ? 'success' : 'warning'"
                          effect="light"
                        >
                          {{ item.value }}
                        </el-tag>
                        <template v-else>{{ item.value }}</template>
                      </strong>
                    </div>
                  </div>
                </section>

                <section class="result-section">
                  <el-card v-if="showTraditionalComparison" shadow="never" class="result-card">
                    <template #header>
                      <div class="block-heading block-heading--compact">
                        <h3>估计偏差对比图</h3>
                        <span>偏差越接近 0，说明估计结果越接近真实分布；正值表示高估，负值表示低估。</span>
                      </div>
                    </template>
                    <div ref="errorChartRef" class="chart-box chart-box--bias"></div>
                  </el-card>

                  <el-card shadow="never" class="result-card">
                    <template #header>
                      <div class="block-heading block-heading--compact">
                        <h3>分布估计结果对照</h3>
                      </div>
                    </template>
                    <div ref="chartRef" class="chart-box chart-box--distribution"></div>
                  </el-card>

                  <el-card shadow="never" class="result-card">
                    <template #header>
                      <div class="block-heading block-heading--compact">
                        <h3>误差明细表</h3>
                      </div>
                    </template>
                    <el-table :data="comparisonDetailRows" border style="width: 100%">
                      <el-table-column prop="label" label="类别" min-width="140" fixed />
                      <el-table-column prop="referenceValue" label="真实值" min-width="110" align="center">
                        <template #default="scope">{{ formatDetailNumber(scope.row.referenceValue) }}</template>
                      </el-table-column>
                      <el-table-column prop="newEstimate" label="新方案估计" min-width="140" align="center">
                        <template #default="scope">
                          <span class="new-estimate-value">{{ formatDetailNumber(scope.row.newEstimate) }}</span>
                        </template>
                      </el-table-column>
                      <el-table-column prop="newBias" label="新方案偏差" min-width="130" align="center">
                        <template #default="scope">{{ formatSignedDetail(scope.row.newBias) }}</template>
                      </el-table-column>
                      <el-table-column v-if="showTraditionalComparison" prop="traditionalEstimate" label="传统方案估计" min-width="150" align="center">
                        <template #default="scope">{{ formatOptionalDetailNumber(scope.row.traditionalEstimate) }}</template>
                      </el-table-column>
                      <el-table-column v-if="showTraditionalComparison" prop="traditionalBias" label="传统方案偏差" min-width="140" align="center">
                        <template #default="scope">{{ formatOptionalSignedDetail(scope.row.traditionalBias) }}</template>
                      </el-table-column>
                      <el-table-column v-if="showTraditionalComparison" prop="betterScheme" label="更优方案" min-width="120" align="center">
                        <template #default="scope">
                          <el-tag
                            :type="scope.row.betterScheme === '新方案' ? 'success' : 'warning'"
                            effect="light"
                          >
                            {{ scope.row.betterScheme }}
                          </el-tag>
                        </template>
                      </el-table-column>
                    </el-table>
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
  Monitor,
  Setting
} from '@element-plus/icons-vue';
import { useUserStore } from '../../store/user';
import { useTaskStore } from '../../store/task';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import { getAggregateResults } from '../../services/taskAggregateMetricsService';
import {
  buildArrExperimentRows,
  getArrParams,
  getArrRecords
} from '../../utils/arrDemoUtils';
import {
  aggregateAOUE,
  aggregateTraditionalGRR,
  perturbAOUEWithDetails,
  perturbByTraditionalGRR
} from '../../utils/ldpAlgorithms';
import { STAND_BUCKET_ORDER, STEP_BUCKET_ORDER } from '../../utils/constants';

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
const isTspExperiment = computed(() => currentProtocol.value === 'TSP');
const showTraditionalComparison = computed(() => !isTspExperiment.value);
const comparisonRows = computed(() => buildComparisonRows());
const comparisonDetailRows = computed(() => buildComparisonDetailRows());
const newMSE = computed(() => average(comparisonDetailRows.value.map(row => row.newSquaredFreqError)));
const traditionalMSE = computed(() => average(
  comparisonDetailRows.value
    .filter(row => row.traditionalSquaredFreqError != null)
    .map(row => row.traditionalSquaredFreqError)
));
const improvementRate = computed(() => {
  const traditional = Number(traditionalMSE.value);
  const current = Number(newMSE.value);
  if (!Number.isFinite(traditional) || traditional <= 0 || !Number.isFinite(current)) {
    return 0;
  }
  return ((traditional - current) / traditional) * 100;
});
const betterOverallScheme = computed(() => {
  if (traditionalMSE.value == null) {
    return '新方案';
  }
  return Number(newMSE.value) <= Number(traditionalMSE.value) ? '新方案' : '传统方案';
});
const comparisonMetricCards = computed(() => {
  const cards = [
    { label: '新方案频率 MSE', value: formatMseNumber(newMSE.value), type: 'new' }
  ];
  if (!showTraditionalComparison.value) {
    return cards;
  }
  return [
    ...cards,
    { label: '传统方案频率 MSE', value: formatOptionalMseNumber(traditionalMSE.value), type: 'traditional' },
    { label: '误差下降', value: `${formatPercent(improvementRate.value)}%`, type: 'improvement' },
    { label: '当前更优方案', value: betterOverallScheme.value, type: 'best', isTag: true }
  ];
});
const hasTraditionalEstimate = computed(() => comparisonRows.value.some(row => row.traditionalEstimate != null));
const chartConclusionText = computed(() => {
  if (!currentResult.value) {
    return '';
  }
  if (!showTraditionalComparison.value) {
    return '';
  }
  if (traditionalMSE.value == null) {
    return `当前任务暂未配置传统方案估计结果，仅展示新方案估计效果。新方案频率 MSE = ${formatMseNumber(newMSE.value)}。`;
  }
  return `当前任务下，新方案聚合估计结果更接近真实分布。新方案频率 MSE = ${formatMseNumber(newMSE.value)}，传统方案频率 MSE = ${formatMseNumber(traditionalMSE.value)}，误差下降约 ${formatPercent(improvementRate.value)}%。`;
});
const emptyText = computed(() => {
  if (!experimentTasks.value.length) {
    return '暂无可对比任务，请先在任务配置页下发 ARR、AGRR、AOUE 或 TSP 任务。';
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

function createDeterministicRandom(seedText) {
  let seed = 2166136261;
  String(seedText).split('').forEach(char => {
    seed ^= char.charCodeAt(0);
    seed = Math.imul(seed, 16777619);
  });
  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    seed ^= seed >>> 16;
    return (seed >>> 0) / 4294967296;
  };
}

function getStoredSubmissions(taskId = '') {
  try {
    const storedData = JSON.parse(localStorage.getItem('submittedData') || '[]');
    return storedData.filter(item => !taskId || String(item.task_id ?? item.taskId) === String(taskId));
  } catch (error) {
    console.error('读取实验对比数据失败:', error);
    return [];
  }
}

function normalizeAgrrCode(value) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > STAND_BUCKET_ORDER.length) {
    return null;
  }
  return numericValue;
}

function normalizeAoueCode(value) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > STEP_BUCKET_ORDER.length) {
    return null;
  }
  return numericValue;
}

function getAgrrOriginalSamples() {
  if (currentProtocol.value !== 'AGRR' || !selectedTask.value) {
    return [];
  }
  return getStoredSubmissions(selectedTask.value.id)
    .filter(item => String(item?.reportData?.protocol || item?.protocol || '').toUpperCase() === 'AGRR')
    .map(item => (
      item.original_bucket_code
      ?? item.rawData?.standBucketCode
      ?? item.reportData?.rawBucketCode
      ?? item.rawData?.rawValue
    ))
    .map(normalizeAgrrCode)
    .filter(value => value != null);
}

function getAgrrTraditionalRows() {
  if (currentProtocol.value !== 'AGRR' || !selectedTask.value || !currentResult.value) {
    return [];
  }
  const originalSamples = getAgrrOriginalSamples();
  if (!originalSamples.length) {
    return [];
  }
  const domainValues = STAND_BUCKET_ORDER.map((_, index) => index + 1);
  const epsilon = Number(currentResult.value.epsilon ?? selectedTask.value?.privacyBudget ?? 0.5);
  const grrReportedValues = originalSamples.map((rawValue, index) => (
    perturbByTraditionalGRR(
      rawValue,
      domainValues,
      epsilon,
      createDeterministicRandom(`${selectedTask.value.id}-agrr-traditional-grr-${index}-${rawValue}`)
    ).reportedValue
  ));
  const grrResult = aggregateTraditionalGRR(grrReportedValues, domainValues, epsilon);
  const traditionalEstimates = grrResult.rawEstimatedCounts || grrResult.estimatedCounts || [];
  return STAND_BUCKET_ORDER.map((label, index) => ({
    label,
    traditionalEstimate: Number((Number(traditionalEstimates[index] ?? 0)).toFixed(4))
  }));
}

function getAoueOriginalSamplesFromResult() {
  if (!currentResult.value?.compareRows?.length) {
    return [];
  }
  return currentResult.value.compareRows.flatMap((row, index) => {
    const count = Math.max(0, Math.round(Number(row.trueCount || 0)));
    return new Array(count).fill(index + 1);
  });
}

function getAoueOriginalSamples() {
  if (currentProtocol.value !== 'AOUE' || !selectedTask.value) {
    return [];
  }
  const records = getStoredSubmissions(selectedTask.value.id)
    .filter(item => String(item?.reportData?.protocol || item?.protocol || '').toUpperCase() === 'AOUE');
  const samples = records
    .map(item => {
      const rawBucket = item.original_bucket || item.rawData?.stepsBucket || item.reportData?.rawBucket;
      if (rawBucket) {
        const labelIndex = STEP_BUCKET_ORDER.indexOf(rawBucket);
        if (labelIndex >= 0) {
          return labelIndex + 1;
        }
      }
      return (
        item.original_bucket_code
        ?? item.rawData?.stepsBucketCode
        ?? item.reportData?.rawBucketCode
        ?? item.rawData?.rawValue
      );
    })
    .map(normalizeAoueCode)
    .filter(value => value != null);

  return samples.length ? samples : getAoueOriginalSamplesFromResult();
}

function getAoueTraditionalRows() {
  if (currentProtocol.value !== 'AOUE' || !selectedTask.value || !currentResult.value) {
    return [];
  }
  const originalSamples = getAoueOriginalSamples();
  if (!originalSamples.length) {
    return [];
  }
  const domainSize = STEP_BUCKET_ORDER.length;
  const epsilon = Number(currentResult.value.epsilon ?? selectedTask.value?.privacyBudget ?? 0.5);
  const q = 1 / (Math.exp(epsilon) + 1);
  const p = 0.5;
  const perturbedVectors = originalSamples.map((rawValue, index) => (
    perturbAOUEWithDetails(
      rawValue,
      domainSize,
      q,
      p,
      createDeterministicRandom(`${selectedTask.value.id}-aoue-traditional-oue-${index}-${rawValue}`)
    ).reportValue
  ));
  const traditionalEstimates = aggregateAOUE(perturbedVectors, epsilon, domainSize, p, q);

  return STEP_BUCKET_ORDER.map((label, index) => ({
    label,
    traditionalEstimate: Number((Number(traditionalEstimates[index] ?? 0)).toFixed(4))
  }));
}

function getTraditionalRows() {
  if (currentProtocol.value === 'ARR') {
    return getArrTraditionalRows();
  }
  if (currentProtocol.value === 'AGRR') {
    return getAgrrTraditionalRows();
  }
  if (currentProtocol.value === 'AOUE') {
    return getAoueTraditionalRows();
  }
  return [];
}

function buildComparisonRows() {
  if (!currentResult.value) {
    return [];
  }

  const traditionalRows = getTraditionalRows();
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

function buildComparisonDetailRows() {
  const sampleCount = getComparisonSampleCount(comparisonRows.value);
  return comparisonRows.value.map(row => {
    const referenceValue = Number(row.trueCount || 0);
    const newEstimate = Number(row.newEstimate || 0);
    const traditionalEstimate = row.traditionalEstimate == null ? null : Number(row.traditionalEstimate);
    const newBias = Number((newEstimate - referenceValue).toFixed(4));
    const traditionalBias = traditionalEstimate == null
      ? null
      : Number((traditionalEstimate - referenceValue).toFixed(4));
    const newAbsError = Math.abs(newBias);
    const traditionalAbsError = traditionalBias == null ? null : Math.abs(traditionalBias);
    const newSquaredError = Number((newBias ** 2).toFixed(6));
    const traditionalSquaredError = traditionalBias == null ? null : Number((traditionalBias ** 2).toFixed(6));
    const newFreqError = Number((newBias / sampleCount).toFixed(8));
    const traditionalFreqError = traditionalBias == null ? null : Number((traditionalBias / sampleCount).toFixed(8));
    const newSquaredFreqError = Number((newFreqError ** 2).toFixed(10));
    const traditionalSquaredFreqError = traditionalFreqError == null ? null : Number((traditionalFreqError ** 2).toFixed(10));
    const betterScheme = traditionalSquaredFreqError == null || newSquaredFreqError <= traditionalSquaredFreqError ? '新方案' : '传统方案';
    return {
      label: row.label,
      referenceValue,
      reportCount: row.reportCount,
      newEstimate,
      newBias,
      newAbsError,
      newSquaredError,
      newFreqError,
      newSquaredFreqError,
      traditionalEstimate,
      traditionalBias,
      traditionalAbsError,
      traditionalSquaredError,
      traditionalFreqError,
      traditionalSquaredFreqError,
      betterScheme
    };
  });
}

function getComparisonSampleCount(rows = []) {
  const explicitCount = Number(currentResult.value?.sampleCount);
  if (Number.isFinite(explicitCount) && explicitCount > 0) {
    return explicitCount;
  }
  const inferredCount = rows.reduce((sum, row) => sum + Number(row?.trueCount || 0), 0);
  return Number.isFinite(inferredCount) && inferredCount > 0 ? inferredCount : 1;
}

function average(values) {
  const numericValues = values.filter(value => Number.isFinite(Number(value))).map(Number);
  if (!numericValues.length) {
    return null;
  }
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function calculateTraditionalMetrics() {
  if (!['ARR', 'AGRR', 'AOUE'].includes(currentProtocol.value)) {
    return null;
  }
  const rows = currentProtocol.value === 'ARR'
    ? getArrTraditionalRows()
    : comparisonRows.value.filter(row => row.traditionalError != null);
  if (!rows.length) {
    return null;
  }
  const sampleCount = getComparisonSampleCount(rows);
  const metrics = [
    {
      label: '传统方案频率 MSE',
      value: average(rows.map(row => (Number(row.traditionalError || 0) / sampleCount) ** 2))?.toFixed(6) ?? '--'
    }
  ];
  return {
    mse: metrics.find(item => item.label === '传统方案频率 MSE')?.value ?? '--'
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
  const sampleCount = getComparisonSampleCount(rows);
  const newErrors = rows.map(row => Number(row.newError));
  const newMse = average(newErrors.map(value => (value / sampleCount) ** 2));
  const traditional = calculateTraditionalMetrics();

  const cards = [
    { label: '样本规模', value: String(currentResult.value.sampleCount || 0) },
    { label: '隐私预算 epsilon', value: String(currentResult.value.epsilon ?? '--') },
    { label: '扰动参数 p/q', value: formatParamCard() },
    { label: '新方案频率 MSE', value: formatOptionalMseNumber(newMse) }
  ];

  if (traditional) {
    cards.push(
      { label: '传统方案频率 MSE', value: traditional.mse }
    );
  } else {
    cards.push(
      { label: '传统方案频率 MSE', value: '--' }
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
    const detailRows = comparisonDetailRows.value;
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
        name: '新方案估计分布',
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

    const biasSeries = [
      {
        name: '新方案偏差',
        type: 'bar',
        barGap: '0%',
        barMaxWidth: 34,
        data: detailRows.map(row => Number(row.newBias || 0)),
        itemStyle: { color: '#409eff', borderRadius: [6, 6, 0, 0] },
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ yAxis: 0, name: '0 基准线' }],
          lineStyle: { color: '#111827', width: 1, type: 'solid' },
          label: { formatter: '0 基准线', color: '#475569' }
        }
      }
    ];

    if (hasTraditionalEstimate.value) {
      biasSeries.push({
        name: '传统方案偏差',
        type: 'bar',
        barGap: '0%',
        barMaxWidth: 34,
        data: detailRows.map(row => row.traditionalBias == null ? 0 : Number(row.traditionalBias)),
        itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] }
      });
    }

    errorChartInstance?.setOption({
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          const category = params?.[0]?.axisValue ?? '';
          const lines = [`${category}`];
          params.forEach(item => {
            lines.push(`${item.marker}${item.seriesName}：${formatSignedDetail(item.value)}`);
          });
          lines.push('偏差 = 估计值 - 真实值');
          return lines.join('<br/>');
        }
      },
      legend: { top: 0 },
      grid: { top: 48, left: 52, right: 24, bottom: 48 },
      xAxis: {
        type: 'category',
        data: detailRows.map(row => row.label),
        axisLabel: { interval: 0 }
      },
      yAxis: { type: 'value', name: '估计偏差' },
      series: biasSeries
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

function formatDetailNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return numeric.toFixed(2);
}

function formatOptionalDetailNumber(value) {
  return value == null ? '--' : formatDetailNumber(value);
}

function formatMseNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return numeric.toFixed(6);
}

function formatOptionalMseNumber(value) {
  return value == null ? '--' : formatMseNumber(value);
}

function formatSignedDetail(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '--';
  }
  return numeric > 0 ? `+${numeric.toFixed(2)}` : numeric.toFixed(2);
}

function formatOptionalSignedDetail(value) {
  return value == null ? '--' : formatSignedDetail(value);
}

function formatPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0.00';
  }
  return numeric.toFixed(2);
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

watch(selectedTaskId, refreshExperiment);
watch(
  () => route.query.taskId,
  taskId => {
    if (!taskId) return;
    const matchedTask = experimentTasks.value.find(task => String(task.id) === String(taskId));
    if (matchedTask && String(selectedTaskId.value) !== String(matchedTask.id)) {
      selectedTaskId.value = matchedTask.id;
    }
  }
);
watch(comparisonRows, renderChart);

onMounted(() => {
  taskStore.loadFromLocalStorage();
  attributeConfigStore.loadFromLocalStorage();
  const routeTaskId = route.query.taskId;
  const matchedTask = experimentTasks.value.find(task => String(task.id) === String(routeTaskId));
  if (matchedTask) {
    selectedTaskId.value = matchedTask.id;
  } else if (experimentTasks.value.length > 0) {
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

.comparison-summary-section,
.metric-section {
  flex: 0 0 auto;
}

.conclusion-banner {
  padding: 12px 14px;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: linear-gradient(135deg, #eff6ff 0%, #f8fbff 100%);
  color: #1e3a8a;
  font-size: 15px;
  line-height: 1.6;
  font-weight: 700;
}

.comparison-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.comparison-metric-card {
  min-height: 72px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.comparison-metric-card span {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

.comparison-metric-card strong {
  margin-top: 8px;
  color: #111827;
  font-size: 22px;
  line-height: 1.2;
  font-weight: 800;
}

.comparison-metric-card--new {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.comparison-metric-card--new strong {
  color: #0f5db8;
}

.comparison-metric-card--traditional {
  border-color: #fed7aa;
  background: #fffaf3;
}

.comparison-metric-card--traditional strong {
  color: #b45309;
}

.comparison-metric-card--improvement {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.comparison-metric-card--improvement strong {
  color: #15803d;
}

.comparison-metric-card--best {
  align-items: flex-start;
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

.chart-box--bias {
  height: 380px;
}

.chart-box--distribution {
  height: 320px;
}

.chart-note {
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.comparison-note-strip {
  padding: 10px 12px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
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

  .comparison-metric-grid {
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

  .comparison-metric-grid {
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
