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
            <el-menu-item index="/admin/arr-multi-user-simulation">
              <el-icon><Monitor /></el-icon>
              <span>ARR 多用户上报模拟</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <el-main>
          <div class="simulation-content">
            <el-card shadow="hover">
              <template #header>
                <div class="page-header">
                  <div>
                    <div class="page-title">ARR 多用户上报模拟</div>
                    <div class="page-desc">
                      本页面用于答辩演示，通过一次点击模拟多个用户分别完成一次 ARR 本地扰动上报。该过程用于展示多用户数据采集链路，不代表单个用户的连续采样。
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
                    <el-button type="primary" :disabled="!selectedTask" @click="runArrSimulation">
                      模拟 500 个用户上报
                    </el-button>
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
                  <strong>500 个用户各上报一次</strong>
                </div>
              </div>
              <el-empty v-else description="暂无 ARR 任务，请先在属性配置页下发 ARR 场景" />

              <section v-if="simulationRows.length" class="detail-section">
                <div class="detail-title">
                  <h3>模拟用户上报明细</h3>
                  <span>共 {{ simulationRows.length }} 条，批次 ID：{{ batchId }}</span>
                </div>
                <el-table :data="simulationRows" height="560" border style="width: 100%">
                  <el-table-column prop="userNo" label="用户编号" width="120" />
                  <el-table-column prop="rawLabel" label="原始值" min-width="160" />
                  <el-table-column prop="beforeValue" label="扰动前值" min-width="140" />
                  <el-table-column prop="afterValue" label="扰动后值" min-width="140" />
                  <el-table-column prop="uploadStatus" label="上报状态" width="120">
                    <template #default="scope">
                      <el-tag type="success">{{ scope.row.uploadStatus }}</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </section>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
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
import { ARR } from '../../utils/ldpAlgorithms';
import {
  CONDITION_DISTRIBUTION_KEYS,
  sampleObservedValue
} from '../../utils/conditionDistributionPresets';

const ARR_SAMPLE_COUNT = 500;

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const selectedTaskId = ref('');
const simulationRows = ref([]);
const batchId = ref('');

const activeMenu = computed(() => route.path);
const user = computed(() => userStore.user);
const arrTasks = computed(() => taskStore.taskList.filter(task => {
  const attribute = task.attributes?.[0];
  return task.algorithm === 'arr' || attribute?.algorithm === 'arr' || attribute?.name === '是否触发睡眠异常提醒';
}));
const selectedTask = computed(() => arrTasks.value.find(task => task.id === selectedTaskId.value) || null);
const selectedConfig = computed(() => {
  if (!selectedTask.value) return null;
  const attributeId = selectedTask.value.distributedAttributeId || selectedTask.value.attributes?.[0]?.id;
  return selectedTask.value.configSnapshot || attributeConfigStore.getConfigById(attributeId);
});
const arrParams = computed(() => {
  const epsilon = Number(selectedConfig.value?.epsilon ?? selectedTask.value?.privacyBudget ?? 0.5);
  const expEpsilon = Math.exp(epsilon);
  const fallbackP = expEpsilon / (expEpsilon + 1);
  return {
    epsilon,
    p: Number(selectedConfig.value?.calibratedParams?.p ?? fallbackP),
    q: Number(selectedConfig.value?.calibratedParams?.q ?? (1 - fallbackP))
  };
});

function sampleArrRawValue() {
  const sampled = sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.ARR_SLEEP_ALERT_AGE);
  return sampled.observedValue === '触发提醒' ? 1 : 0;
}

function getArrLabel(value) {
  return Number(value) === 1 ? '触发提醒' : '未触发提醒';
}

function runArrSimulation() {
  if (!selectedTask.value) {
    ElMessage.warning('请先选择 ARR 任务');
    return;
  }

  const currentBatchId = `${selectedTask.value.id}-arr-multi-${Date.now()}`;
  const uploadTime = new Date().toISOString();
  const rows = [];
  const records = [];

  for (let index = 0; index < ARR_SAMPLE_COUNT; index += 1) {
    const rawValue = sampleArrRawValue();
    const reportValue = ARR(
      rawValue,
      arrParams.value.epsilon,
      2,
      arrParams.value.p,
      arrParams.value.q
    );
    const userNo = `用户${String(index + 1).padStart(3, '0')}`;

    rows.push({
      userNo,
      rawLabel: getArrLabel(rawValue),
      beforeValue: `${rawValue}（${getArrLabel(rawValue)}）`,
      afterValue: `${reportValue}（${getArrLabel(reportValue)}）`,
      uploadStatus: '已上报'
    });

    records.push({
      userId: userNo,
      user_id: userNo,
      taskId: selectedTask.value.id,
      task_id: selectedTask.value.id,
      batch_id: currentBatchId,
      protocol: 'ARR',
      uploadTime,
      upload_time: uploadTime,
      report_value: reportValue,
      rawData: {
        scenario: 'arr',
        fallAlarm: rawValue,
        rawLabel: getArrLabel(rawValue)
      },
      reportData: {
        protocol: 'ARR',
        perturbedValue: reportValue,
        reportValue,
        perturbedLabel: getArrLabel(reportValue),
        params: {
          p: arrParams.value.p.toFixed(4),
          q: arrParams.value.q.toFixed(4)
        }
      }
    });
  }

  const storedData = JSON.parse(localStorage.getItem('submittedData') || '[]');
  localStorage.setItem('submittedData', JSON.stringify([...storedData, ...records]));
  batchId.value = currentBatchId;
  simulationRows.value = rows;
  ElMessage.success('已模拟 500 个用户分别完成一次 ARR 本地扰动上报');
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

onMounted(() => {
  taskStore.loadFromLocalStorage();
  attributeConfigStore.loadFromLocalStorage();
  if (arrTasks.value.length > 0) {
    selectedTaskId.value = arrTasks.value[0].id;
  }
});
</script>

<style scoped>
.admin-container {
  height: 100vh;
  overflow: hidden;
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

.simulation-content {
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
  max-width: 760px;
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

.detail-section {
  margin-top: 20px;
}

.detail-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.detail-title h3 {
  margin: 0;
  font-size: 18px;
}

.detail-title span {
  color: #64748b;
  font-size: 13px;
}
</style>
