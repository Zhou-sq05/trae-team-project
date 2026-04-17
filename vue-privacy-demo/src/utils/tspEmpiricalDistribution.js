import { AGE_GROUP_ORDER, loadCSVFile, parseCSV } from './fallAlarmMatrix.js';
import { normalizeSleepMissingRows, SLEEP_QUALITY_MISSING_DATA_PATH } from './sleepQualityMissingMatrix.js';

const SCORE_DOMAIN = [1, 2, 3, 4, 5];
const distributionCache = new Map();

function createEmptyScoreCounts() {
  return Object.fromEntries(SCORE_DOMAIN.map(score => [String(score), 0]));
}

function createEmptyAgeGroupCounts() {
  return Object.fromEntries(AGE_GROUP_ORDER.map(group => [group, 0]));
}

function createEmptyAgeGroupStats() {
  return Object.fromEntries(
    AGE_GROUP_ORDER.map(group => [
      group,
      {
        total: 0,
        missing: 0,
        nonMissing: 0,
        missingRate: 0,
        nonMissingRate: 0
      }
    ])
  );
}

function toProbabilityMap(counts, total) {
  return Object.fromEntries(
    Object.entries(counts).map(([key, count]) => [key, total > 0 ? count / total : 0])
  );
}

export function buildTspEmpiricalDistribution(rows) {
  const missingCounts = {
    missing: 0,
    nonMissing: 0
  };
  const scoreCounts = createEmptyScoreCounts();
  const ageGroupCounts = createEmptyAgeGroupCounts();
  const ageGroupStats = createEmptyAgeGroupStats();

  rows.forEach(row => {
    const ageGroup = row.ageGroup;
    if (!ageGroupStats[ageGroup]) {
      ageGroupStats[ageGroup] = {
        total: 0,
        missing: 0,
        nonMissing: 0,
        missingRate: 0,
        nonMissingRate: 0
      };
      ageGroupCounts[ageGroup] = 0;
    }

    ageGroupCounts[ageGroup] += 1;
    ageGroupStats[ageGroup].total += 1;

    if (row.sleepMissing === 1) {
      missingCounts.missing += 1;
      ageGroupStats[ageGroup].missing += 1;
      return;
    }

    missingCounts.nonMissing += 1;
    ageGroupStats[ageGroup].nonMissing += 1;
    scoreCounts[String(row.sleepScore)] += 1;
  });

  Object.values(ageGroupStats).forEach(stats => {
    if (stats.total > 0) {
      stats.missingRate = stats.missing / stats.total;
      stats.nonMissingRate = stats.nonMissing / stats.total;
    }
  });

  return {
    filePath: SLEEP_QUALITY_MISSING_DATA_PATH,
    sampleSize: rows.length,
    nonMissingSampleSize: missingCounts.nonMissing,
    rows,
    missingCounts,
    missingProbabilities: toProbabilityMap(missingCounts, rows.length),
    scoreCounts,
    scoreProbabilities: toProbabilityMap(scoreCounts, missingCounts.nonMissing),
    ageGroupCounts,
    ageGroupProbabilities: toProbabilityMap(ageGroupCounts, rows.length),
    ageGroupStats
  };
}

export async function getTspEmpiricalDistribution(filePath = SLEEP_QUALITY_MISSING_DATA_PATH) {
  if (!distributionCache.has(filePath)) {
    distributionCache.set(
      filePath,
      (async () => {
        const csvContent = await loadCSVFile(filePath);
        const parsedRows = parseCSV(csvContent);
        const normalizedRows = normalizeSleepMissingRows(parsedRows);
        return buildTspEmpiricalDistribution(normalizedRows);
      })()
    );
  }

  return distributionCache.get(filePath);
}

export function sampleTspRawRecordFromDistribution(distribution) {
  const rows = distribution?.rows ?? [];
  if (!rows.length) {
    throw new Error('TSP 基础样本为空，无法采样');
  }

  const sampledRow = rows[Math.floor(Math.random() * rows.length)];

  return {
    userId: sampledRow.userId,
    age: sampledRow.age,
    ageGroup: sampledRow.ageGroup,
    sleepMissing: sampledRow.sleepMissing,
    sleepScore: sampledRow.sleepScore,
    rawMissing: sampledRow.sleepMissing,
    rawScore: sampledRow.sleepScore,
    missingLabel: sampledRow.missingLabel
  };
}

export async function sampleTspRawRecordByDistribution(filePath = SLEEP_QUALITY_MISSING_DATA_PATH) {
  const distribution = await getTspEmpiricalDistribution(filePath);
  return sampleTspRawRecordFromDistribution(distribution);
}

export function clearTspEmpiricalDistributionCache(filePath = null) {
  if (filePath) {
    distributionCache.delete(filePath);
    return;
  }

  distributionCache.clear();
}
