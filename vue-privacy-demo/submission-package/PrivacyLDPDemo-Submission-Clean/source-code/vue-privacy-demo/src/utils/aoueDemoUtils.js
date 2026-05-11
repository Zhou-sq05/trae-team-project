import { Encode, calculateAOUEParameters, perturbAOUEWithDetails } from './ldpAlgorithms';
import { STEP_BUCKET_ORDER } from './constants';
import {
  CONDITION_DISTRIBUTION_KEYS,
  sampleObservedValue
} from './conditionDistributionPresets';
import {
  getStepsBucketCode,
  getStepsBucketLabelByCode
} from './stepsBuckets';

export const AOUE_DEMO_SAMPLE_COUNT = 500;

export function isAoueTask(task) {
  const attribute = task?.attributes?.[0];
  return task?.algorithm === 'aoue'
    || attribute?.algorithm === 'aoue'
    || attribute?.name === '每日步数分桶';
}

export function getAoueTasks(tasks = []) {
  return tasks.filter(isAoueTask);
}

export function getAoueConfig(task, attributeConfigStore) {
  if (!task) return null;
  const attributeId = task.distributedAttributeId || task.attributes?.[0]?.id;
  return task.configSnapshot || attributeConfigStore?.getConfigById?.(attributeId) || null;
}

export function getAoueParams(task, attributeConfigStore) {
  const config = getAoueConfig(task, attributeConfigStore);
  const epsilon = Number(config?.epsilon ?? task?.privacyBudget ?? 0.5);
  const alpha = Number(config?.alphaBetaResult?.alpha ?? config?.alpha ?? 0);
  const beta = Number(config?.alphaBetaResult?.beta ?? config?.beta ?? 0);
  const calibrated = calculateAOUEParameters(alpha, beta, epsilon);

  return {
    epsilon,
    domainSize: STEP_BUCKET_ORDER.length,
    p: calibrated.p,
    q: calibrated.q
  };
}

export function stepsFromBucketLabel(label) {
  const ranges = {
    低步数: [0, 3999],
    中低步数: [4000, 6999],
    中高步数: [7000, 9999],
    高步数: [10000, 14000]
  };
  const [min, max] = ranges[label] || ranges.中低步数;
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function sampleAoueRawClientValue() {
  const sampled = sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.AOUE_STEPS_BMI);
  const rawLabel = sampled.observedValue;
  const rawValue = getStepsBucketCode(rawLabel);
  const rawSteps = stepsFromBucketLabel(rawLabel);

  return {
    sensitiveValue: sampled.sensitiveValue,
    rawSteps,
    rawLabel,
    rawValue
  };
}

export function formatAoueVector(vector, pending = '待编码') {
  if (!Array.isArray(vector)) {
    return pending;
  }
  return `[${vector.map(bit => Number(bit) || 0).join(', ')}]`;
}

export function formatAoueCode(value) {
  return `${value}（${getStepsBucketLabelByCode(value)}）`;
}

export function encodeAoueValue(rawValue, domainSize = STEP_BUCKET_ORDER.length) {
  return Encode(rawValue, domainSize);
}

export function perturbAoueValue(rawValue, params) {
  return perturbAOUEWithDetails(rawValue, params.domainSize, params.q, params.p);
}

export function formatAoueTransitions(bitSteps = []) {
  if (!Array.isArray(bitSteps) || !bitSteps.length) {
    return '待扰动';
  }
  return bitSteps.map(step => `${step.originalBit}→${step.resultBit}`).join('，');
}

export function appendAoueSubmissionRecords(records) {
  const storedData = JSON.parse(localStorage.getItem('submittedData') || '[]');
  localStorage.setItem('submittedData', JSON.stringify([...storedData, ...records]));
}
