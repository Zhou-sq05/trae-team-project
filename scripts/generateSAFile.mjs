import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  defaultSAConfig,
  processDataToTwoColumns,
  calculateConditionalProbabilityMatrix,
  validateConditionalMatrix
} from '../src/utils/saGenerator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function printConditionalMatrix(conditionalProbs) {
  const sGroups = Object.keys(conditionalProbs);
  const aGroups = [...new Set(Object.values(conditionalProbs).flatMap(probs => Object.keys(probs)))];

  console.log('\nPr(A|S) 条件概率矩阵');
  console.log('='.repeat(60));

  let header = 'S\\A'.padEnd(18);
  aGroups.forEach(a => {
    header += String(a).padEnd(12);
  });
  header += 'sum'.padEnd(10);
  console.log(header);
  console.log('-'.repeat(60));

  sGroups.forEach(s => {
    let row = String(s).padEnd(18);
    let rowSum = 0;

    aGroups.forEach(a => {
      const value = conditionalProbs[s][a] || 0;
      row += value.toFixed(4).padEnd(12);
      rowSum += value;
    });

    row += rowSum.toFixed(4).padEnd(10);
    console.log(row);
  });

  console.log('='.repeat(60));
}

export function generateSAFile({
  inputPath,
  outputPath,
  config = defaultSAConfig,
  printMatrix = true
}) {
  if (!inputPath || !outputPath) {
    throw new Error('inputPath 和 outputPath 为必填项');
  }

  if (!fs.existsSync(inputPath)) {
    throw new Error(`输入文件不存在: ${inputPath}`);
  }

  const csvContent = fs.readFileSync(inputPath, 'utf-8');
  const result = processDataToTwoColumns(csvContent, config);

  fs.writeFileSync(outputPath, result.csv, 'utf-8');

  const matrixResult = calculateConditionalProbabilityMatrix(result.data);
  const validationResult = validateConditionalMatrix(matrixResult.conditionalProbs);

  if (printMatrix) {
    printConditionalMatrix(matrixResult.conditionalProbs);
  }

  return {
    ...result,
    matrixResult,
    validationResult
  };
}

const exampleConfig = {
  ...defaultSAConfig,
  outputHeaders: ['S', 'A']
};

function runExample() {
  const inputPath = path.join(__dirname, '..', 'public', 'data', 'Sleep_Health_and_Lifestyle_Dataset.csv');
  const outputPath = path.join(__dirname, '..', 'public', 'data', 'processed_SA_data.csv');

  const result = generateSAFile({
    inputPath,
    outputPath,
    config: exampleConfig
  });

  console.log(`\n输出文件已生成: ${outputPath}`);
  console.log(`有效记录数: ${result.count}`);
  console.log(`可识别列: ${result.columnKeys.join(', ')}`);
  console.log(`矩阵校验: ${result.validationResult.allValid ? '通过' : '失败'}`);
}

if (process.argv[1] === __filename) {
  runExample();
}
