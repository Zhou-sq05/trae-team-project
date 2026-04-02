/**
 * 聚合算法模块
 * 实现ARR、AGRR、AOUE等算法的聚合计算
 */

/**
 * AGRR算法的聚合函数
 * @param {Array<number>} perturbedData - 扰动后的数据数组
 * @param {number} epsilon - 隐私预算
 * @param {number} domainSize - 定义域大小
 * @returns {Array<number>} 聚合估计结果
 */
export function aggregateAGRR(perturbedData, epsilon, domainSize) {
  if (!Array.isArray(perturbedData) || perturbedData.length === 0) {
    return [];
  }

  // 计算概率参数
  const q = Math.exp(epsilon) / (Math.exp(epsilon) + domainSize - 1);
  const p = 1 / domainSize;

  // 计算每个值的计数
  const counts = new Array(domainSize).fill(0);
  perturbedData.forEach(value => {
    if (value >= 0 && value < domainSize) {
      counts[value]++;
    }
  });

  // 执行无偏估计
  const n = perturbedData.length;
  const estimatedCounts = counts.map(count => {
    return (count - n * p) / (q - p);
  });

  return estimatedCounts;
}

/**
 * ARR算法的聚合函数
 * @param {Array<number>} perturbedData - 扰动后的数据数组
 * @param {number} epsilon - 隐私预算
 * @param {number} domainSize - 定义域大小
 * @returns {Array<number>} 聚合估计结果
 */
export function aggregateARR(perturbedData, epsilon, domainSize) {
  if (!Array.isArray(perturbedData) || perturbedData.length === 0) {
    return [];
  }

  // 计算概率参数
  const p = 1 / (Math.exp(epsilon) + 1);
  const q = 1 - p;

  // 计算每个值的计数
  const counts = new Array(domainSize).fill(0);
  perturbedData.forEach(value => {
    if (value >= 0 && value < domainSize) {
      counts[value]++;
    }
  });

  // 执行无偏估计
  const n = perturbedData.length;
  const estimatedCounts = counts.map(count => {
    return (count - n * p) / (q - p);
  });

  return estimatedCounts;
}

/**
 * AOUE算法的聚合函数
 * @param {Array<number>} perturbedData - 扰动后的数据数组
 * @param {number} epsilon - 隐私预算
 * @param {number} domainSize - 定义域大小
 * @returns {Array<number>} 聚合估计结果
 */
export function aggregateAOUE(perturbedData, epsilon, domainSize) {
  if (!Array.isArray(perturbedData) || perturbedData.length === 0) {
    return [];
  }

  // 计算概率参数
  const p = 1 / 2;
  const q = Math.exp(epsilon / 2) / (Math.exp(epsilon / 2) + 1);

  // 计算每个值的计数
  const counts = new Array(domainSize).fill(0);
  perturbedData.forEach(value => {
    if (value >= 0 && value < domainSize) {
      counts[value]++;
    }
  });

  // 执行无偏估计
  const n = perturbedData.length;
  const estimatedCounts = counts.map(count => {
    return (count - n * p) / (q - p);
  });

  return estimatedCounts;
}

/**
 * 计算均方误差(MSE)
 * @param {Array<number>} originalValues - 原始值数组
 * @param {Array<number>} estimatedValues - 估计值数组
 * @returns {number} 均方误差
 */
export function calculateMSE(originalValues, estimatedValues) {
  if (!Array.isArray(originalValues) || !Array.isArray(estimatedValues) || originalValues.length === 0) {
    return 0;
  }

  // 计算原始值的平均值
  const originalAvg = originalValues.reduce((sum, val) => sum + val, 0) / originalValues.length;
  
  // 计算估计值的平均值
  const estimatedAvg = estimatedValues.length > 0 
    ? estimatedValues.reduce((sum, val) => sum + val, 0) / estimatedValues.length 
    : 0;

  // 计算均方误差
  return Math.pow(originalAvg - estimatedAvg, 2);
}

/**
 * 计算重合度(一致性)
 * @param {Array<number>} originalValues - 原始值数组
 * @param {Array<number>} estimatedValues - 估计值数组
 * @returns {number} 重合度，范围0-1
 */
export function calculateConsistency(originalValues, estimatedValues) {
  if (!Array.isArray(originalValues) || !Array.isArray(estimatedValues) || originalValues.length === 0) {
    return 0;
  }

  const minLength = Math.min(originalValues.length, estimatedValues.length);
  let matchCount = 0;

  for (let i = 0; i < minLength; i++) {
    if (Math.abs(originalValues[i] - Math.round(estimatedValues[i])) <= 1) {
      matchCount++;
    }
  }

  return matchCount / minLength;
}

/**
 * 计算平均绝对误差(MAE)
 * @param {Array<number>} originalValues - 原始值数组
 * @param {Array<number>} estimatedValues - 估计值数组
 * @returns {number} 平均绝对误差
 */
export function calculateMAE(originalValues, estimatedValues) {
  if (!Array.isArray(originalValues) || !Array.isArray(estimatedValues) || originalValues.length === 0) {
    return 0;
  }

  const minLength = Math.min(originalValues.length, estimatedValues.length);
  let sumAbsError = 0;

  for (let i = 0; i < minLength; i++) {
    sumAbsError += Math.abs(originalValues[i] - estimatedValues[i]);
  }

  return sumAbsError / minLength;
}

/**
 * 计算聚合估计方差
 * @param {Array<number>} estimatedValues - 估计值数组
 * @returns {number} 方差
 */
export function calculateVariance(estimatedValues) {
  if (!Array.isArray(estimatedValues) || estimatedValues.length <= 1) {
    return 0;
  }

  const mean = estimatedValues.reduce((sum, val) => sum + val, 0) / estimatedValues.length;
  const squaredDifferences = estimatedValues.map(val => Math.pow(val - mean, 2));
  const variance = squaredDifferences.reduce((sum, val) => sum + val, 0) / (estimatedValues.length - 1);

  return variance;
}