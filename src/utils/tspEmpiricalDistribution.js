import { AGE_GROUP_ORDER } from './fallAlarmMatrix.js';
import { SLEEP_QUALITY_MISSING_DATA_PATH } from './sleepQualityMissingMatrix.js';
import {
  CONDITION_DISTRIBUTION_KEYS,
  getConditionDistribution,
  sampleObservedValue,
  samplePriorValue,
  sampleSensitiveValue
} from './conditionDistributionPresets.js';

const SCORE_DOMAIN = [1, 2, 3, 4, 5];
const QUALITY_SCORE_MAP = {
  评分1: 1,
  评分2: 2,
  评分3: 3,
  评分4: 4,
  评分5: 5
};
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

function createSyntheticRows(sampleSize = 500) {
  return Array.from({ length: sampleSize }, (_, index) => {
    const ageGroup = sampleSensitiveValue(CONDITION_DISTRIBUTION_KEYS.TSP_MISSING_AGE);
    const missingSample = sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.TSP_MISSING_AGE, ageGroup);
    const sleepMissing = missingSample.observedValue === '缺失' ? 1 : 0;
    const qualitySample = sleepMissing === 1
      ? { observedValue: null }
      : samplePriorValue(CONDITION_DISTRIBUTION_KEYS.TSP_SLEEP_QUALITY_VALUE_PRIOR);
    const sleepScore = sleepMissing === 1 ? null : QUALITY_SCORE_MAP[qualitySample.observedValue] ?? 3;

    return {
      userId: `preset_tsp_${index + 1}`,
      age: null,
      ageGroup,
      sleepMissing,
      sleepScore,
      rawMissing: sleepMissing,
      rawScore: sleepScore,
      qualityLabel: qualitySample.observedValue,
      missingLabel: sleepMissing === 1 ? '缺失' : '未缺失'
    };
  });
}

export function buildTspEmpiricalDistribution(rows = createSyntheticRows()) {
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
    dataSourceMode: 'multi_source_calibrated_preset',
    scorePrior: getConditionDistribution(CONDITION_DISTRIBUTION_KEYS.TSP_SLEEP_QUALITY_VALUE_PRIOR),
    missingPreset: getConditionDistribution(CONDITION_DISTRIBUTION_KEYS.TSP_MISSING_AGE),
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
    distributionCache.set(filePath, Promise.resolve(buildTspEmpiricalDistribution()));
  }

  return distributionCache.get(filePath);
}

export function sampleTspRawRecordFromDistribution(distribution) {
  const row = createSyntheticRows(1)[0];
  return {
    userId: row.userId,
    age: row.age,
    ageGroup: row.ageGroup,
    sleepMissing: row.sleepMissing,
    sleepScore: row.sleepScore,
    rawMissing: row.sleepMissing,
    rawScore: row.sleepScore,
    missingLabel: row.missingLabel,
    qualityLabel: row.qualityLabel,
    distributionSourceMode: distribution?.dataSourceMode || 'multi_source_calibrated_preset'
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
