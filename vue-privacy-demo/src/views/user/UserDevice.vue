<template>
  <div class="user-device-container">
    <div class="header">
      <div class="header-left">
        <h1>用户采集端</h1>
      </div>
      <div class="header-right">
        <el-dropdown>
          <span class="user-info">
            {{ user?.username || '用户' }} <el-icon class="el-icon--right"><arrow-down /></el-icon>
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
        <div class="user-info">
          <div class="user-id">用户 #001</div>
          <div class="task-id-section">
            <span>当前绑定任务ID：</span>
            <el-select v-model="currentTaskId" placeholder="选择任务ID">
              <el-option 
                v-for="task in taskList" 
                :key="task.id" 
                :label="task.id" 
                :value="task.id"
              />
            </el-select>
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
          <span>采集周期：</span>
          <span>每日24:00自动上报</span>
        </div>
      </div>
      <div class="daily-summary">
        <h3>今日行为摘要</h3>
        <div class="summary-form">
          <div class="form-item">
            <span>睡眠时长：</span>
            <el-input v-model="dailyData.sleepHours" placeholder="请输入睡眠时长" />
          </div>
          <div class="form-item">
            <span>日均步数：</span>
            <el-input v-model="dailyData.dailySteps" placeholder="请输入日均步数" />
          </div>
          <div class="form-item">
            <span>近7天运动频次：</span>
            <el-input v-model="dailyData.exerciseFrequency" placeholder="请输入运动频次" />
          </div>
          <div class="form-item">
            <span>平均静息心率：</span>
            <el-input v-model="dailyData.heartRate" placeholder="请输入心率" />
          </div>
          <div class="form-item">
            <span>今日感觉：</span>
            <el-select v-model="dailyData.mood" placeholder="请选择">
              <el-option label="良好" value="good" />
              <el-option label="一般" value="normal" />
              <el-option label="较差" value="bad" />
            </el-select>
          </div>
        </div>
      </div>
      <div class="control-buttons">
        <el-button 
          type="primary" 
          @click="refreshData"
          :disabled="refreshed"
        >
          刷新今日手环数据
        </el-button>
        <el-button 
          type="success" 
          @click="submitData"
          :loading="submitting"
        >
          提交
        </el-button>
      </div>
      <div class="bottom-buttons">
        <el-button @click="goToDashboard">返回首页</el-button>
      </div>
    </div>
    <div class="right-section">
      <h3>演示调试区域</h3>
      <div class="demo-form">
        <div class="form-item">
          <span>服务端下发任务ID：</span>
          <el-input v-model="serverTaskId" placeholder="任务ID" disabled />
        </div>
        <div class="form-item">
          <span>隐私预算：</span>
          <el-input v-model="privacyBudget" placeholder="隐私预算" disabled />
        </div>
      </div>
      <div class="raw-summary">
        <h4>原始值</h4>
        <div class="card-grid">
          <div class="summary-card" v-for="(value, key) in parsedRawSummary" :key="key">
            <div class="card-header">
              <el-icon class="card-icon"><component :is="getIcon(key)" /></el-icon>
              <div class="card-label">{{ getLabel(key) }}</div>
            </div>
            <div class="card-value">{{ formatValue(key, value) }}</div>
          </div>
        </div>
      </div>
      <div class="perturbed-summary">
        <h4>扰动值</h4>
        <div class="card-grid">
          <div class="summary-card" v-for="(value, key) in parsedPerturbedSummary" :key="key">
            <div class="card-header">
              <el-icon class="card-icon"><component :is="getIcon(key)" /></el-icon>
              <div class="card-label">{{ getLabel(key) }}</div>
            </div>
            <div class="card-value">{{ formatValue(key, value) }}</div>
          </div>
        </div>
      </div>

    </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import * as Icons from '@element-plus/icons-vue'
import { useUserStore } from '../../store/user'
import { useTaskStore } from '../../store/task'
import { ElMessage } from 'element-plus'
import {
  AGRR,
  ARR,
  AOUE,
  calculateAGRParameters,
  calculateARRParameters,
  calculateAOUEParameters,
  calculateAlphaBeta,
  generateConditionalProbs
} from '../../utils/ldpAlgorithms'

const router = useRouter()
const userStore = useUserStore()
const taskStore = useTaskStore()
const user = computed(() => userStore.user)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// 任务列表
const taskList = computed(() => {
  return taskStore.taskList.map(task => ({ id: task.id }))
})

// 当前选中的任务ID
const currentTaskId = ref('')

// 今日数据
const dailyData = reactive({
  sleepHours: '',
  dailySteps: '',
  exerciseFrequency: '',
  heartRate: '',
  mood: ''
})

// 刷新状态
const refreshed = ref(false)

// 提交状态
const submitting = ref(false)

// 服务端任务ID
const serverTaskId = ref('')

// 隐私预算
const privacyBudget = ref('')

// 原始行为摘要
const rawSummary = ref('{\n  "sleepHours": "",\n  "dailySteps": "",\n  "exerciseFrequency": "",\n  "heartRate": "",\n  "mood": ""\n}')

// 扰动后摘要
const perturbedSummary = ref('{\n  "sleepHours": "",\n  "dailySteps": "",\n  "exerciseFrequency": "",\n  "heartRate": "",\n  "mood": ""\n}')



// 系统状态：0-未扰动，1-扰动，2-已上传
const systemStatus = ref(0)

// 获取状态文本
const statusText = computed(() => {
  switch (systemStatus.value) {
    case 0:
      return '未扰动'
    case 1:
      return '扰动'
    case 2:
      return '已上传'
    default:
      return '未扰动'
  }
})

// 获取状态颜色
const statusColor = computed(() => {
  switch (systemStatus.value) {
    case 0:
      return 'red' // 红色 - 未扰动
    case 1:
      return 'yellow' // 黄色 - 扰动
    case 2:
      return 'green' // 绿色 - 已上传
    default:
      return 'red'
  }
})

// 刷新今日数据
const refreshData = () => {
  // 模拟刷新数据
  dailyData.sleepHours = '7.5'
  dailyData.dailySteps = '12500'
  dailyData.exerciseFrequency = '5'
  dailyData.heartRate = '72'
  dailyData.mood = 'good'
  
  // 更新原始行为摘要
  rawSummary.value = JSON.stringify(dailyData, null, 2)
  
  // 标记为已刷新
  refreshed.value = true
}

// 提交数据
const submitData = () => {
  submitting.value = true
  
  // 模拟提交过程
  setTimeout(() => {
    submitting.value = false
    
    // 更新服务端任务ID和隐私预算
    serverTaskId.value = currentTaskId.value
    
    // 从任务中获取隐私预算和属性配置
    const task = taskStore.taskList.find(t => t.id === currentTaskId.value)
    let epsilon = 1.0
    let taskAttributes = {}
    let taskAlgorithms = {}
    if (task) {
      epsilon = task.privacyBudget || 1.0
      privacyBudget.value = epsilon.toString()
      // 构建属性配置映射
      if (task.attributes) {
        task.attributes.forEach(attr => {
          // 映射属性名称到配置
          switch (attr.name) {
            case '睡眠时长':
              taskAttributes.sleepHours = attr.isProtected
              taskAlgorithms.sleepHours = attr.algorithm || 'agrr'
              break
            case '日均步数':
              taskAttributes.dailySteps = attr.isProtected
              taskAlgorithms.dailySteps = attr.algorithm || 'agrr'
              break
            case '近7天运动频次':
              taskAttributes.exerciseFrequency = attr.isProtected
              taskAlgorithms.exerciseFrequency = attr.algorithm || 'agrr'
              break
            case '平均静息心率':
              taskAttributes.heartRate = attr.isProtected
              taskAlgorithms.heartRate = attr.algorithm || 'agrr'
              break
            case '今日感觉':
              taskAttributes.mood = attr.isProtected
              taskAlgorithms.mood = attr.algorithm || 'agrr'
              break
          }
        })
      }
    } else {
      privacyBudget.value = '1.0'
    }
    
    // 定义域大小
    const domainSizes = {
      sleepHours: 24, // 睡眠时长 0-24小时
      dailySteps: 50000, // 步数 0-50000
      exerciseFrequency: 7, // 每周运动频次 0-7
      heartRate: 200, // 心率 0-200
      mood: 3 // 心情 0-2
    }
    
    // 映射心情值
    const moodMap = {
      good: 0,
      normal: 1,
      bad: 2
    }
    
    // 生成扰动后的数据
    const perturbedData = {
      sleepHours: taskAttributes.sleepHours ? (
        (() => {
          const algorithm = taskAlgorithms.sleepHours || 'agrr'
          const domainSize = domainSizes.sleepHours
          const rawValue = Math.round(parseFloat(dailyData.sleepHours))
          
          // 生成模拟的条件概率表
          const conditionalProbs = generateConditionalProbs(domainSize, 2)
          // 计算 alpha 和 beta 参数
          const { alpha, beta } = calculateAlphaBeta(conditionalProbs, epsilon)
          
          // 根据算法选择调用相应的扰动函数
          let perturbedValue
          switch (algorithm) {
            case 'arr':
              const arrParams = calculateARRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = ARR(rawValue, epsilon, domainSize, arrParams.p, arrParams.q)
              break
            case 'aoue':
              const aoueParams = calculateAOUEParameters(alpha, beta, epsilon)
              perturbedValue = AOUE(rawValue, epsilon, domainSize, aoueParams.q)
              // 对于AOUE，返回数组中1的索引+1
              perturbedValue = perturbedValue.indexOf(1) + 1
              break
            case 'agrr':
            default:
              const agrrParams = calculateAGRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = AGRR(rawValue, epsilon, domainSize, agrrParams.p, agrrParams.q)
              break
          }
          
          return perturbedValue.toString()
        })()
      ) : dailyData.sleepHours,
      dailySteps: taskAttributes.dailySteps ? (
        (() => {
          const algorithm = taskAlgorithms.dailySteps || 'agrr'
          const domainSize = domainSizes.dailySteps
          const rawValue = parseInt(dailyData.dailySteps)
          
          // 生成模拟的条件概率表
          const conditionalProbs = generateConditionalProbs(domainSize, 2)
          // 计算 alpha 和 beta 参数
          const { alpha, beta } = calculateAlphaBeta(conditionalProbs, epsilon)
          
          // 根据算法选择调用相应的扰动函数
          let perturbedValue
          switch (algorithm) {
            case 'arr':
              const arrParams = calculateARRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = ARR(rawValue, epsilon, domainSize, arrParams.p, arrParams.q)
              break
            case 'aoue':
              const aoueParams = calculateAOUEParameters(alpha, beta, epsilon)
              perturbedValue = AOUE(rawValue, epsilon, domainSize, aoueParams.q)
              // 对于AOUE，返回数组中1的索引+1
              perturbedValue = perturbedValue.indexOf(1) + 1
              break
            case 'agrr':
            default:
              const agrrParams = calculateAGRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = AGRR(rawValue, epsilon, domainSize, agrrParams.p, agrrParams.q)
              break
          }
          
          return perturbedValue.toString()
        })()
      ) : dailyData.dailySteps,
      exerciseFrequency: taskAttributes.exerciseFrequency ? (
        (() => {
          const algorithm = taskAlgorithms.exerciseFrequency || 'agrr'
          const domainSize = domainSizes.exerciseFrequency
          const rawValue = parseInt(dailyData.exerciseFrequency)
          
          // 生成模拟的条件概率表
          const conditionalProbs = generateConditionalProbs(domainSize, 2)
          // 计算 alpha 和 beta 参数
          const { alpha, beta } = calculateAlphaBeta(conditionalProbs, epsilon)
          
          // 根据算法选择调用相应的扰动函数
          let perturbedValue
          switch (algorithm) {
            case 'arr':
              const arrParams = calculateARRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = ARR(rawValue, epsilon, domainSize, arrParams.p, arrParams.q)
              break
            case 'aoue':
              const aoueParams = calculateAOUEParameters(alpha, beta, epsilon)
              perturbedValue = AOUE(rawValue, epsilon, domainSize, aoueParams.q)
              // 对于AOUE，返回数组中1的索引+1
              perturbedValue = perturbedValue.indexOf(1) + 1
              break
            case 'agrr':
            default:
              const agrrParams = calculateAGRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = AGRR(rawValue, epsilon, domainSize, agrrParams.p, agrrParams.q)
              break
          }
          
          return perturbedValue.toString()
        })()
      ) : dailyData.exerciseFrequency,
      heartRate: taskAttributes.heartRate ? (
        (() => {
          const algorithm = taskAlgorithms.heartRate || 'agrr'
          const domainSize = domainSizes.heartRate
          const rawValue = parseInt(dailyData.heartRate)
          
          // 生成模拟的条件概率表
          const conditionalProbs = generateConditionalProbs(domainSize, 2)
          // 计算 alpha 和 beta 参数
          const { alpha, beta } = calculateAlphaBeta(conditionalProbs, epsilon)
          
          // 根据算法选择调用相应的扰动函数
          let perturbedValue
          switch (algorithm) {
            case 'arr':
              const arrParams = calculateARRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = ARR(rawValue, epsilon, domainSize, arrParams.p, arrParams.q)
              break
            case 'aoue':
              const aoueParams = calculateAOUEParameters(alpha, beta, epsilon)
              perturbedValue = AOUE(rawValue, epsilon, domainSize, aoueParams.q)
              // 对于AOUE，返回数组中1的索引+1
              perturbedValue = perturbedValue.indexOf(1) + 1
              break
            case 'agrr':
            default:
              const agrrParams = calculateAGRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = AGRR(rawValue, epsilon, domainSize, agrrParams.p, agrrParams.q)
              break
          }
          
          return perturbedValue.toString()
        })()
      ) : dailyData.heartRate,
      mood: taskAttributes.mood ? (
        (() => {
          const algorithm = taskAlgorithms.mood || 'agrr'
          const domainSize = domainSizes.mood
          const rawValue = moodMap[dailyData.mood] + 1 // 转换为1-based索引
          
          // 生成模拟的条件概率表
          const conditionalProbs = generateConditionalProbs(domainSize, 2)
          // 计算 alpha 和 beta 参数
          const { alpha, beta } = calculateAlphaBeta(conditionalProbs, epsilon)
          
          // 根据算法选择调用相应的扰动函数
          let perturbedValue
          switch (algorithm) {
            case 'arr':
              const arrParams = calculateARRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = ARR(rawValue - 1, epsilon, domainSize, arrParams.p, arrParams.q) // ARR使用0-based
              perturbedValue += 1 // 转换回1-based
              break
            case 'aoue':
              const aoueParams = calculateAOUEParameters(alpha, beta, epsilon)
              perturbedValue = AOUE(rawValue, epsilon, domainSize, aoueParams.q)
              // 对于AOUE，返回数组中1的索引+1
              perturbedValue = perturbedValue.indexOf(1) + 1
              break
            case 'agrr':
            default:
              const agrrParams = calculateAGRParameters(alpha, beta, epsilon, domainSize)
              perturbedValue = AGRR(rawValue, epsilon, domainSize, agrrParams.p, agrrParams.q)
              break
          }
          
          // 转换回心情字符串
          return Object.keys(moodMap)[perturbedValue - 1]
        })()
      ) : dailyData.mood
    }
    
    // 更新扰动后摘要
    perturbedSummary.value = JSON.stringify(perturbedData, null, 2)
    
    // 更新系统状态为扰动
    systemStatus.value = 1
    
    // 保存数据到本地存储
    try {
      const submittedData = {
        userId: `用户001`, // 实际项目中应该使用真实的用户ID
        taskId: currentTaskId.value,
        uploadTime: new Date().toISOString(),
        rawData: { ...dailyData },
        perturbedData: perturbedData,
        epsilon: epsilon
      }
      
      // 从本地存储获取现有数据
      const storedData = localStorage.getItem('submittedData') || '[]'
      const existingData = JSON.parse(storedData)
      
      // 添加新数据
      existingData.push(submittedData)
      
      // 保存回本地存储
      localStorage.setItem('submittedData', JSON.stringify(existingData))
      
      // 更新系统状态为已上传
      systemStatus.value = 2
      
      ElMessage.success('数据提交成功')
    } catch (error) {
      console.error('保存数据失败:', error)
      ElMessage.error('数据提交失败')
    }
    

  }, 1000)
}



// 返回首页
const goToDashboard = () => {
  router.push('/')
}

// 初始化
onMounted(() => {
  // 加载任务数据
  taskStore.loadFromLocalStorage()
  
  // 如果有任务，默认选择第一个
  if (taskStore.taskList.length > 0) {
    currentTaskId.value = taskStore.taskList[0].id
  }
})

// 解析原始行为摘要
const parsedRawSummary = computed(() => {
  try {
    return JSON.parse(rawSummary.value)
  } catch (e) {
    return {}
  }
})

// 解析扰动后摘要
const parsedPerturbedSummary = computed(() => {
  try {
    return JSON.parse(perturbedSummary.value)
  } catch (e) {
    return {}
  }
})

// 获取标签
const getLabel = (key) => {
  const labels = {
    sleepHours: '睡眠时长',
    dailySteps: '日均步数',
    exerciseFrequency: '运动频次',
    heartRate: '静息心率',
    mood: '今日感觉'
  }
  return labels[key] || key
}

// 格式化值
const formatValue = (key, value) => {
  if (!value) return '-'  
  switch (key) {
    case 'sleepHours':
      return value + ' 小时'
    case 'dailySteps':
      return value + ' 步'
    case 'exerciseFrequency':
      return value + ' 次/周'
    case 'heartRate':
      return value + ' BPM'
    case 'mood':
      const moodMap = {
        good: '良好',
        normal: '一般',
        bad: '较差'
      }
      return moodMap[value] || value
    default:
      return value
  }
}

// 获取图标
const getIcon = (key) => {
  const icons = {
    sleepHours: 'Moon',
    dailySteps: 'Position',
    exerciseFrequency: 'Timer',
    heartRate: 'Operation',
    mood: 'ChatLineSquare'
  }
  return Icons[icons[key]] || null
}
</script>

<style scoped>
.user-device-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  box-sizing: border-box;
}

.header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  margin-bottom: 20px;
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

.content {
  flex: 1;
  display: flex;
  padding: 0 20px 20px;
  box-sizing: border-box;
  gap: 20px;
}

.left-section {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  padding: 30px;
  display: flex;
  flex-direction: column;
}

.right-section {
  flex: 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  padding: 30px;
  display: flex;
  flex-direction: column;
}

.user-info {
  margin-bottom: 30px;
}

.user-id {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 15px;
}

.task-id-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-info {
  margin-bottom: 30px;
}

.info-item {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
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
  transition: all 0.3s ease;
}

.status-indicator.red {
  background-color: #f56c6c;
  box-shadow: 0 0 10px rgba(245, 108, 108, 0.6);
}

.status-indicator.yellow {
  background-color: #e6a23c;
  box-shadow: 0 0 10px rgba(230, 162, 60, 0.6);
}

.status-indicator.green {
  background-color: #67c23a;
  box-shadow: 0 0 10px rgba(103, 194, 58, 0.6);
}

.daily-summary {
  margin-bottom: 30px;
  flex: 1;
}

.daily-summary h3 {
  margin-bottom: 20px;
}

.summary-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-item span {
  width: 120px;
  font-weight: 500;
}

.form-item .el-input {
  flex: 1;
}

.control-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
}

.bottom-buttons {
  margin-top: auto;
}

.right-section h3 {
  margin-bottom: 20px;
}

.demo-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 30px;
}

.raw-summary,
.perturbed-summary {
  margin-bottom: 20px;
}

.raw-summary h4,
.perturbed-summary h4 {
  margin-bottom: 10px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.summary-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-icon {
  font-size: 16px;
  color: #409eff;
}

.card-label {
  font-size: 14px;
  color: #606266;
}

.card-value {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-top: 4px;
}


</style>