<template>
  <div class="data-processor">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>数据处理工具</span>
        </div>
      </template>
      
      <div class="processor-content">
        <div class="info-section">
          <h4>数据说明</h4>
          <ul>
            <li><strong>敏感属性(S)</strong>：血压分组（低血压、正常血压、高血压前期、高血压1期、高血压2期）</li>
            <li><strong>非敏感属性(A)</strong>：睡眠时长分组（睡眠不足、正常睡眠、睡眠充足）</li>
            <li><strong>条件概率</strong>：Pr(A|S)，即在给定血压条件下，睡眠时长的概率分布</li>
          </ul>
        </div>
        
        <div class="action-section">
          <el-button type="primary" @click="processData" :loading="loading">
            处理数据
          </el-button>
          <el-button @click="downloadProcessedData" :disabled="!processedCSV">
            下载处理后的CSV
          </el-button>
        </div>
        
        <div v-if="result" class="result-section">
          <h4>处理结果</h4>
          <p>总记录数：{{ result.count }}</p>
          
          <div class="matrix-section">
            <h5>条件概率矩阵 Pr(A|S)</h5>
            <el-table :data="matrixTableData" border style="width: 100%">
              <el-table-column prop="sGroup" label="血压分组(S)" width="120" />
              <el-table-column 
                v-for="aGroup in aGroups" 
                :key="aGroup"
                :prop="aGroup" 
                :label="aGroup"
              >
                <template #default="scope">
                  {{ formatProbability(scope.row[aGroup]) }}
                </template>
              </el-table-column>
              <el-table-column prop="rowSum" label="行和" width="100">
                <template #default="scope">
                  {{ formatProbability(scope.row.rowSum) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <div class="validation-section">
            <h5>验证结果</h5>
            <el-alert
              :type="validationResult.allValid ? 'success' : 'error'"
              :title="validationResult.allValid ? '验证通过：每行概率之和均为1' : '验证失败：存在行概率之和不等于1'"
              show-icon
            />
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import {
  loadCSVFile,
  processDataToTwoColumns,
  calculateConditionalProbabilityMatrix,
  convertMatrixToArray,
  validateConditionalMatrix,
  downloadCSV
} from '../utils/saGenerator';

const loading = ref(false);
const result = ref(null);
const processedCSV = ref('');
const conditionalProbs = ref(null);
const validationResult = ref(null);

const aGroups = ref([]);

const matrixTableData = computed(() => {
  if (!conditionalProbs.value) return [];
  
  const sGroups = Object.keys(conditionalProbs.value);
  const aGroupsList = [...new Set(
    Object.values(conditionalProbs.value).flatMap(probs => Object.keys(probs))
  )];
  
  aGroups.value = aGroupsList;
  
  return sGroups.map(s => {
    const row = { sGroup: s };
    let rowSum = 0;
    
    aGroupsList.forEach(a => {
      const prob = conditionalProbs.value[s][a] || 0;
      row[a] = prob;
      rowSum += prob;
    });
    
    row.rowSum = rowSum;
    return row;
  });
});

const processData = async () => {
  loading.value = true;
  
  try {
    // 1. 加载原始CSV文件
    const csvContent = await loadCSVFile('/data/Sleep_Health_and_Lifestyle_Dataset.csv');
    
    if (!csvContent) {
      ElMessage.error('加载CSV文件失败');
      return;
    }
    
    // 2. 处理数据为两列格式
    const processedResult = processDataToTwoColumns(csvContent);
    result.value = processedResult;
    processedCSV.value = processedResult.csv;
    
    // 3. 计算条件概率矩阵
    const matrixResult = calculateConditionalProbabilityMatrix(processedResult.data);
    conditionalProbs.value = matrixResult.conditionalProbs;
    
    // 4. 验证条件概率矩阵
    validationResult.value = validateConditionalMatrix(matrixResult.conditionalProbs);
    
    ElMessage.success('数据处理完成');
    
  } catch (error) {
    console.error('处理数据失败:', error);
    ElMessage.error('处理数据失败');
  } finally {
    loading.value = false;
  }
};

const downloadProcessedData = () => {
  if (processedCSV.value) {
    downloadCSV(processedCSV.value, 'processed_SA_data.csv');
    ElMessage.success('文件下载成功');
  }
};

const formatProbability = (value) => {
  if (value === undefined || value === null) return '-';
  return value.toFixed(4);
};
</script>

<style scoped>
.data-processor {
  padding: 20px;
}

.card-header {
  font-weight: bold;
  font-size: 16px;
}

.processor-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-section {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.info-section ul {
  margin: 10px 0;
  padding-left: 20px;
}

.info-section li {
  margin: 5px 0;
  line-height: 1.6;
}

.action-section {
  display: flex;
  gap: 10px;
}

.result-section {
  margin-top: 20px;
}

.matrix-section {
  margin-top: 20px;
}

.validation-section {
  margin-top: 20px;
}

h4 {
  margin: 0 0 15px 0;
  color: #303133;
}

h5 {
  margin: 15px 0 10px 0;
  color: #606266;
}
</style>
