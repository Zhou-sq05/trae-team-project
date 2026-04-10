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
                    <el-table :data="tableAttributes" style="width: 100%">
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
                          <el-tag :type="scope.row.configStatus === '已配置' ? 'success' : 'info'">
                            {{ scope.row.configStatus }}
                          </el-tag>
                        </template>
                      </el-table-column>
                      <el-table-column label="操作" width="180">
                        <template #default="scope">
                          <div class="action-cell">
                            <el-button type="primary" link @click="handleAttributeClick(scope.row)">
                              {{ scope.row.configStatus === '已配置' ? '编辑配置' : '配置' }}
                            </el-button>
                            <el-button
                              v-if="scope.row.configStatus === '已配置'"
                              type="danger"
                              link
                              @click="handleDeleteConfig(scope.row)"
                            >
                              删除
                            </el-button>
                          </div>
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
      width="860px"
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

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">S 与 A 的条件分布矩阵 Pr(A|S)</h3>
              <el-button type="primary" plain :loading="matrixLoading" @click="recalculateMatrix">
                {{ fallAlarmMatrixData ? '重新计算' : '计算条件分布矩阵' }}
              </el-button>
            </div>

            <div v-if="matrixLoading" class="matrix-loading">
              <span>正在根据当前 CSV 重新统计条件分布矩阵...</span>
            </div>
            <div v-else-if="fallAlarmMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>年龄段分组(S) \ 是否触发异常跌倒告警(A)</th>
                    <th
                      v-for="header in matrixHeaders"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isSelectedColumn(header) }]"
                    >
                      <div class="header-cell">
                        <span>{{ header }}</span>
                        <el-tag v-if="isSelectedColumn(header)" size="small" type="success" effect="light">αβ来源</el-tag>
                      </div>
                    </th>
                    <th class="row-sum-column">行和</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in matrixRows" :key="row.s">
                    <th>{{ row.s }}</th>
                    <td
                      v-for="header in matrixHeaders"
                      :key="header"
                      :class="['matrix-value-column', { 'highlight-column': isSelectedColumn(header) }]"
                    >
                      {{ formatProbability(row[header]) }}
                    </td>
                    <td class="row-sum-column">{{ formatProbability(rowSum(row)) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="matrix-placeholder">
              <p>点击“计算条件分布矩阵”后，将根据当前测试 CSV 自动统计 Pr(A|S)。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">计算依据</h3>
            <div v-if="columnStats.length" class="basis-card">
              <table class="basis-table">
                <thead>
                  <tr>
                    <th>候选列</th>
                    <th>max</th>
                    <th>min</th>
                    <th>ratio</th>
                    <th>是否选中</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="stat in columnStats" :key="stat.label">
                    <td>{{ stat.label }}</td>
                    <td>{{ formatProbability(stat.max) }}</td>
                    <td>{{ formatProbability(stat.min) }}</td>
                    <td>{{ formatRatio(stat.ratio) }}</td>
                    <td>
                      <el-tag v-if="alphaBetaResult?.selectedLabel === stat.label" size="small" type="success" effect="light">
                        已选
                      </el-tag>
                      <span v-else class="muted-text">未选</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="final-selection-card">
                <div class="final-selection-title">最终选择结果</div>
                <div class="final-selection-line">最终选定列：{{ alphaBetaResult?.selectedLabel }}</div>
                <div class="final-selection-line">
                  选择原因：该列对应 ratio = {{ formatRatio(selectedColumnRatio) }}，大于另一列的 {{ formatRatio(unselectedColumnRatio) }}，因此作为 α、β 来源列。
                </div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>矩阵尚未计算，暂时无法展示 max / min / ratio 的比较结果。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">内在不确定性参数</h3>
            <div v-if="alphaBetaResult" class="result-grid">
              <div class="result-panel accent-panel">
                <div class="result-label">选定列</div>
                <div class="result-value">{{ alphaBetaResult.selectedLabel }}</div>
                <div class="result-subtext">后续 α、β 都基于这一列的条件概率推导。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">α（最大条件概率）</div>
                <div class="result-value">{{ formatProbability(alphaBetaResult.alpha) }}</div>
                <div class="result-subtext">在选定列中，对所有年龄段取最大的 Pr(A=a*|S=s)。</div>
              </div>
              <div class="result-panel">
                <div class="result-label">β（最小条件概率）</div>
                <div class="result-value">{{ formatProbability(alphaBetaResult.beta) }}</div>
                <div class="result-subtext">在选定列中，对所有年龄段取最小的 Pr(A=a*|S=s)。</div>
              </div>
            </div>
            <div v-else class="empty-state-panel">
              <p>条件分布矩阵计算完成后，这里会自动展示 α、β 的结果，无需额外点击计算。</p>
            </div>
          </div>

          <div class="module-group">
            <h3 class="module-title">隐私预算 ε</h3>
            <div class="epsilon-card">
              <div class="epsilon-item">
                <span class="epsilon-label">当前隐私预算</span>
                <el-input v-model.number="dialogPrivacyBudget" placeholder="请输入隐私预算" style="width: 200px" />
              </div>
              <el-button type="primary" @click="savePrivacyBudget">保存 ε</el-button>
            </div>
            <div class="epsilon-hint">当前校准将使用 ε = {{ savedPrivacyBudget }}</div>
          </div>

          <div class="module-group">
            <div class="section-header">
              <h3 class="module-title">扰动参数重校准</h3>
              <el-button type="primary" :loading="calibrationLoading" @click="calibrateParams">校准扰动参数</el-button>
            </div>
            <div class="result-grid compact-grid">
              <div class="result-panel">
                <div class="result-label">p（保持概率）</div>
                <div class="result-value">{{ calibratedParams ? calibratedParams.p : '--' }}</div>
              </div>
              <div class="result-panel">
                <div class="result-label">q（翻转概率）</div>
                <div class="result-value">{{ calibratedParams ? calibratedParams.q : '--' }}</div>
              </div>
            </div>
            <div class="calibration-tip">由 ε、α、β 自动校准</div>
            <div class="calibration-tip">满足 p + q = 1</div>
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
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleDialogCancel">取消</el-button>
          <el-button type="primary" :disabled="!canSaveCurrentConfig" @click="handleSaveAttributeConfig">
            保存配置
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowDown, DataAnalysis, Delete, Document, House, QuestionFilled, Setting } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useAttributeConfigStore } from '../../store/attributeConfig';
import { useTaskStore } from '../../store/task';
import { useUserStore } from '../../store/user';
import {
  AGE_GROUP_DISPLAY,
  FALL_ALARM_DATA_PATH,
  FALL_ALARM_ORDER,
  buildMatrixRows,
  calculateAlphaBeta,
  loadFallAlarmMatrixFromCSV
} from '../../utils/fallAlarmMatrix.js';
import { calculateARRParameters } from '../../utils/ldpAlgorithms.js';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const taskStore = useTaskStore();
const attributeConfigStore = useAttributeConfigStore();

const activeMenu = computed(() => route.path);
const user = computed(() => userStore.user);

const activeTab = ref('basic');
const selectedAttributeId = ref(null);
const dialogVisible = ref(false);
const currentAttribute = ref(null);
const taskId = ref('');
const customTaskId = ref('');
const hasGeneratedMatrix = ref(false);
const privacyBudgetSaved = ref(false);

const basicConfig = ref({
  dataSource: '模拟数据',
  privacyBudget: 1.0
});

const dialogPrivacyBudget = ref(1.0);
const savedPrivacyBudget = ref(1.0);

const attributes = ref([
  {
    id: 1,
    name: '睡眠时长',
    isProtected: false,
    protectionMode: 'indirect',
    algorithm: 'aoue',
    status: '未配置',
    fixed: true,
    tooltip: '睡眠时长与血压存在关联关系，保留原有间接隐私风险配置。'
  },
  {
    id: 2,
    name: '是否触发异常跌倒告警',
    isProtected: false,
    protectionMode: 'indirect',
    algorithm: 'arr',
    status: '未配置',
    fixed: true,
    tooltip: '是否触发异常跌倒告警与年龄段分组存在关联关系，固定采用间接隐私风险配置。'
  },
  { id: 3, name: '日均站立时长分档', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置', fixed: false, tooltip: '' },
  { id: 4, name: '每日步数分档', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置', fixed: false, tooltip: '' },
  { id: 5, name: '睡眠质量评分', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置', fixed: false, tooltip: '' }
]);

const ageGroupDisplay = AGE_GROUP_DISPLAY;
const matrixHeaders = FALL_ALARM_ORDER;

const tableAttributes = computed(() =>
  attributes.value.map(attribute => ({
    ...attribute,
    configStatus: attributeConfigStore.hasConfigById(attribute.id) ? '已配置' : '未配置'
  }))
);

const matrixLoading = ref(false);
const fallAlarmMatrixData = ref(null);
const alphaBetaResult = ref(null);
const columnStats = ref([]);
const calibrationLoading = ref(false);
const calibratedParams = ref(null);

const matrixRows = computed(() => buildMatrixRows(fallAlarmMatrixData.value));
const selectedColumnRatio = computed(() => alphaBetaResult.value?.selectedStat?.ratio ?? null);
const unselectedColumnRatio = computed(() => {
  if (!alphaBetaResult.value) return null;
  const other = columnStats.value.find(stat => stat.label !== alphaBetaResult.value.selectedLabel);
  return other?.ratio ?? null;
});
const canSaveCurrentConfig = computed(() => {
  if (!currentAttribute.value) return false;

  if (currentAttribute.value.name === '是否触发异常跌倒告警') {
    return Boolean(
      hasGeneratedMatrix.value &&
      alphaBetaResult.value &&
      privacyBudgetSaved.value &&
      calibratedParams.value
    );
  }

  return true;
});

watch(selectedAttributeId, value => {
  attributes.value.forEach(attribute => {
    attribute.isProtected = attribute.id === value;
  });
});

watch(dialogVisible, visible => {
  if (!visible) {
    resetMatrixState();
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

function formatRatio(value) {
  if (!Number.isFinite(value)) return 'Infinity';
  return Number(value).toFixed(4);
}

function rowSum(row) {
  return matrixHeaders.reduce((sum, header) => sum + (row[header] || 0), 0);
}

function isSelectedColumn(header) {
  return alphaBetaResult.value?.selectedLabel === header;
}

function savePrivacyBudget() {
  const nextValue = Number(dialogPrivacyBudget.value);
  if (!Number.isFinite(nextValue) || nextValue <= 0) {
    ElMessage.warning('请输入大于 0 的隐私预算');
    return;
  }

  savedPrivacyBudget.value = nextValue;
  basicConfig.value.privacyBudget = nextValue;
  privacyBudgetSaved.value = true;
  calibratedParams.value = null;
  ElMessage.success('隐私预算已保存');
}

function resetMatrixState() {
  fallAlarmMatrixData.value = null;
  alphaBetaResult.value = null;
  columnStats.value = [];
  calibratedParams.value = null;
  hasGeneratedMatrix.value = false;
  privacyBudgetSaved.value = false;
  dialogPrivacyBudget.value = basicConfig.value.privacyBudget;
  savedPrivacyBudget.value = basicConfig.value.privacyBudget;
}

function buildCurrentConfigPayload() {
  return {
    attributeName: currentAttribute.value?.name || '',
    matrixData: fallAlarmMatrixData.value,
    columnStats: columnStats.value,
    alphaBetaResult: alphaBetaResult.value,
    selectedColumnLabel: alphaBetaResult.value?.selectedLabel || '',
    epsilon: savedPrivacyBudget.value,
    epsilonDraft: dialogPrivacyBudget.value,
    privacyBudgetSaved: privacyBudgetSaved.value,
    calibratedParams: calibratedParams.value,
    notes: {
      dataPath: FALL_ALARM_DATA_PATH,
      selectedColumnRatio: selectedColumnRatio.value,
      unselectedColumnRatio: unselectedColumnRatio.value
    }
  };
}

function applySavedConfig(config) {
  fallAlarmMatrixData.value = config?.matrixData || null;
  columnStats.value = config?.columnStats || [];
  alphaBetaResult.value = config?.alphaBetaResult || null;
  calibratedParams.value = config?.calibratedParams || null;
  hasGeneratedMatrix.value = Boolean(config?.matrixData && config?.alphaBetaResult);
  privacyBudgetSaved.value = Boolean(config?.privacyBudgetSaved);
  dialogPrivacyBudget.value = config?.epsilonDraft ?? config?.epsilon ?? basicConfig.value.privacyBudget;
  savedPrivacyBudget.value = config?.epsilon ?? basicConfig.value.privacyBudget;
}

function resetDialogForAttribute(attribute) {
  resetMatrixState();

  const savedConfig = attributeConfigStore.getConfigById(attribute.id);
  if (savedConfig) {
    applySavedConfig(savedConfig);
  }
}

async function recalculateMatrix() {
  matrixLoading.value = true;
  calibratedParams.value = null;

  try {
    const { matrix } = await loadFallAlarmMatrixFromCSV(FALL_ALARM_DATA_PATH);
    fallAlarmMatrixData.value = matrix;
    const result = calculateAlphaBeta(matrix);
    alphaBetaResult.value = result;
    columnStats.value = result.stats;
    hasGeneratedMatrix.value = true;
    ElMessage.success('条件分布矩阵已刷新');
  } catch (error) {
    console.error('重算条件分布矩阵失败:', error);
    ElMessage.error('重算条件分布矩阵失败');
  } finally {
    matrixLoading.value = false;
  }
}

async function handleAttributeClick(attribute) {
  currentAttribute.value = attribute;
  resetDialogForAttribute(attribute);
  dialogVisible.value = true;
}

function calibrateParams() {
  if (!alphaBetaResult.value) {
    ElMessage.warning('请先计算条件分布矩阵');
    return;
  }

  if (!privacyBudgetSaved.value) {
    ElMessage.warning('请先填写并保存隐私预算 ε');
    return;
  }

  calibrationLoading.value = true;

  try {
    const epsilon = Number(savedPrivacyBudget.value) || 1.0;
    const k = matrixHeaders.length;
    const { p, q } = calculateARRParameters(alphaBetaResult.value.alpha, alphaBetaResult.value.beta, epsilon, k);

    calibratedParams.value = {
      p: Number(p).toFixed(4),
      q: Number(q).toFixed(4),
      epsilon,
      k,
      protocol: 'ARR (Adaptive Randomized Response)',
      description: `基于 ${alphaBetaResult.value.selectedLabel} 列自动校准扰动参数。`,
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

function handleDialogCancel() {
  dialogVisible.value = false;
}

function handleSaveAttributeConfig() {
  if (!currentAttribute.value) {
    return;
  }

  if (!canSaveCurrentConfig.value) {
    ElMessage.warning('请先完成矩阵、α/β、ε 和扰动参数校准后再保存配置');
    return;
  }

  attributeConfigStore.saveConfig(currentAttribute.value.id, buildCurrentConfigPayload());
  dialogVisible.value = false;
  ElMessage.success('配置已保存');
}

function handleDeleteConfig(attribute) {
  ElMessageBox.confirm('确认删除当前配置吗？删除后将恢复为未配置状态。', '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      attributeConfigStore.deleteConfig(attribute.id);

      if (currentAttribute.value?.id === attribute.id) {
        resetMatrixState();
        dialogVisible.value = false;
      }

      ElMessage.success('配置已删除');
    })
    .catch(() => {});
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
  attributeConfigStore.loadFromLocalStorage();
  dialogPrivacyBudget.value = basicConfig.value.privacyBudget;
  savedPrivacyBudget.value = basicConfig.value.privacyBudget;
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

.action-cell {
  display: flex;
  align-items: center;
  gap: 8px;
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
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.boundary-group,
.module-group {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background-color: #fff;
}

.boundary-title,
.module-title {
  font-weight: 700;
  font-size: 16px;
  color: #303133;
  margin: 0 0 14px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
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
.empty-details,
.empty-state-panel {
  text-align: center;
  padding: 24px;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.matrix-container {
  overflow-x: auto;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 560px;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #dfe6ee;
  padding: 10px;
  text-align: center;
}

.matrix-table th {
  background-color: #f7f9fc;
  font-weight: 700;
}

.matrix-table td {
  font-family: 'Courier New', monospace;
}

.header-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.matrix-value-column.highlight-column {
  background-color: #edf5ff;
}

.row-sum-column {
  background-color: #fafbfc !important;
  color: #9aa4b2;
  font-weight: 500 !important;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.compact-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.result-panel {
  padding: 14px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #f8fbff;
}

.accent-panel {
  border-color: #bfd7ff;
  background: #eef5ff;
}

.result-label {
  font-size: 13px;
  color: #5f6b7a;
  margin-bottom: 8px;
}

.result-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2d3d;
}

.result-subtext {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7785;
}

.basis-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fbff;
  border: 1px solid #dfe6ee;
}

.basis-table {
  width: 100%;
  border-collapse: collapse;
}

.basis-table th,
.basis-table td {
  border-bottom: 1px solid #e7edf4;
  padding: 10px 8px;
  text-align: left;
  color: #425466;
}

.basis-table th {
  color: #1f2d3d;
  font-weight: 700;
}

.basis-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  color: #425466;
}

.basis-name {
  min-width: 120px;
  font-weight: 700;
  color: #1f2d3d;
}

.selected-reason {
  font-weight: 700;
  color: #214c9b;
  border-top: 1px dashed #cfd8e3;
  padding-top: 10px;
}

.final-selection-card {
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #eef5ff;
  border: 1px solid #bfd7ff;
}

.final-selection-title {
  font-weight: 700;
  color: #1f2d3d;
  margin-bottom: 6px;
}

.final-selection-line {
  color: #214c9b;
  font-weight: 600;
  line-height: 1.6;
}

.muted-text {
  color: #98a2b3;
}

.epsilon-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #f8fbff;
}

.epsilon-item {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.epsilon-label {
  font-weight: 700;
  color: #425466;
}

.epsilon-hint,
.calibration-tip {
  font-size: 13px;
  color: #7b8794;
  margin-top: 8px;
}

.calibration-info {
  margin-top: 12px;
  padding: 12px 14px;
  background-color: #f0fff4;
  border-left: 4px solid #67c23a;
  border-radius: 4px;
}

.calibration-info p {
  margin: 5px 0;
  color: #303133;
}

.calibration-info .formula {
  font-family: 'Courier New', monospace;
  color: #606266;
  font-style: italic;
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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 768px) {
  .section-header,
  .epsilon-card {
    flex-direction: column;
    align-items: stretch;
  }

  .result-grid,
  .compact-grid {
    grid-template-columns: 1fr;
  }

  .action-cell,
  .dialog-footer {
    justify-content: flex-start;
  }
}
</style>
