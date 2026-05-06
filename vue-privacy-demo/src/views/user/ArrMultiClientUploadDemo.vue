<template>
  <div class="client-demo-container">
    <header class="header">
      <div class="header-left">
        <h1>用户采集端</h1>
        <span>客户端本地扰动演示</span>
      </div>
      <div class="header-right">
        <el-dropdown>
          <span class="user-dropdown">
            演示模式
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
              <div class="page-title">演示：ARR 多客户端上报</div>
              <div class="page-desc">
                本页面为答辩演示用的多客户端模拟器。由于演示环境中无法同时打开多个真实用户端页面，因此通过分步骤操作模拟多个虚拟客户端分别完成一次本地采集、编码、扰动与上报。
                表格中的本地采集值和本地编码值仅用于展示虚拟客户端的本地扰动过程，不代表服务器或管理员能够获得用户原始数据；真实系统中服务器只接收扰动后上传值。
                本页面采用分步骤演示方式，依次展示虚拟客户端从本地采集、本地编码、随机扰动到扰动值上报的完整链路。
              </div>
            </div>
            <div class="header-actions">
              <span class="task-select-label">ARR 任务 ID</span>
              <el-select v-model="selectedTaskId" placeholder="选择 ARR 任务" style="width: 220px">
                <el-option
                  v-for="task in arrTasks"
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
            <strong>是否触发睡眠异常提醒</strong>
          </div>
          <div class="summary-item">
            <span>协议</span>
            <strong>ARR</strong>
          </div>
          <div class="summary-item">
            <span>扰动概率</span>
            <strong>p={{ arrParams.p.toFixed(4) }}，q={{ arrParams.q.toFixed(4) }}</strong>
          </div>
          <div class="summary-item">
            <span>样本规模</span>
            <strong>500 个客户端各上报一次</strong>
          </div>
        </div>
        <el-empty v-else description="暂无 ARR 任务，请先在管理端属性配置页下发 ARR 场景" />

        <section class="flow-section">
          <div class="flow-title">ARR 客户端本地处理链路</div>
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
            启动 500 个虚拟客户端
          </el-button>
          <el-button :disabled="!canEncode" @click="startLocalEncoding">
            客户端本地编码
          </el-button>
          <el-button :disabled="!canPerturb" @click="startArrPerturbation">
            客户端执行 ARR 扰动
          </el-button>
          <el-button type="success" :disabled="!canUpload" @click="startUpload">
            上传扰动后值
          </el-button>
          <el-button v-if="isAnimating" type="warning" plain @click="finishCurrentStage">
            立即完成当前步骤
          </el-button>
          <el-button @click="resetDemo">重置演示</el-button>
        </section>

        <el-alert
          v-if="progressNotice"
          class="upload-notice"
          :type="isAnimating ? 'info' : 'success'"
          :closable="false"
          :title="progressNotice"
          show-icon
        />

        <section class="detail-section">
          <div class="detail-title">
            <h3>客户端上报明细</h3>
            <span>共 {{ simulationRows.length }} 条，批次 ID：{{ batchId || '待生成' }}</span>
          </div>

          <el-table
            ref="tableRef"
            :data="simulationRows"
            :row-class-name="getRowClassName"
            height="560"
            border
            style="width: 100%"
            empty-text="请先启动 500 个虚拟客户端"
          >
            <el-table-column prop="userNo" label="客户端编号" width="150" />
            <el-table-column prop="rawLabel" label="客户端本地采集值" min-width="190" />
            <el-table-column prop="localCodeValue" label="本地编码值" min-width="180" />
            <el-table-column prop="arrTransition" label="ARR 扰动结果" min-width="150" />
            <el-table-column prop="uploadedValue" label="扰动后上传值" min-width="180" />
            <el-table-column prop="uploadStatus" label="上报状态" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.uploadStatus === '已上报' ? 'success' : 'info'">
                  {{ scope.row.uploadStatus }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </section>

        <div class="page-actions">
          <el-button @click="goToUserDevice">返回单用户上报演示</el-button>
        </div>
      </el-card>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { useUserStore } from '../../store/user';
import { useTaskStore } from '../../store/task';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import { ARR } from '../../utils/ldpAlgorithms';
import {
  ARR_DEMO_SAMPLE_COUNT,
  appendArrSubmissionRecords,
  getArrLabel,
  getArrParams,
  getArrTasks,
  sampleArrRawValue
} from '../../utils/arrDemoUtils';

const FLOW_STEPS = [
  {
    title: '启动虚拟客户端',
    description: '模拟 500 个客户端各自完成一次本地采集'
  },
  {
    title: '客户端本地编码',
    description: '触发提醒编码为 1，未触发提醒编码为 0'
  },
  {
    title: 'ARR 随机扰动',
    description: '客户端按 p、q 概率对编码值进行随机响应'
  },
  {
    title: '上传扰动后值',
    description: '服务器仅接收扰动后的上报值'
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
    running: '正在接入虚拟客户端',
    done: '已启动 500 个虚拟客户端，可继续执行本地编码。'
  },
  [STAGES.ENCODE]: {
    running: '正在执行本地编码',
    done: '已完成 500 个客户端本地编码。'
  },
  [STAGES.PERTURB]: {
    running: '正在执行 ARR 随机扰动',
    done: '已完成 500 个客户端 ARR 扰动。'
  },
  [STAGES.UPLOAD]: {
    running: '正在上传扰动后值',
    done: '已模拟 500 个虚拟客户端分别完成一次 ARR 本地扰动上报。'
  }
};

const ANIMATION_INTERVAL_MS = 150;
const ANIMATION_BATCH_SIZE = 5;
const ROW_HEIGHT = 48;
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
const highlightedRows = ref([]);
const tableRef = ref(null);
let animationTimer = null;
let highlightTimer = null;

const arrTasks = computed(() => getArrTasks(taskStore.taskList));
const selectedTask = computed(() => arrTasks.value.find(task => task.id === selectedTaskId.value) || null);
const arrParams = computed(() => getArrParams(selectedTask.value, attributeConfigStore));
const isAnimating = computed(() => Boolean(activeStage.value));
const canEncode = computed(() => !isAnimating.value && completedStep.value === 1);
const canPerturb = computed(() => !isAnimating.value && completedStep.value === 2);
const canUpload = computed(() => !isAnimating.value && completedStep.value === 3);
const flowSteps = computed(() => FLOW_STEPS.map((step, index) => {
  const stepNo = index + 1;
  const activeStep = STAGE_STEP[activeStage.value] || 0;
  const state = activeStep === stepNo ? 'active' : completedStep.value >= stepNo ? 'done' : 'pending';
  const statusText = state === 'done' ? '已完成' : state === 'active' ? '当前步骤' : '未执行';
  return { ...step, state, statusText };
}));

function createBatchId() {
  return `${selectedTask.value.id}-arr-clients-${Date.now()}`;
}

function buildLocalCodeText(value) {
  return `${value}（${getArrLabel(value)}）`;
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
  const rawValue = sampleArrRawValue();
  return {
    userNo: `客户端${String(index + 1).padStart(3, '0')}`,
    rawValue,
    rawLabel: getArrLabel(rawValue),
    localCodeValue: '待编码',
    arrTransition: '待扰动',
    uploadedValue: '待上传',
    uploadStatus: '未上报'
  };
}

function scrollTableToIndex(index) {
  nextTick(() => {
    const wrapper = tableRef.value?.$el?.querySelector?.('.el-scrollbar__wrap');
    if (wrapper) {
      const middleOffset = wrapper.clientHeight * 0.62;
      const top = Math.max(0, index * ROW_HEIGHT - middleOffset);
      wrapper.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    if (typeof tableRef.value?.setScrollTop === 'function') {
      const top = Math.max(0, index * ROW_HEIGHT - ROW_HEIGHT * 7);
      tableRef.value.setScrollTop(top);
    }
  });
}

function markRows(startIndex, endIndex) {
  const marked = simulationRows.value
    .slice(startIndex, endIndex)
    .map(row => row.userNo);
  highlightedRows.value = marked;
  scrollTableToIndex(Math.max(endIndex - 1, 0));

  clearHighlightTimer();
  highlightTimer = setTimeout(() => {
    highlightedRows.value = [];
    highlightTimer = null;
  }, HIGHLIGHT_MS);
}

function getRowClassName({ row }) {
  return highlightedRows.value.includes(row.userNo) ? 'is-row-active' : '';
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
  progressNotice.value = `${STAGE_TEXT[stage].running}：0 / ${ARR_DEMO_SAMPLE_COUNT}`;

  const tick = () => {
    const startIndex = stageProgress.value;
    const endIndex = Math.min(startIndex + ANIMATION_BATCH_SIZE, ARR_DEMO_SAMPLE_COUNT);
    if (startIndex >= endIndex) {
      finishStage(onComplete);
      return;
    }

    processor(startIndex, endIndex);
    stageProgress.value = endIndex;
    progressNotice.value = `${STAGE_TEXT[stage].running}：${stageProgress.value} / ${ARR_DEMO_SAMPLE_COUNT}`;
    markRows(startIndex, endIndex);

    if (stageProgress.value >= ARR_DEMO_SAMPLE_COUNT) {
      finishStage(onComplete);
    }
  };

  tick();
  if (stageProgress.value < ARR_DEMO_SAMPLE_COUNT) {
    animationTimer = setInterval(tick, ANIMATION_INTERVAL_MS);
  }
}

function finishStage(onComplete) {
  clearAnimationTimer();
  const stage = activeStage.value;
  completedStep.value = Math.max(completedStep.value, STAGE_STEP[stage] || 0);
  activeStage.value = '';
  stageProgress.value = ARR_DEMO_SAMPLE_COUNT;
  progressNotice.value = STAGE_TEXT[stage]?.done || '';
  onComplete?.();
}

function completeRemainingStage() {
  if (!activeStage.value) return;
  const stage = activeStage.value;
  const startIndex = stageProgress.value;
  if (startIndex >= ARR_DEMO_SAMPLE_COUNT) {
    return;
  }

  if (stage === STAGES.START) {
    appendClientRows(startIndex, ARR_DEMO_SAMPLE_COUNT);
  } else if (stage === STAGES.ENCODE) {
    encodeRows(startIndex, ARR_DEMO_SAMPLE_COUNT);
  } else if (stage === STAGES.PERTURB) {
    perturbRows(startIndex, ARR_DEMO_SAMPLE_COUNT);
  } else if (stage === STAGES.UPLOAD) {
    uploadRows(startIndex, ARR_DEMO_SAMPLE_COUNT);
  }
  stageProgress.value = ARR_DEMO_SAMPLE_COUNT;
  markRows(Math.max(ARR_DEMO_SAMPLE_COUNT - ANIMATION_BATCH_SIZE, 0), ARR_DEMO_SAMPLE_COUNT);
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
  replaceRows(startIndex, endIndex, row => ({
    ...row,
    localCodeValue: buildLocalCodeText(row.rawValue)
  }));
}

function perturbRows(startIndex, endIndex) {
  replaceRows(startIndex, endIndex, row => {
    const reportValue = ARR(row.rawValue, arrParams.value.epsilon, 2, arrParams.value.p, arrParams.value.q);
    return {
      ...row,
      reportValue,
      arrTransition: `${row.rawValue} → ${reportValue}`,
      uploadedValue: buildLocalCodeText(reportValue),
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
  highlightedRows.value = [];
  scrollTableToIndex(0);
}

function startClientStartup() {
  if (!selectedTask.value) {
    ElMessage.warning('请先选择 ARR 任务');
    return;
  }

  resetDemo();
  batchId.value = createBatchId();
  runStage(STAGES.START, appendClientRows);
}

function startLocalEncoding() {
  if (!canEncode.value) return;
  runStage(STAGES.ENCODE, encodeRows);
}

function startArrPerturbation() {
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
    protocol: 'ARR',
    uploadTime,
    upload_time: uploadTime,
    report_value: row.reportValue,
    rawData: {
      scenario: 'arr',
      fallAlarm: row.rawValue,
      rawLabel: getArrLabel(row.rawValue)
    },
    reportData: {
      protocol: 'ARR',
      perturbedValue: row.reportValue,
      reportValue: row.reportValue,
      perturbedLabel: getArrLabel(row.reportValue),
      params: {
        p: arrParams.value.p.toFixed(4),
        q: arrParams.value.q.toFixed(4)
      }
    }
  }));
}

function persistSubmissionRecords() {
  appendArrSubmissionRecords(buildSubmissionRecords());
}

function startUpload() {
  if (!canUpload.value) return;
  runStage(STAGES.UPLOAD, uploadRows, persistSubmissionRecords);
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
  if (arrTasks.value.length > 0) {
    selectedTaskId.value = arrTasks.value[0].id;
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
  margin-bottom: 16px;
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
