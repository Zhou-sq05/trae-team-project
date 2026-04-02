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
                    <el-option 
                      v-for="task in tasks" 
                      :key="task.id" 
                      :label="task.id" 
                      :value="task.id"
                    />
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
                    <el-tag type="success">{{ scope.row.status }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="数据详情" width="100">
                  <template #default="scope">
                    <el-button size="small" @click="viewDataDetail(scope.row)">查看</el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <!-- 分页控件 -->
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
                    <el-option 
                      v-for="task in tasks" 
                      :key="task.id" 
                      :label="task.id" 
                      :value="task.id"
                    />
                  </el-select>
                  <span class="hint">(预先生成真实分布作为基准)</span>
                </div>
                <div class="generate-buttons">
                  <el-button type="primary" @click="generateData">生成数据</el-button>
                  <el-button type="success" @click="startAggregation">开始聚合估计</el-button>
                </div>
              </div>
            </el-card>
            
            <!-- 数据详情表格 -->
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
                <el-table-column prop="attribute" label="属性名" />
                <el-table-column prop="perturbedValue" label="扰动后值" />
                <el-table-column prop="mode" label="模式" width="100" />
                <el-table-column prop="algorithm" label="算法" width="100" />
                <el-table-column prop="uploadTime" label="上传时间" />
              </el-table>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { House, Setting, Document, DataAnalysis, ArrowDown, Monitor } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../store/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const activeMenu = computed(() => route.path)
const user = computed(() => userStore.user)

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// 数据集数据
const datasets = ref([])

// 总数据数
const totalDataCount = computed(() => filteredDatasets.value.length)

// 表格引用和选中行
const tableRef = ref(null)
const selectedRows = ref([])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)

// 过滤后的数据
const filteredDatasets = computed(() => {
  if (!filterTaskId.value) {
    return datasets.value
  }
  return datasets.value.filter(item => item.taskId === filterTaskId.value)
})

// 分页后的数据
const paginatedDatasets = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return filteredDatasets.value.slice(startIndex, endIndex)
})

// 批量生成人数
const generateCount = ref('10')

// 任务列表
const tasks = ref([])

// 选中的任务ID
const selectedTaskId = ref('')

// 过滤任务ID
const filterTaskId = ref('')

// 选中的数据集
const selectedDataset = ref(null)

// 数据详情
const dataDetails = ref([])

// 加载状态
const loading = ref(false)

// 从本地存储加载数据
const loadDataFromStorage = () => {
  loading.value = true
  try {
    // 从本地存储获取数据
    const storedData = localStorage.getItem('submittedData')
    if (storedData) {
      const parsedData = JSON.parse(storedData)
      // 处理数据，确保只显示扰动后的数据
      datasets.value = parsedData.map((item, index) => ({
        id: index + 1,
        userId: item.userId || `用户${String(index + 1).padStart(3, '0')}`,
        taskId: item.taskId,
        uploadTime: new Date(item.uploadTime || Date.now()).toLocaleString(),
        status: '已扰动'
      }))
    } else {
      // 如果没有数据，使用默认模拟数据
      datasets.value = [
        { id: 1, userId: '用户001', taskId: 'Task_20260330', uploadTime: '2026/3/30 21:52', status: '已扰动' },
        { id: 2, userId: '用户002', taskId: 'Task_20260330', uploadTime: '2026/3/30 22:15', status: '已扰动' },
        { id: 3, userId: '用户003', taskId: 'Task_20260330', uploadTime: '2026/3/30 23:01', status: '已扰动' }
      ]
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
    // 使用默认模拟数据
    datasets.value = [
      { id: 1, userId: '用户001', taskId: 'Task_20260330', uploadTime: '2026/3/30 21:52', status: '已扰动' },
      { id: 2, userId: '用户002', taskId: 'Task_20260330', uploadTime: '2026/3/30 22:15', status: '已扰动' },
      { id: 3, userId: '用户003', taskId: 'Task_20260330', uploadTime: '2026/3/30 23:01', status: '已扰动' }
    ]
  } finally {
    loading.value = false
  }
}

// 加载任务列表
const loadTasks = () => {
  try {
    // 从本地存储加载任务数据
    const taskStore = JSON.parse(localStorage.getItem('taskStore') || '{}')
    const taskList = taskStore.taskList || []
    
    // 同时检查另一种存储方式
    const tasksFromLocal = JSON.parse(localStorage.getItem('tasks') || '[]')
    
    // 合并两种来源的任务
    const allTasks = [...taskList, ...tasksFromLocal]
    
    // 去重
    const uniqueTasks = []
    const taskIds = new Set()
    
    allTasks.forEach(task => {
      if (task.id && !taskIds.has(task.id)) {
        uniqueTasks.push(task)
        taskIds.add(task.id)
      }
    })
    
    // 按创建时间排序，最新的在前
    uniqueTasks.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0)
      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0)
      return dateB - dateA
    })
    
    tasks.value = uniqueTasks
    
    // 默认选择最新的任务
    if (uniqueTasks.length > 0) {
      selectedTaskId.value = uniqueTasks[0].id
    }
  } catch (error) {
    console.error('加载任务列表失败:', error)
  }
}

// 刷新数据
const refreshData = () => {
  loading.value = true
  // 模拟网络请求延迟
  setTimeout(() => {
    loadDataFromStorage()
    loadTasks() // 同时刷新任务列表
    ElMessage.success('数据刷新成功')
  }, 500)
}

// 查看数据详情
const viewDataDetail = (dataset) => {
  selectedDataset.value = dataset
  
  // 从本地存储获取详细数据
  try {
    const storedData = localStorage.getItem('submittedData')
    if (storedData) {
      const parsedData = JSON.parse(storedData)
      const userData = parsedData.find(item => item.userId === dataset.userId && item.taskId === dataset.taskId)
      
      if (userData && userData.perturbedData) {
        // 使用实际的扰动后数据
        dataDetails.value = Object.entries(userData.perturbedData).map(([key, value], index) => ({
          userId: dataset.userId,
          taskId: dataset.taskId,
          attribute: getAttributeName(key),
          perturbedValue: value.toString(),
          mode: '差分隐私',
          algorithm: 'Laplace',
          uploadTime: dataset.uploadTime
        }))
      } else {
        // 使用模拟数据详情
        generateMockDataDetails(dataset)
      }
    } else {
      // 使用模拟数据详情
      generateMockDataDetails(dataset)
    }
  } catch (error) {
    console.error('加载数据详情失败:', error)
    ElMessage.error('加载数据详情失败')
    // 使用模拟数据详情
    generateMockDataDetails(dataset)
  }
}

// 生成模拟数据详情
const generateMockDataDetails = (dataset) => {
  dataDetails.value = [
    {
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: '睡眠时长',
      perturbedValue: (7 + Math.random() * 2).toFixed(1),
      mode: '差分隐私',
      algorithm: 'Laplace',
      uploadTime: dataset.uploadTime
    },
    {
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: '日均步数',
      perturbedValue: (10000 + Math.random() * 5000).toFixed(0),
      mode: '差分隐私',
      algorithm: 'Laplace',
      uploadTime: dataset.uploadTime
    },
    {
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: '近7天运动频次',
      perturbedValue: (3 + Math.floor(Math.random() * 4)).toString(),
      mode: '差分隐私',
      algorithm: 'Laplace',
      uploadTime: dataset.uploadTime
    },
    {
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: '平均静息心率',
      perturbedValue: (60 + Math.floor(Math.random() * 30)).toString(),
      mode: '差分隐私',
      algorithm: 'Laplace',
      uploadTime: dataset.uploadTime
    },
    {
      userId: dataset.userId,
      taskId: dataset.taskId,
      attribute: '今日感觉',
      perturbedValue: ['good', 'normal', 'tired'][Math.floor(Math.random() * 3)],
      mode: '差分隐私',
      algorithm: 'Laplace',
      uploadTime: dataset.uploadTime
    }
  ]
}

// 获取属性名
const getAttributeName = (key) => {
  const attributeMap = {
    sleepHours: '睡眠时长',
    dailySteps: '日均步数',
    exerciseFrequency: '近7天运动频次',
    heartRate: '平均静息心率',
    mood: '今日感觉'
  }
  return attributeMap[key] || key
}

// 生成数据
const generateData = () => {
  if (!selectedTaskId.value) {
    ElMessage.warning('请选择任务ID')
    return
  }
  
  loading.value = true
  // 模拟生成数据
  setTimeout(() => {
    const count = parseInt(generateCount.value)
    const generatedData = []
    
    for (let i = 0; i < count; i++) {
      const userId = `模拟用户${String(datasets.value.length + i + 1).padStart(3, '0')}`
      const taskId = selectedTaskId.value
      const uploadTime = new Date().toLocaleString()
      
      generatedData.push({
        id: datasets.value.length + i + 1,
        userId,
        taskId,
        uploadTime,
        status: '已扰动'
      })
    }
    
    // 添加到数据集
    datasets.value = [...datasets.value, ...generatedData]
    
    // 保存到本地存储
    try {
      const storedData = localStorage.getItem('submittedData') || '[]'
      const existingData = JSON.parse(storedData)
      const newData = generatedData.map(item => {
        // 生成原始数据
        const rawSleepHours = (7 + Math.random() * 2).toFixed(1)
        const rawDailySteps = (10000 + Math.random() * 5000).toFixed(0)
        const rawExerciseFrequency = (3 + Math.floor(Math.random() * 4)).toString()
        const rawHeartRate = (60 + Math.floor(Math.random() * 30)).toString()
        const rawMood = ['good', 'normal', 'tired'][Math.floor(Math.random() * 3)]
        
        return {
          userId: item.userId,
          taskId: item.taskId,
          uploadTime: item.uploadTime,
          rawData: {
            sleepHours: rawSleepHours,
            dailySteps: rawDailySteps,
            exerciseFrequency: rawExerciseFrequency,
            heartRate: rawHeartRate,
            mood: rawMood
          },
          perturbedData: {
            sleepHours: rawSleepHours,
            dailySteps: rawDailySteps,
            exerciseFrequency: rawExerciseFrequency,
            heartRate: rawHeartRate,
            mood: rawMood
          },
          epsilon: 1.0 // 添加隐私预算
        }
      })
      localStorage.setItem('submittedData', JSON.stringify([...existingData, ...newData]))
    } catch (error) {
      console.error('保存数据失败:', error)
    }
    
    ElMessage.success(`已为任务 ${selectedTaskId.value} 生成 ${count} 人的模拟数据`)
    loading.value = false
  }, 1000)
}

// 开始聚合估计
const startAggregation = () => {
  ElMessage.success('开始聚合估计')
  // 跳转到聚合结果页面
  router.push('/admin/aggregate')
}

// 分页处理函数
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1 // 重置为第一页
}

const handleCurrentChange = (current) => {
  currentPage.value = current
}

// 处理选择变更
const handleSelectionChange = (val) => {
  selectedRows.value = val
}

// 选择全部数据
const selectAllData = () => {
  if (tableRef.value) {
    // 先清空现有选择
    tableRef.value.clearSelection()
    // 然后选择过滤后的数据
    filteredDatasets.value.forEach(row => {
      tableRef.value.toggleRowSelection(row, true)
    })
  }
}

// 批量删除
const batchDelete = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择要删除的数据')
    return
  }
  
  ElMessageBox.confirm('确定要删除选中的数据吗？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 从本地存储中获取数据
    const storedData = JSON.parse(localStorage.getItem('submittedData') || '[]')
    console.log('删除前本地存储数据:', storedData)
    
    // 筛选出不包含选中行的数据
    const updatedData = storedData.filter(item => {
      const isSelected = selectedRows.value.some(selected => 
        selected.userId === item.userId && selected.taskId === item.taskId
      )
      return !isSelected
    })
    
    console.log('删除后本地存储数据:', updatedData)
    
    // 更新本地存储
    localStorage.setItem('submittedData', JSON.stringify(updatedData))
    console.log('本地存储已更新')
    
    // 重新加载数据
    loadDataFromStorage()
    console.log('数据已重新加载')
    
    // 清空选择
    selectedRows.value = []
    tableRef.value.clearSelection()
    console.log('选择已清空')
    
    // 显示删除成功消息
    ElMessage.success('批量删除成功')
  }).catch(() => {
    // 取消删除
  })
}

// 监听筛选任务ID变化，同步更新批量生成任务ID
watch(filterTaskId, (newValue) => {
  if (newValue) {
    // 如果选择了特定任务ID，同步到批量生成任务ID
    selectedTaskId.value = newValue
  } else {
    // 如果选择了"全部数据"，设置为最新的任务ID
    if (tasks.value.length > 0) {
      selectedTaskId.value = tasks.value[0].id
    }
  }
})

// 初始化
onMounted(() => {
  loadDataFromStorage()
  loadTasks() // 加载任务列表
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
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.batch-operations {
  margin: 20px 0;
}

.total-data {
  font-size: 16px;
  font-weight: bold;
}

.total-count {
  color: #409eff;
  margin-left: 10px;
}

.batch-generate {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.generate-controls {
  display: flex;
  align-items: center;
}

.hint {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}

.generate-buttons {
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dataset-content {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding: 20px;
}
</style>