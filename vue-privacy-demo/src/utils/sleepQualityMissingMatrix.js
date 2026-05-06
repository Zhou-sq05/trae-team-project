import { MISSING_STATUS_ORDER, SLEEP_QUALITY_BUCKET_ORDER } from './constants.js';
import { AGE_GROUP_ORDER, getAgeGroup } from './fallAlarmMatrix.js';
import { calculateTSPAlphaBetaFromMissingProbs } from './ldpAlgorithms.js';
import {
  CONDITION_DISTRIBUTION_KEYS,
  buildMatrixDataFromPreset
} from './conditionDistributionPresets.js';

export { MISSING_STATUS_ORDER, SLEEP_QUALITY_BUCKET_ORDER };
export const SLEEP_QUALITY_MISSING_DATA_PATH = 'src/data/conditionDistributionPresets.json';

export function getMissingLabel(value) {
  return Number(value) === 1 ? '缺失' : '未缺失';
}

export function normalizeSleepMissingRows(rows) {
  return rows
    .map(row => {
      const age = Number(row.age);
      const ageGroup = getAgeGroup(age);
      const missingValue = Number(row.sleep_missing);
      const rawScore = row.sleep_score?.trim();
      const sleepScore = rawScore === '' ? null : Number(rawScore);

      if (!Number.isFinite(age) || !ageGroup || ![0, 1].includes(missingValue)) {
        return null;
      }

      if (missingValue === 0 && (!Number.isFinite(sleepScore) || sleepScore < 1 || sleepScore > 5)) {
        return null;
      }

      return {
        userId: row.user_id,
        age,
        ageGroup,
        sleepScore,
        sleepMissing: missingValue,
        missingLabel: getMissingLabel(missingValue)
      };
    })
    .filter(Boolean);
}

export function calculatePrMGivenS() {
  const matrix = buildMatrixDataFromPreset(CONDITION_DISTRIBUTION_KEYS.TSP_SLEEP_QUALITY_MISSING_AGE);
  return {
    conditionalProbs: matrix.conditionalProbs,
    jointCounts: matrix.jointCounts,
    sCounts: matrix.sCounts
  };
}

export function buildSleepMissingMatrixRows(matrixData) {
  if (!matrixData) return [];

  return AGE_GROUP_ORDER.map(group => {
    const row = { s: group };
    MISSING_STATUS_ORDER.forEach(label => {
      row[label] = matrixData.conditionalProbs?.[group]?.[label] ?? 0;
    });
    return row;
  });
}

export function buildSleepQualityMatrixRows(matrixData) {
  if (!matrixData) return [];

  return AGE_GROUP_ORDER.map(group => {
    const row = { s: group };
    SLEEP_QUALITY_BUCKET_ORDER.forEach(label => {
      row[label] = matrixData.conditionalProbs?.[group]?.[label] ?? 0;
    });
    return row;
  });
}

function calculateColumnStats(matrixData, domain) {
  const rows = domain === MISSING_STATUS_ORDER
    ? buildSleepMissingMatrixRows(matrixData)
    : buildSleepQualityMatrixRows(matrixData);

  return domain.map(label => {
    const values = rows.map(row => row[label] ?? 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const ratio = min === 0 ? Number.POSITIVE_INFINITY : max / min;
    return { label, max, min, alpha: max, beta: min, ratio };
  });
}

export function calculateMissingColumnStats(matrixData) {
  return calculateColumnStats(matrixData, MISSING_STATUS_ORDER);
}

export function calculateSleepQualityColumnStats(matrixData) {
  return calculateColumnStats(matrixData, SLEEP_QUALITY_BUCKET_ORDER);
}

function approximatelyEqual(left, right, tolerance = 1e-9) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function calculateGenericMatrixAlphaBeta(matrixData, rowsBuilder, domain) {
  const stats = calculateColumnStats(matrixData, domain);
  const rows = rowsBuilder(matrixData);
  const selectedStat = stats.reduce((best, current) => {
    if (!best) return current;
    return current.ratio > best.ratio ? current : best;
  }, null);
  const values = rows.map(row => row[selectedStat?.label] ?? 0);

  return {
    selectedLabel: selectedStat?.label || '',
    alpha: Math.max(...values),
    beta: Math.min(...values),
    selectedStat,
    stats
  };
}

export function calculateSleepQualityAlphaBeta(matrixData) {
  return calculateGenericMatrixAlphaBeta(matrixData, buildSleepQualityMatrixRows, SLEEP_QUALITY_BUCKET_ORDER);
}

export function calculateSleepMissingAlphaBeta(matrixData, epsilon) {
  const stats = calculateMissingColumnStats(matrixData);
  const rows = buildSleepMissingMatrixRows(matrixData);
  const conditionalProbs = rows.map(row => MISSING_STATUS_ORDER.map(label => row[label] ?? Number.NaN));
  const { alpha, beta } = calculateTSPAlphaBetaFromMissingProbs(conditionalProbs, epsilon);
  const selectedStat = stats.find(stat => (
    approximatelyEqual(stat.max, alpha) && approximatelyEqual(stat.min, beta)
  )) || stats[0] || null;

  return {
    selectedLabel: selectedStat?.label || '',
    alpha,
    beta,
    selectedStat,
    stats
  };
}

export function calculateCombinedTspAlphaBeta(scoreMatrixData, missingMatrixData, epsilon) {
  const scoreResult = calculateSleepQualityAlphaBeta(scoreMatrixData);
  const missingResult = calculateSleepMissingAlphaBeta(missingMatrixData, epsilon);
  const useScore = (scoreResult.beta === 0 ? Number.POSITIVE_INFINITY : scoreResult.alpha / scoreResult.beta)
    > (missingResult.beta === 0 ? Number.POSITIVE_INFINITY : missingResult.alpha / missingResult.beta);
  const selected = useScore ? scoreResult : missingResult;

  return {
    ...selected,
    selectedSource: useScore ? '睡眠质量评分矩阵 P(A|S)' : '缺失状态矩阵 P(M|S)',
    scoreResult,
    missingResult,
    stats: [
      ...scoreResult.stats.map(item => ({ ...item, source: 'P(A|S)' })),
      ...missingResult.stats.map(item => ({ ...item, source: 'P(M|S)' }))
    ]
  };
}

export async function loadSleepMissingMatrixFromCSV() {
  return {
    rows: [],
    matrix: buildMatrixDataFromPreset(CONDITION_DISTRIBUTION_KEYS.TSP_SLEEP_QUALITY_MISSING_AGE)
  };
}

export async function loadSleepQualityMatrixFromPreset() {
  return {
    rows: [],
    matrix: buildMatrixDataFromPreset(CONDITION_DISTRIBUTION_KEYS.TSP_SLEEP_QUALITY_AGE)
  };
}
