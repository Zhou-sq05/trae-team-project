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
          </el-menu>
        </el-aside>

        <el-main>
          <div class="config-content">
            <el-card shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>配置面板</span>
                </div>
              </template>

              <el-tabs v-model="activeTab">
                <el-tab-pane label="基础配置" name="basic">
                  <div class="basic-config">
                    <div class="config-section">
                      <h3>数据采集选择</h3>
                      <el-radio-group v-model="basicConfig.dataSource">
                        <el-radio label="模拟数据">模拟数据</el-radio>
                        <el-radio label="手环采集">手环采集</el-radio>
                        <el-radio label="导入">导入</el-radio>
                      </el-radio-group>
                    </div>
                    <div class="config-section">
                      <h3>隐私预算 ε</h3>
                      <el-input v-model.number="basicConfig.privacyBudget" placeholder="请输入隐私预算" />
                    </div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="属性配置" name="attributes">
                  <div class="attr-config">
                    <el-table :data="attributes" style="width: 100%">
                      <el-table-column prop="name" label="采集属性">
                        <template #default="scope">
                          <span class="attribute-link" @click="handleAttributeClick(scope.row)">
                            {{ scope.row.name }}
                          </span>
                        </template>
                      </el-table-column>
                      <el-table-column label="参与保护" width="120">
                        <template #default="scope">
                          <el-radio v-model="selectedAttributeId" :label="scope.row.id" />
                        </template>
                      </el-table-column>
                      <el-table-column label="防护模式" width="150">
                        <template #default="scope">
                          <div v-if="scope.row.fixed" class="fixed-value">
                            <el-tag type="primary">间接隐私风险</el-tag>
                            <el-tooltip :content="scope.row.tooltip">
                              <el-icon><QuestionFilled /></el-icon>
                            </el-tooltip>
                          </div>
                          <el-select
                            v-else
                            v-model="scope.row.protectionMode"
                            placeholder="待选择"
                            :disabled="selectedAttributeId !== scope.row.id"
                            @change="handleProtectionModeChange(scope.row)"
                          >
                            <el-option label="间接隐私风险防护" value="indirect" />
                            <el-option label="混合隐私风险防护" value="hybrid" />
                          </el-select>
                        </template>
                      </el-table-column>
                      <el-table-column label="算法协议" width="140">
                        <template #default="scope">
                          <div v-if="scope.row.fixed" class="fixed-value">
                            <el-tag type="success">{{ scope.row.algorithm.toUpperCase() }}</el-tag>
                          </div>
                          <el-select
                            v-else
                            v-model="scope.row.algorithm"
                            placeholder="默认"
                            :disabled="selectedAttributeId !== scope.row.id"
                          >
                            <el-option label="ARR" value="arr" />
                            <el-option label="AGRR" value="agrr" />
                            <el-option label="AOUE" value="aoue" />
                          </el-select>
                        </template>
                      </el-table-column>
                      <el-table-column label="状态" width="100">
                        <template #default="scope">
                          <el-tag :type="scope.row.status === '已配置' ? 'success' : 'info'">
                            {{ scope.row.status }}
                          </el-tag>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="任务管理" name="tasks">
                  <div class="task-management">
                    <el-table :data="taskStore.taskList" style="width: 100%">
                      <el-table-column prop="id" label="任务 ID" />
                      <el-table-column label="创建时间" width="200">
                        <template #default="scope">
                          {{ new Date(scope.row.createdAt).toLocaleString() }}
                        </template>
                      </el-table-column>
                      <el-table-column prop="dataSource" label="数据来源" width="120" />
                      <el-table-column prop="privacyBudget" label="隐私预算" width="100" />
                      <el-table-column label="操作" width="100">
                        <template #default="scope">
                          <el-button type="danger" size="small" @click="deleteTask(scope.row)">
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </el-tab-pane>
              </el-tabs>

              <div v-if="activeTab === 'attributes'" class="config-footer">
                <div class="task-id-input">
                  <span>任务 ID：</span>
                  <el-input
                    v-model="customTaskId"
                    placeholder="请输入任务 ID，留空则自动生成"
                    style="width: 300px; margin-right: 10px"
                  />
                </div>
                <el-button type="primary" @click="saveConfig">保存</el-button>
                <el-button @click="distributePolicy">下发隐私策略</el-button>
                <el-alert
                  v-if="taskId"
                  :title="`任务 ID: ${taskId}`"
                  type="success"
                  show-icon
                  style="margin-top: 20px"
                />
              </div>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>

    <el-dialog
      v-model="dialogVisible"
      :title="currentAttribute ? `${currentAttribute.name} 详情` : '属性详情'"
      width="820px"
    >
      <div v-if="currentAttribute" class="attribute-details">
        <div v-if="currentAttribute.name === '是否触发异常跌倒告警'" class="attribute-details">
          <div class="form-item relation-row">
            <span class="relation-label">相关敏感属性 S：</span>
            <span class="relation-value">年龄段分组</span>
          </div>

          <div class="form-item">
            <label>年龄段分组</label>
            <div class="boundary-settings">
              <div class="boundary-group">
                <div class="boundary-title">年龄段分组</div>
                <div class="group-display">
                  <div v-for="group in ageGroupDisplay" :key="group.name" class="group-item">
                    <span class="group-name">{{ group.name }}</span>
                    <span class="group-range">{{ group.range }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-item">
            <label>S 与 A 的条件分布矩阵 Pr(A|S)</label>
            <div v-if="matrixLoading" class="matrix-loading">
              <span>正在从测试 CSV 统计矩阵...</span>
            </div>
            <div v-else-if="fallAlarmMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>年龄段分组(S) \ 是否触发异常跌倒告警(A)</th>
                    <th v-for="header in matrixHeaders" :key="header">{{ header }}</th>
                    <th>行和</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in matrixRows" :key="row.s">
                    <th>{{ row.s }}</th>
                    <td v-for="header in matrixHeaders" :key="header">
                      {{ formatProbability(row[header]) }}
                    </td>
                    <td>{{ formatProbability(rowSum(row)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="matrix-placeholder">
              <p>暂无矩阵数据，请重新打开弹窗或检查测试 CSV。</p>
            </div>
          </div>

          <div class="form-item">
            <label>内在不确定性计算</label>
            <div class="uncertainty-container">
              <div class="uncertainty-item">
                <label>α：</label>
                <el-input :model-value="displayAlpha" style="width: 120px" readonly placeholder="点击计算" />
              </div>
              <div class="uncertainty-item">
                <label>β：</label>
                <el-input :model-value="displayBeta" style="width: 120px" readonly placeholder="点击计算" />
              </div>
              <el-button type="primary" :loading="uncertaintyLoading" @click="calculateUncertainty">
                计算
              </el-button>
            </div>
            <div v-if="alphaValue !== null" class="uncertainty-info">
              <p>α = max_s min_a Pr(A=a|S=s) = {{ displayAlpha }}</p>
              <p>β = min_s max_a Pr(A=a|S=s) = {{ displayBeta }}</p>
            </div>
          </div>

          <div class="form-item">
            <label>扰动参数重校准（间接隐私风险 - ARR 协议）</label>
            <div class="calibration-container">
              <div class="calibration-item">
                <div class="param-group single-group">
                  <div class="param-item">
                    <label>p（保持概率）：</label>
                    <el-input :model-value="calibratedParams?.p || ''" style="width: 120px" readonly placeholder="点击校准" />
                  </div>
                  <div class="param-item">
                    <label>q（翻转概率）：</label>
                    <el-input :model-value="calibratedParams?.q || ''" style="width: 120px" readonly placeholder="点击校准" />
                  </div>
                </div>
              </div>
              <el-button type="primary" :loading="calibrationLoading" @click="calibrateParams">
                校准
              </el-button>
            </div>
            <div v-if="calibratedParams" class="calibration-info">
              <p>隐私预算 ε = {{ calibratedParams.epsilon }}</p>
              <p>域大小 k = {{ calibratedParams.k }}</p>
              <p>协议 = {{ calibratedParams.protocol }}</p>
              <p class="formula">p = e^ε / (e^ε + k - 1), q = 1 / (e^ε + k - 1)</p>
              <p>{{ calibratedParams.description }}</p>
              <p>数据源：{{ calibratedParams.dataSource }}</p>
            </div>
          </div>
        </div>

        <div v-else-if="currentAttribute.name === '睡眠时长'" class="attribute-details">
          <div class="form-item relation-row">
            <span class="relation-label">相关敏感属性 S：</span>
            <span class="relation-value">血压</span>
          </div>
          <div class="form-item">
            <label>分组说明</label>
            <div class="boundary-settings">
              <div class="boundary-group">
                <div class="boundary-title">睡眠时长分组</div>
                <div class="group-display">
                  <div class="group-item"><span class="group-name">睡眠不足</span><span class="group-range">0-7 小时</span></div>
                  <div class="group-item"><span class="group-name">正常睡眠</span><span class="group-range">7-10 小时</span></div>
                  <div class="group-item"><span class="group-name">睡眠过多</span><span class="group-range">10-24 小时</span></div>
                </div>
              </div>
              <div class="boundary-group">
                <div class="boundary-title">血压分组</div>
                <div class="group-display">
                  <div class="group-item"><span class="group-name">低血压</span><span class="group-range">&lt;90 mmHg</span></div>
                  <div class="group-item"><span class="group-name">正常血压</span><span class="group-range">90-119 mmHg</span></div>
                  <div class="group-item"><span class="group-name">高血压</span><span class="group-range">≥120 mmHg</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="matrix-placeholder">
            <p>该属性保留原有演示场景，本次未改动其矩阵来源。</p>
          </div>
        </div>

        <div v-else class="empty-details">
          <p>该属性的详细信息正在整理中。</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowDown, DataAnalysis, Delete, Document, House, QuestionFilled, Setting } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useTaskStore } from '../../store/task';
import { useUserStore } from '../../store/user';
import {
  AGE_GROUP_DISPLAY,
  FALL_ALARM_DATA_PATH,
  FALL_ALARM_ORDER,
  calculateAlphaBeta,
  buildMatrixRows,
  loadFallAlarmMatrixFromCSV
} from '../../utils/fallAlarmMatrix.js';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();

const activeMenu = computed(() => route.path);
const user = computed(() => userStore.user);

const activeTab = ref('basic');
const selectedAttributeId = ref(null);
const dialogVisible = ref(false);
const currentAttribute = ref(null);
const taskId = ref('');
const customTaskId = ref('');

const basicConfig = ref({
  dataSource: '模拟数据',
  privacyBudget: 1.0
});

const attributes = ref([
  {
    id: 1,
    name: '睡眠时长',
    isProtected: false,
    protectionMode: 'indirect',
    algorithm: 'aoue',
    status: '已配置',
    fixed: true,
    tooltip: '睡眠时长与血压存在关联关系，保留原有间接隐私风险配置。'
  },
  {
    id: 2,
    name: '是否触发异常跌倒告警',
    isProtected: false,
    protectionMode: 'indirect',
    algorithm: 'arr',
    status: '已配置',
    fixed: true,
    tooltip: '是否触发异常跌倒告警与年龄段分组存在关联关系，固定采用间接隐私风险配置。'
  },
  { id: 3, name: '日均站立时长分档', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置', fixed: false, tooltip: '' },
  { id: 4, name: '每日步数分档', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置', fixed: false, tooltip: '' },
  { id: 5, name: '睡眠质量评分', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置', fixed: false, tooltip: '' }
]);

const ageGroupDisplay = AGE_GROUP_DISPLAY;

const matrixLoading = ref(false);
const fallAlarmMatrixData = ref(null);
const alphaValue = ref(null);
const betaValue = ref(null);
const uncertaintyLoading = ref(false);
const calibratedParams = ref(null);
const calibrationLoading = ref(false);

const matrixHeaders = FALL_ALARM_ORDER;
const matrixRows = computed(() => buildMatrixRows(fallAlarmMatrixData.value));

const displayAlpha = computed(() => (alphaValue.value === null ? '' : formatProbability(alphaValue.value)));
const displayBeta = computed(() => (betaValue.value === null ? '' : formatProbability(betaValue.value)));

watch(selectedAttributeId, value => {
  attributes.value.forEach(attribute => {
    attribute.isProtected = attribute.id === value;
  });
});

watch(dialogVisible, visible => {
  if (!visible) {
    resetFallAlarmResults();
  }
});

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

function handleProtectionModeChange(row) {
  if (row.protectionMode === 'indirect' || row.protectionMode === 'hybrid') {
    row.algorithm = 'agrr';
  }
}

function formatProbability(value) {
  return Number(value).toFixed(4);
}

function rowSum(row) {
  return matrixHeaders.reduce((sum, header) => sum + (row[header] || 0), 0);
}

function resetFallAlarmResults() {
  fallAlarmMatrixData.value = null;
  alphaValue.value = null;
  betaValue.value = null;
  calibratedParams.value = null;
}

async function loadFallAlarmMatrix() {
  matrixLoading.value = true;
  try {
    const { matrix } = await loadFallAlarmMatrixFromCSV(FALL_ALARM_DATA_PATH);
    fallAlarmMatrixData.value = matrix;
  } catch (error) {
    console.error('加载跌倒告警条件矩阵失败:', error);
    ElMessage.error('加载跌倒告警测试矩阵失败');
  } finally {
    matrixLoading.value = false;
  }
}

async function handleAttributeClick(attribute) {
  currentAttribute.value = attribute;
  dialogVisible.value = true;
  resetFallAlarmResults();

  if (attribute.name === '是否触发异常跌倒告警') {
    await loadFallAlarmMatrix();
  }
}

function calculateUncertainty() {
  if (!fallAlarmMatrixData.value) {
    ElMessage.warning('请先等待条件分布矩阵加载完成');
    return;
  }

  uncertaintyLoading.value = true;

  try {
    const { alpha, beta } = calculateAlphaBeta(fallAlarmMatrixData.value);
    alphaValue.value = alpha;
    betaValue.value = beta;
    ElMessage.success('α、β 计算完成');
  } catch (error) {
    console.error('计算 α、β 失败:', error);
    ElMessage.error('计算 α、β 失败');
  } finally {
    uncertaintyLoading.value = false;
  }
}

function calibrateParams() {
  if (!fallAlarmMatrixData.value) {
    ElMessage.warning('请先等待条件分布矩阵加载完成');
    return;
  }

  calibrationLoading.value = true;

  try {
    const epsilon = Number(basicConfig.value.privacyBudget) || 1.0;
    const k = matrixHeaders.length;
    const expEpsilon = Math.exp(epsilon);
    const p = expEpsilon / (expEpsilon + k - 1);
    const q = 1 / (expEpsilon + k - 1);

    calibratedParams.value = {
      p: p.toFixed(4),
      q: q.toFixed(4),
      epsilon,
      k,
      protocol: 'ARR (Adaptive Randomized Response)',
      description: '对二值告警属性执行随机响应，保留值概率为 p，翻转值概率为 q。',
      dataSource: 'temp_fall_alarm_age_200.csv'
    };

    ElMessage.success('扰动参数校准完成');
  } catch (error) {
    console.error('校准扰动参数失败:', error);
    ElMessage.error('校准扰动参数失败');
  } finally {
    calibrationLoading.value = false;
  }
}

function saveConfig() {
  if (!selectedAttributeId.value) {
    ElMessage.warning('请选择一个属性参与保护');
    return;
  }

  let newTaskId = '';
  const trimmedTaskId = customTaskId.value.trim();

  if (trimmedTaskId) {
    if (trimmedTaskId.length > 50) {
      ElMessage.warning('任务 ID 长度不能超过 50 个字符');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedTaskId)) {
      ElMessage.warning('任务 ID 只允许字母、数字、下划线和中划线');
      return;
    }

    if (taskStore.taskList.some(task => task.id === trimmedTaskId)) {
      ElMessage.warning('任务 ID 已存在，请更换');
      return;
    }

    newTaskId = trimmedTaskId;
  } else {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    newTaskId = `Task_${dateStr}_${Date.now()}`;
  }

  taskId.value = newTaskId;

  attributes.value.forEach(attribute => {
    attribute.status = attribute.id === selectedAttributeId.value && attribute.protectionMode ? '已配置' : '未配置';
  });

  taskStore.addTask({
    id: newTaskId,
    createdAt: new Date().toISOString(),
    dataSource: basicConfig.value.dataSource,
    privacyBudget: basicConfig.value.privacyBudget,
    attributes: JSON.parse(JSON.stringify(attributes.value))
  });

  customTaskId.value = '';
  ElMessage.success('配置保存成功，任务已生成');
}

function distributePolicy() {
  if (!taskId.value) {
    ElMessage.warning('请先保存配置生成任务 ID');
    return;
  }

  if (!selectedAttributeId.value) {
    ElMessage.warning('请选择一个属性参与保护');
    return;
  }

  ElMessage.success('隐私策略下发成功');
}

function deleteTask(task) {
  ElMessageBox.confirm(`确定要删除任务 ${task.id} 吗？`, '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      taskStore.deleteTask(task.id);
      ElMessage.success('任务删除成功');
    })
    .catch(() => {});
}

onMounted(() => {
  taskStore.loadFromLocalStorage();
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

.config-content {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.basic-config,
.attr-config {
  padding: 20px 0;
}

.config-section {
  margin-bottom: 30px;
}

.config-section h3 {
  margin-bottom: 15px;
  font-size: 16px;
  color: #303133;
}

.attribute-link {
  cursor: pointer;
  text-decoration: underline;
  color: #409eff;
}

.config-footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.task-id-input {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.task-id-input span {
  width: 80px;
  font-weight: 500;
}

.attribute-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-item label {
  font-weight: 700;
  color: #303133;
}

.relation-row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.relation-label,
.relation-value {
  font-weight: 700;
}

.boundary-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 10px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.boundary-group {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 15px;
  background-color: #fff;
}

.boundary-title {
  font-weight: 700;
  font-size: 16px;
  color: #303133;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.group-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.group-name {
  font-weight: 700;
  color: #303133;
  min-width: 100px;
}

.group-range {
  color: #409eff;
  font-weight: 500;
}

.matrix-loading,
.matrix-placeholder,
.empty-details {
  text-align: center;
  padding: 24px;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.matrix-container {
  overflow-x: auto;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 520px;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
}

.matrix-table th {
  background-color: #f5f7fa;
  font-weight: 700;
}

.matrix-table td {
  font-family: 'Courier New', monospace;
}

.uncertainty-container,
.calibration-container {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.uncertainty-item,
.param-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calibration-item,
.param-group.single-group {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.uncertainty-info {
  margin-top: 10px;
  padding: 10px 15px;
  background-color: #f0f9ff;
  border-left: 4px solid #409eff;
  border-radius: 4px;
}

.uncertainty-info p,
.calibration-info p {
  margin: 5px 0;
  color: #303133;
}

.calibration-info {
  margin-top: 10px;
  padding: 10px 15px;
  background-color: #f0fff4;
  border-left: 4px solid #67c23a;
  border-radius: 4px;
}

.calibration-info .formula {
  font-family: 'Courier New', monospace;
  color: #606266;
  font-style: italic;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #dcdfe6;
}

.fixed-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fixed-value .el-icon {
  color: #909399;
  cursor: help;
}
</style>

