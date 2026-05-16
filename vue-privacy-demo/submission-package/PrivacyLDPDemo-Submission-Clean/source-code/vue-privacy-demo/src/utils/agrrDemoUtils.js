import { AGRR, calculateAGRParameters } from './ldpAlgorithms';
import { STAND_BUCKET_ORDER } from './constants';
import {
  CONDITION_DISTRIBUTION_KEYS,
  sampleObservedValue
} from './conditionDistributionPresets';
import {
  getStandBucketCode,
  getStandBucketLabelByCode
} from './standDurationBuckets';
import { appendSubmissionRecords } from './submissionStorage';

export const AGRR_DEMO_SAMPLE_COUNT = 500;

export function isAgrrTask(task) {
  const attribute = task?.attributes?.[0];
  return task?.algorithm === 'agrr'
    || attribute?.algorithm === 'agrr'
    || attribute?.name === '日均站立时长分档'
    || attribute?.name === '身体活动水平分档';
}

export function getAgrrTasks(tasks = []) {
  return tasks.filter(isAgrrTask);
}

export function getAgrrConfig(task, attributeConfigStore) {
  if (!task) return null;
  const attributeId = task.distributedAttributeId || task.attributes?.[0]?.id;
  return task.configSnapshot || attributeConfigStore?.getConfigById?.(attributeId) || null;
}

export function getAgrrParams(task, attributeConfigStore) {
  const config = getAgrrConfig(task, attributeConfigStore);
  const epsilon = Number(config?.epsilon ?? task?.privacyBudget ?? 0.5);
  const domainSize = STAND_BUCKET_ORDER.length;
  const alpha = Number(config?.alphaBetaResult?.alpha ?? config?.alpha ?? 0);
  const beta = Number(config?.alphaBetaResult?.beta ?? config?.beta ?? 0);
  const calibrated = calculateAGRParameters(alpha, beta, epsilon, domainSize);

  return {
    epsilon,
    domainSize,
    p: calibrated.p,
    q: calibrated.q
  };
}

export function standMinutesFromActivityLabel(label) {
  const ranges = {
    低活动: [0, 119],
    中活动: [120, 239],
    高活动: [240, 360]
  };
  const [min, max] = ranges[label] || ranges.中活动;
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function sampleAgrrRawClientValue() {
  const sampled = sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.AGRR_ACTIVITY_BMI);
  const rawLabel = sampled.observedValue;
  const rawValue = getStandBucketCode(rawLabel);
  const rawMinutes = standMinutesFromActivityLabel(rawLabel);

  return {
    sensitiveValue: sampled.sensitiveValue,
    rawMinutes,
    rawLabel,
    rawValue
  };
}

export function perturbAgrrValue(rawValue, params) {
  return AGRR(rawValue, params.epsilon, params.domainSize, params.p, params.q);
}

export function formatAgrrCode(value) {
  return `${value}（${getStandBucketLabelByCode(value)}）`;
}

export function appendAgrrSubmissionRecords(records) {
  appendSubmissionRecords(records);
}
