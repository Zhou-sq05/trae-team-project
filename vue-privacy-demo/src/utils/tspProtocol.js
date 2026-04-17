import { calculateAGRParameters, calculateLegacySplitBudgetTSPParameters, calculateTSPParameters } from './ldpAlgorithms.js';

export const TSP_VERSION_LEGACY_SPLIT_BUDGET = 'legacy_split_budget';
export const TSP_VERSION_PAPER_UNIFIED_BUDGET = 'paper_unified_budget';

function approximatelyEqual(left, right, tolerance = 1e-3) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function hasFiniteProbabilities(values) {
  return values.every(Number.isFinite);
}

function getRawTspVersion(snapshot = {}) {
  return snapshot?.tspVersion
    || snapshot?.calibratedParams?.tspVersion
    || snapshot?.notes?.tspVersion
    || '';
}

export function getTspVersion(versionOrSnapshot) {
  const rawVersion = typeof versionOrSnapshot === 'string'
    ? versionOrSnapshot
    : getRawTspVersion(versionOrSnapshot);

  if (rawVersion === TSP_VERSION_LEGACY_SPLIT_BUDGET) {
    return TSP_VERSION_LEGACY_SPLIT_BUDGET;
  }

  if (rawVersion === TSP_VERSION_PAPER_UNIFIED_BUDGET) {
    return TSP_VERSION_PAPER_UNIFIED_BUDGET;
  }

  if (typeof versionOrSnapshot === 'object' && versionOrSnapshot) {
    const hasLegacyBudgetFields = versionOrSnapshot?.epsilonStage1 != null
      || versionOrSnapshot?.epsilonStage2 != null
      || versionOrSnapshot?.calibratedParams?.epsilonStage1 != null
      || versionOrSnapshot?.calibratedParams?.epsilonStage2 != null;

    if (hasLegacyBudgetFields) {
      return TSP_VERSION_LEGACY_SPLIT_BUDGET;
    }
  }

  return TSP_VERSION_PAPER_UNIFIED_BUDGET;
}

export function isLegacyTspVersion(versionOrSnapshot) {
  return getTspVersion(versionOrSnapshot) === TSP_VERSION_LEGACY_SPLIT_BUDGET;
}

export function getTspVersionMeta(versionOrSnapshot) {
  const version = getTspVersion(versionOrSnapshot);

  if (version === TSP_VERSION_LEGACY_SPLIT_BUDGET) {
    return {
      version,
      label: '旧版均分预算逻辑',
      shortLabel: '旧版',
      description: '该任务沿用了早期的 ε1 / ε2 均分实现，仅用于兼容历史结果展示，不再作为新任务默认逻辑。',
      usesUnifiedEpsilon: false
    };
  }

  return {
    version,
    label: '论文统一 ε 逻辑',
    shortLabel: '论文版',
    description: '该任务按论文定义使用统一的总隐私预算 ε 联合求解两阶段扰动参数。',
    usesUnifiedEpsilon: true
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
  const version = getTspVersion(snapshot);
  const calculated = version === TSP_VERSION_LEGACY_SPLIT_BUDGET
    ? calculateLegacySplitBudgetTSPParameters(alpha, beta, epsilon, scoreDomainSize)
    : calculateTSPParameters(alpha, beta, epsilon, scoreDomainSize);

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

  const legacyBudgetInfo = version === TSP_VERSION_LEGACY_SPLIT_BUDGET
    ? {
        epsilonStage1: Number(snapshot.calibratedParams?.epsilonStage1 ?? snapshot.epsilonStage1 ?? calculated.epsilonStage1),
        epsilonStage2: Number(snapshot.calibratedParams?.epsilonStage2 ?? snapshot.epsilonStage2 ?? calculated.epsilonStage2),
        displayOnly: true
      }
    : null;

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
    versionMeta: getTspVersionMeta(version),
    legacyBudgetInfo
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

export function calculateLegacyUnifiedBudgetComparison(alpha, beta, epsilon, scoreDomainSize = 5) {
  return {
    legacy: calculateLegacySplitBudgetTSPParameters(alpha, beta, epsilon, scoreDomainSize),
    paper: calculateTSPParameters(alpha, beta, epsilon, scoreDomainSize)
  };
}

export function calculateTspCompositeTarget(alpha, beta, epsilon, scoreDomainSize = 5) {
  return calculateAGRParameters(alpha, beta, epsilon, scoreDomainSize);
}
