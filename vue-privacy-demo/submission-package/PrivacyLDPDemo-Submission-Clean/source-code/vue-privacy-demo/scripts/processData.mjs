/**
 * 数据处理脚本 (ES Module版本)
 * 将原始CSV数据处理为两列格式（敏感属性S和非敏感属性A）
 * 使用方法：node scripts/processData.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 血压分组函数
function getBloodPressureGroup(bloodPressure) {
  if (bloodPressure < 90) return '低血压';
  if (bloodPressure < 120) return '正常血压';
  if (bloodPressure < 140) return '高血压前期';
  if (bloodPressure < 160) return '高血压1期';
  return '高血压2期';
}

// 睡眠时长分组函数
function getSleepDurationGroup(sleepDuration) {
  if (sleepDuration < 6) return '睡眠不足';
  if (sleepDuration < 8) return '正常睡眠';
  return '睡眠充足';
}

// 解析CSV文件
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(header => header.replace(/"/g, '').trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    
    const values = lines[i].split(',').map(value => value.replace(/"/g, '').trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    
    data.push(row);
  }
  
  return data;
}

// 提取敏感属性和非敏感属性
function extractSensitiveAndNonSensitiveData(rawData) {
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

// 将处理后的数据转换为CSV格式
function convertToCSV(processedData) {
  const headers = ['S(敏感属性-血压)', 'A(非敏感属性-睡眠时长)'];
  const rows = processedData.map(item => `${item.S},${item.A}`);
  return [headers.join(','), ...rows].join('\n');
}

// 计算条件概率矩阵 Pr(A|S)
function calculateConditionalProbabilityMatrix(processedData) {
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

// 验证条件概率矩阵
function validateConditionalMatrix(conditionalProbs) {
  const results = {};
  let allValid = true;
  
  Object.keys(conditionalProbs).forEach(s => {
    let sum = 0;
    Object.keys(conditionalProbs[s]).forEach(a => {
      sum += conditionalProbs[s][a];
    });
    
    const isValid = Math.abs(sum - 1.0) < 0.0001;
    results[s] = {
      sum: sum.toFixed(4),
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

// 打印条件概率矩阵
function printConditionalMatrix(conditionalProbs) {
  const sGroups = Object.keys(conditionalProbs);
  const aGroups = [...new Set(
    Object.values(conditionalProbs).flatMap(probs => Object.keys(probs))
  )];
  
  console.log('\n条件概率矩阵 Pr(A|S)：');
  console.log('========================================');
  
  // 打印表头
  let header = '血压分组(S)\\睡眠分组(A)'.padEnd(20);
  aGroups.forEach(a => {
    header += a.padEnd(12);
  });
  header += '行和'.padEnd(10);
  console.log(header);
  console.log('-'.repeat(70));
  
  // 打印每一行
  sGroups.forEach(s => {
    let row = s.padEnd(20);
    let rowSum = 0;
    
    aGroups.forEach(a => {
      const prob = conditionalProbs[s][a] || 0;
      row += prob.toFixed(4).padEnd(12);
      rowSum += prob;
    });
    
    row += rowSum.toFixed(4).padEnd(10);
    console.log(row);
  });
  
  console.log('========================================');
}

// 主函数
function main() {
  console.log('开始处理数据...\n');
  
  // 1. 读取原始CSV文件
  const inputPath = path.join(__dirname, '..', 'public', 'data', 'Sleep_Health_and_Lifestyle_Dataset.csv');
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'processed_SA_data.csv');
  
  console.log(`读取文件: ${inputPath}`);
  
  if (!fs.existsSync(inputPath)) {
    console.error('错误：找不到原始CSV文件');
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(inputPath, 'utf-8');
  
  // 2. 解析原始数据
  const rawData = parseCSV(csvContent);
  console.log(`原始数据记录数: ${rawData.length}`);
  
  // 3. 提取敏感属性和非敏感属性
  const processedData = extractSensitiveAndNonSensitiveData(rawData);
  console.log(`处理后数据记录数: ${processedData.length}`);
  
  // 4. 转换为CSV格式
  const csvOutput = convertToCSV(processedData);
  
  // 5. 保存处理后的CSV文件
  fs.writeFileSync(outputPath, csvOutput, 'utf-8');
  console.log(`\n处理后的数据已保存到: ${outputPath}`);
  
  // 6. 计算条件概率矩阵
  const matrixResult = calculateConditionalProbabilityMatrix(processedData);
  
  // 7. 打印条件概率矩阵
  printConditionalMatrix(matrixResult.conditionalProbs);
  
  // 8. 验证条件概率矩阵
  const validationResult = validateConditionalMatrix(matrixResult.conditionalProbs);
  
  console.log('\n验证结果:');
  console.log('========================================');
  Object.keys(validationResult.details).forEach(s => {
    const detail = validationResult.details[s];
    const status = detail.isValid ? '✓' : '✗';
    console.log(`${status} ${s}: 行和 = ${detail.sum}`);
  });
  console.log('========================================');
  
  if (validationResult.allValid) {
    console.log('\n✓ 验证通过：所有行的概率之和均为1');
  } else {
    console.log('\n✗ 验证失败：存在行的概率之和不等于1');
  }
  
  console.log('\n数据处理完成！');
}

// 运行主函数
main();
