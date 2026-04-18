import { calculateAGRParameters, calculateTSPParameters } from './ldpAlgorithms.js';

export const TSP_VERSION_PAPER_UNIFIED_BUDGET = 'paper_unified_budget';

function approximatelyEqual(left, right, tolerance = 1e-3) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function hasFiniteProbabilities(values) {
  return values.every(Number.isFinite);
}

export function getTspVersion() {
  return TSP_VERSION_PAPER_UNIFIED_BUDGET;
}

export function getTspVersionMeta() {
  return {
    version: TSP_VERSION_PAPER_UNIFIED_BUDGET,
    label: '论文统一 ε 逻辑',
    shortLabel: '论文版',
    description: '该任务按论文定义使用统一的总隐私预算 ε 联合求解两阶段扰动参数。'
  };
}

function buildProbabilityConstraints(p1, q1, p2, q2, scoreDomainSize) {
  return {
    stageOneConstraint: p1 + (scoreDomainSize - 1) * q1,
    stageTwoConstraint: p2 + scoreDomainSize * q2,
    expectedPStar: p1 * p2 + (1 - p1) * q2,
    expectedQStar: q1 * p2 + (1 - q1) * q2
  };
}

function hasValidStoredTspParams({ p1, q1, p2, q2, pStar, qStar, scoreDomainSize }) {
  if (!hasFiniteProbabilities([p1, q1, p2, q2])) {
    return false;
  }

  const constraints = buildProbabilityConstraints(p1, q1, p2, q2, scoreDomainSize);

  return approximatelyEqual(constraints.stageOneConstraint, 1)
    && approximatelyEqual(constraints.stageTwoConstraint, 1)
    && (!Number.isFinite(pStar) || approximatelyEqual(pStar, constraints.expectedPStar))
    && (!Number.isFinite(qStar) || approximatelyEqual(qStar, constraints.expectedQStar));
}

export function resolveTspTaskConfig(taskOrSnapshot, scoreDomainSize = 5) {
  const snapshot = taskOrSnapshot?.configSnapshot || taskOrSnapshot || {};
  const alpha = Number(snapshot.alphaBetaResult?.alpha ?? snapshot.alpha ?? 0);
  const beta = Number(snapshot.alphaBetaResult?.beta ?? snapshot.beta ?? 0);
  const epsilon = Number(snapshot.epsilon ?? taskOrSnapshot?.privacyBudget ?? 1);
  const version = getTspVersion();
  const calculated = calculateTSPParameters(alpha, beta, epsilon, scoreDomainSize);

  let p1 = Number(snapshot.calibratedParams?.p1);
  let q1 = Number(snapshot.calibratedParams?.q1);
  let p2 = Number(snapshot.calibratedParams?.p2);
  let q2 = Number(snapshot.calibratedParams?.q2);
  let pStar = Number(snapshot.calibratedParams?.pStar);
  let qStar = Number(snapshot.calibratedParams?.qStar);

  if (!hasValidStoredTspParams({ p1, q1, p2, q2, pStar, qStar, scoreDomainSize })) {
    p1 = calculated.p1;
    q1 = calculated.q1;
    p2 = calculated.p2;
    q2 = calculated.q2;
    pStar = calculated.pStar;
    qStar = calculated.qStar;
  }

  if (!Number.isFinite(pStar) || !Number.isFinite(qStar)) {
    const constraints = buildProbabilityConstraints(p1, q1, p2, q2, scoreDomainSize);
    pStar = constraints.expectedPStar;
    qStar = constraints.expectedQStar;
  }

  return {
    alpha,
    beta,
    epsilon,
    p1,
    q1,
    p2,
    q2,
    pStar,
    qStar,
    scoreDomainSize,
    unifiedDomainSize: scoreDomainSize + 1,
    version,
    versionMeta: getTspVersionMeta()
  };
}

export function aggregateTspDomainCounts(reportCounts, sampleCount, config) {
  const unifiedDomainSize = Number(config?.unifiedDomainSize ?? 0);
  const estimatedCounts = new Array(unifiedDomainSize).fill(0);
  const total = Number(sampleCount) || 0;

  if (!total || !unifiedDomainSize) {
    return estimatedCounts;
  }

  const n0Hat = (Number(reportCounts[0] ?? 0) - total * config.q2) / (config.p2 - config.q2);
  estimatedCounts[0] = Number(n0Hat.toFixed(4));

  for (let value = 1; value < unifiedDomainSize; value += 1) {
    estimatedCounts[value] = Number(((
      Number(reportCounts[value] ?? 0)
      - n0Hat * config.q2
      - (total - n0Hat) * config.qStar
    ) / (config.pStar - config.qStar)).toFixed(4));
  }

  return estimatedCounts;
}

function clampFrequency(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function resolveReferenceFrequencies({
  trueCounts = [],
  estimatedCounts = [],
  sampleCount = 0,
  unifiedDomainSize = 0
} = {}) {
  const total = Number(sampleCount) || 0;
  const fallbackLength = Number(unifiedDomainSize) || Math.max(trueCounts.length, estimatedCounts.length, 0);

  if (!total || !fallbackLength) {
    return new Array(fallbackLength).fill(0);
  }

  const trueTotal = trueCounts.reduce((sum, value) => sum + (Number(value) || 0), 0);
  const referenceCounts = trueTotal > 0 ? trueCounts : estimatedCounts;

  return Array.from({ length: fallbackLength }, (_, index) => {
    const count = Number(referenceCounts[index] ?? 0);
    return clampFrequency(count / total);
  });
}

export function calculateTspFrequencyVarianceMetrics({
  trueCounts = [],
  estimatedCounts = [],
  sampleCount = 0,
  config
} = {}) {
  const total = Number(sampleCount) || 0;
  const unifiedDomainSize = Number(config?.unifiedDomainSize ?? 0);
  const varianceByCategory = {};

  if (!total || !unifiedDomainSize) {
    return {
      varianceByCategory,
      avgVariance: 0,
      totalVariance: 0,
      stdError: 0,
      ciWidth95: 0
    };
  }

  const referenceFreqs = resolveReferenceFrequencies({
    trueCounts,
    estimatedCounts,
    sampleCount: total,
    unifiedDomainSize
  });

  const deltaStageTwo = Number(config?.p2) - Number(config?.q2);
  const deltaScore = Number(config?.pStar) - Number(config?.qStar);
  const theta0 = clampFrequency(
    Number(config?.q2) + deltaStageTwo * Number(referenceFreqs[0] ?? 0)
  );

  const baseVariance0 = deltaStageTwo === 0
    ? 0
    : (theta0 * (1 - theta0)) / (total * (deltaStageTwo ** 2));

  varianceByCategory['0'] = Number(baseVariance0.toFixed(8));

  const coupling = deltaStageTwo === 0 ? 0 : (Number(config?.q2) - Number(config?.qStar)) / deltaStageTwo;

  for (let index = 1; index < unifiedDomainSize; index += 1) {
    const referenceFreq = Number(referenceFreqs[index] ?? 0);
    const thetaI = clampFrequency(
      Number(config?.qStar)
      + Number(referenceFreqs[0] ?? 0) * (Number(config?.q2) - Number(config?.qStar))
      + referenceFreq * deltaScore
    );

    if (deltaScore === 0) {
      varianceByCategory[String(index)] = 0;
      continue;
    }

    const varXi = (thetaI * (1 - thetaI)) / total;
    const varY0 = (theta0 * (1 - theta0)) / total;
    const covXiY0 = -(thetaI * theta0) / total;
    const categoryVariance = (varXi + (coupling ** 2) * varY0 - 2 * coupling * covXiY0) / (deltaScore ** 2);

    varianceByCategory[String(index)] = Number(Math.max(0, categoryVariance).toFixed(8));
  }

  const varianceValues = Object.values(varianceByCategory);
  const totalVariance = varianceValues.reduce((sum, value) => sum + Number(value || 0), 0);
  const avgVariance = varianceValues.length ? totalVariance / varianceValues.length : 0;
  const stdError = Math.sqrt(Math.max(0, avgVariance));
  const ciWidth95 = 2 * 1.96 * stdError;

  return {
    varianceByCategory,
    avgVariance: Number(avgVariance.toFixed(8)),
    totalVariance: Number(totalVariance.toFixed(8)),
    stdError: Number(stdError.toFixed(8)),
    ciWidth95: Number(ciWidth95.toFixed(8))
  };
}

export function calculateTspCompositeTarget(alpha, beta, epsilon, scoreDomainSize = 5) {
  return calculateAGRParameters(alpha, beta, epsilon, scoreDomainSize);
}
