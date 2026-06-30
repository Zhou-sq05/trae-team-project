<template>
  <div class="client-demo-container">
    <header class="header">
      <div class="header-left">
        <h1>用户端</h1>
      </div>
      <div class="header-right">
        <el-dropdown>
          <span class="user-dropdown">
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main class="content">
      <el-card shadow="hover">
        <template #header>
          <div class="page-header">
            <div>
              <div class="page-title">AOUE 多客户端上报</div>
              <div class="page-desc">
                本页面为答辩用的 AOUE 多客户端上报页面。由于当前环境中无法同时打开多个真实用户端页面，因此通过分步骤操作组织 2000 个客户端分别完成一次 AOUE 本地采集、初始编码向量生成、逐位随机扰动与上报。
                表格中的本地采集值和初始编码向量仅用于展示客户端的本地扰动过程，不代表服务器或管理员能够获得用户原始数据；真实系统中服务器只接收扰动后的编码向量。
              </div>
            </div>
            <div class="header-actions">
              <span class="task-select-label">AOUE 任务 ID</span>
              <el-select v-model="selectedTaskId" placeholder="选择 AOUE 任务" style="width: 220px">
                <el-option
                  v-for="task in aoueTasks"
                  :key="task.id"
                  :label="task.id"
                  :value="task.id"
                />
              </el-select>
            </div>
          </div>
        </template>

        <div v-if="selectedTask" class="task-summary">
          <div class="summary-item">
            <span>采集属性</span>
            <strong>每日步数分桶</strong>
          </div>
          <div class="summary-item">
            <span>协议</span>
            <strong>AOUE</strong>
          </div>
          <div class="summary-item">
            <span>扰动概率</span>
            <strong>p={{ aoueParams.p.toFixed(4) }}，q={{ aoueParams.q.toFixed(4) }}</strong>
          </div>
          <div class="summary-item">
            <span>样本规模</span>
            <strong>2000 个客户端各上报一次</strong>
          </div>
        </div>
        <el-empty v-else description="暂无 AOUE 任务，请先在服务器端属性配置页下发 AOUE 场景" />

        <section class="flow-section">
          <div class="flow-title">AOUE 客户端本地处理链路</div>
          <div class="flow-steps">
            <div
              v-for="(step, index) in flowSteps"
              :key="step.title"
              class="flow-card"
              :class="`is-${step.state}`"
            >
              <div class="flow-index">{{ index + 1 }}</div>
              <div class="flow-copy">
                <div class="flow-card-head">
                  <strong>{{ step.title }}</strong>
                  <em>{{ step.statusText }}</em>
                </div>
                <span>{{ step.description }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="step-actions">
          <el-button type="primary" :disabled="!selectedTask || isAnimating" @click="startClientStartup">
            启动 2000 个客户端
          </el-button>
          <el-button :disabled="!canEncode" @click="startLocalEncoding">
            客户端生成初始编码向量
          </el-button>
          <el-button :disabled="!canPerturb" @click="startAouePerturbation">
            客户端执行 AOUE 扰动
          </el-button>
          <el-button type="success" :disabled="!canUpload" @click="startUpload">
            上传扰动后编码向量
          </el-button>
          <el-button v-if="isAnimating" type="warning" plain @click="finishCurrentStage">
            立即完成当前步骤
          </el-button>
          <el-button type="primary" plain :disabled="!selectedTask" @click="completeAllSteps">
            一键完成
          </el-button>
        </section>

        <el-alert
          v-if="progressNotice"
          class="upload-notice"
          :type="isAnimating ? 'info' : 'success'"
          :closable="false"
          :title="progressNotice"
          show-icon
        />
        <div v-if="currentBatchText" class="batch-progress-tip">
          {{ currentBatchText }}
        </div>

        <section class="detail-section">
          <div class="detail-title">
            <h3>客户端上报明细</h3>
            <span>共 {{ simulationRows.length }} 条，批次 ID：{{ batchId || '待生成' }}</span>
          </div>

          <div class="client-table-v2-shell">
            <el-auto-resizer>
              <template #default="{ width, height }">
                <el-table-v2
                  v-if="simulationRows.length > 0"
                  :columns="tableColumns"
                  :data="simulationRows"
                  :width="width"
                  :height="height"
                  :row-height="48"
                  :header-height="48"
                  row-key="userNo"
                  :row-class="getRowClassName"
                  fixed
                  scrollbar-always-on
                  class="client-table-v2"
                />
                <div v-else class="client-table-empty">请先启动 2000 个客户端</div>
              </template>
            </el-auto-resizer>
          </div>
        </section>

        <div class="page-actions">
          <el-button @click="goToUserDevice">返回单用户上报</el-button>
        </div>
      </el-card>
    </main>
  </div>
</template>

<script setup>
import { computed, h, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElTag } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { useUserStore } from '../../store/user';
import { useTaskStore } from '../../store/task';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import {
  AOUE_DEMO_SAMPLE_COUNT,
  appendAoueSubmissionRecords,
  encodeAoueValue,
  formatAoueCode,
  formatAoueTransitions,
  formatAoueVector,
  getAoueParams,
  getAoueTasks,
  perturbAoueValue,
  sampleAoueRawClientValue
} from '../../utils/aoueDemoUtils';

const FLOW_STEPS = [
  {
    title: '启动客户端',
    description: '生成 2000 个客户端各自完成一次每日步数本地采集'
  },
  {
    title: '生成初始编码向量',
    description: '将步数分桶映射为 one-hot 初始编码向量'
  },
  {
    title: 'AOUE 逐位扰动',
    description: '客户端按 p、q 概率对编码向量逐位独立扰动'
  },
  {
    title: '上传扰动后向量',
    description: '服务器仅接收扰动后的编码向量'
  }
];

const STAGES = {
  START: 'start',
  ENCODE: 'encode',
  PERTURB: 'perturb',
  UPLOAD: 'upload'
};

const STAGE_STEP = {
  [STAGES.START]: 1,
  [STAGES.ENCODE]: 2,
  [STAGES.PERTURB]: 3,
  [STAGES.UPLOAD]: 4
};

const STAGE_TEXT = {
  [STAGES.START]: {
    running: '正在接入客户端',
    done: '已启动 2000 个客户端，可继续生成初始编码向量。'
  },
  [STAGES.ENCODE]: {
    running: '正在生成初始编码向量',
    done: '已完成 2000 个客户端初始编码向量生成。'
  },
  [STAGES.PERTURB]: {
    running: '正在执行 AOUE 逐位扰动',
    done: '已完成 2000 个客户端 AOUE 扰动。'
  },
  [STAGES.UPLOAD]: {
    running: '正在上传扰动后编码向量',
    done: '已完成 2000 个客户端分别进行一次 AOUE 本地扰动上报。'
  }
};

const ANIMATION_INTERVAL_MS = 150;
const ANIMATION_BATCH_SIZE = 20;
const HIGHLIGHT_MS = 560;

const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const selectedTaskId = ref('');
const simulationRows = ref([]);
const batchId = ref('');
const completedStep = ref(0);
const activeStage = ref('');
const stageProgress = ref(0);
const progressNotice = ref('');
const currentBatchText = ref('');
const highlightedRows = ref([]);
const tableRef = ref(null);
let animationTimer = null;
let highlightTimer = null;

const aoueTasks = computed(() => getAoueTasks(taskStore.taskList));
const selectedTask = computed(() => aoueTasks.value.find(task => task.id === selectedTaskId.value) || null);
const aoueParams = computed(() => getAoueParams(selectedTask.value, attributeConfigStore));
const isAnimating = computed(() => Boolean(activeStage.value));
const canEncode = computed(() => !isAnimating.value && completedStep.value === 1);
const canPerturb = computed(() => !isAnimating.value && completedStep.value === 2);
const canUpload = computed(() => !isAnimating.value && completedStep.value === 3);

function renderTextCell({ cellData }) {
  const text = cellData ?? '';
  return h('span', { class: 'client-table-v2-text', title: String(text) }, String(text));
}

function renderStatusCell({ rowData }) {
  const status = rowData.uploadStatus || '';
  return h(ElTag, { type: status === '已上报' ? 'success' : 'info' }, () => status);
}

function createTextColumn(key, title, width) {
  return {
    key,
    dataKey: key,
    title,
    width,
    cellRenderer: renderTextCell
  };
}

const tableColumns = [
  createTextColumn('userNo', '客户端编号', 150),
  createTextColumn('rawDisplay', '客户端本地采集值', 300),
  createTextColumn('encodedVectorDisplay', '初始编码向量', 260),
  createTextColumn('aoueTransition', 'AOUE 扰动结果', 360),
  createTextColumn('uploadedVectorDisplay', '扰动后上传向量', 280),
  {
    key: 'uploadStatus',
    dataKey: 'uploadStatus',
    title: '上报状态',
    width: 160,
    cellRenderer: renderStatusCell
  }
];


const flowSteps = computed(() => FLOW_STEPS.map((step, index) => {
  const stepNo = index + 1;
  const activeStep = STAGE_STEP[activeStage.value] || 0;
  const state = activeStep === stepNo ? 'active' : completedStep.value >= stepNo ? 'done' : 'pending';
  const statusText = state === 'done' ? '已完成' : state === 'active' ? '当前步骤' : '未执行';
  return { ...step, state, statusText };
}));

function createBatchId() {
  return `${selectedTask.value.id}-aoue-clients-${Date.now()}`;
}

function clearAnimationTimer() {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
}

function clearHighlightTimer() {
  if (highlightTimer) {
    clearTimeout(highlightTimer);
    highlightTimer = null;
  }
}

function createClientRow(index) {
  const sample = sampleAoueRawClientValue();
  return {
    userNo: `客户端${String(index + 1).padStart(3, '0')}`,
    rawSteps: sample.rawSteps,
    rawLabel: sample.rawLabel,
    rawValue: sample.rawValue,
    sensitiveValue: sample.sensitiveValue,
    rawDisplay: `${sample.rawSteps} 步（${sample.rawLabel}）`,
    encodedVector: null,
    encodedVectorDisplay: '待编码',
    aoueTransition: '待扰动',
    uploadedVector: null,
    uploadedVectorDisplay: '待上传',
    uploadStatus: '未上报'
  };
}

function scrollTableToIndex() {}

function markRows(startIndex, endIndex) {
  const marked = simulationRows.value
    .slice(startIndex, endIndex)
    .map(row => row.userNo);
  highlightedRows.value = marked;
  currentBatchText.value = `当前批次：客户端 ${String(startIndex + 1).padStart(3, '0')}—${String(endIndex).padStart(3, '0')}，本批处理 ${endIndex - startIndex} 条`;

  clearHighlightTimer();
  highlightTimer = setTimeout(() => {
    highlightedRows.value = [];
    highlightTimer = null;
  }, HIGHLIGHT_MS);
}

function getRowClassName({ rowData }) {
  return highlightedRows.value.includes(rowData.userNo) ? 'is-row-active' : '';
}

function replaceRows(startIndex, endIndex, updater) {
  const rows = simulationRows.value.slice();
  for (let index = startIndex; index < endIndex; index += 1) {
    rows[index] = updater(rows[index], index);
  }
  simulationRows.value = rows;
}

function runStage(stage, processor, onComplete) {
  clearAnimationTimer();
  activeStage.value = stage;
  stageProgress.value = 0;
  progressNotice.value = `${STAGE_TEXT[stage].running}：0 / ${AOUE_DEMO_SAMPLE_COUNT}`;

  const tick = () => {
    const startIndex = stageProgress.value;
    const endIndex = Math.min(startIndex + ANIMATION_BATCH_SIZE, AOUE_DEMO_SAMPLE_COUNT);
    if (startIndex >= endIndex) {
      finishStage(onComplete);
      return;
    }

    processor(startIndex, endIndex);
    stageProgress.value = endIndex;
    progressNotice.value = `${STAGE_TEXT[stage].running}：${stageProgress.value} / ${AOUE_DEMO_SAMPLE_COUNT}`;
    markRows(startIndex, endIndex);

    if (stageProgress.value >= AOUE_DEMO_SAMPLE_COUNT) {
      finishStage(onComplete);
    }
  };

  tick();
  if (stageProgress.value < AOUE_DEMO_SAMPLE_COUNT) {
    animationTimer = setInterval(tick, ANIMATION_INTERVAL_MS);
  }
}

function finishStage(onComplete) {
  clearAnimationTimer();
  const stage = activeStage.value;
  completedStep.value = Math.max(completedStep.value, STAGE_STEP[stage] || 0);
  activeStage.value = '';
  stageProgress.value = AOUE_DEMO_SAMPLE_COUNT;
  progressNotice.value = stage === STAGES.UPLOAD
    ? '已完成 2000 个客户端的 AOUE 本地扰动上报'
    : STAGE_TEXT[stage]?.done || '';
  onComplete?.();
}

function completeRemainingStage() {
  if (!activeStage.value) return;
  const stage = activeStage.value;
  const startIndex = stageProgress.value;
  if (startIndex >= AOUE_DEMO_SAMPLE_COUNT) {
    return;
  }

  if (stage === STAGES.START) {
    appendClientRows(startIndex, AOUE_DEMO_SAMPLE_COUNT);
  } else if (stage === STAGES.ENCODE) {
    encodeRows(startIndex, AOUE_DEMO_SAMPLE_COUNT);
  } else if (stage === STAGES.PERTURB) {
    perturbRows(startIndex, AOUE_DEMO_SAMPLE_COUNT);
  } else if (stage === STAGES.UPLOAD) {
    uploadRows(startIndex, AOUE_DEMO_SAMPLE_COUNT);
  }
  stageProgress.value = AOUE_DEMO_SAMPLE_COUNT;
  markRows(Math.max(AOUE_DEMO_SAMPLE_COUNT - ANIMATION_BATCH_SIZE, 0), AOUE_DEMO_SAMPLE_COUNT);
}

function finishCurrentStage() {
  if (!activeStage.value) return;
  const stage = activeStage.value;
  completeRemainingStage();
  if (stage === STAGES.UPLOAD) {
    persistSubmissionRecords();
  }
  finishStage();
}

function appendClientRows(startIndex, endIndex) {
  const nextRows = Array.from(
    { length: endIndex - startIndex },
    (_, offset) => createClientRow(startIndex + offset)
  );
  simulationRows.value = [...simulationRows.value, ...nextRows];
}

function encodeRows(startIndex, endIndex) {
  replaceRows(startIndex, endIndex, row => {
    const encodedVector = encodeAoueValue(row.rawValue, aoueParams.value.domainSize);
    return {
      ...row,
      encodedVector,
      encodedVectorDisplay: `${formatAoueCode(row.rawValue)} ${formatAoueVector(encodedVector)}`
    };
  });
}

function perturbRows(startIndex, endIndex) {
  replaceRows(startIndex, endIndex, row => {
    const result = perturbAoueValue(row.rawValue, aoueParams.value);
    return {
      ...row,
      encodedVector: result.originalVector,
      encodedVectorDisplay: `${formatAoueCode(row.rawValue)} ${formatAoueVector(result.originalVector)}`,
      uploadedVector: result.reportValue,
      uploadedVectorDisplay: formatAoueVector(result.reportValue, '待上传'),
      aoueTransition: formatAoueTransitions(result.bitSteps),
      bitSteps: result.bitSteps,
      uploadStatus: '未上报'
    };
  });
}

function uploadRows(startIndex, endIndex) {
  replaceRows(startIndex, endIndex, row => ({
    ...row,
    uploadStatus: '已上报'
  }));
}

function resetDemo() {
  clearAnimationTimer();
  clearHighlightTimer();
  simulationRows.value = [];
  batchId.value = '';
  completedStep.value = 0;
  activeStage.value = '';
  stageProgress.value = 0;
  progressNotice.value = '';
  currentBatchText.value = '';
  highlightedRows.value = [];
  scrollTableToIndex(0);
}

function startClientStartup() {
  if (!selectedTask.value) {
    ElMessage.warning('请先选择 AOUE 任务');
    return;
  }

  resetDemo();
  batchId.value = createBatchId();
  appendClientRows(0, AOUE_DEMO_SAMPLE_COUNT);
  completedStep.value = STAGE_STEP[STAGES.START];
  stageProgress.value = AOUE_DEMO_SAMPLE_COUNT;
  progressNotice.value = STAGE_TEXT[STAGES.START].done;
  currentBatchText.value = `已一次性接入客户端 001—${String(AOUE_DEMO_SAMPLE_COUNT).padStart(3, '0')}`;
  markRows(Math.max(AOUE_DEMO_SAMPLE_COUNT - ANIMATION_BATCH_SIZE, 0), AOUE_DEMO_SAMPLE_COUNT);
}

function startLocalEncoding() {
  if (!canEncode.value) return;
  runStage(STAGES.ENCODE, encodeRows);
}

function startAouePerturbation() {
  if (!canPerturb.value) return;
  runStage(STAGES.PERTURB, perturbRows);
}

function buildSubmissionRecords() {
  const uploadTime = new Date().toISOString();
  return simulationRows.value.map(row => ({
    userId: row.userNo,
    user_id: row.userNo,
    taskId: selectedTask.value.id,
    task_id: selectedTask.value.id,
    batch_id: batchId.value,
    protocol: 'AOUE',
    uploadTime,
    upload_time: uploadTime,
    report_value: row.uploadedVector,
    original_steps: row.rawSteps,
    original_bucket: row.rawLabel,
    original_bucket_code: row.rawValue,
    rawData: {
      scenario: 'aoue',
      dailySteps: row.rawSteps,
      stepsBucket: row.rawLabel,
      stepsBucketCode: row.rawValue,
      sensitiveAttribute: row.sensitiveValue
    },
    reportData: {
      protocol: 'AOUE',
      originalVector: row.encodedVector,
      perturbedValue: row.uploadedVector,
      reportValue: row.uploadedVector,
      perturbedLabel: row.uploadedVectorDisplay,
      rawBucket: row.rawLabel,
      rawBucketCode: row.rawValue,
      bitSteps: row.bitSteps,
      params: {
        p: aoueParams.value.p.toFixed(4),
        q: aoueParams.value.q.toFixed(4)
      }
    }
  }));
}

function persistSubmissionRecords() {
  appendAoueSubmissionRecords(buildSubmissionRecords());
}

function startUpload() {
  if (!canUpload.value) return;
  runStage(STAGES.UPLOAD, uploadRows, persistSubmissionRecords);
}

function completeAllSteps() {
  if (!selectedTask.value) {
    ElMessage.warning('请先选择 AOUE 任务');
    return;
  }

  resetDemo();
  batchId.value = createBatchId();
  appendClientRows(0, AOUE_DEMO_SAMPLE_COUNT);
  encodeRows(0, AOUE_DEMO_SAMPLE_COUNT);
  perturbRows(0, AOUE_DEMO_SAMPLE_COUNT);
  uploadRows(0, AOUE_DEMO_SAMPLE_COUNT);
  completedStep.value = 4;
  activeStage.value = '';
  stageProgress.value = AOUE_DEMO_SAMPLE_COUNT;
  progressNotice.value = '已一键完成 2000 个客户端的 AOUE 本地扰动上报。';
  currentBatchText.value = `一键完成：客户端 001—${String(AOUE_DEMO_SAMPLE_COUNT).padStart(3, '0')}`;
  markRows(Math.max(AOUE_DEMO_SAMPLE_COUNT - ANIMATION_BATCH_SIZE, 0), AOUE_DEMO_SAMPLE_COUNT);
  persistSubmissionRecords();
}

function goToUserDevice() {
  router.push('/user/device');
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

watch(selectedTaskId, () => {
  resetDemo();
});

onMounted(() => {
  taskStore.loadFromLocalStorage();
  attributeConfigStore.loadFromLocalStorage();
  if (aoueTasks.value.length > 0) {
    selectedTaskId.value = aoueTasks.value[0].id;
  }
});

onUnmounted(() => {
  clearAnimationTimer();
  clearHighlightTimer();
});
</script>

<style scoped>
.client-demo-container {
  min-height: 100vh;
  background: #f4f7fb;
}

.header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.header-left h1 {
  margin: 0;
  color: #2563eb;
  font-size: 20px;
}

.header-left span {
  color: #64748b;
  font-size: 13px;
}

.user-dropdown {
  cursor: pointer;
  color: #4b5563;
}

.content {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
}

.page-desc {
  max-width: 900px;
  color: #4b5563;
  line-height: 1.7;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.task-select-label {
  color: #64748b;
  font-size: 13px;
}

.task-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.summary-item {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  padding: 12px;
}

.summary-item span {
  display: block;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 6px;
}

.summary-item strong {
  display: block;
  color: #111827;
  overflow-wrap: anywhere;
}

.flow-section {
  margin: 18px 0 16px;
  border: 1px solid #dbeafe;
  background: linear-gradient(180deg, #f8fbff 0%, #f1f7ff 100%);
  border-radius: 10px;
  padding: 16px;
}

.flow-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e3a8a;
  margin-bottom: 12px;
}

.flow-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.flow-card {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  min-height: 108px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.flow-card:not(:last-child)::after {
  content: '→';
  position: absolute;
  right: -11px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-weight: 800;
  z-index: 1;
}

.flow-card.is-active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.14);
}

.flow-card.is-done {
  border-color: #86efac;
  background: #f0fdf4;
}

.flow-card.is-active:not(:last-child)::after,
.flow-card.is-done:not(:last-child)::after {
  color: #2563eb;
}

.flow-index {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #cbd5e1;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
}

.flow-card.is-active .flow-index {
  background: #2563eb;
}

.flow-card.is-done .flow-index {
  background: #16a34a;
}

.flow-copy {
  min-width: 0;
}

.flow-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.flow-copy strong {
  color: #111827;
}

.flow-card-head em {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
}

.flow-card.is-active .flow-card-head em {
  color: #2563eb;
  font-weight: 700;
}

.flow-card.is-done .flow-card-head em {
  color: #16a34a;
  font-weight: 700;
}

.flow-copy span {
  display: block;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 14px 0 18px;
}

.upload-notice {
  margin-bottom: 10px;
}

.batch-progress-tip {
  margin-bottom: 16px;
  padding: 9px 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
  color: #1e3a8a;
  font-size: 13px;
  line-height: 1.5;
}

.detail-section {
  margin-top: 20px;
}

.detail-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-title h3 {
  margin: 0;
  font-size: 18px;
}

.detail-title span {
  color: #64748b;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.client-table-v2-shell {
  width: 100%;
  height: 560px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.client-table-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  background: #fff;
}

.client-table-v2-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.client-table-v2 .el-table-v2__row.is-row-active) {
  background: #fff7ed !important;
  transition: background 0.6s ease;
}

:deep(.el-table__row.is-row-active > td) {
  background: #fff7ed !important;
  transition: background 0.6s ease;
}

.page-actions {
  margin-top: 16px;
}

@media (max-width: 1100px) {
  .page-header {
    flex-direction: column;
  }

  .flow-steps,
  .task-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flow-card::after {
    display: none;
  }
}

@media (max-width: 700px) {
  .flow-steps,
  .task-summary {
    grid-template-columns: 1fr;
  }
}
</style>
