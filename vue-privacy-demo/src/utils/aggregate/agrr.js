/**
 * 聚合算法模块
 * 实现ARR、AGRR、AOUE等算法的聚合计算
 */
import {
  calculateAggregateVariance,
  calculateMeanAbsoluteError,
  calculateMeanSquaredError
} from './aggregateMetrics';

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
  return calculateMeanSquaredError(originalValues, estimatedValues);
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
  return calculateMeanAbsoluteError(originalValues, estimatedValues);
}

/**
 * 计算聚合估计方差
 * @param {Array<number>} estimatedValues - 估计值数组
 * @returns {number} 方差
 */
export function calculateVariance(estimatedValues) {
  return calculateAggregateVariance(estimatedValues);
}
