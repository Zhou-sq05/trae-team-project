/**
 * 数据处理器模块
 * 将原始CSV数据处理为两列格式（敏感属性S和非敏感属性A）
 */

import { parseCSV, getBloodPressureGroup, getSleepDurationGroup } from './dataProcessing';

/**
 * 加载CSV文件
 * @param {string} filePath - CSV文件路径
 * @returns {Promise<string>} CSV文件内容
 */
export async function loadCSVFile(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('加载CSV文件失败:', error);
    return null;
  }
}

/**
 * 处理原始数据，提取敏感属性和非敏感属性
 * @param {Array} rawData - 原始数据数组
 * @returns {Array} 处理后的数据，包含S和A两列
 */
export function extractSensitiveAndNonSensitiveData(rawData) {
  return rawData.map(row => {
    // 解析睡眠时长（非敏感属性A）
    const sleepDuration = parseFloat(row['Sleep Duration']);
    
    // 解析血压（敏感属性S）
    const bloodPressure = row['Blood Pressure'];
    const [systolic] = bloodPressure.split('/').map(Number);
    
    // 获取分组
    const sleepGroup = getSleepDurationGroup(sleepDuration);
    const bpGroup = getBloodPressureGroup(systolic);
    
    return {
      S: bpGroup,      // 敏感属性：血压分组
      A: sleepGroup    // 非敏感属性：睡眠时长分组
    };
  }).filter(item => item.S && item.A);
}

/**
 * 将处理后的数据转换为CSV格式
 * @param {Array} processedData - 处理后的数据数组
 * @returns {string} CSV格式字符串
 */
export function convertToCSV(processedData) {
  const headers = ['S(敏感属性-血压)', 'A(非敏感属性-睡眠时长)'];
  const rows = processedData.map(item => `${item.S},${item.A}`);
  return [headers.join(','), ...rows].join('\n');
}

/**
 * 完整的处理流程
 * @param {string} csvContent - 原始CSV内容
 * @returns {Object} 包含处理后的数据和CSV字符串
 */
export function processDataToTwoColumns(csvContent) {
  // 1. 解析原始CSV
  const rawData = parseCSV(csvContent);
  
  // 2. 提取敏感属性和非敏感属性
  const processedData = extractSensitiveAndNonSensitiveData(rawData);
  
  // 3. 转换为CSV格式
  const csvString = convertToCSV(processedData);
  
  return {
    data: processedData,
    csv: csvString,
    count: processedData.length
  };
}

/**
 * 下载CSV文件
 * @param {string} csvContent - CSV内容
 * @param {string} filename - 文件名
 */
export function downloadCSV(csvContent, filename = 'processed_data.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 计算条件概率矩阵 Pr(A|S)
 * @param {Array} processedData - 处理后的数据（包含S和A）
 * @returns {Object} 条件概率矩阵
 */
export function calculateConditionalProbabilityMatrix(processedData) {
  // 统计联合频率 N(S,A)
  const jointCounts = {};
  const sCounts = {};
  
  processedData.forEach(item => {
    const s = item.S;
    const a = item.A;
    
    // 初始化联合计数
    if (!jointCounts[s]) {
      jointCounts[s] = {};
    }
    if (!jointCounts[s][a]) {
      jointCounts[s][a] = 0;
    }
    jointCounts[s][a]++;
    
    // 统计S的总数
    if (!sCounts[s]) {
      sCounts[s] = 0;
    }
    sCounts[s]++;
  });
  
  // 计算条件概率 P(A|S) = N(S,A) / N(S)
  const conditionalProbs = {};
  
  Object.keys(jointCounts).forEach(s => {
    conditionalProbs[s] = {};
    const totalCount = sCounts[s];
    
    Object.keys(jointCounts[s]).forEach(a => {
      conditionalProbs[s][a] = jointCounts[s][a] / totalCount;
    });
  });
  
  return {
    conditionalProbs,
    jointCounts,
    sCounts
  };
}

/**
 * 将条件概率矩阵转换为数组格式（用于计算alpha和beta）
 * @param {Object} conditionalProbs - 条件概率对象
 * @returns {Array} 二维数组，行表示S，列表示A
 */
export function convertMatrixToArray(conditionalProbs) {
  const sGroups = Object.keys(conditionalProbs);
  const aGroups = [...new Set(
    Object.values(conditionalProbs).flatMap(probs => Object.keys(probs))
  )];
  
  return sGroups.map(s => {
    return aGroups.map(a => {
      return conditionalProbs[s][a] || 0;
    });
  });
}

/**
 * 验证条件概率矩阵（检查每行概率之和是否为1）
 * @param {Object} conditionalProbs - 条件概率对象
 * @returns {Object} 验证结果
 */
export function validateConditionalMatrix(conditionalProbs) {
  const results = {};
  let allValid = true;
  
  Object.keys(conditionalProbs).forEach(s => {
    let sum = 0;
    Object.keys(conditionalProbs[s]).forEach(a => {
      sum += conditionalProbs[s][a];
    });
    
    const isValid = Math.abs(sum - 1.0) < 0.0001; // 允许微小误差
    results[s] = {
      sum,
      isValid
    };
    
    if (!isValid) {
      allValid = false;
    }
  });
  
  return {
    allValid,
    details: results
  };
}
