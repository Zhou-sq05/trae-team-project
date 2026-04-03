/**
 * 测试数据处理工具
 * 验证条件概率计算的正确性
 */

// 使用ES模块语法
import { 
  parseCSV, 
  preprocessData, 
  calculateConditionalProbabilities, 
  processCSVData 
} from './dataProcessing';

// 测试CSV数据
const testCSV = `"Person ID","Gender","Age","Occupation","Sleep Duration","Quality of Sleep","Physical Activity Level","Stress Level","BMI Category","Blood Pressure","Heart Rate","Daily Steps","Sleep Disorder"
"1","Male","27","Software Engineer","6.1","6","42","6","Overweight","126/83","77","4200","None"
"2","Male","28","Doctor","6.2","6","60","8","Normal","125/80","75","10000","None"
"3","Male","28","Doctor","6.2","6","60","8","Normal","125/80","75","10000","None"
"4","Male","28","Sales Representative","5.9","4","30","8","Obese","140/90","85","3000","Sleep Apnea"
"5","Male","28","Sales Representative","5.9","4","30","8","Obese","140/90","85","3000","Sleep Apnea"
"6","Male","28","Software Engineer","5.9","4","30","8","Obese","140/90","85","3000","Insomnia"
"7","Male","29","Teacher","6.3","6","40","7","Obese","140/90","82","3500","Insomnia"
"8","Male","29","Doctor","7.8","7","75","6","Normal","120/80","70","8000","None"
"9","Male","29","Doctor","7.8","7","75","6","Normal","120/80","70","8000","None"
"10","Male","29","Doctor","7.8","7","75","6","Normal","120/80","70","8000","None"
`;

/**
 * 运行测试
 */
export function runTests() {
  console.log('开始测试数据处理工具...');
  
  // 测试1: 解析CSV
  console.log('\n测试1: 解析CSV');
  const parsedData = parseCSV(testCSV);
  console.log(`解析成功，共 ${parsedData.length} 条记录`);
  console.log('前2条记录:', parsedData.slice(0, 2));
  
  // 测试2: 预处理数据
  console.log('\n测试2: 预处理数据');
  const preprocessedData = preprocessData(parsedData);
  console.log(`预处理成功，共 ${preprocessedData.length} 条有效记录`);
  console.log('前2条预处理后记录:', preprocessedData.slice(0, 2));
  
  // 测试3: 计算条件概率
  console.log('\n测试3: 计算条件概率');
  const conditionalProbs = calculateConditionalProbabilities(preprocessedData);
  console.log('条件概率表:', conditionalProbs);
  
  // 测试4: 完整处理流程
  console.log('\n测试4: 完整处理流程');
  const result = processCSVData(testCSV);
  console.log('处理结果摘要:', result.summary);
  console.log('条件概率表:', result.conditionalProbabilities);
  
  // 验证概率和为1
  console.log('\n测试5: 验证概率和为1');
  let allValid = true;
  Object.keys(conditionalProbs).forEach(bpGroup => {
    const probs = Object.values(conditionalProbs[bpGroup]);
    const sum = probs.reduce((acc, prob) => acc + prob, 0);
    console.log(`${bpGroup}: 概率和 = ${sum.toFixed(4)}`);
    if (Math.abs(sum - 1) > 0.001) {
      allValid = false;
    }
  });
  
  if (allValid) {
    console.log('\n✓ 所有概率和都为1，测试通过！');
  } else {
    console.log('\n✗ 部分概率和不为1，测试失败！');
  }
  
  console.log('\n测试完成！');
  return result;
}

// 运行测试
if (typeof window !== 'undefined') {
  // 在浏览器环境中运行
  window.runDataProcessingTests = runTests;
  console.log('测试函数已添加到全局对象，可通过 runDataProcessingTests() 运行测试');
}