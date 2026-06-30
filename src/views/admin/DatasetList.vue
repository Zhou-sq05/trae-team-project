<template>
  <div class="admin-container">
    <el-container>
      <el-header>
        <div class="header-left">
          <h1>数据集列表</h1>
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
        <el-aside width="240px">
          <div class="sidebar-brand">
            <div class="sidebar-brand-title">隐私保护平台</div>
            <div class="sidebar-brand-subtitle">风险自适应隐私保护数据采集系统</div>
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
                  <el-button type="danger" @click="batchDelete" :disabled="selectedRows.length === 0">批量删除</el-button>
                  <el-button type="success" @click="startAggregation">开始聚合估计</el-button>
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
                <el-table-column prop="attribute" label="上传属性" min-width="180" />
                <el-table-column prop="reportedValue" label="扰动后编码值" min-width="200" />
                <el-table-column prop="batchId" label="批次号" min-width="180" />
                <el-table-column prop="algorithm" label="协议" width="120" />
                <el-table-column prop="uploadTime" label="上传时间" min-width="180" />
                <el-table-column prop="status" label="数据状态" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === '已上报' ? 'success' : 'warning'">{{ scope.row.status }}</el-tag>
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
import { Setting, Document, DataAnalysis, ArrowDown, Monitor } from '@element-plus/icons-vue';
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
const tasks = ref([]);
const selectedTaskId = ref('');
const filterTaskId = ref('');
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
  const supportedNames = ['是否触发睡眠异常提醒', '日均站立时长分档', '每日步数分桶', '睡眠质量评分'];
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
    '是否触发睡眠异常提醒': {
      attributeName: '是否触发睡眠异常提醒',
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
  return Number(value) === 1 ? '触发提醒' : '未触发提醒';
}

function formatAgrrLabel(bucket, code) {
  if (!bucket && (code === null || code === undefined || code === '')) {
    return '--';
  }
  if (bucket && (code === null || code === undefined || code === '')) {
    return bucket;
  }
  return `${bucket || '--'}（${code}）`;
}

function formatTspValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '--';
  }
  return numericValue === 0 ? '0（缺失值）' : `${numericValue} 分`;
}

function formatVectorValue(value) {
  if (Array.isArray(value)) {
    return `[${value.join(', ')}]`;
  }
  if (typeof value === 'string') {
    return value;
  }
  return value == null ? '--' : String(value);
}

function getDisplayAttribute(meta, protocol) {
  if (String(protocol).toUpperCase() === 'TSP') {
    return `${meta.attributeName} / 缺失状态`;
  }
  return meta.attributeName;
}

function getReportedValueDisplay(record, protocol) {
  const normalizedProtocol = String(protocol || record?.protocol || record?.reportData?.protocol || '').toUpperCase();
  const reportValue = record?.report_value
    ?? record?.reportData?.reportValue
    ?? record?.reportData?.perturbedValue
    ?? record?.perturbed_value
    ?? record?.reportValue;

  if (record?.uploadedValue && record.uploadedValue !== '待上传') {
    return record.uploadedValue;
  }
  if (record?.uploadedVectorDisplay && record.uploadedVectorDisplay !== '待上传') {
    return record.uploadedVectorDisplay;
  }
  if (record?.finalReportDisplay && record.finalReportDisplay !== '待上传') {
    return record.finalReportDisplay;
  }

  if (normalizedProtocol === 'ARR') {
    return `${record?.reportData?.perturbedLabel || formatArrLabel(reportValue)}（${reportValue ?? '--'}）`;
  }

  if (normalizedProtocol === 'AGRR') {
    const reportBucket = record?.perturbed_bucket
      || record?.reportData?.perturbedBucket
      || record?.reportData?.perturbedLabel
      || record?.perturbedLabel
      || '--';
    const reportCode = record?.perturbed_bucket_code
      ?? record?.reportData?.perturbedBucketCode
      ?? record?.reportData?.perturbedValue
      ?? reportValue
      ?? '--';
    return formatAgrrLabel(reportBucket, reportCode);
  }

  if (normalizedProtocol === 'AOUE') {
    return formatVectorValue(reportValue);
  }

  if (normalizedProtocol === 'TSP') {
    return formatTspValue(reportValue);
  }

  return formatVectorValue(reportValue);
}

function buildDatasetRows(submissions) {
  const rows = [];

  submissions.forEach((item, index) => {
    if (Array.isArray(item?.samples)) {
      const taskId = item.task_id ?? item.taskId;
      const meta = getTaskMeta(taskId);
      const protocol = item.protocol || meta.algorithm;
      item.samples.forEach((sample, sampleIndex) => {
        rows.push({
          id: `${index + 1}-${sampleIndex + 1}`,
          sourceIndex: index,
          sourceType: 'batch',
          sampleIndex,
          userId: item.user_id || item.userId || `用户${String(index + 1).padStart(3, '0')}`,
          taskId,
          attribute: getDisplayAttribute(meta, protocol),
          reportedValue: getReportedValueDisplay(sample, protocol),
          batchId: item.batch_id || '--',
          uploadTime: formatDateTime(item.upload_time || item.uploadTime || Date.now()),
          status: '已上报',
          algorithm: protocol
        });
      });
      return;
    }

    const taskId = item.task_id ?? item.taskId;
    const meta = getTaskMeta(taskId);
    const protocol = item.protocol || item.reportData?.protocol || meta.algorithm;
    rows.push({
      id: index + 1,
      sourceIndex: index,
      sourceType: 'single',
      userId: item.user_id || item.userId || `用户${String(index + 1).padStart(3, '0')}`,
      taskId,
      attribute: getDisplayAttribute(meta, protocol),
      reportedValue: getReportedValueDisplay(item, protocol),
      batchId: item.batch_id || item.sampleMeta?.batchId || '--',
      uploadTime: formatDateTime(item.upload_time || item.uploadTime || Date.now()),
      status: item.reportData ? '已上报' : '已扰动',
      algorithm: protocol
    });
  });

  return rows;
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

function startAggregation() {
  ElMessage.success('开始聚合估计');
  const query = {};
  if (selectedTaskId.value) {
    query.taskId = selectedTaskId.value;
  }
  router.push({ path: '/admin/aggregate', query });
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

:deep(.el-container) {
  min-height: 0;
}

:deep(.el-main) {
  height: calc(100vh - 60px);
  overflow-y: auto;
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

.detail-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.detail-chip {
  padding: 12px 14px;
  border: 1px solid #e8eef6;
  border-radius: 10px;
  background: #f7fbff;
}

.detail-chip-label {
  display: block;
  font-size: 12px;
  color: #7a8ca5;
  margin-bottom: 6px;
}

.detail-chip-value {
  font-size: 16px;
  font-weight: 700;
  color: #183153;
  word-break: break-all;
}

.tsp-detail-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
}

.tsp-detail-card {
  border: 1px solid #e6edf6;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #fdfefe 100%);
  padding: 14px 16px;
}

.tsp-detail-card__title {
  font-size: 14px;
  font-weight: 700;
  color: #183153;
  margin-bottom: 10px;
}

.tsp-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px 12px;
}

.tsp-detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid #edf2f8;
  border-radius: 10px;
  background: #ffffff;
}

.tsp-detail-item__label {
  font-size: 12px;
  color: #73849b;
}

.tsp-detail-item__value {
  font-size: 14px;
  font-weight: 700;
  color: #183153;
  line-height: 1.5;
}

@media (max-width: 1200px) {
  .dataset-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
