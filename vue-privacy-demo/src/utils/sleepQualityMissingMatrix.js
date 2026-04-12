import { MISSING_STATUS_ORDER } from './constants.js';
import { AGE_GROUP_ORDER, FALL_ALARM_DATA_PATH, getAgeGroup, parseCSV, loadCSVFile } from './fallAlarmMatrix.js';

export { MISSING_STATUS_ORDER };
export const SLEEP_QUALITY_MISSING_DATA_PATH = '/data/temp_sleep_quality_missing_age_200.csv';

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

export function calculateSleepMissingAlphaBeta(matrixData) {
  const stats = calculateMissingColumnStats(matrixData);
  const selectedStat = stats[1].ratio > stats[0].ratio ? stats[1] : stats[0];
  return {
    selectedLabel: selectedStat.label,
    alpha: selectedStat.max,
    beta: selectedStat.min,
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
