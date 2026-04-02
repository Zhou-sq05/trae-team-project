// 基于老师 GitHub: https://github.com/null944/enhanced-accuracy-in-ldp
// 论文: Enhanced Accuracy in Local Differential Privacy by Exploiting Inherent Uncertainty
// 可直接在 Vue3 中使用

// 选择参数对的辅助函数
export function choose(alpha_k, beta_k, alpha, beta, exp_eps) {
  if (alpha_k >= alpha && beta_k <= beta) {
    return [alpha_k, beta_k];
  }
  if (alpha_k <= alpha && beta_k >= beta) {
    return [alpha, beta];
  }
  if (alpha_k > alpha && beta_k > beta) {
    const delta1 = alpha_k - alpha;
    const delta2 = beta_k - beta;
    if (delta1 / delta2 >= exp_eps) {
      return [alpha_k, beta_k];
    } else {
      return [alpha, beta];
    }
  }
  if (alpha_k < alpha && beta_k < beta) {
    const delta1 = alpha - alpha_k;
    const delta2 = beta - beta_k;
    if (delta1 / delta2 <= exp_eps) {
      return [alpha_k, beta_k];
    } else {
      return [alpha, beta];
    }
  }
  return [alpha, beta];
}

// AGRR 算法 - 客户端扰动
export function AGRR(rawValue, epsilon, domainSize, p, q) {
  const rand = Math.random();
  if (rand < p) {
    return rawValue;
  } else {
    // 随机选择除了原值以外的值
    const possibleValues = [];
    for (let i = 1; i <= domainSize; i++) {
      if (i !== rawValue) {
        possibleValues.push(i);
      }
    }
    return possibleValues[Math.floor(Math.random() * possibleValues.length)];
  }
}

// AGRR 算法 - 服务器端聚合
export function aggregateAGRR(perturbedData, epsilon, domainSize, p, q) {
  const n = perturbedData.length;
  const count = new Array(domainSize).fill(0);
  
  // 统计扰动数据的频率
  perturbedData.forEach(val => {
    const index = val - 1;
    if (index >= 0 && index < domainSize) {
      count[index]++;
    }
  });
  
  // 无偏估计
  return count.map(c => (c - n * q) / (p - q));
}

// 计算 AGRR 的扰动参数
export function calculateAGRParameters(alpha, beta, epsilon, domainSize) {
  const exp_eps = Math.exp(epsilon);
  const numerator = (1 - alpha) - (1 - beta) * exp_eps;
  const denominator = (1 - domainSize * alpha) - (1 - domainSize * beta) * exp_eps;
  const p = Math.min(numerator / denominator, 1);
  const q = (1 - p) / (domainSize - 1);
  return { p, q };
}

// ARR 算法 - 客户端扰动
export function ARR(rawValue, epsilon, domainSize, p, q) {
  const rand = Math.random();
  if (rand < p) {
    return rawValue;
  } else {
    // 对于二值属性，返回相反的值
    return 1 - rawValue;
  }
}

// ARR 算法 - 服务器端聚合
export function aggregateARR(perturbedData, epsilon, domainSize, p, q) {
  const n = perturbedData.length;
  const count = new Array(domainSize).fill(0);
  
  // 统计扰动数据的频率
  perturbedData.forEach(val => {
    const index = val;
    if (index >= 0 && index < domainSize) {
      count[index]++;
    }
  });
  
  // 无偏估计
  return count.map(c => (c - n * q) / (p - q));
}

// 计算 ARR 的扰动参数
export function calculateARRParameters(alpha, beta, epsilon, domainSize) {
  const exp_eps = Math.exp(epsilon);
  const numerator = (1 - alpha) - (1 - beta) * exp_eps;
  const denominator = (1 - domainSize * alpha) - (1 - domainSize * beta) * exp_eps;
  const p = Math.min(numerator / denominator, 1);
  const q = 1 - p;
  return { p, q };
}

// AOUE 算法 - 编码
export function Encode(value, domainSize) {
  const array = new Array(domainSize).fill(0);
  array[value - 1] = 1;
  return array;
}

// AOUE 算法 - 客户端扰动
export function AOUE(rawValue, epsilon, domainSize, q) {
  const enValue = Encode(rawValue, domainSize);
  
  // 逐位扰动
  for (let i = 0; i < domainSize; i++) {
    if (enValue[i] === 1) {
      // 对于1位，以1/2的概率翻转
      if (Math.random() >= 0.5) {
        enValue[i] = 0;
      }
    } else {
      // 对于0位，以q的概率翻转
      if (Math.random() < q) {
        enValue[i] = 1;
      }
    }
  }
  
  return enValue;
}

// AOUE 算法 - 服务器端聚合
export function aggregateAOUE(perturbedData, epsilon, domainSize, p, q) {
  const n = perturbedData.length;
  const count = new Array(domainSize).fill(0);
  
  // 统计扰动数据的频率
  perturbedData.forEach(valueArray => {
    valueArray.forEach((bit, index) => {
      if (bit === 1) {
        count[index]++;
      }
    });
  });
  
  // 无偏估计
  return count.map(c => (c - n * q) / (p - q));
}

// 计算 AOUE 的扰动参数
export function calculateAOUEParameters(alpha, beta, epsilon) {
  const exp_eps = Math.exp(epsilon);
  const p = 0.5;
  const q = (alpha - beta * exp_eps) / ((exp_eps - 1) + 2 * (alpha - beta * exp_eps));
  return { p, q };
}

// 计算条件概率的最大最小值
export function computeMaxMin(conditionalProbs, targetValue) {
  const column = conditionalProbs.map(row => row[targetValue - 1]);
  const validValues = column.filter(val => !isNaN(val));
  if (validValues.length === 0) {
    return [0, 0];
  }
  return [Math.max(...validValues), Math.min(...validValues)];
}

// 计算最终的 alpha 和 beta 参数
export function calculateAlphaBeta(conditionalProbs, epsilon) {
  const domainSize = conditionalProbs[0].length;
  const exp_eps = Math.exp(epsilon);
  
  // 计算每个属性值的最大最小条件概率
  const indexList = [];
  for (let i = 0; i < domainSize; i++) {
    const [maxProb, minProb] = computeMaxMin(conditionalProbs, i + 1);
    indexList.push([maxProb, minProb]);
  }
  
  // 选择最终的 alpha 和 beta
  let alpha = -Infinity;
  let beta = Infinity;
  for (const [alpha_i, beta_i] of indexList) {
    const [newAlpha, newBeta] = choose(alpha_i, beta_i, alpha, beta, exp_eps);
    alpha = newAlpha;
    beta = newBeta;
  }
  
  return { alpha, beta };
}

// 生成模拟的条件概率表（用于测试）
export function generateConditionalProbs(domainSize, sensitiveDomainSize) {
  const probs = [];
  for (let i = 0; i < sensitiveDomainSize; i++) {
    const row = [];
    let sum = 0;
    for (let j = 0; j < domainSize; j++) {
      const prob = Math.random();
      row.push(prob);
      sum += prob;
    }
    // 归一化
    for (let j = 0; j < domainSize; j++) {
      row[j] = row[j] / sum;
    }
    probs.push(row);
  }
  return probs;
}