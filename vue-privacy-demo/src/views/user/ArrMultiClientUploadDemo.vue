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
                本页面为答辩演示用的多客户端模拟器。由于演示环境中无法同时打开多个真实用户端页面，因此通过一次点击模拟 500 个客户端分别在本地完成 ARR 扰动并上报。表格中的原始值和本地编码值仅用于展示客户端的本地扰动过程，不代表服务器或管理员能够获得用户原始数据；真实系统中服务器只接收扰动后上传值。
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
                模拟 500 个客户端上报
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
            <strong>500 个客户端各上报一次</strong>
          </div>
        </div>
        <el-empty v-else description="暂无 ARR 任务，请先在管理端属性配置页下发 ARR 场景" />

        <section class="flow-section">
          <div class="flow-title">ARR 客户端本地处理链路</div>
          <div class="flow-steps">
            <div v-for="(step, index) in flowSteps" :key="step.title" class="flow-card">
              <div class="flow-index">{{ index + 1 }}</div>
              <div class="flow-copy">
                <strong>{{ step.title }}</strong>
                <span>{{ step.description }}</span>
              </div>
            </div>
          </div>
        </section>

        <section v-if="simulationRows.length" class="detail-section">
          <div class="detail-title">
            <h3>客户端上报明细</h3>
            <span>共 {{ simulationRows.length }} 条，批次 ID：{{ batchId }}</span>
          </div>
          <el-table :data="simulationRows" height="560" border style="width: 100%">
            <el-table-column prop="userNo" label="客户端编号" width="150" />
            <el-table-column prop="rawLabel" label="原始属性值" min-width="160" />
            <el-table-column prop="localCodeValue" label="本地编码值" min-width="170" />
            <el-table-column prop="arrTransition" label="ARR 扰动结果" min-width="150" />
            <el-table-column prop="uploadedValue" label="扰动后上传值" min-width="170" />
            <el-table-column prop="uploadStatus" label="上报状态" width="120">
              <template #default="scope">
                <el-tag type="success">{{ scope.row.uploadStatus }}</el-tag>
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
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ArrowDown } from '@element-plus/icons-vue';
import { useUserStore } from '../../store/user';
import { useTaskStore } from '../../store/task';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import {
  appendArrSubmissionRecords,
  getArrParams,
  getArrTasks,
  simulateArrClientUploads
} from '../../utils/arrDemoUtils';

const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const selectedTaskId = ref('');
const simulationRows = ref([]);
const batchId = ref('');

const user = computed(() => userStore.user);
const arrTasks = computed(() => getArrTasks(taskStore.taskList));
const selectedTask = computed(() => arrTasks.value.find(task => task.id === selectedTaskId.value) || null);
const arrParams = computed(() => getArrParams(selectedTask.value, attributeConfigStore));
const flowSteps = [
  {
    title: '原始采集',
    description: '客户端本地得到是否触发睡眠异常提醒'
  },
  {
    title: '本地二元编码',
    description: '触发提醒编码为 1，未触发提醒编码为 0'
  },
  {
    title: 'ARR 随机扰动',
    description: '按照 p、q 概率对二元编码值进行随机响应'
  },
  {
    title: '上传扰动后值',
    description: '服务器只接收扰动后的上报值'
  }
];

function runArrSimulation() {
  if (!selectedTask.value) {
    ElMessage.warning('请先选择 ARR 任务');
    return;
  }

  const result = simulateArrClientUploads(selectedTask.value, arrParams.value);
  appendArrSubmissionRecords(result.records);
  batchId.value = result.batchId;
  simulationRows.value = result.rows;
  ElMessage.success('已模拟 500 个客户端分别完成一次 ARR 本地扰动上报');
}

function goToUserDevice() {
  router.push('/user/device');
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
  max-width: 860px;
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
  margin: 18px 0 20px;
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
  min-height: 92px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.flow-card:not(:last-child)::after {
  content: '→';
  position: absolute;
  right: -11px;
  top: 50%;
  transform: translateY(-50%);
  color: #2563eb;
  font-weight: 800;
  z-index: 1;
}

.flow-index {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  font-weight: 700;
  font-size: 13px;
}

.flow-copy strong {
  display: block;
  color: #111827;
  margin-bottom: 6px;
}

.flow-copy span {
  display: block;
  color: #64748b;
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

.page-actions {
  margin-top: 16px;
}

@media (max-width: 1100px) {
  .flow-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .flow-card::after {
    display: none;
  }
}
</style>
