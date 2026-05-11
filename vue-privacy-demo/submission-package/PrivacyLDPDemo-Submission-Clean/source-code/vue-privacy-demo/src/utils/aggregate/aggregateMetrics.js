function toNumericArray(values = []) {
  return Array.isArray(values) ? values.map(value => Number(value) || 0) : [];
}

function roundValue(value, digits = 4) {
  return Number(Number(value || 0).toFixed(digits));
}

export function calculateMeanSquaredError(actualValues = [], estimatedValues = []) {
  const actual = toNumericArray(actualValues);
  const estimated = toNumericArray(estimatedValues);

  if (!actual.length || actual.length !== estimated.length) {
    return 0;
  }

  return actual.reduce((sum, value, index) => sum + ((value - estimated[index]) ** 2), 0) / actual.length;
}

export function calculateMeanAbsoluteError(actualValues = [], estimatedValues = []) {
  const actual = toNumericArray(actualValues);
  const estimated = toNumericArray(estimatedValues);

  if (!actual.length || actual.length !== estimated.length) {
    return 0;
  }

  return actual.reduce((sum, value, index) => sum + Math.abs(value - estimated[index]), 0) / actual.length;
}

export function calculateAggregateVariance(values = []) {
  const numericValues = toNumericArray(values);
  if (!numericValues.length) {
    return 0;
  }

  const mean = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
  return numericValues.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / numericValues.length;
}

export function convertCountsToFrequencies(counts = [], sampleCount = 0) {
  const numericCounts = toNumericArray(counts);
  const total = Number(sampleCount) || 0;

  if (!total) {
    return numericCounts.map(() => 0);
  }

  return numericCounts.map(value => value / total);
}

export function buildAggregateMetrics({
  labels = [],
  trueCounts = [],
  estimatedCounts = [],
  sampleCount = 0,
  consistencyThreshold = 0.05
} = {}) {
  const normalizedLabels = Array.isArray(labels) ? labels : [];
  const normalizedTrueCounts = toNumericArray(trueCounts);
  const normalizedEstimatedCounts = toNumericArray(estimatedCounts);
  const resolvedSampleCount = Number(sampleCount) || normalizedTrueCounts.reduce((sum, value) => sum + value, 0);

  const trueFreqs = convertCountsToFrequencies(normalizedTrueCounts, resolvedSampleCount);
  const estimatedFreqs = convertCountsToFrequencies(normalizedEstimatedCounts, resolvedSampleCount);

  const countErrors = normalizedLabels.map((_, index) => normalizedEstimatedCounts[index] - normalizedTrueCounts[index]);
  const freqErrors = normalizedLabels.map((_, index) => estimatedFreqs[index] - trueFreqs[index]);

  const countMse = calculateMeanSquaredError(normalizedTrueCounts, normalizedEstimatedCounts);
  const countMae = calculateMeanAbsoluteError(normalizedTrueCounts, normalizedEstimatedCounts);
  const freqMse = calculateMeanSquaredError(trueFreqs, estimatedFreqs);
  const freqMae = calculateMeanAbsoluteError(trueFreqs, estimatedFreqs);

  const consistencyScore = normalizedLabels.length
    ? normalizedLabels.filter((_, index) => Math.abs(freqErrors[index]) <= consistencyThreshold).length / normalizedLabels.length
    : 0;
  const consistencyLevel = consistencyScore >= 1 ? '较高' : consistencyScore >= 0.75 ? '较高' : consistencyScore >= 0.5 ? '一般' : '较低';

  const comparisonRows = normalizedLabels.map((label, index) => ({
    label,
    trueCount: roundValue(normalizedTrueCounts[index], 4),
    estimatedCount: roundValue(normalizedEstimatedCounts[index], 4),
    countError: roundValue(countErrors[index], 4),
    trueFreq: roundValue(trueFreqs[index], 6),
    estimatedFreq: roundValue(estimatedFreqs[index], 6),
    freqError: roundValue(freqErrors[index], 6)
  }));

  const maxCountError = comparisonRows.reduce((max, row) => Math.max(max, Math.abs(row.countError)), 0);
  const maxFreqError = comparisonRows.reduce((max, row) => Math.max(max, Math.abs(row.freqError)), 0);
  const estimateVariance = calculateAggregateVariance(normalizedEstimatedCounts);

  return {
    labels: normalizedLabels,
    sampleCount: resolvedSampleCount,
    trueCounts: normalizedTrueCounts,
    estimatedCounts: normalizedEstimatedCounts,
    countErrors: countErrors.map(value => roundValue(value, 4)),
    trueFreqs: trueFreqs.map(value => roundValue(value, 6)),
    estimatedFreqs: estimatedFreqs.map(value => roundValue(value, 6)),
    freqErrors: freqErrors.map(value => roundValue(value, 6)),
    countMse: roundValue(countMse, 4),
    countMae: roundValue(countMae, 4),
    freqMse: roundValue(freqMse, 6),
    freqMae: roundValue(freqMae, 6),
    consistencyScore: roundValue(consistencyScore, 4),
    consistencyLevel,
    estimateVariance: roundValue(estimateVariance, 4),
    maxCountError: roundValue(maxCountError, 4),
    maxFreqError: roundValue(maxFreqError, 6),
    comparisonRows
  };
}
