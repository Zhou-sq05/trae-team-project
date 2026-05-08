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

export function calculateTraditionalGRRParams(epsilon, domainSize) {
  const resolvedEpsilon = Number(epsilon);
  const resolvedDomainSize = Math.max(1, Number(domainSize) || 1);
  const expEpsilon = Math.exp(resolvedEpsilon);
  const denominator = expEpsilon + resolvedDomainSize - 1;
  return {
    p: expEpsilon / denominator,
    q: 1 / denominator,
    epsilon: resolvedEpsilon,
    domainSize: resolvedDomainSize,
    protocol: 'GRR'
  };
}

export function perturbByTraditionalGRR(trueValue, domainValues, epsilon, randomFn = Math.random) {
  const normalizedDomain = Array.from(domainValues || []);
  const params = calculateTraditionalGRRParams(epsilon, normalizedDomain.length);
  if (!normalizedDomain.length || !normalizedDomain.includes(trueValue)) {
    return {
      originalValue: trueValue,
      reportedValue: trueValue,
      p: params.p,
      q: params.q,
      protocol: 'GRR'
    };
  }

  if (randomFn() < params.p) {
    return {
      originalValue: trueValue,
      reportedValue: trueValue,
      p: params.p,
      q: params.q,
      protocol: 'GRR'
    };
  }

  const fallbackValues = normalizedDomain.filter(value => value !== trueValue);
  const reportedValue = fallbackValues[Math.floor(randomFn() * fallbackValues.length)] ?? trueValue;
  return {
    originalValue: trueValue,
    reportedValue,
    p: params.p,
    q: params.q,
    protocol: 'GRR'
  };
}

export function aggregateTraditionalGRR(reportedValues, domainValues, epsilon) {
  const normalizedDomain = Array.from(domainValues || []);
  const totalUsers = Array.isArray(reportedValues) ? reportedValues.length : 0;
  const params = calculateTraditionalGRRParams(epsilon, normalizedDomain.length);
  const reportedCounts = normalizedDomain.map(value => (
    Array.isArray(reportedValues)
      ? reportedValues.filter(item => item === value).length
      : 0
  ));
  const rawEstimatedCounts = reportedCounts.map(count => (
    params.p === params.q ? 0 : (count - totalUsers * params.q) / (params.p - params.q)
  ));
  const estimatedCounts = rawEstimatedCounts.map(value => Math.max(0, Number(value) || 0));
  const estimatedTotal = estimatedCounts.reduce((sum, value) => sum + value, 0);
  const estimatedFrequencies = estimatedCounts.map(value => (
    estimatedTotal > 0 ? value / estimatedTotal : 0
  ));

  return {
    protocol: 'GRR',
    params,
    reportedCounts,
    rawEstimatedCounts,
    estimatedCounts,
    estimatedFrequencies,
    totalUsers
  };
}

// 计算 AGRR 的扰动参数
export function calculateAGRParameters(alpha, beta, epsilon, domainSize) {
  const exp_eps = Math.exp(epsilon);
  if (beta > 0 && alpha / beta <= exp_eps) {
    return { p: 1, q: 0, triggeredByThreshold: true, expEpsilon: exp_eps };
  }
  const numerator = (1 - alpha) - (1 - beta) * exp_eps;
  const denominator = (1 - domainSize * alpha) - (1 - domainSize * beta) * exp_eps;
  const p = numerator / denominator;
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
  if (beta > 0 && alpha / beta <= exp_eps) {
    return { p: 1, q: 0, triggeredByThreshold: true, expEpsilon: exp_eps };
  }
  const numerator = (1 - alpha) - (1 - beta) * exp_eps;
  const denominator = (1 - domainSize * alpha) - (1 - domainSize * beta) * exp_eps;
  const p = numerator / denominator;
  const q = (1 - p) / (domainSize - 1);
  return { p, q, triggeredByThreshold: false, expEpsilon: exp_eps };
}

// AOUE 算法 - 编码
export function Encode(value, domainSize) {
  const array = new Array(domainSize).fill(0);
  const index = Number(value) - 1;
  if (Number.isInteger(index) && index >= 0 && index < domainSize) {
    array[index] = 1;
  }
  return array;
}

export function createAOUEBitStep(originalBit, p = 0.5, q = 0, randomValue = Math.random()) {
  const normalizedOriginalBit = Number(originalBit) === 1 ? 1 : 0;
  const usedProbability = normalizedOriginalBit === 1 ? Number(p) : Number(q);
  const sampledRandom = Number(randomValue);
  const resultBit = sampledRandom < usedProbability ? 1 : 0;

  return {
    originalBit: normalizedOriginalBit,
    usedProbability,
    sampledRandom,
    resultBit
  };
}

export function perturbAOUEWithDetails(rawValue, domainSize, q, p = 0.5, randomFn = Math.random) {
  const originalVector = Encode(rawValue, domainSize);
  const bitSteps = originalVector.map((bit, index) => ({
    index,
    ...createAOUEBitStep(bit, p, q, randomFn())
  }));

  return {
    originalVector,
    reportValue: bitSteps.map(step => step.resultBit),
    bitSteps
  };
}

// AOUE 算法 - 客户端扰动
export function AOUE(rawValue, epsilon, domainSize, q) {
  return perturbAOUEWithDetails(rawValue, domainSize, q, 0.5).reportValue;
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
  if (beta > 0 && alpha / beta <= exp_eps) {
    return { p: 1, q: 0, triggeredByThreshold: true, expEpsilon: exp_eps };
  }
  const p = 0.5;
  const q = (alpha - beta * exp_eps) / ((exp_eps - 1) + 2 * (alpha - beta * exp_eps));
  return { p, q, rawQ: q, clamped: false, triggeredByThreshold: false, expEpsilon: exp_eps };
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

export function calculateTSPParameters(alpha, beta, epsilon, scoreDomainSize = 5) {
  const unifiedDomainSize = scoreDomainSize + 1;
  const exp_eps = Math.exp(epsilon);
  const p2Numerator = (1 - alpha) - (1 - beta) * exp_eps;
  const p2Denominator = (1 - unifiedDomainSize * alpha) - (1 - unifiedDomainSize * beta) * exp_eps;
  const p2 = p2Numerator / p2Denominator;
  const q2 = (1 - p2) / scoreDomainSize;
  const delta = p2 - q2;
  const stageOneDenominator = (scoreDomainSize - 1 + exp_eps) * delta;

  let p1 = 1;
  if (scoreDomainSize > 1 && stageOneDenominator !== 0) {
    const stageOneNumerator = (
      exp_eps * p2
      + ((scoreDomainSize - 2) * exp_eps - (scoreDomainSize - 1)) * q2
    );
    p1 = stageOneNumerator / stageOneDenominator;
  }
  const q1 = scoreDomainSize > 1
    ? (1 - p1) / (scoreDomainSize - 1)
    : 0;

  // 检查参数有效性
  const p1Valid = p1 >= 0 && p1 <= 1;
  const q1Valid = q1 >= 0 && q1 <= 1;
  const p2Valid = p2 >= 0 && p2 <= 1;
  const q2Valid = q2 >= 0 && q2 <= 1;
  
  if (!p1Valid || !q1Valid || !p2Valid || !q2Valid) {
    console.warn(`TSP参数计算警告: 推导的参数超出有效范围 [0,1]`);
    console.warn(`  alpha=${alpha}, beta=${beta}, epsilon=${epsilon}, scoreDomainSize=${scoreDomainSize}`);
    console.warn(`  p1=${p1}, q1=${q1}, p2=${p2}, q2=${q2}`);
    console.warn(`  将回退到标准随机响应参数`);
    
    // 回退到标准随机响应
    // 第一阶段：域 {1,...,K}（大小 K）
    const stage1Denominator = exp_eps + scoreDomainSize - 1;
    const fallbackP1 = exp_eps / stage1Denominator;
    const fallbackQ1 = 1 / stage1Denominator;
    
    // 第二阶段：域 {0,1,...,K}（大小 K+1）
    const stage2Denominator = exp_eps + scoreDomainSize;
    const fallbackP2 = exp_eps / stage2Denominator;
    const fallbackQ2 = 1 / stage2Denominator;
    
    // 计算回退情况下的 pStar 和 qStar
    const fallbackPStar = fallbackP1 * fallbackP2 + (scoreDomainSize - 1) * fallbackQ1 * fallbackQ2;
    const fallbackQStar = fallbackP1 * fallbackQ2 + fallbackQ1 * fallbackP2 + (scoreDomainSize - 2) * fallbackQ1 * fallbackQ2;
    
    return {
      version: 'fallback_standard_rr',
      epsilon,
      p1: fallbackP1,
      q1: fallbackQ1,
      p2: fallbackP2,
      q2: fallbackQ2,
      pStar: fallbackPStar,
      qStar: fallbackQStar,
      scoreDomainSize,
      unifiedDomainSize,
      fallback: true,
      fallbackReason: '参数超出有效范围'
    };
  }

  // 正确的两阶段扰动概率计算
  // pStar = Pr(上报值=原始值|原始值非缺失)
  //       = Pr(阶段1保持且阶段2保持) + Pr(阶段1翻转且阶段2恰好翻回)
  //       = p1*p2 + (K-1)*q1*q2
  const pStar = p1 * p2 + (scoreDomainSize - 1) * q1 * q2;
  
  // Pr(上报0|原始值非缺失) = q2
  // 这是正确的，因为阶段2翻转为0的概率是 q2
  
  // qStar = Pr(上报某个特定非原始非零值 u|原始值非缺失)
  //       = Pr(阶段1保持且阶段2翻转到u) + Pr(阶段1翻转到u且阶段2保持) + Pr(阶段1翻转到其他值且阶段2翻转到u)
  //       = p1*q2 + q1*p2 + (K-2)*q1*q2
  //       注意：q2 已经是翻转为特定值的概率（因为阶段2有 K+1 个值，翻转时均匀分布到其他 K 个值）
  const K = scoreDomainSize;
  const qStar = p1 * q2 + q1 * p2 + (K - 2) * q1 * q2;

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
