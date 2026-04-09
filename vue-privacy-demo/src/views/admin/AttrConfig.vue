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
              {{ user?.username || '管理员' }} <el-icon class="el-icon--right"><arrow-down /></el-icon>
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
              <el-icon><house /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/admin/attr-config">
              <el-icon><setting /></el-icon>
              <span>属性配置</span>
            </el-menu-item>
            <el-menu-item index="/admin/dataset">
              <el-icon><document /></el-icon>
              <span>数据集列表</span>
            </el-menu-item>
            <el-menu-item index="/admin/aggregate">
              <el-icon><data-analysis /></el-icon>
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
                      <h3>隐私预算ε</h3>
                      <el-input v-model.number="basicConfig.privacyBudget" placeholder="请输入隐私预算" />
                    </div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="属性配置" name="attributes">
                  <div class="attr-config">
                    <el-table :data="attributes" style="width: 100%">
                      <el-table-column prop="name" label="采集属性">
                        <template #default="scope">
                          <span @click="handleAttributeClick(scope.row)" style="cursor: pointer; text-decoration: underline; color: #409EFF;">
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
                          <el-select v-model="scope.row.protectionMode" placeholder="待选择" @change="handleProtectionModeChange(scope.row)" :disabled="selectedAttributeId !== scope.row.id">
                            <el-option label="间接隐私风险防护" value="indirect" />
                            <el-option label="混合隐私风险防护" value="hybrid" />
                          </el-select>
                        </template>
                      </el-table-column>
                      <el-table-column label="算法协议" width="120">
                        <template #default="scope">
                          <el-select v-model="scope.row.algorithm" placeholder="默认" :disabled="selectedAttributeId !== scope.row.id">
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
                      <el-table-column prop="id" label="任务ID" />
                      <el-table-column label="创建时间" width="200">
                        <template #default="scope">
                          {{ new Date(scope.row.createdAt).toLocaleString() }}
                        </template>
                      </el-table-column>
                      <el-table-column prop="dataSource" label="数据来源" width="120" />
                      <el-table-column prop="privacyBudget" label="隐私预算" width="100" />
                      <el-table-column label="操作" width="100">
                        <template #default="scope">
                          <el-button 
                            type="danger" 
                            size="small" 
                            @click="deleteTask(scope.row)"
                          >
                            <el-icon><delete /></el-icon>
                          </el-button>
                        </template>
                      </el-table-column>
                    </el-table>
                  </div>
                </el-tab-pane>
              </el-tabs>
              
              <div class="config-footer" v-if="activeTab === 'attributes'">
                <div class="task-id-input">
                  <span>任务ID：</span>
                  <el-input v-model="customTaskId" placeholder="请输入任务ID，留空则自动生成" style="width: 300px; margin-right: 10px" />
                </div>
                <el-button type="primary" @click="saveConfig">保存</el-button>
                <el-button @click="distributePolicy">下发隐私策略</el-button>
                <el-alert
                  v-if="taskId"
                  :title="`任务ID: ${taskId}`"
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
    
    <!-- 属性详情弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentAttribute ? currentAttribute.name + ' 详情' : '属性详情'"
      width="800px"
    >
      <div v-if="currentAttribute" style="font-size: 16px;">
        <!-- 睡眠时长的详细内容 -->
        <div v-if="currentAttribute.name === '睡眠时长'" class="attribute-details">
          <div class="form-item" style="display: flex; flex-direction: row; justify-content: left; align-items: center;">
            <span style="font-weight: bold; ">相关敏感属性 S：</span>
            <span style="font-weight: bold; margin-left: 10px;">血压</span>
          </div>
          
          <!-- 分组边界设置 -->
          <div class="form-item">
            <label>分组边界设置：</label>
            <div class="boundary-settings">
              <!-- 睡眠时长分组 -->
              <div class="boundary-group">
                <div class="boundary-title">睡眠时长分组</div>
                <div class="boundary-inputs">
                  <div class="input-item">
                    <span>b值：</span>
                    <el-input-number v-model="sleepBoundaries.b" :min="1" :max="23" :precision="1" :step="0.5" style="width: 115px;" />
                    <span>小时</span>
                  </div>
                  <div class="input-item">
                    <span>c值：</span>
                    <el-input-number v-model="sleepBoundaries.c" :min="1" :max="24" :precision="1" :step="0.5" style="width: 115px;" />
                    <span>小时</span>
                  </div>
                </div>
                <div class="group-display">
                  <div v-for="group in sleepGroups" :key="group.name" class="group-item">
                    <span class="group-name">{{ group.name }}：</span>
                    <span class="group-range">{{ group.range }}</span>
                  </div>
                </div>
              </div>
              
              <!-- 血压分组 -->
              <div class="boundary-group">
                <div class="boundary-title">血压分组</div>
                <div class="boundary-inputs">
                  <div class="input-item">
                    <span>正常血压下限：</span>
                    <el-input-number v-model="bpBoundaries.normal" :min="60" :max="100" :precision="0" style="width: 115px;" />
                    <span>mmHg</span>
                  </div>
                  <div class="input-item">
                    <span>高血压下限：</span>
                    <el-input-number v-model="bpBoundaries.high" :min="100" :max="160" :precision="0" style="width: 115px;" />
                    <span>mmHg</span>
                  </div>
                </div>
                <div class="group-display">
                  <div v-for="group in bpGroups" :key="group.name" class="group-item">
                    <span class="group-name">{{ group.name }}：</span>
                    <span class="group-range">{{ group.range }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-item">
            <label>S与A的条件分布矩阵 Pr(A|S)：</label>
            <div v-if="matrixLoading" class="matrix-loading">
              <el-loading-spinner />
              <span>正在计算...</span>
            </div>
            <div v-else-if="conditionalMatrixData" class="matrix-container">
              <table class="matrix-table">
                <thead>
                  <tr>
                    <th>血压分组(S) \ 睡眠分组(A)</th>
                    <th v-for="header in matrixHeaders" :key="header">{{ header }}</th>
                    <th>行和</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in matrixRows" :key="index">
                    <th>{{ row.s }}</th>
                    <td v-for="header in matrixHeaders" :key="header">
                      {{ row[header].toFixed(4) }}
                    </td>
                    <td>{{ matrixHeaders.reduce((sum, h) => sum + row[h], 0).toFixed(4) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="matrix-placeholder">
              <p>点击"计算矩阵"按钮或重新打开弹窗以显示数据</p>
            </div>
          </div>
          
          <div class="form-item">
            <label>内在不确定性计算：</label>
            <div class="uncertainty-container">
              <div class="uncertainty-item">
                <label>α：</label>
                <el-input 
                  v-model="alphaValue" 
                  style="width: 100px;" 
                  readonly 
                  placeholder="点击计算"
                />
              </div>
              <div class="uncertainty-item">
                <label>β：</label>
                <el-input 
                  v-model="betaValue" 
                  style="width: 100px;" 
                  readonly 
                  placeholder="点击计算"
                />
              </div>
              <el-button 
                type="primary" 
                style="margin-left: 20px;" 
                :loading="uncertaintyLoading"
                @click="calculateUncertainty"
              >
                计算
              </el-button>
            </div>
            <div v-if="alphaValue !== null" class="uncertainty-info">
              <p>α = max_s min_a Pr(A|S) = {{ alphaValue }}</p>
              <p>β = min_s max_a Pr(A|S) = {{ betaValue }}</p>
            </div>
          </div>
          
          <div class="form-item">
            <label>扰动参数重校准（间接隐私风险 - RR协议）：</label>
            <div class="calibration-container">
              <div class="calibration-item">
                <div class="param-group single-group">
                  <div class="param-item">
                    <label>p（保持概率）：</label>
                    <el-input 
                      :model-value="calibratedParams ? calibratedParams.p : ''" 
                      style="width: 100px;" 
                      readonly 
                      placeholder="点击校准"
                    />
                  </div>
                  <div class="param-item">
                    <label>q（翻转概率）：</label>
                    <el-input 
                      :model-value="calibratedParams ? calibratedParams.q : ''" 
                      style="width: 100px;" 
                      readonly 
                      placeholder="点击校准"
                    />
                  </div>
                </div>
              </div>
              <el-button 
                type="primary" 
                style="margin-left: 20px;" 
                :loading="calibrationLoading"
                @click="calibrateParams"
              >
                校准
              </el-button>
            </div>
            <div v-if="calibratedParams" class="calibration-info">
              <p>隐私预算 ε = {{ calibratedParams.epsilon }}</p>
              <p>域大小 k = {{ calibratedParams.k }}</p>
              <p>协议：{{ calibratedParams.protocol }}</p>
              <p class="formula">p = e^ε / (e^ε + k - 1), q = 1 / (e^ε + k - 1)</p>
            </div>
          </div>
        </div>
        
        <!-- 其他属性的空白内容 -->
        <div v-else class="empty-details">
          <p>该属性的详细信息正在开发中...</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
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
  font-weight: bold;
}

.matrix-container {
  margin-top: 10px;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.matrix-table th {
  background-color: #f5f7fa;
}

.uncertainty-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.uncertainty-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.calibration-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 10px;
}

.calibration-item {
  display: flex;
  gap: 20px;
}

.param-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
</style>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { House, Setting, Document, DataAnalysis, ArrowDown, Monitor, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../store/user'
import { useTaskStore } from '../../store/task'
import { loadCSVFile, processDataToTwoColumns, calculateConditionalProbabilityMatrix } from '../../utils/dataProcessor'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const taskStore = useTaskStore()
const activeMenu = computed(() => route.path)
const user = computed(() => userStore.user)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// 激活的标签页
const activeTab = ref('basic')

// 基础配置
const basicConfig = ref({
  dataSource: '模拟数据',
  privacyBudget: 1.0
})

// 选中的属性ID（单选模式）
const selectedAttributeId = ref(null)

// 模拟属性数据
const attributes = ref([
  { id: 1, name: '睡眠时长', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' },
  { id: 2, name: '日均步数', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' },
  { id: 3, name: '近7天运动频次', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' },
  { id: 4, name: '平均静息心率', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' },
  { id: 5, name: '今日感觉', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' }
])

// 当选中属性变化时，更新isProtected状态
const updateProtectionStatus = () => {
  attributes.value.forEach(attr => {
    attr.isProtected = attr.id === selectedAttributeId.value
  })
}

// 监听选中属性变化
watch(selectedAttributeId, () => {
  updateProtectionStatus()
})

// 处理单选按钮变化
const handleRadioChange = (id) => {
  selectedAttributeId.value = id
}

// 弹窗相关状态
const dialogVisible = ref(false)
const currentAttribute = ref(null)

// 睡眠时长分组边界
const sleepBoundaries = ref({
  b: 7,  // 睡眠不足与正常睡眠的分界
  c: 10  // 正常睡眠与睡眠过多的分界
})

// 血压分组边界
const bpBoundaries = ref({
  normal: 90,   // 低血压与正常血压的分界
  high: 120     // 正常血压与高血压的分界
})

// 计算睡眠时长分组显示
const sleepGroups = computed(() => {
  const { b, c } = sleepBoundaries.value
  return [
    { name: '睡眠不足', range: `0h ~ ${b}h` },
    { name: '正常睡眠', range: `${b}h ~ ${c}h` },
    { name: '睡眠过多', range: `${c}h ~ 24h` }
  ]
})

// 计算血压分组显示
const bpGroups = computed(() => {
  const { normal, high } = bpBoundaries.value
  return [
    { name: '低血压', range: `<${normal}` },
    { name: '正常血压', range: `${normal}-${high-1}` },
    { name: '高血压', range: `≥${high}` }
  ]
})

// 条件概率矩阵数据
const conditionalMatrixData = ref(null)
const matrixLoading = ref(false)

// 根据用户设置的分组边界对数据进行分组
const getCustomSleepGroup = (sleepDuration) => {
  const { b, c } = sleepBoundaries.value
  if (sleepDuration < b) return '睡眠不足'
  if (sleepDuration < c) return '正常睡眠'
  return '睡眠过多'
}

const getCustomBPGroup = (bloodPressure) => {
  const { normal, high } = bpBoundaries.value
  if (bloodPressure < normal) return '低血压'
  if (bloodPressure < high) return '正常血压'
  return '高血压'
}

// 基于自定义分组边界计算条件概率矩阵
const calculateCustomMatrix = (rawData) => {
  // 统计联合频率 N(S,A)
  const jointCounts = {}
  const sCounts = {}
  
  rawData.forEach(row => {
    const sleepDuration = parseFloat(row['Sleep Duration'])
    const bloodPressure = row['Blood Pressure']
    const [systolic] = bloodPressure.split('/').map(Number)
    
    const s = getCustomBPGroup(systolic)
    const a = getCustomSleepGroup(sleepDuration)
    
    // 初始化联合计数
    if (!jointCounts[s]) {
      jointCounts[s] = {}
    }
    if (!jointCounts[s][a]) {
      jointCounts[s][a] = 0
    }
    jointCounts[s][a]++
    
    // 统计S的总数
    if (!sCounts[s]) {
      sCounts[s] = 0
    }
    sCounts[s]++
  })
  
  // 计算条件概率 P(A|S) = N(S,A) / N(S)
  const conditionalProbs = {}
  
  Object.keys(jointCounts).forEach(s => {
    conditionalProbs[s] = {}
    const totalCount = sCounts[s]
    
    Object.keys(jointCounts[s]).forEach(a => {
      conditionalProbs[s][a] = jointCounts[s][a] / totalCount
    })
  })
  
  return {
    conditionalProbs,
    jointCounts,
    sCounts
  }
}

// 计算条件概率矩阵
const calculateMatrix = async () => {
  matrixLoading.value = true
  try {
    const csvContent = await loadCSVFile('/data/Sleep_Health_and_Lifestyle_Dataset.csv')
    if (csvContent) {
      // 解析原始数据
      const lines = csvContent.split('\n')
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      const rawData = []
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim())
        const row = {}
        headers.forEach((h, idx) => row[h] = values[idx])
        rawData.push(row)
      }
      
      // 使用自定义分组边界计算矩阵
      const matrixResult = calculateCustomMatrix(rawData)
      conditionalMatrixData.value = matrixResult
    }
  } catch (error) {
    console.error('计算条件概率矩阵失败:', error)
    ElMessage.error('计算条件概率矩阵失败')
  } finally {
    matrixLoading.value = false
  }
}

// 获取矩阵的表头（A的分组）- 按照睡眠分组的逻辑顺序
const matrixHeaders = computed(() => {
  if (!conditionalMatrixData.value) return []
  const aGroups = [...new Set(
    Object.values(conditionalMatrixData.value.conditionalProbs).flatMap(probs => Object.keys(probs))
  )]
  // 按照逻辑顺序排序：睡眠不足、正常睡眠、睡眠过多
  const order = { '睡眠不足': 0, '正常睡眠': 1, '睡眠过多': 2 }
  return aGroups.sort((a, b) => {
    const orderA = order[a] !== undefined ? order[a] : 99
    const orderB = order[b] !== undefined ? order[b] : 99
    return orderA - orderB
  })
})

// 获取矩阵的行数据 - 按照血压分组的逻辑顺序
const matrixRows = computed(() => {
  if (!conditionalMatrixData.value) return []
  const sGroups = Object.keys(conditionalMatrixData.value.conditionalProbs)
  const aGroups = matrixHeaders.value
  
  // 按照逻辑顺序排序：低血压、正常血压、高血压
  const order = { '低血压': 0, '正常血压': 1, '高血压': 2 }
  const sortedSGroups = sGroups.sort((a, b) => {
    const orderA = order[a] !== undefined ? order[a] : 99
    const orderB = order[b] !== undefined ? order[b] : 99
    return orderA - orderB
  })
  
  return sortedSGroups.map(s => {
    const row = { s }
    aGroups.forEach(a => {
      row[a] = conditionalMatrixData.value.conditionalProbs[s][a] || 0
    })
    return row
  })
})

// 监听分组边界变化，自动重新计算矩阵
watch([sleepBoundaries, bpBoundaries], () => {
  if (currentAttribute.value?.name === '睡眠时长' && dialogVisible.value) {
    calculateMatrix()
    // 清空之前的计算结果
    alphaValue.value = null
    betaValue.value = null
    calibratedParams.value = null
  }
}, { deep: true })

// 处理属性点击事件
const handleAttributeClick = (attribute) => {
  currentAttribute.value = attribute
  dialogVisible.value = true
  // 如果点击的是睡眠时长，自动计算矩阵
  if (attribute.name === '睡眠时长') {
    calculateMatrix()
  }
}

// 内在不确定性参数
const alphaValue = ref(null)
const betaValue = ref(null)
const uncertaintyLoading = ref(false)

// 计算内在不确定性参数 α 和 β
// α = max_s min_a Pr(A=a|S=s) - 最小条件概率的最大值
// β = min_s max_a Pr(A=a|S=s) - 最大条件概率的最小值
const calculateUncertainty = () => {
  if (!conditionalMatrixData.value) {
    ElMessage.warning('请先等待条件概率矩阵计算完成')
    return
  }
  
  uncertaintyLoading.value = true
  
  try {
    const conditionalProbs = conditionalMatrixData.value.conditionalProbs
    const sGroups = Object.keys(conditionalProbs)
    
    let minProbMax = 0  // α = max_s min_a Pr(A|S)
    let maxProbMin = 1  // β = min_s max_a Pr(A|S)
    
    sGroups.forEach(s => {
      const probs = Object.values(conditionalProbs[s])
      const minProb = Math.min(...probs)
      const maxProb = Math.max(...probs)
      
      // α: 对每个S，找到最小概率，然后取这些最小值中的最大值
      if (minProb > minProbMax) {
        minProbMax = minProb
      }
      
      // β: 对每个S，找到最大概率，然后取这些最大值中的最小值
      if (maxProb < maxProbMin) {
        maxProbMin = maxProb
      }
    })
    
    alphaValue.value = minProbMax
    betaValue.value = maxProbMin
    
    ElMessage.success('内在不确定性参数计算完成')
  } catch (error) {
    console.error('计算内在不确定性失败:', error)
    ElMessage.error('计算内在不确定性失败')
  } finally {
    uncertaintyLoading.value = false
  }
}

// 扰动参数重校准结果
const calibratedParams = ref(null)
const calibrationLoading = ref(false)

// 扰动参数重校准（间接隐私风险 - 只有一组p和q）
// 使用RR (Randomized Response) 协议: p = e^ε / (e^ε + k - 1), q = 1 / (e^ε + k - 1)
const calibrateParams = () => {
  if (!conditionalMatrixData.value) {
    ElMessage.warning('请先等待条件概率矩阵计算完成')
    return
  }
  
  calibrationLoading.value = true
  
  try {
    // 获取A的分组数量（睡眠分组数）
    const aGroups = matrixHeaders.value
    const k = aGroups.length  // 域大小
    
    // 隐私预算 ε (可以从基础配置中获取，这里使用默认值1.0)
    const epsilon = basicConfig.value.privacyBudget || 1.0
    
    // RR协议参数计算
    const expEpsilon = Math.exp(epsilon)
    const p = expEpsilon / (expEpsilon + k - 1)  // 保持概率
    const q = 1 / (expEpsilon + k - 1)  // 翻转概率
    
    calibratedParams.value = {
      p: p.toFixed(4),
      q: q.toFixed(4),
      epsilon: epsilon,
      k: k,
      protocol: 'RR (Randomized Response)'
    }
    
    ElMessage.success('扰动参数重校准完成')
  } catch (error) {
    console.error('扰动参数校准失败:', error)
    ElMessage.error('扰动参数校准失败')
  } finally {
    calibrationLoading.value = false
  }
}



// 生成的任务ID
const taskId = ref('')

// 自定义任务ID
const customTaskId = ref('')

// 处理防护模式变化
const handleProtectionModeChange = (row) => {
  if (row.protectionMode === 'indirect' || row.protectionMode === 'hybrid') {
    row.algorithm = 'agrr'
  }
}

// 保存配置
const saveConfig = () => {
  // 验证是否选择了属性
  if (!selectedAttributeId.value) {
    ElMessage.warning('请选择一个属性参与保护')
    return
  }
  
  // 验证并生成任务ID
  let newTaskId = ''
  
  if (customTaskId.value.trim()) {
    // 使用自定义任务ID
    const trimmedTaskId = customTaskId.value.trim()
    
    // 输入验证
    if (trimmedTaskId.length > 50) {
      ElMessage.warning('任务ID长度不能超过50个字符')
      return
    }
    
    // 检查特殊字符
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedTaskId)) {
      ElMessage.warning('任务ID只能包含字母、数字、下划线和连字符')
      return
    }
    
    // 检查唯一性
    const isDuplicate = taskStore.taskList.some(task => task.id === trimmedTaskId)
    if (isDuplicate) {
      ElMessage.warning('任务ID已存在，请使用其他任务ID')
      return
    }
    
    newTaskId = trimmedTaskId
  } else {
    // 自动生成任务ID
    const today = new Date()
    const dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0')
    newTaskId = `Task_${dateStr}_${Date.now()}`
  }
  
  taskId.value = newTaskId
  
  // 更新属性状态
  attributes.value.forEach(attr => {
    if (attr.id === selectedAttributeId.value && attr.protectionMode) {
      attr.status = '已配置'
    } else {
      attr.status = '未配置'
    }
  })
  
  // 创建任务对象
  const newTask = {
    id: newTaskId,
    createdAt: new Date().toISOString(),
    dataSource: basicConfig.value.dataSource,
    privacyBudget: basicConfig.value.privacyBudget,
    attributes: JSON.parse(JSON.stringify(attributes.value))
  }
  
  // 添加到任务列表
  taskStore.addTask(newTask)
  
  // 清空自定义任务ID输入
  customTaskId.value = ''
  
  // 模拟保存成功
  ElMessage.success('配置保存成功，任务ID已生成')
}

// 下发隐私策略
const distributePolicy = () => {
  if (!taskId.value) {
    ElMessage.warning('请先保存配置生成任务ID')
    return
  }
  
  if (!selectedAttributeId.value) {
    ElMessage.warning('请选择一个属性参与保护')
    return
  }
  
  // 模拟下发成功
  ElMessage.success('隐私策略下发成功')
}

// 删除任务
const deleteTask = (task) => {
  ElMessageBox.confirm(
    `确定要删除任务 ${task.id} 吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    taskStore.deleteTask(task.id)
    ElMessage.success('任务删除成功')
  }).catch(() => {
    // 取消删除
  })
}

// 初始化
onMounted(() => {
  // 加载任务数据
  taskStore.loadFromLocalStorage()
})
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

.basic-config {
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

.attr-config {
  padding: 20px 0;
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

/* 属性详情弹窗样式 */
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
  font-weight: bold;
}

.matrix-container {
  margin-top: 10px;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}

.matrix-table th {
  background-color: #f5f7fa;
}

.uncertainty-container {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.uncertainty-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.calibration-container {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 10px;
}

.calibration-item {
  display: flex;
  gap: 20px;
}

.param-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.param-group.single-group {
  flex-direction: row;
  gap: 20px;
}

.empty-details {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

/* 不确定性计算信息样式 */
.uncertainty-info {
  margin-top: 10px;
  padding: 10px 15px;
  background-color: #f0f9ff;
  border-left: 4px solid #409EFF;
  border-radius: 4px;
}

.uncertainty-info p {
  margin: 5px 0;
  color: #303133;
  font-family: 'Courier New', monospace;
}

/* 校准信息样式 */
.calibration-info {
  margin-top: 10px;
  padding: 10px 15px;
  background-color: #f0fff4;
  border-left: 4px solid #67C23A;
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
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #dcdfe6;
}

/* 分组边界设置样式 */
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
  font-weight: bold;
  font-size: 16px;
  color: #303133;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.boundary-inputs {
  display: flex;
  gap: 30px;
  margin-bottom: 15px;
}

.input-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-item span {
  color: #606266;
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
  font-weight: bold;
  color: #303133;
  min-width: 100px;
}

.group-range {
  color: #409EFF;
  font-weight: 500;
}

/* 矩阵加载和占位样式 */
.matrix-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #909399;
}

.matrix-placeholder {
  text-align: center;
  padding: 40px;
  color: #909399;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-top: 10px;
}

.matrix-container {
  margin-top: 10px;
  overflow-x: auto;
}

.matrix-table {
  border-collapse: collapse;
  width: 100%;
  min-width: 400px;
}

.matrix-table th,
.matrix-table td {
  border: 1px solid #ddd;
  padding: 10px;
  text-align: center;
}

.matrix-table th {
  background-color: #f5f7fa;
  font-weight: bold;
}

.matrix-table td {
  font-family: 'Courier New', monospace;
}
</style>