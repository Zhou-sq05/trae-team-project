import { STAND_BUCKET_ORDER, WEIGHT_STATUS_ORDER } from './constants.js';
import { choose } from './ldpAlgorithms.js';
import {
  CONDITION_DISTRIBUTION_KEYS,
  buildMatrixDataFromPreset
} from './conditionDistributionPresets.js';

export { STAND_BUCKET_ORDER };

export const STAND_DURATION_DATA_PATH = 'src/data/conditionDistributionPresets.json';
const STAND_SENSITIVE_ORDER = WEIGHT_STATUS_ORDER;

export async function loadStandMatrixFromCSV() {
  return buildMatrixDataFromPreset(CONDITION_DISTRIBUTION_KEYS.AGRR_ACTIVITY_BMI);
}

export function buildStandMatrixRows(matrixData) {
  if (!matrixData) return [];

  return STAND_SENSITIVE_ORDER.map(weightStatus => {
    const row = { s: weightStatus };
    STAND_BUCKET_ORDER.forEach(bucket => {
      row[bucket] = matrixData.conditionalProbs?.[weightStatus]?.[bucket] ?? 0;
    });
    return row;
  });
}

export function calculateStandAlphaBeta(matrixData, epsilon = 0.5) {
  if (!matrixData) {
    return {
      alpha: null,
      beta: null,
      selectedLabel: null,
      selectedStat: null,
      columnStats: []
    };
  }

  const expEpsilon = Math.exp(epsilon);
  const columnStats = STAND_BUCKET_ORDER.map((bucket, index) => {
    const values = STAND_SENSITIVE_ORDER.map(status => matrixData.conditionalProbs?.[status]?.[bucket] ?? 0);
    const alpha = Math.max(...values);
    const beta = Math.min(...values);
    const ratio = beta === 0 ? Number.POSITIVE_INFINITY : alpha / beta;

    return {
      label: bucket,
      alpha,
      beta,
      max: alpha,
      min: beta,
      ratio,
      columnIndex: index
    };
  });

  let selectedPair = null;
  let selectedStat = null;

  columnStats.forEach(stat => {
    if (!selectedPair) {
      selectedPair = [stat.alpha, stat.beta];
      selectedStat = stat;
      return;
    }

    const [nextAlpha, nextBeta] = choose(stat.alpha, stat.beta, selectedPair[0], selectedPair[1], expEpsilon);
    if (nextAlpha === stat.alpha && nextBeta === stat.beta) {
      selectedPair = [stat.alpha, stat.beta];
      selectedStat = stat;
    }
  });

  return {
    alpha: selectedPair?.[0] ?? null,
    beta: selectedPair?.[1] ?? null,
    selectedLabel: selectedStat?.label ?? null,
    selectedStat,
    columnStats,
    selectionRule: '系统依据不确定性参数选择规则，从各列的 (αk, βk) 中选出最终 α、β。',
    expEpsilon
  };
}
