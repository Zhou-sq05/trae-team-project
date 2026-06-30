import conditionDistributionPresets from '../data/conditionDistributionPresets.json';

export const CONDITION_PRESET_DATA_SOURCE_MODE = 'multi_source_calibrated_preset';

export const CONDITION_PRESET_RUNTIME_NOTICE =
  '当前条件分布为基于公开健康数据样本统计、平滑处理与趋势校准形成的内置矩阵。系统运行时直接读取该矩阵，不实时处理原始数据集。后续可继续接入原始数据分析脚本，对矩阵来源进行更细致的数据支撑。';

export const CONDITION_DISTRIBUTION_KEYS = {
  ARR_SLEEP_ALERT_AGE: 'arr_sleep_alert_age',
  AGRR_ACTIVITY_BMI: 'agrr_activity_bmi',
  AOUE_STEPS_BMI: 'aoue_steps_bmi',
  TSP_MISSING_AGE: 'tsp_missing_age',
  TSP_SLEEP_QUALITY_VALUE_PRIOR: 'tsp_sleep_quality_value_prior'
};

export function getPresetCatalog() {
  return conditionDistributionPresets;
}

export function getConditionDistribution(key) {
  const distribution = conditionDistributionPresets.distributions?.[key];
  if (!distribution) {
    throw new Error(`未找到条件分布预设: ${key}`);
  }
  return distribution;
}

export function getConditionDistributionSource(key) {
  const distribution = getConditionDistribution(key);
  return {
    key: distribution.key,
    mode: distribution.dataSourceMode,
    dataSourceMode: distribution.dataSourceMode,
    label: '内置多源校准矩阵',
    description: CONDITION_PRESET_RUNTIME_NOTICE,
    basis: distribution.basis,
    notes: distribution.notes || [],
    sources: conditionDistributionPresets.sources || []
  };
}

function getObservedDomain(distribution) {
  return distribution.aDomain || distribution.mDomain;
}

export function buildConditionalProbsFromPreset(key) {
  const distribution = getConditionDistribution(key);
  if (!Array.isArray(distribution.matrix)) {
    throw new Error(`预设 ${key} 不是条件分布矩阵`);
  }
  const observedDomain = getObservedDomain(distribution);
  return Object.fromEntries(
    distribution.sDomain.map((sValue, rowIndex) => [
      sValue,
      Object.fromEntries(
        observedDomain.map((aValue, colIndex) => [
          aValue,
          Number(distribution.matrix[rowIndex]?.[colIndex] ?? 0)
        ])
      )
    ])
  );
}

export function buildMatrixDataFromPreset(key) {
  const distribution = getConditionDistribution(key);
  if (!Array.isArray(distribution.matrix)) {
    throw new Error(`预设 ${key} 不是条件分布矩阵`);
  }
  const observedDomain = getObservedDomain(distribution);
  const conditionalProbs = buildConditionalProbsFromPreset(key);
  const jointCounts = Object.fromEntries(
    distribution.sDomain.map(sValue => [
      sValue,
      Object.fromEntries(observedDomain.map(aValue => [aValue, null]))
    ])
  );
  const sCounts = Object.fromEntries(distribution.sDomain.map(sValue => [sValue, null]));

  return {
    key: distribution.key,
    distribution,
    conditionalProbs,
    jointCounts,
    sCounts,
    source: getConditionDistributionSource(key)
  };
}

export function buildPresetRows(key) {
  const matrixData = buildMatrixDataFromPreset(key);
  const distribution = matrixData.distribution;
  const observedDomain = getObservedDomain(distribution);
  return distribution.sDomain.map(sValue => {
    const row = { s: sValue };
    observedDomain.forEach(aValue => {
      row[aValue] = matrixData.conditionalProbs[sValue]?.[aValue] ?? 0;
    });
    return row;
  });
}

export function validateConditionDistributionRows() {
  return Object.values(conditionDistributionPresets.distributions || {})
    .filter(distribution => Array.isArray(distribution.matrix))
    .map(distribution => {
      const rowSums = distribution.matrix.map(row => row.reduce((sum, value) => sum + Number(value || 0), 0));
      return {
        key: distribution.key,
        valid: rowSums.every(sum => Math.abs(sum - 1) <= 1e-9),
        rowSums
      };
    });
}

export function sampleWeightedLabel(labels, probabilities, randomValue = Math.random()) {
  let cumulative = 0;
  for (let index = 0; index < labels.length; index += 1) {
    cumulative += Number(probabilities[index] ?? 0);
    if (randomValue <= cumulative) {
      return labels[index];
    }
  }
  return labels[labels.length - 1] ?? null;
}

export function sampleSensitiveValue(key) {
  const distribution = getConditionDistribution(key);
  return distribution.sDomain[Math.floor(Math.random() * distribution.sDomain.length)] ?? null;
}

export function sampleObservedValue(key, sensitiveValue = null) {
  const distribution = getConditionDistribution(key);
  const observedDomain = getObservedDomain(distribution);
  const resolvedSensitiveValue = sensitiveValue || sampleSensitiveValue(key);
  const rowIndex = distribution.sDomain.indexOf(resolvedSensitiveValue);
  const probabilities = distribution.matrix[rowIndex >= 0 ? rowIndex : 0] || [];
  return {
    sensitiveValue: rowIndex >= 0 ? resolvedSensitiveValue : distribution.sDomain[0],
    observedValue: sampleWeightedLabel(observedDomain, probabilities),
    probabilities
  };
}

export function samplePriorValue(key) {
  const distribution = getConditionDistribution(key);
  if (!Array.isArray(distribution.domain) || !Array.isArray(distribution.distribution)) {
    throw new Error(`预设 ${key} 不是有效值先验分布`);
  }
  return {
    observedValue: sampleWeightedLabel(distribution.domain, distribution.distribution),
    probabilities: distribution.distribution,
    domain: distribution.domain
  };
}

export function getExpectedObservedDistribution(key, sensitiveWeights = null) {
  const distribution = getConditionDistribution(key);
  const observedDomain = getObservedDomain(distribution);
  const weights = sensitiveWeights && sensitiveWeights.length === distribution.sDomain.length
    ? sensitiveWeights
    : distribution.sDomain.map(() => 1 / distribution.sDomain.length);
  const totals = observedDomain.map((_, colIndex) => (
    distribution.sDomain.reduce((sum, _sValue, rowIndex) => (
      sum + Number(weights[rowIndex] ?? 0) * Number(distribution.matrix[rowIndex]?.[colIndex] ?? 0)
    ), 0)
  ));

  return Object.fromEntries(observedDomain.map((aValue, index) => [aValue, totals[index]]));
}

export function getExpectedObservedCounts(key, sampleCount, sensitiveWeights = null) {
  const expected = getExpectedObservedDistribution(key, sensitiveWeights);
  return Object.fromEntries(
    Object.entries(expected).map(([label, probability]) => [
      label,
      Number((Number(sampleCount || 0) * probability).toFixed(4))
    ])
  );
}
