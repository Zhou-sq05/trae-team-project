<template>
  <div class="user-device-container">
    <div class="header">
      <div class="header-left">
        <h1>用户采集端</h1>
      </div>
      <div class="header-right">
        <el-dropdown>
          <span class="user-dropdown">
            {{ user?.username || '用户' }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="content">
      <div class="left-section">
        <div class="task-panel">
          <div class="task-user">{{ user?.username || '用户 #001' }}</div>
          <div class="task-select-row">
            <span class="task-select-label">当前绑定任务 ID：</span>
            <el-select v-model="currentTaskId" placeholder="选择任务 ID" style="width: 240px">
              <el-option
                v-for="task in taskList"
                :key="task.id"
                :label="task.id"
                :value="task.id"
              />
            </el-select>
          </div>
          <div v-if="currentTaskDetail" class="task-meta-grid">
            <div class="meta-card">
              <div class="meta-label">当前任务</div>
              <div class="meta-value">{{ currentTaskDetail.title }}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">协议</div>
              <div class="meta-value">{{ currentTaskDetail.protocol }}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">防护模式</div>
              <div class="meta-value">{{ currentTaskDetail.mode }}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">任务 ID</div>
              <div class="meta-value">{{ currentTaskDetail.taskId }}</div>
            </div>
          </div>
        </div>

        <div class="device-info">
          <div class="info-item">
            <span>设备：</span>
            <span>健康手环</span>
          </div>
          <div class="info-item">
            <span>状态：</span>
            <div class="status-display">
              <div class="status-indicator" :class="statusColor"></div>
              <span>{{ statusText }}</span>
            </div>
          </div>
          <div class="info-item">
            <span>采集模式：</span>
            <span>按当前任务动态采集</span>
          </div>
        </div>

        <div class="dynamic-form-panel">
          <h3>采集属性</h3>
          <div v-if="!currentTaskDetail" class="empty-box">
            <p>请先选择任务，系统会根据当前任务动态展示采集属性。</p>
          </div>

          <div v-else class="dynamic-form">
            <div v-if="currentTaskDetail.scenario === 'arr'" class="form-item">
              <span>是否触发异常跌倒告警</span>
              <el-radio-group v-model="dynamicForm.fallAlarm" @change="markFormTouched">
                <el-radio :label="0" @click="handleArrOptionClick(0)">否</el-radio>
                <el-radio :label="1" @click="handleArrOptionClick(1)">是</el-radio>
              </el-radio-group>
            </div>

            <div v-else-if="currentTaskDetail.scenario === 'agrr'" class="form-item">
              <span>日均站立时长（分钟）</span>
              <el-input v-model.number="dynamicForm.standMinutes" placeholder="请输入原始分钟数" @input="markFormTouched" />
              <div class="derived-hint">自动映射分档：{{ derivedStandBucket || '--' }}</div>
            </div>

            <div v-else-if="currentTaskDetail.scenario === 'aoue'" class="form-item">
              <span>每日步数</span>
              <el-input v-model.number="dynamicForm.dailySteps" placeholder="请输入每日步数" @input="markFormTouched" />
              <div class="derived-hint">自动映射分桶：{{ derivedStepsBucket || '--' }}</div>
            </div>

            <div v-else-if="currentTaskDetail.scenario === 'tsp'" class="tsp-form">
              <div class="form-item">
                <span>睡眠记录是否缺失</span>
                <el-radio-group v-model="dynamicForm.sleepMissing" @change="handleSleepMissingChange">
                  <el-radio :label="0" @click="markFormTouched">否</el-radio>
                  <el-radio :label="1" @click="markFormTouched">是</el-radio>
                </el-radio-group>
              </div>
              <div class="form-item">
                <span>睡眠质量评分（1-5）</span>
                <el-input-number
                  v-model="dynamicForm.sleepScore"
                  :min="1"
                  :max="5"
                  :disabled="dynamicForm.sleepMissing === 1"
                  @change="markFormTouched"
                />
                <div class="derived-hint">
                  {{ dynamicForm.sleepMissing === 1 ? '当前为缺失状态，评分输入已禁用' : '请填写 1~5 分的睡眠质量评分' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="control-buttons">
          <el-button type="primary" @click="refreshData" :disabled="!currentTaskDetail">加载示例数据</el-button>
          <el-button @click="goToDashboard">返回首页</el-button>
        </div>
      </div>

      <div class="right-section">
        <h3>演示调试区域</h3>
        <template v-if="currentTaskDetail?.scenario === 'arr'">
          <div class="summary-block">
            <h4>任务摘要</h4>
            <div class="demo-top-card">
              <div class="demo-top-item">
                <span class="demo-top-label">任务 ID：  </span>
                <span class="demo-top-value">{{ currentTaskDetail?.taskId || '--' }}</span>
              </div>
              <div class="demo-top-item">
                <span class="demo-top-label">协议：  </span>
                <span class="demo-top-value">{{ currentTaskDetail?.protocol || '--' }}</span>
              </div>
              <div class="demo-top-item">
                <span class="demo-top-label">隐私预算 ε：  </span>
                <span class="demo-top-value">{{ displayEpsilon }}</span>
              </div>
            </div>
          </div>

          <div class="summary-block">
            <h4>原始输入</h4>
            <div class="card-grid">
              <div v-for="item in arrRawCards" :key="item.label" class="summary-card">
                <div class="card-label">{{ item.label }}</div>
                <div class="card-value">{{ item.value }}</div>
              </div>
            </div>
          </div>

          <div class="summary-block">
            <div class="summary-heading">
              <h4>扰动参数</h4>
              <span class="section-tip">从管理端当前任务的已保存配置中读取</span>
            </div>
            <div class="card-grid">
              <div v-for="item in arrParameterCards" :key="item.label" class="summary-card">
                <div class="card-label">{{ item.label }}</div>
                <div class="card-value">{{ item.value }}</div>
              </div>
            </div>
            <div v-if="!arrParametersReady" class="preview-tip">
              当前任务尚未在管理端完成 ARR 参数保存，暂时无法执行本地扰动模拟。
            </div>
          </div>

          <div class="summary-block">
            <div class="summary-heading">
              <h4>扰动结果</h4>
              <span class="section-tip">同一原始值下可重复随机模拟</span>
            </div>
            <div class="card-grid">
              <div v-for="item in arrResultCards" :key="item.label" class="summary-card preview-card">
                <div class="card-label">{{ item.label }}</div>
                <div class="card-value">{{ item.value }}</div>
              </div>
            </div>
            <div class="preview-tip">
              ARR 会按当前原始编码值与参数 p、q 进行一次本地随机扰动，再生成本次上报值。
            </div>
          </div>

          <div class="summary-block">
            <div class="summary-heading">
              <h4>操作区</h4>
              <span class="section-tip">先模拟，再提交上报</span>
            </div>
            <div class="action-row">
              <el-button type="primary" @click="simulateArrPerturbation" :disabled="!canSimulateArr">
                {{ arrSimulationResult ? '重新模拟一次扰动' : '模拟一次扰动' }}
              </el-button>
              <el-button type="success" @click="submitData" :loading="submitting" :disabled="!canSubmitCurrentTask">
                提交上报
              </el-button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="demo-top-card">
            <div class="demo-top-item">
              <span class="demo-top-label">任务 ID</span>
              <span class="demo-top-value">{{ currentTaskDetail?.taskId || '--' }}</span>
            </div>
            <div class="demo-top-item">
              <span class="demo-top-label">协议</span>
              <span class="demo-top-value">{{ currentTaskDetail?.protocol || '--' }}</span>
            </div>
            <div class="demo-top-item">
              <span class="demo-top-label">隐私预算 ε</span>
              <span class="demo-top-value">{{ displayEpsilon }}</span>
            </div>
          </div>

          <div class="summary-block">
            <h4>原始值</h4>
            <div v-if="!currentTaskDetail" class="empty-box">
              <p>当前尚未选择任务。</p>
            </div>
            <div v-else class="card-grid">
              <div v-for="item in rawSummaryCards" :key="item.label" class="summary-card">
                <div class="card-label">{{ item.label }}</div>
                <div class="card-value">{{ item.value }}</div>
              </div>
            </div>
          </div>

          <div class="summary-block">
            <h4>处理预览</h4>
            <div v-if="!currentTaskDetail" class="empty-box">
              <p>选择任务后，这里会同步展示当前输入对应的原始处理链路。</p>
            </div>
            <div v-else class="card-grid">
              <div v-for="item in processPreviewCards" :key="item.label" class="summary-card preview-card">
                <div class="card-label">{{ item.label }}</div>
                <div class="card-value">{{ item.value }}</div>
              </div>
            </div>
            <div v-if="currentTaskDetail" class="preview-tip">
              当前优先完成 ARR 场景的本地扰动演示，其余协议的完整上报链路将在下一步继续接入。
            </div>
            <div class="action-row" v-if="currentTaskDetail">
              <el-button type="success" @click="submitData" :loading="submitting" :disabled="!canSubmitCurrentTask">
                提交上报
              </el-button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowDown } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useUserStore } from '../../store/user';
import { useTaskStore } from '../../store/task';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import { ARR } from '../../utils/ldpAlgorithms';

const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const user = computed(() => userStore.user);
const currentTaskId = ref('');
const submitting = ref(false);
const systemStatus = ref(0);
const formTouched = ref(false);
const arrSimulationResult = ref(null);

const dynamicForm = reactive({
  fallAlarm: 0,
  standMinutes: null,
  dailySteps: null,
  sleepMissing: 0,
  sleepScore: 3
});

const taskList = computed(() => taskStore.taskList.map(task => ({ id: task.id })));
const currentTask = computed(() => taskStore.taskList.find(task => task.id === currentTaskId.value) || null);

const currentTaskAttribute = computed(() => {
  const task = currentTask.value;
  if (!task?.attributes?.length) return null;

  const supportedNames = ['是否触发异常跌倒告警', '日均站立时长分档', '每日步数分桶', '睡眠质量评分'];
  return (
    task.attributes.find(attribute => supportedNames.includes(attribute.name) && attribute.isProtected) ||
    task.attributes.find(attribute => supportedNames.includes(attribute.name) && attribute.status === '已配置') ||
    task.attributes.find(attribute => supportedNames.includes(attribute.name)) ||
    null
  );
});

const currentTaskDetail = computed(() => {
  const task = currentTask.value;
  const attribute = currentTaskAttribute.value;
  if (!task || !attribute) return null;

  const map = {
    '是否触发异常跌倒告警': {
      scenario: 'arr',
      title: '是否触发异常跌倒告警',
      protocol: 'ARR',
      mode: '间接隐私风险'
    },
    '日均站立时长分档': {
      scenario: 'agrr',
      title: '日均站立时长分档',
      protocol: 'AGRR',
      mode: '间接隐私风险'
    },
    '每日步数分桶': {
      scenario: 'aoue',
      title: '每日步数分桶',
      protocol: 'AOUE',
      mode: '间接隐私风险'
    },
    '睡眠质量评分': {
      scenario: 'tsp',
      title: '睡眠质量评分',
      protocol: 'TSP',
      mode: '混合隐私风险'
    }
  };

  return {
    ...map[attribute.name],
    taskId: task.id,
    epsilon: task.privacyBudget ?? '--'
  };
});

const currentAttributeConfig = computed(() => {
  const attribute = currentTaskAttribute.value;
  if (!attribute?.id) return null;
  return attributeConfigStore.getConfigById(attribute.id);
});

const arrConfigParams = computed(() => {
  if (currentTaskDetail.value?.scenario !== 'arr') return null;
  const calibratedParams = currentAttributeConfig.value?.calibratedParams;
  if (!calibratedParams) return null;

  const p = Number(calibratedParams.p);
  const q = Number(calibratedParams.q);
  if (!Number.isFinite(p) || !Number.isFinite(q)) return null;

  return {
    p,
    q,
    epsilon: currentAttributeConfig.value?.epsilon ?? currentTaskDetail.value?.epsilon ?? '--'
  };
});

const arrParametersReady = computed(() => Boolean(arrConfigParams.value));
const canSimulateArr = computed(() => currentTaskDetail.value?.scenario === 'arr' && formTouched.value && arrParametersReady.value);
const displayEpsilon = computed(() => {
  if (currentTaskDetail.value?.scenario === 'arr' && arrConfigParams.value) {
    return arrConfigParams.value.epsilon;
  }
  return currentTaskDetail.value?.epsilon ?? '--';
});
const canSubmitCurrentTask = computed(() => {
  if (!currentTaskDetail.value) return false;
  if (currentTaskDetail.value.scenario === 'arr') {
    return Boolean(arrSimulationResult.value);
  }
  return formTouched.value;
});

const statusText = computed(() => {
  if (systemStatus.value === 2) {
    return '已上报';
  }

  if (systemStatus.value === 1) {
    return '已扰动';
  }

  return '待扰动';
});

const statusColor = computed(() => {
  switch (systemStatus.value) {
    case 1:
      return 'yellow';
    case 2:
      return 'green';
    default:
      return 'red';
  }
});

const derivedStandBucket = computed(() => {
  const value = Number(dynamicForm.standMinutes);
  if (!Number.isFinite(value)) return '';
  if (value < 120) return '低站立';
  if (value < 240) return '中低站立';
  if (value < 360) return '中高站立';
  return '高站立';
});

const derivedStepsBucket = computed(() => {
  const value = Number(dynamicForm.dailySteps);
  if (!Number.isFinite(value)) return '';
  if (value < 2000) return '0-1999';
  if (value < 4000) return '2000-3999';
  if (value < 6000) return '4000-5999';
  if (value < 8000) return '6000-7999';
  if (value < 10000) return '8000-9999';
  if (value < 12000) return '10000-11999';
  if (value < 14000) return '12000-13999';
  return '14000+';
});

const rawSummaryCards = computed(() => {
  if (!currentTaskDetail.value) return [];

  switch (currentTaskDetail.value.scenario) {
    case 'arr':
      return [
        { label: '原始告警值', value: dynamicForm.fallAlarm === 1 ? '触发' : '未触发' }
      ];
    case 'agrr':
      return [
        { label: '原始分钟数', value: dynamicForm.standMinutes ?? '--' },
        { label: '映射分档', value: derivedStandBucket.value || '--' }
      ];
    case 'aoue':
      return [
        { label: '原始步数', value: dynamicForm.dailySteps ?? '--' },
        { label: '映射分桶', value: derivedStepsBucket.value || '--' }
      ];
    case 'tsp':
      return [
        { label: '缺失状态', value: dynamicForm.sleepMissing === 1 ? '缺失' : '非缺失' },
        { label: '睡眠质量评分', value: dynamicForm.sleepMissing === 1 ? '--' : dynamicForm.sleepScore ?? '--' }
      ];
    default:
      return [];
  }
});

const arrRawCards = computed(() => [
  { label: '原始告警值', value: dynamicForm.fallAlarm === 1 ? '触发' : '未触发' },
  { label: '原始编码值', value: String(dynamicForm.fallAlarm) }
]);

const arrParameterCards = computed(() => [
  { label: 'p（保留原值概率）', value: arrParametersReady.value ? arrConfigParams.value.p.toFixed(4) : '--' },
  { label: 'q（翻转为相反值概率）', value: arrParametersReady.value ? arrConfigParams.value.q.toFixed(4) : '--' }
]);

const arrResultCards = computed(() => [
  {
    label: '扰动后结果',
    value: arrSimulationResult.value ? (arrSimulationResult.value.perturbedLabel) : '--'
  },
  {
    label: '上报值',
    value: arrSimulationResult.value ? String(arrSimulationResult.value.reportValue) : '--'
  }
]);

const processPreviewCards = computed(() => {
  if (!currentTaskDetail.value) return [];

  switch (currentTaskDetail.value.scenario) {
    case 'arr':
      return [
        { label: '处理链路', value: '原始值 -> 扰动值（下一步接入）' },
        { label: '当前输入', value: dynamicForm.fallAlarm === 1 ? '触发' : '未触发' }
      ];
    case 'agrr':
      return [
        { label: '处理链路', value: '原始分钟数 -> 分档 -> 扰动值（下一步接入）' },
        { label: '当前分档', value: derivedStandBucket.value || '--' }
      ];
    case 'aoue':
      return [
        { label: '处理链路', value: '原始步数 -> 分桶 -> one-hot 编码 -> 扰动上报（下一步接入）' },
        { label: '当前分桶', value: derivedStepsBucket.value || '--' }
      ];
    case 'tsp':
      return [
        { label: '处理链路', value: '缺失状态/评分 -> 第一阶段 -> 第二阶段 -> 上报值（下一步接入）' },
        { label: '当前状态', value: dynamicForm.sleepMissing === 1 ? '仅上报缺失状态' : `评分 ${dynamicForm.sleepScore ?? '--'}` }
      ];
    default:
      return [];
  }
});

watch(currentTaskDetail, detail => {
  resetDynamicForm();
  arrSimulationResult.value = null;
  if (detail) {
    systemStatus.value = 0;
    formTouched.value = false;
  }
});

watch(
  () => ({ ...dynamicForm }),
  () => {
    if (!currentTaskDetail.value || !formTouched.value) {
      return;
    }

    if (currentTaskDetail.value.scenario === 'arr') {
      arrSimulationResult.value = null;
      systemStatus.value = 0;
      return;
    }

    systemStatus.value = 0;
  },
  { deep: true }
);

function resetDynamicForm() {
  dynamicForm.fallAlarm = 0;
  dynamicForm.standMinutes = null;
  dynamicForm.dailySteps = null;
  dynamicForm.sleepMissing = 0;
  dynamicForm.sleepScore = 3;
}

function refreshData() {
  if (!currentTaskDetail.value) return;

  switch (currentTaskDetail.value.scenario) {
    case 'arr':
      dynamicForm.fallAlarm = 1;
      break;
    case 'agrr':
      dynamicForm.standMinutes = 285;
      break;
    case 'aoue':
      dynamicForm.dailySteps = 10850;
      break;
    case 'tsp':
      dynamicForm.sleepMissing = 0;
      dynamicForm.sleepScore = 4;
      break;
  }

  formTouched.value = true;
  systemStatus.value = 0;
  if (currentTaskDetail.value.scenario === 'arr' && arrParametersReady.value) {
    simulateArrPerturbation(false);
  }
  ElMessage.success('已加载当前任务的示例输入');
}

function markFormTouched() {
  formTouched.value = true;
  if (currentTaskDetail.value?.scenario !== 'arr') {
    systemStatus.value = 0;
  }
}

function handleArrOptionClick(value) {
  dynamicForm.fallAlarm = value;
  markFormTouched();
  arrSimulationResult.value = null;
  systemStatus.value = 0;
  if (arrParametersReady.value) {
    simulateArrPerturbation(false);
  }
}

function handleSleepMissingChange(value) {
  markFormTouched();
  if (value === 1) {
    dynamicForm.sleepScore = null;
    return;
  }

  if (dynamicForm.sleepScore == null) {
    dynamicForm.sleepScore = 3;
  }
}

function simulateArrPerturbation(showMessage = true) {
  if (!canSimulateArr.value) {
    if (showMessage) {
      ElMessage.warning('请先完成填写，并确保管理端已保存当前 ARR 参数');
    }
    return;
  }

  const reportValue = ARR(dynamicForm.fallAlarm, arrConfigParams.value.epsilon, 2, arrConfigParams.value.p, arrConfigParams.value.q);
  arrSimulationResult.value = {
    reportValue,
    perturbedLabel: reportValue === 1 ? '触发' : '未触发',
    rawValue: dynamicForm.fallAlarm,
    rawLabel: dynamicForm.fallAlarm === 1 ? '触发' : '未触发'
  };
  systemStatus.value = 1;

  if (showMessage) {
    ElMessage.success('已完成一次 ARR 本地扰动模拟');
  }
}

function submitData() {
  if (!currentTaskDetail.value) {
    ElMessage.warning('请先选择任务');
    return;
  }

  if (!formTouched.value) {
    ElMessage.warning('请先完成当前任务的数据填写');
    return;
  }

  if (currentTaskDetail.value.scenario === 'arr' && !arrSimulationResult.value) {
    ElMessage.warning('请先完成一次 ARR 本地扰动模拟');
    return;
  }

  submitting.value = true;

  setTimeout(() => {
    submitting.value = false;
    systemStatus.value = 2;

    try {
      const storedData = JSON.parse(localStorage.getItem('submittedData') || '[]');
      storedData.push({
        userId: user.value?.username || '用户001',
        taskId: currentTaskDetail.value.taskId,
        uploadTime: new Date().toISOString(),
        rawData: {
          scenario: currentTaskDetail.value.scenario,
          ...JSON.parse(JSON.stringify(dynamicForm)),
          standBucket: derivedStandBucket.value || null,
          stepsBucket: derivedStepsBucket.value || null
        },
        reportData: {
          protocol: currentTaskDetail.value.protocol,
          perturbedValue: currentTaskDetail.value.scenario === 'arr' ? arrSimulationResult.value?.reportValue ?? null : null,
          perturbedLabel: currentTaskDetail.value.scenario === 'arr' ? arrSimulationResult.value?.perturbedLabel ?? null : null,
          params: currentTaskDetail.value.scenario === 'arr' && arrConfigParams.value
            ? {
                p: arrConfigParams.value.p.toFixed(4),
                q: arrConfigParams.value.q.toFixed(4)
              }
            : null
        }
      });
      localStorage.setItem('submittedData', JSON.stringify(storedData));
      ElMessage.success('当前任务扰动结果已提交上报');
    } catch (error) {
      console.error('保存用户端采集数据失败:', error);
      ElMessage.error('提交失败');
    }
  }, 600);
}

function goToDashboard() {
  router.push('/');
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

onMounted(() => {
  taskStore.loadFromLocalStorage();
  attributeConfigStore.loadFromLocalStorage();
  if (taskStore.taskList.length > 0) {
    currentTaskId.value = taskStore.taskList[0].id;
  }
});
</script>

<style scoped>
.user-device-container {
  width: 100vw;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #dfe8f5 100%);
}

.header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  color: #409eff;
}

.user-dropdown {
  color: #606266;
  cursor: pointer;
}

.content {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  box-sizing: border-box;
}

.left-section,
.right-section {
  flex: 1;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
  padding: 28px;
  display: flex;
  flex-direction: column;
}

.task-panel,
.device-info,
.dynamic-form-panel,
.summary-block,
.demo-top-card {
  margin-bottom: 22px;
}

.task-user {
  font-size: 24px;
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 14px;
}

.task-select-row,
.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: #425466;
}

.task-select-label,
.info-item span:first-child {
  font-weight: 600;
}

.task-meta-grid,
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.summary-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.meta-card,
.summary-card,
.empty-box,
.demo-top-card {
  border: 1px solid #dfe6ee;
  border-radius: 10px;
  background: #f8fbff;
}

.meta-card,
.summary-card {
  padding: 14px;
}

.meta-label,
.card-label,
.demo-top-label {
  font-size: 13px;
  color: #6b7785;
  margin-bottom: 8px;
}

.meta-value,
.card-value,
.demo-top-value {
  font-size: 18px;
  font-weight: 700;
  color: #1f2d3d;
}

.status-display {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-indicator.red {
  background: #f56c6c;
}

.status-indicator.yellow {
  background: #e6a23c;
}

.status-indicator.green {
  background: #67c23a;
}

.dynamic-form-panel h3,
.right-section h3,
.summary-block h4 {
  margin: 0 0 14px;
  color: #1f2d3d;
}

.dynamic-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item > span {
  color: #425466;
  font-weight: 600;
}

.tsp-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.derived-hint,
.preview-tip {
  color: #6b7785;
  font-size: 13px;
  line-height: 1.6;
}

.section-tip {
  font-size: 12px;
  color: #7b8794;
}

.control-buttons {
  margin-top: auto;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.action-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.demo-top-card {
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.preview-card {
  background: #f5f7fa;
}

.empty-box {
  padding: 18px;
  color: #8b97a7;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .content {
    flex-direction: column;
  }

  .task-meta-grid,
  .card-grid,
  .demo-top-card {
    grid-template-columns: 1fr;
  }
}
</style>
