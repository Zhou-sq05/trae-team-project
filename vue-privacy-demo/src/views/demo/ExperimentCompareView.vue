<template>
  <div class="experiment-compare-page">
    <el-card shadow="hover" class="compare-card">
      <template #header>
        <div class="card-header">
          <div>
            <h2>实验效果对比</h2>
            <p>实验效果对比页开发中</p>
          </div>
          <el-button type="primary" @click="goToDashboard">返回首页</el-button>
        </div>
      </template>

      <div class="placeholder-block">
        <p>当前页面仅用于先接入路由、页面壳子和 mock 数据接口，方便并行开发。</p>
      </div>

      <div class="placeholder-block">
        <div class="section-title">Mock 接口返回示例</div>
        <pre class="mock-preview">{{ formattedMockData }}</pre>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getExperimentCompareData } from '../../api/experimentCompare'

const router = useRouter()
const mockData = ref(null)

const formattedMockData = computed(() => {
  return JSON.stringify(mockData.value, null, 2)
})

const goToDashboard = () => {
  router.push('/admin/dashboard')
}

onMounted(async () => {
  mockData.value = await getExperimentCompareData()
})
</script>

<style scoped>
.experiment-compare-page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fa;
  box-sizing: border-box;
}

.compare-card {
  max-width: 960px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.card-header p {
  margin: 8px 0 0;
  color: #606266;
}

.placeholder-block + .placeholder-block {
  margin-top: 24px;
}

.section-title {
  margin-bottom: 12px;
  font-weight: 600;
  color: #303133;
}

.mock-preview {
  margin: 0;
  padding: 16px;
  overflow-x: auto;
  border-radius: 12px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 14px;
  line-height: 1.6;
}
</style>
