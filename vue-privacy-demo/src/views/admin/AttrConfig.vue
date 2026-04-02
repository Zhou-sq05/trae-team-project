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
                      <el-table-column prop="name" label="采集属性" />
                      <el-table-column label="是否参与保护" width="120">
                        <template #default="scope">
                          <el-checkbox v-model="scope.row.isProtected" />
                        </template>
                      </el-table-column>
                      <el-table-column label="防护模式" width="150">
                        <template #default="scope">
                          <el-select v-model="scope.row.protectionMode" placeholder="待选择" @change="handleProtectionModeChange(scope.row)">
                            <el-option label="间接隐私风险防护" value="indirect" />
                            <el-option label="混合隐私风险防护" value="hybrid" />
                          </el-select>
                        </template>
                      </el-table-column>
                      <el-table-column label="算法协议" width="120">
                        <template #default="scope">
                          <el-select v-model="scope.row.algorithm" placeholder="默认">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { House, Setting, Document, DataAnalysis, ArrowDown, Monitor, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../../store/user'
import { useTaskStore } from '../../store/task'

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

// 模拟属性数据
const attributes = ref([
  { id: 1, name: '睡眠时长', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' },
  { id: 2, name: '日均步数', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' },
  { id: 3, name: '近7天运动频次', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' },
  { id: 4, name: '平均静息心率', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' },
  { id: 5, name: '今日感觉', isProtected: false, protectionMode: '', algorithm: 'default', status: '未配置' }
])



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
    if (attr.isProtected && attr.protectionMode) {
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


</style>