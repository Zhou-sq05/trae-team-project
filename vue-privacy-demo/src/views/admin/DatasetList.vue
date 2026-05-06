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
            <el-sub-menu index="/admin/demo">
              <template #title>
                <el-icon><Monitor /></el-icon>
                <span>演示与验证</span>
              </template>
              <el-menu-item index="/admin/demo/arr-experiment-comparison">
                演示：ARR 实验效果对比
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
                <el-table-column prop="batchId" label="批次号" min-width="180" />
                <el-table-column prop="algorithm" label="协议" width="120" />
                <el-table-column prop="uploadTime" label="上传时间" min-width="180" />
                <el-table-column prop="status" label="数据状态" width="100">
                  <template #default="scope">
                    <el-tag :type="scope.row.status === '已上报' ? 'success' : 'warning'">{{ scope.row.status }}</el-tag>
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
            </el-card>

          </div>
        </el-main>
      </el-container>
    </el-container>

    <el-drawer
      v-model="detailDrawerVisible"
      title="数据详情"
      size="52%"
      destroy-on-close
    >
      <template v-if="selectedDataset">
        <div class="detail-overview">
          <div class="detail-chip">
            <span class="detail-chip-label">用户ID</span>
            <span class="detail-chip-value">{{ selectedDataset.userId }}</span>
          </div>
          <div class="detail-chip">
            <span class="detail-chip-label">任务ID</span>
            <span class="detail-chip-value">{{ selectedDataset.taskId }}</span>
          </div>
          <div class="detail-chip">
            <span class="detail-chip-label">批次号</span>
            <span class="detail-chip-value">{{ selectedDataset.batchId }}</span>
          </div>
          <div class="detail-chip">
            <span class="detail-chip-label">协议</span>
            <span class="detail-chip-value">{{ selectedDataset.algorithm }}</span>
          </div>
        </div>

        <div v-if="selectedDataset.algorithm === 'TSP' && tspDetailSections.length" class="tsp-detail-sections">
          <div v-for="section in tspDetailSections" :key="section.title" class="tsp-detail-card">
            <div class="tsp-detail-card__title">{{ section.title }}</div>
            <div class="tsp-detail-grid">
              <div v-for="item in section.items" :key="item.label" class="tsp-detail-item">
                <span class="tsp-detail-item__label">{{ item.label }}</span>
                <span class="tsp-detail-item__value">{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <el-table :data="dataDetails" style="width: 100%">
          <el-table-column label="序号" type="index" width="80" />
          <el-table-column prop="userId" label="用户ID" />
          <el-table-column prop="taskId" label="任务ID" />
          <el-table-column prop="batchId" label="批次号" min-width="180" />
          <el-table-column prop="attribute" label="属性名" min-width="180" />
          <el-table-column prop="rawValue" label="原始值" min-width="160" />
          <el-table-column prop="reportedValue" label="上报值" min-width="180" />
          <el-table-column prop="mode" label="模式" width="140" />
          <el-table-column prop="algorithm" label="算法" width="120" />
          <el-table-column prop="uploadTime" label="上传时间" min-width="180" />
        </el-table>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { House, Setting, Document, DataAnalysis, ArrowDown, Monitor } from '@element-plus/icons-vue';
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
const selectedDataset = ref(null);
const dataDetails = ref([]);
const tspDetailSections = ref([]);
const detailDrawerVisible = ref(false);
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

function formatTspMissingLabel(value) {
  return Number(value) === 1 ? '缺失（M=1）' : '非缺失（M=0）';
}

function formatTspValue(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '--';
  }
  return numericValue === 0 ? '0（缺失值）' : `${numericValue} 分`;
}

function buildTspDetailSections(submission, dataset) {
  if (!submission) return [];

  const originalMissing = submission.original_missing ?? submission.rawData?.sleepMissing ?? null;
  const originalScore = submission.original_score ?? submission.rawData?.sleepScore ?? null;
  const stage1Result = submission.stage1_result ?? submission.reportData?.stageOneResult ?? null;
  const stage2Input = submission.stage2_input ?? submission.reportData?.stageTwoInput ?? null;
  const reportValue = submission.report_value ?? submission.reportData?.reportValue ?? submission.reportData?.perturbedValue ?? null;
  const stage1Skipped = stage1Result === 'skipped' || stage1Result == null;

  return [
    {
      title: '原始输入',
      items: [
        { label: '缺失状态', value: formatTspMissingLabel(originalMissing) },
        { label: '原始评分', value: originalScore == null ? '--' : `${originalScore} 分` }
      ]
    },
    {
      title: '第一阶段',
      items: [
        { label: '是否执行第一阶段', value: stage1Skipped ? '跳过' : '执行' },
        { label: '第一阶段结果', value: stage1Skipped ? '跳过' : `${stage1Result} 分` }
      ]
    },
    {
      title: '第二阶段',
      items: [
        { label: '第二阶段输入', value: formatTspValue(stage2Input) },
        { label: '最终上报值', value: formatTspValue(reportValue) }
      ]
    },
    {
      title: '元信息',
      items: [
        { label: 'task_id', value: submission.task_id ?? submission.taskId ?? dataset.taskId ?? '--' },
        { label: 'protocol', value: submission.protocol ?? submission.reportData?.protocol ?? dataset.algorithm ?? '--' },
        { label: 'batch_id', value: submission.batch_id ?? submission.sampleMeta?.batchId ?? dataset.batchId ?? '--' },
        { label: 'upload_time', value: formatDateTime(submission.upload_time ?? submission.uploadTime ?? dataset.uploadTime) }
      ]
    }
  ];
}

function buildDatasetRows(submissions) {
  const rows = [];

  submissions.forEach((item, index) => {
    if (Array.isArray(item?.samples)) {
      const taskId = item.task_id ?? item.taskId;
      const meta = getTaskMeta(taskId);
      item.samples.forEach((sample, sampleIndex) => {
        rows.push({
          id: `${index + 1}-${sampleIndex + 1}`,
          sourceIndex: index,
          sourceType: 'batch',
          sampleIndex,
          userId: item.user_id || item.userId || `用户${String(index + 1).padStart(3, '0')}`,
          taskId,
          batchId: item.batch_id || '--',
          uploadTime: formatDateTime(item.upload_time || item.uploadTime || Date.now()),
          status: '已上报',
          algorithm: item.protocol || meta.algorithm
        });
      });
      return;
    }

    const taskId = item.task_id ?? item.taskId;
    const meta = getTaskMeta(taskId);
    rows.push({
      id: index + 1,
      sourceIndex: index,
      sourceType: 'single',
      userId: item.user_id || item.userId || `用户${String(index + 1).padStart(3, '0')}`,
      taskId,
      batchId: item.batch_id || item.sampleMeta?.batchId || '--',
      uploadTime: formatDateTime(item.upload_time || item.uploadTime || Date.now()),
      status: item.reportData ? '已上报' : '已扰动',
      algorithm: item.protocol || item.reportData?.protocol || meta.algorithm
    });
  });

  return rows;
}

function buildDetailRows(submission, dataset) {
  if (!submission) return [];

  const meta = getTaskMeta(dataset.taskId);

  if (dataset.sourceType === 'batch' && Array.isArray(submission.samples)) {
    const sample = submission.samples[dataset.sampleIndex] || {};
    const reportValue = sample.perturbed_value ?? sample.report_value;
    return [{
      userId: dataset.userId,
      taskId: dataset.taskId,
      batchId: dataset.batchId,
      attribute: meta.attributeName,
      rawValue: '--',
      reportedValue: `${formatArrLabel(reportValue)}（${reportValue}）`,
      mode: meta.mode,
      algorithm: dataset.algorithm,
      uploadTime: dataset.uploadTime
    }];
  }

  const scenario = submission.rawData?.scenario;

  if (submission.reportData && (scenario === 'arr' || submission.reportData?.protocol === 'ARR')) {
    const hasRawValue = submission.rawData?.fallAlarm !== undefined && submission.rawData?.fallAlarm !== null;
    const rawValue = hasRawValue ? Number(submission.rawData.fallAlarm) : null;
    const reportValue = submission.reportData?.perturbedValue ?? submission.reportData?.reportValue;
    return [{
      userId: dataset.userId,
      taskId: dataset.taskId,
      batchId: dataset.batchId,
      attribute: meta.attributeName,
      rawValue: hasRawValue ? `${formatArrLabel(rawValue)}（${rawValue}）` : '--',
      reportedValue: `${submission.reportData?.perturbedLabel || formatArrLabel(reportValue)}（${reportValue}）`,
      mode: meta.mode,
      algorithm: submission.reportData?.protocol || meta.algorithm,
      uploadTime: dataset.uploadTime
    }];
  }

  if (submission.reportData && (scenario === 'agrr' || submission.reportData?.protocol === 'AGRR')) {
    const rawMinutes = submission.original_minutes ?? submission.rawData?.standMinutes ?? '--';
    const rawBucket = submission.original_bucket || submission.rawData?.standBucket || submission.reportData?.rawBucket || '--';
    const rawCode = submission.original_bucket_code ?? submission.rawData?.standBucketCode ?? submission.reportData?.rawBucketCode ?? '--';
    const reportBucket = submission.perturbed_bucket || submission.reportData?.perturbedBucket || submission.reportData?.perturbedLabel || '--';
    const reportCode = submission.perturbed_bucket_code ?? submission.reportData?.perturbedBucketCode ?? submission.reportData?.perturbedValue ?? submission.reportData?.reportValue ?? '--';

    return [{
      userId: dataset.userId,
      taskId: dataset.taskId,
      batchId: dataset.batchId,
      attribute: meta.attributeName,
      rawValue: `${rawMinutes} 分钟 -> ${formatAgrrLabel(rawBucket, rawCode)}`,
      reportedValue: formatAgrrLabel(reportBucket, reportCode),
      mode: meta.mode,
      algorithm: submission.reportData?.protocol || meta.algorithm,
      uploadTime: dataset.uploadTime
    }];
  }

  if (submission.reportData && (scenario === 'tsp' || submission.reportData?.protocol === 'TSP')) {
    const originalMissing = submission.original_missing ?? submission.rawData?.sleepMissing ?? '--';
    const originalScore = submission.original_score ?? submission.rawData?.sleepScore ?? null;
    const stage1Result = submission.stage1_result ?? submission.reportData?.stageOneResult;
    const stage2Input = submission.stage2_input ?? submission.reportData?.stageTwoInput;
    const reportValue = submission.report_value ?? submission.reportData?.reportValue ?? submission.reportData?.perturbedValue;

    const rawParts = [
      `缺失状态：${formatTspMissingLabel(originalMissing)}`,
      `原始评分：${originalScore == null ? '--' : `${originalScore} 分`}`,
      `第一阶段：${stage1Result === 'skipped' || stage1Result == null ? 'skipped' : `${stage1Result} 分`}`,
      `第二阶段输入：${formatTspValue(stage2Input)}`
    ];

    return [{
      userId: dataset.userId,
      taskId: dataset.taskId,
      batchId: dataset.batchId,
      attribute: meta.attributeName,
      rawValue: rawParts.join(' / '),
      reportedValue: formatTspValue(reportValue),
      mode: meta.mode,
      algorithm: submission.reportData?.protocol || meta.algorithm,
      uploadTime: dataset.uploadTime
    }];
  }

  return [{
    userId: dataset.userId,
    taskId: dataset.taskId,
    batchId: dataset.batchId,
    attribute: meta.attributeName,
    rawValue: '--',
    reportedValue: '--',
    mode: meta.mode,
    algorithm: dataset.algorithm,
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
  tspDetailSections.value = dataset.algorithm === 'TSP'
    ? buildTspDetailSections(submission, dataset)
    : [];
  detailDrawerVisible.value = true;
}

function startAggregation() {
  ElMessage.success('开始聚合估计');
  const query = {};
  if (selectedTaskId.value) {
    query.taskId = selectedTaskId.value;
  }
  if (
    selectedDataset.value?.taskId
    && String(selectedDataset.value.taskId) === String(selectedTaskId.value)
    && selectedDataset.value?.batchId
    && selectedDataset.value.batchId !== '--'
  ) {
    query.batchId = selectedDataset.value.batchId;
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
    selectedDataset.value = null;
    dataDetails.value = [];
    tspDetailSections.value = [];
    detailDrawerVisible.value = false;
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
