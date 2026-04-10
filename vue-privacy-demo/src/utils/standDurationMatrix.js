import { STAND_BUCKET_ORDER } from './constants.js';
import { choose } from './ldpAlgorithms.js';

export { STAND_BUCKET_ORDER };

export const STAND_DURATION_DATA_PATH = '/data/temp_stand_duration_weight_200.csv';
const STAND_SENSITIVE_ORDER = ['偏瘦', '正常', '超重'];

export async function loadStandMatrixFromCSV() {
  try {
    return getMockStandMatrixData();
  } catch (error) {
    console.error('Error loading stand duration matrix:', error);
    return getMockStandMatrixData();
  }
}

function getMockStandMatrixData() {
  return {
    偏瘦: {
      低站立: 0.2,
      中低站立: 0.3,
      中高站立: 0.3,
      高站立: 0.2
    },
    正常: {
      低站立: 0.15,
      中低站立: 0.3,
      中高站立: 0.35,
      高站立: 0.2
    },
    超重: {
      低站立: 0.4,
      中低站立: 0.3,
      中高站立: 0.2,
      高站立: 0.1
    }
  };
}

export function buildStandMatrixRows(matrixData) {
  if (!matrixData) return [];

  return STAND_SENSITIVE_ORDER.map(weightStatus => {
    const row = { s: weightStatus };
    STAND_BUCKET_ORDER.forEach(bucket => {
      row[bucket] = matrixData[weightStatus]?.[bucket] || 0;
    });
    return row;
  });
}

export function calculateStandAlphaBeta(matrixData, epsilon = 1) {
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
    const values = STAND_SENSITIVE_ORDER.map(status => matrixData[status]?.[bucket] || 0);
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
