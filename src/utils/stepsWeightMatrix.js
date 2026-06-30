import { STEP_BUCKET_ORDER, WEIGHT_STATUS_ORDER } from './constants.js';
import { choose } from './ldpAlgorithms.js';
import {
  CONDITION_DISTRIBUTION_KEYS,
  buildMatrixDataFromPreset
} from './conditionDistributionPresets.js';
import { getStepsBucket } from './stepsBuckets.js';

export { STEP_BUCKET_ORDER, WEIGHT_STATUS_ORDER, getStepsBucket };

export const STEPS_WEIGHT_DATA_PATH = 'src/data/conditionDistributionPresets.json';

export function normalizeStepsRows(rows) {
  return rows
    .map(row => {
      const steps = Number(row.steps);
      const stepsBucket = getStepsBucket(steps);
      const weightStatus = row.weight_status?.trim();

      if (!Number.isFinite(steps) || !stepsBucket || !WEIGHT_STATUS_ORDER.includes(weightStatus)) {
        return null;
      }

      return {
        userId: row.user_id,
        steps,
        stepsBucket,
        weightStatus
      };
    })
    .filter(Boolean);
}

export function calculatePrAGivenS() {
  const matrix = buildMatrixDataFromPreset(CONDITION_DISTRIBUTION_KEYS.AOUE_STEPS_BMI);
  return {
    conditionalProbs: matrix.conditionalProbs,
    jointCounts: matrix.jointCounts,
    sCounts: matrix.sCounts
  };
}

export function buildStepsMatrixRows(matrixData) {
  if (!matrixData) return [];

  return WEIGHT_STATUS_ORDER.map(status => {
    const row = { s: status };
    STEP_BUCKET_ORDER.forEach(bucket => {
      row[bucket] = matrixData.conditionalProbs?.[status]?.[bucket] ?? 0;
    });
    return row;
  });
}

function getPairwiseSupportCandidates(matrixData, epsilon = 0.5) {
  const pairs = WEIGHT_STATUS_ORDER.flatMap(left =>
    WEIGHT_STATUS_ORDER
      .filter(right => right !== left)
      .map(right => [left, right])
  );
  const expEpsilon = Math.exp(epsilon);
  const defaultAlpha = expEpsilon / (1 + expEpsilon);
  const defaultBeta = 1 / (1 + expEpsilon);

  return pairs.map(([left, right], pairIndex) => {
    const diffEntries = STEP_BUCKET_ORDER.map(bucket => {
      const leftProb = matrixData.conditionalProbs?.[left]?.[bucket] ?? 0;
      const rightProb = matrixData.conditionalProbs?.[right]?.[bucket] ?? 0;
      const ratio = rightProb === 0 ? (leftProb === 0 ? 1 : Number.POSITIVE_INFINITY) : leftProb / rightProb;
      const included = ratio >= expEpsilon;

      return {
        bucket,
        leftProb,
        rightProb,
        ratio,
        included
      };
    });

    const supportBuckets = diffEntries.filter(item => item.included).map(item => item.bucket);
    const pairValues = calculateSupportProbabilities(matrixData, supportBuckets, [left, right]);
    const leftValue = pairValues.find(item => item.status === left) ?? { status: left, terms: [], sum: 0 };
    const rightValue = pairValues.find(item => item.status === right) ?? { status: right, terms: [], sum: 0 };
    const isEmptySet = supportBuckets.length === 0;
    const alpha = isEmptySet ? defaultAlpha : leftValue.sum;
    const beta = isEmptySet ? defaultBeta : rightValue.sum;

    return {
      label: `${left} vs ${right}`,
      sourcePair: [left, right],
      orderedPairIndex: pairIndex,
      isDirectedPair: true,
      supportRule: '按论文规则构造 C_ij = { a | Pr(A=a|s_i) / Pr(A=a|s_j) >= e^ε }。',
      buckets: supportBuckets,
      bucketText: supportBuckets.length ? supportBuckets.join('、') : '∅',
      pairValues,
      alpha,
      beta,
      alphaSource: left,
      betaSource: right,
      alphaTerms: leftValue.terms,
      betaTerms: rightValue.terms,
      alphaFormula: isEmptySet
        ? `α_${left}${right} = e^ε / (1 + e^ε) = ${defaultAlpha.toFixed(4)}`
        : `α_${left}${right} = ${leftValue.terms.map(value => value.toFixed(4)).join(' + ')} = ${leftValue.sum.toFixed(4)}`,
      betaFormula: isEmptySet
        ? `β_${left}${right} = 1 / (1 + e^ε) = ${defaultBeta.toFixed(4)}`
        : `β_${left}${right} = ${rightValue.terms.map(value => value.toFixed(4)).join(' + ')} = ${rightValue.sum.toFixed(4)}`,
      compareFormula: isEmptySet
        ? `由于 C_${left}${right} = ∅，按默认初始化取 α = ${defaultAlpha.toFixed(4)}，β = ${defaultBeta.toFixed(4)}`
        : `α = ${leftValue.sum.toFixed(4)}，β = ${rightValue.sum.toFixed(4)}`,
      ratio: beta === 0 ? Number.POSITIVE_INFINITY : alpha / beta,
      bucketDecisions: diffEntries.map(item => ({
        bucket: item.bucket,
        leftStatus: left,
        rightStatus: right,
        leftProb: item.leftProb,
        rightProb: item.rightProb,
        ratio: item.ratio,
        included: item.included,
        reason: item.included
          ? `因 Pr(${item.bucket}|${left}) / Pr(${item.bucket}|${right}) = ${Number.isFinite(item.ratio) ? item.ratio.toFixed(4) : 'Infinity'} >= e^ε = ${expEpsilon.toFixed(4)}，纳入 C_ij`
          : `因 Pr(${item.bucket}|${left}) / Pr(${item.bucket}|${right}) = ${Number.isFinite(item.ratio) ? item.ratio.toFixed(4) : 'Infinity'} < e^ε = ${expEpsilon.toFixed(4)}，不纳入 C_ij`
      })),
      localRule: `对 ${left} vs ${right}，仅保留满足 Pr(A=a|S=${left}) / Pr(A=a|S=${right}) >= e^ε 的桶。`,
      expEpsilon,
      isEmptySet
    };
  });
}

function calculateSupportProbabilities(matrixData, buckets, statuses = WEIGHT_STATUS_ORDER) {
  return statuses.map(status => {
    const terms = buckets.map(bucket => matrixData.conditionalProbs?.[status]?.[bucket] ?? 0);
    const sum = terms.reduce((acc, value) => acc + value, 0);

    return {
      status,
      buckets,
      terms,
      sum
    };
  });
}

export function calculateStepsAlphaBeta(matrixData, epsilon = 0.5) {
  if (!matrixData) {
    return {
      alpha: null,
      beta: null,
      selectedLabel: null,
      selectedSupportSet: null,
      supportStats: []
    };
  }

  const expEpsilon = Math.exp(epsilon);
  const supportStats = getPairwiseSupportCandidates(matrixData, epsilon).map((candidate, index) => ({
    ...candidate,
    supportIndex: index
  }));

  let selectedPair = null;
  let selectedSupportSet = null;

  supportStats.forEach(stat => {
    if (!selectedPair) {
      selectedPair = [stat.alpha, stat.beta];
      selectedSupportSet = stat;
      return;
    }

    const [nextAlpha, nextBeta] = choose(stat.alpha, stat.beta, selectedPair[0], selectedPair[1], expEpsilon);
    if (nextAlpha === stat.alpha && nextBeta === stat.beta) {
      selectedPair = [stat.alpha, stat.beta];
      selectedSupportSet = stat;
    }
  });

  return {
    alpha: selectedPair?.[0] ?? null,
    beta: selectedPair?.[1] ?? null,
    selectedLabel: selectedSupportSet?.label ?? null,
    selectedSupportSet,
    supportStats,
    candidatePairCount: supportStats.length,
    orderedPairRule: '系统对所有有序敏感状态对 i != j 构造 C_ij，反方向 C_ji 会作为独立候选参与比较。',
    selectionRule: '系统先按论文中的支持集规则构造所有有序状态对的 C_ij，再计算每个 (α_ij, β_ij)，最后使用 choose() 依据不确定性参数选择规则选出最终结果。',
    expEpsilon
  };
}

export async function loadStepsMatrixFromCSV() {
  return {
    rows: [],
    matrix: buildMatrixDataFromPreset(CONDITION_DISTRIBUTION_KEYS.AOUE_STEPS_BMI)
  };
}

export async function loadCSVFile() {
  throw new Error('当前阶段不在前端运行时读取原始 CSV，请使用 conditionDistributionPresets.json。');
}

export function parseCSV() {
  return [];
}
