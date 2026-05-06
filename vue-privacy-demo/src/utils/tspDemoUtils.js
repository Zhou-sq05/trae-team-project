import { applyTSP, tspFirstPerturb, tspSecondPerturb } from './ldpAlgorithms';
import { resolveTspTaskConfig } from './tspProtocol.js';
import {
  CONDITION_DISTRIBUTION_KEYS,
  sampleObservedValue,
  samplePriorValue
} from './conditionDistributionPresets.js';

export const TSP_DEMO_SAMPLE_COUNT = 500;

const QUALITY_SCORE_MAP = {
  低质量: 2,
  中质量: 3,
  高质量: 5
};

export function isTspTask(task) {
  const attribute = task?.attributes?.[0];
  return task?.scenario === 'tsp'
    || task?.algorithm === 'tsp'
    || task?.protocol === 'TSP'
    || attribute?.algorithm === 'tsp'
    || attribute?.name === '睡眠质量评分';
}

export function getTspTasks(tasks = []) {
  return tasks.filter(isTspTask);
}

export function getTspConfig(task, attributeConfigStore) {
  if (!task) return null;
  const attributeId = task.distributedAttributeId || task.attributes?.[0]?.id;
  return task.configSnapshot || attributeConfigStore?.getConfigById?.(attributeId) || null;
}

export function getTspParams(task, attributeConfigStore) {
  const config = getTspConfig(task, attributeConfigStore);
  return resolveTspTaskConfig(config || task || {}, 5);
}

export function scoreFromQualityLabel(label) {
  return QUALITY_SCORE_MAP[label] ?? 3;
}

export function sampleTspRawClientValue() {
  const missingSample = sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.TSP_MISSING_AGE);
  const rawMissing = missingSample.observedValue === '缺失' ? 1 : 0;
  const qualitySample = rawMissing === 1
    ? { observedValue: null }
    : samplePriorValue(CONDITION_DISTRIBUTION_KEYS.TSP_SLEEP_QUALITY_VALUE_PRIOR);
  const rawScore = rawMissing === 1 ? null : scoreFromQualityLabel(qualitySample.observedValue);

  return {
    sensitiveValue: missingSample.sensitiveValue,
    missingLabel: missingSample.observedValue,
    qualityLabel: qualitySample.observedValue,
    rawMissing,
    rawScore,
    rawValue: rawMissing === 1 ? 0 : rawScore
  };
}

export function formatTspValue(value) {
  const normalizedValue = Number(value);
  if (normalizedValue === 0) {
    return '0（缺失）';
  }
  if (!Number.isFinite(normalizedValue)) {
    return '--';
  }
  return `${normalizedValue}（评分 ${normalizedValue}）`;
}

export function formatTspMissingStatus(rawMissing) {
  return Number(rawMissing) === 1 ? '缺失（M=1）' : '未缺失（M=0）';
}

export function formatTspRawDisplay(sample) {
  if (Number(sample.rawMissing) === 1) {
    return '睡眠质量评分缺失';
  }
  return `评分 ${sample.rawScore}（${sample.qualityLabel || '有效值'}）`;
}

export function perturbTspValue(rawValue, params) {
  return applyTSP(rawValue, params);
}

export function perturbTspStageOne(rawValue, params) {
  const normalizedRawValue = Number(rawValue);
  if (normalizedRawValue === 0) {
    return 0;
  }
  return tspFirstPerturb(normalizedRawValue, Number(params?.scoreDomainSize ?? 5), Number(params?.p1 ?? 1));
}

export function perturbTspStageTwo(stageTwoInput, params) {
  return tspSecondPerturb(Number(stageTwoInput), Number(params?.scoreDomainSize ?? 5), Number(params?.p2 ?? 1));
}

export function appendTspSubmissionRecords(records) {
  const storedData = JSON.parse(localStorage.getItem('submittedData') || '[]');
  localStorage.setItem('submittedData', JSON.stringify([...storedData, ...records]));
}
