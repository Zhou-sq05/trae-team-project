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
  if (beta > 0 && alpha / beta <= exp_eps) {
    return { p: 1, q: 0, triggeredByThreshold: true, expEpsilon: exp_eps };
  }
  const numerator = (1 - alpha) - (1 - beta) * exp_eps;
  const denominator = (1 - domainSize * alpha) - (1 - domainSize * beta) * exp_eps;
  const p = Math.min(numerator / denominator, 1);
  const q = (1 - p) / (domainSize - 1);
  return { p, q, triggeredByThreshold: false, expEpsilon: exp_eps };
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
  const rawQ = (alpha - beta * exp_eps) / ((exp_eps - 1) + 2 * (alpha - beta * exp_eps));
  const q = Math.min(Math.max(rawQ, 0), 0.5);
  return { p, q, rawQ, clamped: q !== rawQ };
}

export function generalizedRandomizedResponse(rawValue, domainValues, p, q) {
  const normalizedDomain = Array.from(domainValues || []);
  if (!normalizedDomain.length || !normalizedDomain.includes(rawValue)) {
    return rawValue;
  }

  if (Math.random() < p) {
    return rawValue;
  }

  const fallbackValues = normalizedDomain.filter(value => value !== rawValue);
  if (!fallbackValues.length) {
    return rawValue;
  }

  return fallbackValues[Math.floor(Math.random() * fallbackValues.length)];
}

function clampProbability(value, fallback = 0) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(Math.max(value, 0), 1);
}

function sampleAlternativeValue(domainValues, currentValue) {
  const fallbackValues = Array.from(domainValues || []).filter(value => value !== currentValue);
  if (!fallbackValues.length) {
    return currentValue;
  }
  return fallbackValues[Math.floor(Math.random() * fallbackValues.length)];
}

// TSP 论文版使用统一总预算 epsilon。
// 记 d = 有效评分域大小，此处默认 d = 5，对应取值 {1,2,3,4,5}；
// 第二阶段在统一域 {0,1,...,d} 上执行，因此统一域大小是 d + 1。
//
// 这里复用 calculateAGRParameters(alpha, beta, epsilon, d + 1) 来求 p2：
// - 老师 TSP.py 的第二阶段公式是
//     p2 = min(((1-alpha) - (1-beta)e^epsilon) / ((1-(d+1)alpha) - (1-(d+1)beta)e^epsilon), 1)
// - 这与 AGR 参数求解公式在 domainSize = d + 1 时完全相同
// - 因而 stageTwo.p 就等价于老师代码里的 p2
//
// 第二阶段的 q2 不是对 d + 1 个值平均分，而是对“真值之外的 d 个错误候选”平均分，
// 所以满足 p2 + d*q2 = 1，而不是 p2 + (d + 1)q2 = 1。
//
// 第一阶段只在有效评分域 {1,...,d} 上扰动：
// - 保持原值的概率是 p1
// - 其余 d - 1 个错误评分均匀分配概率 q1 = (1 - p1) / (d - 1)
// 因此满足 p1 + (d - 1)q1 = 1，而不是 p1 + d*q1 = 1。
export function calculateTSPParameters(alpha, beta, epsilon, scoreDomainSize = 5) {
  const unifiedDomainSize = scoreDomainSize + 1;
  const exp_eps = Math.exp(epsilon);
  const stageTwo = calculateAGRParameters(alpha, beta, epsilon, unifiedDomainSize);
  const p2 = clampProbability(stageTwo.p, 1);
  const q2 = clampProbability((1 - p2) / scoreDomainSize, 0);
  const delta = p2 - q2;
  const stageOneDenominator = delta * ((scoreDomainSize - 1) + exp_eps);

  let p1 = 1;
  if (scoreDomainSize > 1 && stageOneDenominator > 0) {
    // 等价于老师 TSP.py:
    // p1 = min((e^epsilon * p2 + ((d - 2)e^epsilon - (d - 1)) * q2) / ((d - 1 + e^epsilon)(p2 - q2)), 1)
    const stageOneNumerator = (
      (scoreDomainSize - 1) * q2 * (exp_eps - 1)
      + exp_eps * delta
    );
    p1 = clampProbability(stageOneNumerator / stageOneDenominator, 1);
  }
  const q1 = scoreDomainSize > 1
    ? clampProbability((1 - p1) / (scoreDomainSize - 1), 0)
    : 0;

  const pStar = p1 * p2 + (1 - p1) * q2;
  const qStar = q1 * p2 + (1 - q1) * q2;

  return {
    version: 'paper_unified_budget',
    epsilon,
    p1,
    q1,
    p2,
    q2,
    pStar,
    qStar,
    scoreDomainSize,
    unifiedDomainSize
  };
}

export function tspFirstPerturb(value, scoreDomainSize, p1) {
  const normalizedValue = Number(value);
  if (normalizedValue === 0) {
    return 0;
  }

  const scoreDomain = Array.from({ length: scoreDomainSize }, (_, index) => index + 1);
  if (!scoreDomain.includes(normalizedValue)) {
    return normalizedValue;
  }

  if (Math.random() < p1) {
    return normalizedValue;
  }

  return sampleAlternativeValue(scoreDomain, normalizedValue);
}

export function tspSecondPerturb(value, scoreDomainSize, p2) {
  const normalizedValue = Number(value);
  const unifiedDomain = Array.from({ length: scoreDomainSize + 1 }, (_, index) => index);
  if (!unifiedDomain.includes(normalizedValue)) {
    return normalizedValue;
  }

  if (Math.random() < p2) {
    return normalizedValue;
  }

  return sampleAlternativeValue(unifiedDomain, normalizedValue);
}

export function applyTSP(rawValue, params) {
  const scoreDomainSize = Number(params?.scoreDomainSize ?? 5);
  const normalizedRawValue = Number(rawValue);
  const stageOneSkipped = normalizedRawValue === 0;
  const stageOneValue = stageOneSkipped
    ? 0
    : tspFirstPerturb(normalizedRawValue, scoreDomainSize, Number(params?.p1 ?? 1));
  const stageTwoInput = stageOneSkipped ? 0 : stageOneValue;
  const stageTwoValue = tspSecondPerturb(stageTwoInput, scoreDomainSize, Number(params?.p2 ?? 1));

  return {
    stageOneSkipped,
    stageOneValue,
    stageTwoInput,
    stageTwoValue
  };
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

export function calculateTSPAlphaBetaFromMissingProbs(conditionalProbs, epsilon) {
  return calculateAlphaBeta(conditionalProbs, epsilon);
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
