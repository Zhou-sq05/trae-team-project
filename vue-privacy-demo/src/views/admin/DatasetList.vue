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
          <div class="dataset-content">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>数据集</span>
                </div>
              </template>

              <div class="dataset-header">
                <div class="total-data">
                  总数据数: <span class="total-count">{{ totalDataCount }}</span>
                  <span style="margin-left: 20px;">任务ID筛选:</span>
                  <el-select v-model="filterTaskId" placeholder="选择任务ID" style="width: 200px; margin: 0 10px">
                    <el-option label="全部数据" value="" />
                    <el-option v-for="task in tasks" :key="task.id" :label="task.id" :value="task.id" />
                  </el-select>
                  <el-button type="primary" @click="selectAllData" :disabled="filteredDatasets.length === 0" style="margin-left: 20px;">
                    选择全部数据
                  </el-button>
                </div>
                <div class="header-buttons">
                  <el-button type="danger" @click="batchDelete" :disabled="selectedRows.length === 0">
                    批量删除
                  </el-button>
                  <el-button type="primary" @click="refreshData" :loading="loading">刷新</el-button>
                </div>
              </div>

              <el-table
                :data="paginatedDatasets"
                style="width: 100%"
                v-loading="loading"
                ref="tableRef"
                @selection-change="handleSelectionChange"
              >
                <el-table-column type="selection" width="55" />
                <el-table-column label="序号" type="index" width="80" />
                <el-table-column prop="userId" label="用户ID" />
                <el-table-column prop="taskId" label="任务ID" />
                <el-table-column prop="uploadTime" label="上传时间" />
                <el-table-column prop="status" label="数据状态" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === '已上报' ? 'success' : 'warning'">{{ scope.row.status }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="协议" width="120">
                  <template #default="scope">
                    <span>{{ scope.row.algorithm }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="数据详情" width="100">
                  <template #default="scope">
                    <el-button size="small" @click="viewDataDetail(scope.row)">查看</el-button>
                  </template>
                </el-table-column>
              </el-table>

              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="currentPage"
                  v-model:page-size="pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="totalDataCount"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>

              <div class="batch-generate">
                <div class="generate-controls">
                  <span>批量生成</span>
                  <el-select v-model="generateCount" placeholder="人数" style="width: 100px; margin: 0 10px">
                    <el-option label="10人" value="10" />
                    <el-option label="50人" value="50" />
                    <el-option label="100人" value="100" />
                    <el-option label="500人" value="500" />
                  </el-select>
                  <span>任务ID</span>
                  <el-select v-model="selectedTaskId" placeholder="选择任务ID" style="width: 200px; margin: 0 10px">
                    <el-option v-for="task in tasks" :key="task.id" :label="task.id" :value="task.id" />
                  </el-select>
                  <span class="hint">(预先生成演示用扰动数据)</span>
                </div>
                <div class="generate-buttons">
                  <el-button type="primary" @click="generateData">生成数据</el-button>
                  <el-button type="success" @click="startAggregation">开始聚合估计</el-button>
                </div>
              </div>
            </el-card>

            <el-card shadow="hover" style="margin-top: 20px" v-if="selectedDataset">
              <template #header>
                <div class="card-header">
                  <span>数据详情 - 用户ID: {{ selectedDataset.userId }} | 任务ID: {{ selectedDataset.taskId }}</span>
                </div>
              </template>
              <el-table :data="dataDetails" style="width: 100%">
                <el-table-column label="序号" type="index" width="80" />
                <el-table-column prop="userId" label="用户ID" />
                <el-table-column prop="taskId" label="任务ID" />
                <el-table-column prop="attribute" label="属性名" min-width="180" />
                <el-table-column prop="rawValue" label="原始值" min-width="160" />
                <el-table-column prop="reportedValue" label="上报值" min-width="180" />
                <el-table-column prop="mode" label="模式" width="120" />
                <el-table-column prop="algorithm" label="算法" width="140" />
                <el-table-column prop="uploadTime" label="上传时间" min-width="180" />
              </el-table>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { House, Setting, Document, DataAnalysis, ArrowDown } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '../../store/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const activeMenu = computed(() => route.path);
const user = computed(() => userStore.user);

const datasets = ref([]);
const tableRef = ref(null);
const selectedRows = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const generateCount = ref('10');
const tasks = ref([]);
const selectedTaskId = ref('');
const filterTaskId = ref('');
const selectedDataset = ref(null);
const dataDetails = ref([]);
const loading = ref(false);
const rawSubmissions = ref([]);

const totalDataCount = computed(() => filteredDatasets.value.length);

const filteredDatasets = computed(() => {
  if (!filterTaskId.value) {
    return datasets.value;
  }
  return datasets.value.filter(item => String(item.taskId) === String(filterTaskId.value));
});

const paginatedDatasets = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value;
  const endIndex = startIndex + pageSize.value;
  return filteredDatasets.value.slice(startIndex, endIndex);
});

const handleLogout = () => {
  userStore.logout();
  router.push('/login');
};

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`解析 ${key} 失败:`, error);
    return fallback;
  }
}

function getTaskListFromStorage() {
  const directTasks = safeParse('tasks', []);
  const taskStore = safeParse('taskStore', {});
  const fromStore = Array.isArray(taskStore?.taskList) ? taskStore.taskList : [];
  const merged = [...directTasks, ...fromStore];
  const seen = new Set();
  return merged.filter(task => {
    if (!task?.id || seen.has(String(task.id))) return false;
    seen.add(String(task.id));
    return true;
  });
}

function getTaskById(taskId) {
  return tasks.value.find(task => String(task.id) === String(taskId)) || null;
}

function getProtectedAttribute(task) {
  if (!task?.attributes?.length) return null;
  const supportedNames = ['是否触发异常跌倒告警', '日均站立时长分档', '每日步数分桶', '睡眠质量评分'];
  return (
    task.attributes.find(attribute => supportedNames.includes(attribute.name) && attribute.isProtected) ||
    task.attributes.find(attribute => supportedNames.includes(attribute.name) && attribute.status === '已配置') ||
    task.attributes.find(attribute => supportedNames.includes(attribute.name)) ||
    null
  );
}

function getTaskMeta(taskId) {
  const task = getTaskById(taskId);
  const attribute = getProtectedAttribute(task);
  const map = {
    '是否触发异常跌倒告警': {
      attributeName: '是否触发异常跌倒告警',
      algorithm: 'ARR',
      mode: '间接隐私风险'
    },
    '日均站立时长分档': {
      attributeName: '日均站立时长分档',
      algorithm: 'AGRR',
      mode: '间接隐私风险'
    },
    '每日步数分桶': {
      attributeName: '每日步数分桶',
      algorithm: 'AOUE',
      mode: '间接隐私风险'
    },
    '睡眠质量评分': {
      attributeName: '睡眠质量评分',
      algorithm: 'TSP',
      mode: '混合隐私风险'
    }
  };
  return map[attribute?.name] || {
    attributeName: attribute?.name || '未知属性',
    algorithm: task?.protocol || '未知协议',
    mode: task?.protectionMode || '未知模式'
  };
}

function formatDateTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

function formatArrLabel(value) {
  return Number(value) === 1 ? '触发' : '未触发';
}

function buildDatasetRows(submissions) {
  return submissions.map((item, index) => {
    const meta = getTaskMeta(item.taskId);
    const hasReport = Boolean(item.reportData);
    return {
      id: index + 1,
      sourceIndex: index,
      userId: item.userId || `用户${String(index + 1).padStart(3, '0')}`,
      taskId: item.taskId,
      uploadTime: formatDateTime(item.uploadTime || Date.now()),
      status: hasReport ? '已上报' : '已扰动',
      algorithm: item.reportData?.protocol || meta.algorithm
    };
  });
}

function buildDetailRows(submission, dataset) {
  if (!submission) return [];

  const meta = getTaskMeta(dataset.taskId);
  const scenario = submission.rawData?.scenario;

  if (submission.reportData && scenario === 'arr') {
    const rawValue = Number(submission.rawData?.fallAlarm ?? 0);
    const reportValue = submission.reportData?.perturbedValue;
    return [{
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: meta.attributeName,
      rawValue: `${formatArrLabel(rawValue)}（${rawValue}）`,
      reportedValue: `${submission.reportData?.perturbedLabel || formatArrLabel(reportValue)}（${reportValue}）`,
      mode: meta.mode,
      algorithm: submission.reportData?.protocol || meta.algorithm,
      uploadTime: dataset.uploadTime
    }];
  }

  if (submission.reportData && scenario === 'agrr') {
    return [{
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: meta.attributeName,
      rawValue: `${submission.rawData?.standMinutes ?? '--'} 分钟 -> ${submission.rawData?.standBucket || '--'}`,
      reportedValue: submission.reportData?.perturbedLabel || submission.reportData?.perturbedValue || '--',
      mode: meta.mode,
      algorithm: submission.reportData?.protocol || meta.algorithm,
      uploadTime: dataset.uploadTime
    }];
  }

  if (submission.reportData && scenario === 'aoue') {
    return [{
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: meta.attributeName,
      rawValue: `${submission.rawData?.dailySteps ?? '--'} 步 -> ${submission.rawData?.stepsBucket || '--'}`,
      reportedValue: submission.reportData?.perturbedLabel || submission.reportData?.perturbedValue || '--',
      mode: meta.mode,
      algorithm: submission.reportData?.protocol || meta.algorithm,
      uploadTime: dataset.uploadTime
    }];
  }

  if (submission.reportData && scenario === 'tsp') {
    const missingText = Number(submission.rawData?.sleepMissing) === 1 ? '缺失' : '非缺失';
    const scoreText = Number(submission.rawData?.sleepMissing) === 1 ? '--' : submission.rawData?.sleepScore ?? '--';
    return [{
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: meta.attributeName,
      rawValue: `缺失状态: ${missingText}，评分: ${scoreText}`,
      reportedValue: submission.reportData?.perturbedLabel || submission.reportData?.perturbedValue || '--',
      mode: meta.mode,
      algorithm: submission.reportData?.protocol || meta.algorithm,
      uploadTime: dataset.uploadTime
    }];
  }

  if (submission.perturbedData) {
    const attributeMap = {
      sleepHours: '睡眠时长',
      dailySteps: '日均步数',
      exerciseFrequency: '近7天运动频次',
      heartRate: '平均静息心率',
      mood: '今日感觉'
    };

    return Object.entries(submission.perturbedData).map(([key, value]) => ({
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: attributeMap[key] || key,
      rawValue: submission.rawData?.[key] != null ? String(submission.rawData[key]) : '--',
      reportedValue: value != null ? String(value) : '--',
      mode: '差分隐私',
      algorithm: 'Laplace',
      uploadTime: dataset.uploadTime
    }));
  }

  return [{
    userId: dataset.userId,
    taskId: dataset.taskId,
    attribute: meta.attributeName,
    rawValue: '--',
    reportedValue: '--',
    mode: meta.mode,
    algorithm: meta.algorithm,
    uploadTime: dataset.uploadTime
  }];
}

function loadDataFromStorage() {
  loading.value = true;
  try {
    const parsedData = safeParse('submittedData', []);
    rawSubmissions.value = Array.isArray(parsedData) ? parsedData : [];
    datasets.value = buildDatasetRows(rawSubmissions.value);
  } catch (error) {
    console.error('加载数据失败:', error);
    ElMessage.error('加载数据失败');
    rawSubmissions.value = [];
    datasets.value = [];
  } finally {
    loading.value = false;
  }
}

function loadTasks() {
  tasks.value = getTaskListFromStorage();
  if (!selectedTaskId.value && tasks.value.length > 0) {
    selectedTaskId.value = tasks.value[0].id;
  }
}

function refreshData() {
  loading.value = true;
  setTimeout(() => {
    loadTasks();
    loadDataFromStorage();
    ElMessage.success('数据刷新成功');
  }, 300);
}

function viewDataDetail(dataset) {
  selectedDataset.value = dataset;
  const submission = rawSubmissions.value[dataset.sourceIndex] || null;
  dataDetails.value = buildDetailRows(submission, dataset);
}

function generateData() {
  if (!selectedTaskId.value) {
    ElMessage.warning('请选择任务ID');
    return;
  }

  loading.value = true;
  setTimeout(() => {
    const count = Number(generateCount.value);
    const meta = getTaskMeta(selectedTaskId.value);
    const existing = safeParse('submittedData', []);
    const generated = [];

    for (let i = 0; i < count; i += 1) {
      const rawValue = Math.random() < 0.25 ? 1 : 0;
      const reportValue = Math.random() < 0.5 ? rawValue : 1 - rawValue;
      generated.push({
        userId: `模拟用户${String(existing.length + i + 1).padStart(3, '0')}`,
        taskId: selectedTaskId.value,
        uploadTime: new Date().toISOString(),
        rawData: {
          scenario: meta.algorithm === 'ARR' ? 'arr' : 'legacy',
          fallAlarm: rawValue
        },
        reportData: {
          protocol: meta.algorithm,
          perturbedValue: reportValue,
          perturbedLabel: formatArrLabel(reportValue),
          params: {
            p: '0.8500',
            q: '0.1500'
          }
        }
      });
    }

    localStorage.setItem('submittedData', JSON.stringify([...existing, ...generated]));
    loadDataFromStorage();
    ElMessage.success(`已为任务 ${selectedTaskId.value} 生成 ${count} 条演示数据`);
    loading.value = false;
  }, 600);
}

function startAggregation() {
  ElMessage.success('开始聚合估计');
  router.push('/admin/aggregate');
}

function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
}

function handleCurrentChange(current) {
  currentPage.value = current;
}

function handleSelectionChange(val) {
  selectedRows.value = val;
}

function selectAllData() {
  if (!tableRef.value) return;
  tableRef.value.clearSelection();
  filteredDatasets.value.forEach(row => {
    tableRef.value.toggleRowSelection(row, true);
  });
}

function batchDelete() {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的数据');
    return;
  }

  ElMessageBox.confirm('确定要删除选中的数据吗？', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const selectedIndexes = new Set(selectedRows.value.map(row => row.sourceIndex));
    const updatedData = rawSubmissions.value.filter((_, index) => !selectedIndexes.has(index));
    localStorage.setItem('submittedData', JSON.stringify(updatedData));
    selectedRows.value = [];
    selectedDataset.value = null;
    dataDetails.value = [];
    if (tableRef.value) {
      tableRef.value.clearSelection();
    }
    loadDataFromStorage();
    ElMessage.success('批量删除成功');
  }).catch(() => {});
}

watch(filterTaskId, newValue => {
  currentPage.value = 1;
  if (newValue) {
    selectedTaskId.value = newValue;
  } else if (tasks.value.length > 0) {
    selectedTaskId.value = tasks.value[0].id;
  }
});

onMounted(() => {
  loadTasks();
  loadDataFromStorage();
});
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

.dataset-content {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dataset-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.total-data {
  font-size: 16px;
  font-weight: bold;
}

.total-count {
  color: #409eff;
  margin-left: 10px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.batch-generate {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.generate-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.generate-buttons {
  display: flex;
  gap: 12px;
}

.hint {
  color: #909399;
  margin-left: 8px;
}

@media (max-width: 1200px) {
  .dataset-header,
  .batch-generate {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
