/**
 * 数据处理工具模块
 * 处理CSV数据集并计算条件概率
 */

/**
 * 解析CSV文件内容
 * @param {string} csvText - CSV文件内容
 * @returns {Array} 解析后的数据数组
 */
export function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(header => header.replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split(',').map(value => value.replace(/"/g, ''));
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * 预处理数据
 * @param {Array} data - 原始数据数组
 * @returns {Array} 预处理后的数据
 */
export function preprocessData(data) {
  return data.map(row => {
    // 解析睡眠时长
    const sleepDuration = parseFloat(row['Sleep Duration']);
    
    // 解析血压
    const bloodPressure = row['Blood Pressure'];
    const [systolic, diastolic] = bloodPressure.split('/').map(Number);
    
    return {
      sleepDuration,
      systolic,
      diastolic,
      bloodPressure: systolic // 使用收缩压作为血压分组依据
    };
  }).filter(item => !isNaN(item.sleepDuration) && !isNaN(item.bloodPressure));
}

/**
 * 血压分组
 * @param {number} bloodPressure - 血压值
 * @returns {string} 血压分组
 */
export function getBloodPressureGroup(bloodPressure) {
  if (bloodPressure < 90) return '低血压';
  if (bloodPressure < 120) return '正常血压';
  if (bloodPressure < 140) return '高血压前期';
  if (bloodPressure < 160) return '高血压1期';
  return '高血压2期';
}

/**
 * 睡眠时长分组
 * @param {number} sleepDuration - 睡眠时长
 * @returns {string} 睡眠时长分组
 */
export function getSleepDurationGroup(sleepDuration) {
  if (sleepDuration < 6) return '睡眠不足';
  if (sleepDuration < 8) return '正常睡眠';
  return '睡眠充足';
}

/**
 * 计算条件概率 Pr(睡眠时长|血压)
 * @param {Array} data - 预处理后的数据
 * @returns {Object} 条件概率表
 */
export function calculateConditionalProbabilities(data) {
  // 统计血压分组和睡眠时长分组的联合频率
  const jointCounts = {};
  const bloodPressureCounts = {};
  
  data.forEach(item => {
    const bpGroup = getBloodPressureGroup(item.bloodPressure);
    const sleepGroup = getSleepDurationGroup(item.sleepDuration);
    
    // 初始化联合计数
    if (!jointCounts[bpGroup]) {
      jointCounts[bpGroup] = {};
    }
    if (!jointCounts[bpGroup][sleepGroup]) {
      jointCounts[bpGroup][sleepGroup] = 0;
    }
    
    // 增加联合计数
    jointCounts[bpGroup][sleepGroup]++;
    
    // 增加血压分组计数
    if (!bloodPressureCounts[bpGroup]) {
      bloodPressureCounts[bpGroup] = 0;
    }
    bloodPressureCounts[bpGroup]++;
  });
  
  // 计算条件概率
  const conditionalProbs = {};
  
  Object.keys(jointCounts).forEach(bpGroup => {
    conditionalProbs[bpGroup] = {};
    const totalCount = bloodPressureCounts[bpGroup];
    
    Object.keys(jointCounts[bpGroup]).forEach(sleepGroup => {
      conditionalProbs[bpGroup][sleepGroup] = jointCounts[bpGroup][sleepGroup] / totalCount;
    });
  });
  
  return conditionalProbs;
}

/**
 * 加载并处理CSV数据
 * @param {string} csvText - CSV文件内容
 * @returns {Object} 处理结果
 */
export async function processCSVData(csvText) {
  try {
    const rawData = parseCSV(csvText);
    const processedData = preprocessData(rawData);
    const conditionalProbs = calculateConditionalProbabilities(processedData);
    
    return {
      success: true,
      data: processedData,
      conditionalProbs,
      bloodPressureGroups: Object.keys(conditionalProbs),
      sleepDurationGroups: [...new Set(processedData.map(item => getSleepDurationGroup(item.sleepDuration)))]
    };
  } catch (error) {
    console.error('处理CSV数据失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 将条件概率转换为数组格式，用于计算alpha和beta
 * @param {Object} conditionalProbs - 条件概率对象
 * @returns {Array} 条件概率数组
 */
export function convertToConditionalProbsArray(conditionalProbs) {
  const bpGroups = Object.keys(conditionalProbs);
  const sleepGroups = [...new Set(Object.values(conditionalProbs).flatMap(probs => Object.keys(probs)))];
  
  return bpGroups.map(bpGroup => {
    return sleepGroups.map(sleepGroup => {
      return conditionalProbs[bpGroup][sleepGroup] || 0;
    });
  });
}
