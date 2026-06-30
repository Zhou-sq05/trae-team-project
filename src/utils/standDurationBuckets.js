import { STAND_BUCKET_ORDER } from './constants.js';

export const STAND_DURATION_BUCKET_RULES = [
  { label: STAND_BUCKET_ORDER[0], min: 0, max: 119, rangeText: '0-119 分钟' },
  { label: STAND_BUCKET_ORDER[1], min: 120, max: 239, rangeText: '120-239 分钟' },
  { label: STAND_BUCKET_ORDER[2], min: 240, max: Number.POSITIVE_INFINITY, rangeText: '240 分钟及以上' }
];

export function getStandDurationBucket(minutes) {
  const numericMinutes = Number(minutes);
  if (!Number.isFinite(numericMinutes) || numericMinutes < 0) {
    return '';
  }

  return STAND_DURATION_BUCKET_RULES.find(
    rule => numericMinutes >= rule.min && numericMinutes <= rule.max
  )?.label || '';
}

export function getStandBucketCode(bucketLabel) {
  const index = STAND_BUCKET_ORDER.indexOf(bucketLabel);
  return index >= 0 ? index + 1 : null;
}

export function getStandBucketLabelByCode(code) {
  const numericCode = Number(code);
  if (!Number.isInteger(numericCode) || numericCode < 1 || numericCode > STAND_BUCKET_ORDER.length) {
    return '';
  }

  return STAND_BUCKET_ORDER[numericCode - 1];
}

export function getStandBucketCodeByMinutes(minutes) {
  const bucketLabel = getStandDurationBucket(minutes);
  return getStandBucketCode(bucketLabel);
}

export function createEmptyStandBucketCounts() {
  return Object.fromEntries(STAND_BUCKET_ORDER.map(bucket => [bucket, 0]));
}

export function normalizeStandBucketCounts(counts = {}) {
  return STAND_BUCKET_ORDER.reduce((result, bucket) => {
    result[bucket] = Number(counts?.[bucket] ?? 0);
    return result;
  }, {});
}
