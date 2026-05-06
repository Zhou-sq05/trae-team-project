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
          <div class="comparison-content">
            <el-card shadow="hover">
              <template #header>
                <div class="page-header">
                  <div>
                    <div class="page-title">ARR 实验效果对比</div>
                    <div class="page-desc">
                      本页面仅用于模拟实验验证。真实计数来自模拟数据生成过程，用于评估聚合算法效果；真实系统中服务器无法获得用户原始真实值。
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
                    <el-button @click="refreshRows">刷新实验数据</el-button>
                  </div>
                </div>
              </template>

              <el-empty v-if="!comparisonRows.length" description="暂无 ARR 模拟数据，请先在用户端运行 ARR 多客户端上报模拟" />

              <template v-else>
                <div class="metric-grid">
                  <div v-for="item in metricCards" :key="item.label" class="metric-card">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                </div>

                <el-table :data="comparisonRows" border style="width: 100%">
                  <el-table-column prop="label" label="取值类别" min-width="150" />
                  <el-table-column prop="trueCount" label="真实计数" min-width="120" />
                  <el-table-column prop="reportCount" label="扰动后计数" min-width="120" />
                  <el-table-column prop="newEstimate" label="新方案聚合估计值" min-width="160">
                    <template #default="scope">{{ formatNumber(scope.row.newEstimate) }}</template>
                  </el-table-column>
                  <el-table-column prop="traditionalEstimate" label="传统方案估计值" min-width="160">
                    <template #default="scope">{{ formatNumber(scope.row.traditionalEstimate) }}</template>
                  </el-table-column>
                  <el-table-column prop="newError" label="新方案误差" min-width="130">
                    <template #default="scope">{{ formatSigned(scope.row.newError) }}</template>
                  </el-table-column>
                  <el-table-column prop="traditionalError" label="传统方案误差" min-width="130">
                    <template #default="scope">{{ formatSigned(scope.row.traditionalError) }}</template>
                  </el-table-column>
                </el-table>
              </template>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
import {
  buildArrErrorMetrics,
  buildArrExperimentRows,
  getArrParams,
  getArrRecords,
  getArrTasks
} from '../../utils/arrDemoUtils';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const selectedTaskId = ref('');
const comparisonRows = ref([]);

const activeMenu = computed(() => route.path);
const user = computed(() => userStore.user);
const arrTasks = computed(() => getArrTasks(taskStore.taskList));
const selectedTask = computed(() => arrTasks.value.find(task => task.id === selectedTaskId.value) || null);
const arrParams = computed(() => getArrParams(selectedTask.value, attributeConfigStore));
const metricCards = computed(() => buildArrErrorMetrics(comparisonRows.value));

function refreshRows() {
  if (!selectedTask.value) {
    comparisonRows.value = [];
    return;
  }

  const records = getArrRecords(selectedTask.value.id);
  comparisonRows.value = buildArrExperimentRows(records, arrParams.value);
}

function formatNumber(value) {
  return Number(value || 0).toFixed(4);
}

function formatSigned(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `+${numeric.toFixed(4)}` : numeric.toFixed(4);
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

watch(selectedTaskId, refreshRows);

onMounted(() => {
  taskStore.loadFromLocalStorage();
  attributeConfigStore.loadFromLocalStorage();
  if (arrTasks.value.length > 0) {
    selectedTaskId.value = arrTasks.value[0].id;
  }
  refreshRows();
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

.comparison-content {
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
  max-width: 820px;
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

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0;
}

.metric-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  padding: 12px;
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
  font-size: 18px;
}
</style>
