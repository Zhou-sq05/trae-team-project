import { MISSING_STATUS_ORDER } from './constants.js';
import { AGE_GROUP_ORDER, FALL_ALARM_DATA_PATH, getAgeGroup, parseCSV, loadCSVFile } from './fallAlarmMatrix.js';
import { calculateTSPAlphaBetaFromMissingProbs } from './ldpAlgorithms.js';

export { MISSING_STATUS_ORDER };
export const SLEEP_QUALITY_MISSING_DATA_PATH = '/data/temp_sleep_quality_missing_age_500.csv';

export function getMissingLabel(value) {
  return Number(value) === 1 ? '缺失（M=1）' : '非缺失（M=0）';
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

export function calculatePrMGivenS(rows) {
  const conditionalProbs = {};
  const jointCounts = {};
  const sCounts = {};

  AGE_GROUP_ORDER.forEach(group => {
    conditionalProbs[group] = Object.fromEntries(MISSING_STATUS_ORDER.map(label => [label, 0]));
    jointCounts[group] = Object.fromEntries(MISSING_STATUS_ORDER.map(label => [label, 0]));
    sCounts[group] = 0;
  });

  rows.forEach(row => {
    jointCounts[row.ageGroup][row.missingLabel] += 1;
    sCounts[row.ageGroup] += 1;
  });

  AGE_GROUP_ORDER.forEach(group => {
    const total = sCounts[group];
    if (!total) return;

    MISSING_STATUS_ORDER.forEach(label => {
      conditionalProbs[group][label] = jointCounts[group][label] / total;
    });
  });

  return { conditionalProbs, jointCounts, sCounts };
}

export function buildSleepMissingMatrixRows(matrixData) {
  if (!matrixData) return [];

  return AGE_GROUP_ORDER.map(group => {
    const row = { s: group };
    MISSING_STATUS_ORDER.forEach(label => {
      row[label] = matrixData.conditionalProbs[group]?.[label] ?? 0;
    });
    return row;
  });
}

export function calculateMissingColumnStats(matrixData) {
  const rows = buildSleepMissingMatrixRows(matrixData);

  return MISSING_STATUS_ORDER.map(label => {
    const values = rows.map(row => row[label] ?? 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const ratio = min === 0 ? Number.POSITIVE_INFINITY : max / min;
    return { label, max, min, ratio };
  });
}

function approximatelyEqual(left, right, tolerance = 1e-9) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

// TSP 的 alpha / beta 来源于缺失状态条件分布 Pr(M|S)。
// 这里保留睡眠质量场景专用入口，避免调用方直接面对通用 calculateAlphaBeta。
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

export async function loadSleepMissingMatrixFromCSV(filePath = SLEEP_QUALITY_MISSING_DATA_PATH) {
  const csvContent = await loadCSVFile(filePath);
  const parsedRows = parseCSV(csvContent);
  const normalizedRows = normalizeSleepMissingRows(parsedRows);
  const matrix = calculatePrMGivenS(normalizedRows);

  return {
    rows: normalizedRows,
    matrix
  };
}
