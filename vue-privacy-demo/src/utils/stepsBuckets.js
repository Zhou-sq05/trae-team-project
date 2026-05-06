import { STEP_BUCKET_ORDER } from './constants.js';

export const STEPS_BUCKET_RULES = [
  { label: STEP_BUCKET_ORDER[0], min: 0, max: 3999, rangeText: '0-3999 步' },
  { label: STEP_BUCKET_ORDER[1], min: 4000, max: 6999, rangeText: '4000-6999 步' },
  { label: STEP_BUCKET_ORDER[2], min: 7000, max: 9999, rangeText: '7000-9999 步' },
  { label: STEP_BUCKET_ORDER[3], min: 10000, max: Number.POSITIVE_INFINITY, rangeText: '10000 步及以上' }
];

export function getStepsBucket(steps) {
  const numericSteps = Number(steps);
  if (!Number.isFinite(numericSteps) || numericSteps < 0) {
    return '';
  }

  return STEPS_BUCKET_RULES.find(
    rule => numericSteps >= rule.min && numericSteps <= rule.max
  )?.label || '';
}

export function getStepsBucketCode(bucketLabel) {
  const index = STEP_BUCKET_ORDER.indexOf(bucketLabel);
  return index >= 0 ? index + 1 : null;
}

export function getStepsBucketLabelByCode(code) {
  const numericCode = Number(code);
  if (!Number.isInteger(numericCode) || numericCode < 1 || numericCode > STEP_BUCKET_ORDER.length) {
    return '';
  }

  return STEP_BUCKET_ORDER[numericCode - 1];
}

export function getStepsBucketCodeBySteps(steps) {
  const bucketLabel = getStepsBucket(steps);
  return getStepsBucketCode(bucketLabel);
}

export function createEmptyStepsBucketCounts() {
  return Object.fromEntries(STEP_BUCKET_ORDER.map(bucket => [bucket, 0]));
}

export function normalizeStepsBucketCounts(counts = {}) {
  return STEP_BUCKET_ORDER.reduce((result, bucket) => {
    result[bucket] = Number(counts?.[bucket] ?? 0);
    return result;
  }, {});
}

export function explainPerturbedVector(vector, bucketLabels = STEP_BUCKET_ORDER) {
  if (!Array.isArray(vector) || !vector.length) {
    return '扰动后编码向量为空';
  }

  const oneBitIndices = [];
  vector.forEach((bit, index) => {
    if (Number(bit) === 1) {
      oneBitIndices.push(index);
    }
  });

  if (!oneBitIndices.length) {
    return '扰动后编码向量全为 0（AOUE 合法输出）';
  }

  const resolvedLabels = oneBitIndices.map(index => {
    const bucketLabel = bucketLabels?.[index];
    return bucketLabel ? `b${index} = 1（${bucketLabel}）` : `b${index} = 1`;
  });

  if (resolvedLabels.length === 1) {
    return `扰动后编码向量：${resolvedLabels[0]}`;
  }

  return `扰动后编码向量多个 bit 为 1：${resolvedLabels.join('、')}`;
}
