import { ARR, aggregateARR, calculateARRParameters } from './ldpAlgorithms';
import {
  CONDITION_DISTRIBUTION_KEYS,
  sampleObservedValue
} from './conditionDistributionPresets';
import { appendSubmissionRecords, readSubmittedData } from './submissionStorage';

export const ARR_LABELS = ['未触发提醒', '触发提醒'];
export const ARR_DEMO_SAMPLE_COUNT = 2000;

export function getArrLabel(value) {
  return Number(value) === 1 ? ARR_LABELS[1] : ARR_LABELS[0];
}

export function isArrTask(task) {
  const attribute = task?.attributes?.[0];
  return task?.algorithm === 'arr'
    || attribute?.algorithm === 'arr'
    || attribute?.name === '是否触发睡眠异常提醒';
}

export function getArrTasks(tasks = []) {
  return tasks.filter(isArrTask);
}

export function getArrConfig(task, attributeConfigStore) {
  if (!task) return null;
  const attributeId = task.distributedAttributeId || task.attributes?.[0]?.id;
  return task.configSnapshot || attributeConfigStore?.getConfigById?.(attributeId) || null;
}

export function getArrParams(task, attributeConfigStore) {
  const config = getArrConfig(task, attributeConfigStore);
  const epsilon = Number(config?.epsilon ?? task?.privacyBudget ?? 0.5);
  const expEpsilon = Math.exp(epsilon);
  const fallbackP = expEpsilon / (expEpsilon + 1);
  const fallbackQ = 1 - fallbackP;
  const alpha = Number(config?.alphaBetaResult?.alpha ?? config?.alpha ?? 0);
  const beta = Number(config?.alphaBetaResult?.beta ?? config?.beta ?? 0);
  const calibrated = calculateARRParameters(alpha, beta, epsilon, 2);

  return {
    epsilon,
    p: calibrated.p,
    q: calibrated.q,
    traditionalP: fallbackP,
    traditionalQ: fallbackQ
  };
}

export function sampleArrRawValue() {
  const sampled = sampleObservedValue(CONDITION_DISTRIBUTION_KEYS.ARR_SLEEP_ALERT_AGE);
  return sampled.observedValue === ARR_LABELS[1] ? 1 : 0;
}

function createArrSubmissionRecord({
  task,
  batchId,
  userNo,
  rawValue,
  reportValue,
  params,
  uploadTime
}) {
  return {
    userId: userNo,
    user_id: userNo,
    taskId: task.id,
    task_id: task.id,
    batch_id: batchId,
    protocol: 'ARR',
    uploadTime,
    upload_time: uploadTime,
    report_value: reportValue,
    rawData: {
      scenario: 'arr',
      fallAlarm: rawValue,
      rawLabel: getArrLabel(rawValue)
    },
    reportData: {
      protocol: 'ARR',
      perturbedValue: reportValue,
      reportValue,
      perturbedLabel: getArrLabel(reportValue),
      params: {
        p: params.p.toFixed(4),
        q: params.q.toFixed(4)
      }
    }
  };
}

export function simulateArrClientUploads(task, params, sampleCount = ARR_DEMO_SAMPLE_COUNT) {
  const batchId = `${task.id}-arr-clients-${Date.now()}`;
  const uploadTime = new Date().toISOString();
  const rows = [];
  const records = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const rawValue = sampleArrRawValue();
    const reportValue = ARR(rawValue, params.epsilon, 2, params.p, params.q);
    const userNo = `客户端${String(index + 1).padStart(3, '0')}`;

    rows.push({
      userNo,
      rawValue,
      reportValue,
      rawLabel: getArrLabel(rawValue),
      localCodeValue: `${rawValue}（${getArrLabel(rawValue)}）`,
      arrTransition: `${rawValue} → ${reportValue}`,
      uploadedValue: `${reportValue}（${getArrLabel(reportValue)}）`,
      beforeValue: `${rawValue}（${getArrLabel(rawValue)}）`,
      afterValue: `${reportValue}（${getArrLabel(reportValue)}）`,
      uploadStatus: '已上报'
    });

    records.push(createArrSubmissionRecord({
      task,
      batchId,
      userNo,
      rawValue,
      reportValue,
      params,
      uploadTime
    }));
  }

  return { batchId, rows, records };
}

export function appendArrSubmissionRecords(records) {
  appendSubmissionRecords(records);
}

export function getArrRecords(taskId = '') {
  const storedData = readSubmittedData();
  return storedData.filter(item => {
    const taskMatches = !taskId || String(item.task_id ?? item.taskId) === String(taskId);
    const protocol = item?.reportData?.protocol || item?.protocol;
    return taskMatches && protocol === 'ARR';
  });
}

export function countArrValues(records, valueResolver) {
  return records.reduce((counts, record) => {
    const value = Number(valueResolver(record)) === 1 ? 1 : 0;
    counts[value] += 1;
    return counts;
  }, [0, 0]);
}

export function buildArrExperimentRows(records, params) {
  const trueCounts = countArrValues(records, record => record.rawData?.fallAlarm);
  const reportCounts = countArrValues(
    records,
    record => record.reportData?.perturbedValue ?? record.reportData?.reportValue ?? record.report_value
  );
  const reportValues = records.map(record => (
    Number(record.reportData?.perturbedValue ?? record.reportData?.reportValue ?? record.report_value) === 1 ? 1 : 0
  ));
  const newEstimates = aggregateARR(reportValues, params.epsilon, 2, params.p, params.q)
    .map(value => Number(value.toFixed(4)));
  const traditionalEstimates = aggregateARR(
    reportValues,
    params.epsilon,
    2,
    params.traditionalP,
    params.traditionalQ
  ).map(value => Number(value.toFixed(4)));

  return ARR_LABELS.map((label, index) => ({
    label,
    trueCount: trueCounts[index],
    reportCount: reportCounts[index],
    newEstimate: newEstimates[index],
    traditionalEstimate: traditionalEstimates[index],
    newError: Number((newEstimates[index] - trueCounts[index]).toFixed(4)),
    traditionalError: Number((traditionalEstimates[index] - trueCounts[index]).toFixed(4))
  }));
}

export function buildArrErrorMetrics(rows) {
  if (!rows.length) {
    return [];
  }

  const sampleCount = rows.reduce((sum, row) => sum + Number(row.trueCount || 0), 0) || 1;
  const newSquaredErrors = rows.map(row => (row.newError / sampleCount) ** 2);
  const traditionalSquaredErrors = rows.map(row => (row.traditionalError / sampleCount) ** 2);

  const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;

  return [
    { label: '新方案频率 MSE', value: average(newSquaredErrors).toFixed(6) },
    { label: '传统方案频率 MSE', value: average(traditionalSquaredErrors).toFixed(6) }
  ];
}

