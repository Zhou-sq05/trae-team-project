/**
 * 数据处理工具
 * 用于解析CSV文件、预处理数据和计算条件概率分布
 */

/**
 * 解析CSV文件内容
 * @param {string} csvContent - CSV文件内容
 * @returns {Array} 解析后的数据数组
 */
export function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(value => value.trim().replace(/"/g, ''));
    const row = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      // 尝试转换为数字
      const numValue = parseFloat(value);
      row[header] = isNaN(numValue) ? value : numValue;
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * 预处理数据
 * @param {Array} data - 原始数据
 * @returns {Array} 预处理后的数据
 */
export function preprocessData(data) {
  return data.filter(item => {
    // 确保睡眠时长和血压数值存在且有效
    return item['Sleep Duration'] !== undefined && 
           item['Blood Pressure'] !== undefined && 
           typeof item['Sleep Duration'] === 'number' && 
           typeof item['Blood Pressure'] === 'string';
  }).map(item => {
    // 解析血压值，使用收缩压
    const bloodPressureStr = item['Blood Pressure'];
    const systolic = parseInt(bloodPressureStr.split('/')[0]);
    
    return {
      sleepDuration: item['Sleep Duration'],
      bloodPressure: systolic
    };
  }).filter(item => {
    // 确保解析后的值有效
    return !isNaN(item.bloodPressure) && item.bloodPressure > 0;
  });
}

/**
 * 获取血压分组
 * @param {number} bp - 血压值
 * @returns {string} 血压分组
 */
export function getBloodPressureGroup(bp) {
  if (bp < 90) {
    return '低血压';
  } else if (bp < 120) {
    return '正常血压';
  } else if (bp < 130) {
    return '高血压前期';
  } else if (bp < 140) {
    return '高血压1期';
  } else {
    return '高血压2期';
  }
}

/**
 * 获取睡眠时长分组
 * @param {number} sleep - 睡眠时长（小时）
 * @returns {string} 睡眠时长分组
 */
export function getSleepDurationGroup(sleep) {
  if (sleep < 6) {
    return '睡眠不足';
  } else if (sleep < 8) {
    return '正常睡眠';
  } else {
    return '睡眠充足';
  }
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
 * 加载并处理CSV文件
 * @param {string} csvContent - CSV文件内容
 * @returns {Object} 处理结果，包含预处理后的数据和条件概率表
 */
export function processCSVData(csvContent) {
  const parsedData = parseCSV(csvContent);
  const preprocessedData = preprocessData(parsedData);
  const conditionalProbs = calculateConditionalProbabilities(preprocessedData);
  
  return {
    rawData: parsedData,
    preprocessedData,
    conditionalProbabilities: conditionalProbs,
    summary: {
      totalRecords: parsedData.length,
      validRecords: preprocessedData.length,
      invalidRecords: parsedData.length - preprocessedData.length
    }
  };
}

/**
 * 加载CSV文件内容
 * @param {string} filePath - CSV文件路径
 * @returns {Promise<string>} CSV文件内容
 */
export async function loadCSVFile(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error('Failed to load CSV file');
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading CSV file:', error);
    return '';
  }
}

/**
 * 为聚合服务生成条件概率表
 * @param {Object} conditionalProbs - 从CSV计算的条件概率表
 * @param {number} domainSize - 定义域大小
 * @returns {Array} 适合聚合服务使用的条件概率表
 */
export function generateAggregateConditionalProbs(conditionalProbs, domainSize) {
  // 定义血压分组到敏感属性值的映射
  const bpGroupToSensitiveValue = {
    '低血压': 0,
    '正常血压': 1,
    '高血压前期': 2,
    '高血压1期': 3,
    '高血压2期': 4
  };
  
  // 定义睡眠时长分组到属性值的映射
  const sleepGroupToValue = {
    '睡眠不足': 0,
    '正常睡眠': 1,
    '睡眠充足': 2
  };
  
  // 初始化条件概率表
  const sensitiveDomainSize = Object.keys(bpGroupToSensitiveValue).length;
  const probs = Array(sensitiveDomainSize).fill().map(() => Array(domainSize).fill(0));
  
  // 填充条件概率表
  Object.keys(conditionalProbs).forEach(bpGroup => {
    const sValue = bpGroupToSensitiveValue[bpGroup];
    if (sValue !== undefined) {
      Object.keys(conditionalProbs[bpGroup]).forEach(sleepGroup => {
        const aValue = sleepGroupToValue[sleepGroup];
        if (aValue !== undefined) {
          probs[sValue][aValue] = conditionalProbs[bpGroup][sleepGroup];
        }
      });
    }
  });
  
  return probs;
}