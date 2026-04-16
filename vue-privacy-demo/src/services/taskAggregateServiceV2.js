import { STAND_BUCKET_ORDER } from '../utils/constants';
import {
  aggregateAGRR,
  aggregateARR,
  calculateAGRParameters,
  calculateARRParameters
} from '../utils/ldpAlgorithms';
import {
  createEmptyStandBucketCounts,
  getStandBucketLabelByCode,
  normalizeStandBucketCounts
} from '../utils/standDurationBuckets';

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`解析 ${key} 失败:`, error);
    return fallback;
  }
}

function loadSubmissions(taskId) {
  const allData = safeParse('submittedData', []);
  if (!taskId) {
    return allData;
  }
  return allData.filter(item => String(item.task_id ?? item.taskId) === String(taskId));
}

function getTaskById(taskId) {
  const tasks = safeParse('tasks', []);
  return tasks.find(task => String(task.id) === String(taskId)) || null;
}

function normalizeBinaryValue(value) {
  return Number(value) === 1 ? 1 : 0;
}

function normalizeAgrrCode(value) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 1 || numericValue > STAND_BUCKET_ORDER.length) {
    return null;
  }
  return numericValue;
}

function calculateVariance(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
}

function calculateMAE(real, estimated) {
  if (real.length !== estimated.length || !real.length) return 0;
  return real.reduce((sum, value, index) => sum + Math.abs(value - estimated[index]), 0) / real.length;
}

function calculateMSE(real, estimated) {
  if (real.length !== estimated.length || !real.length) return 0;
  return real.reduce((sum, value, index) => sum + ((value - estimated[index]) ** 2), 0) / real.length;
}

function toFrequencies(counts, sampleCount) {
  if (!sampleCount) {
    return counts.map(() => 0);
  }
  return counts.map(value => value / sampleCount);
}

function getTaskConfig(task, protocol, domainSize) {
  const snapshot = task?.configSnapshot || {};
  const alpha = Number(snapshot.alphaBetaResult?.alpha ?? snapshot.alpha ?? 0);
  const beta = Number(snapshot.alphaBetaResult?.beta ?? snapshot.beta ?? 0);
  const epsilon = Number(snapshot.epsilon ?? task?.privacyBudget ?? 1);

  let p = Number(snapshot.calibratedParams?.p);
  let q = Number(snapshot.calibratedParams?.q);

  if (!Number.isFinite(p) || !Number.isFinite(q)) {
    const calculated = protocol === 'AGRR'
      ? calculateAGRParameters(alpha, beta, epsilon, domainSize)
      : calculateARRParameters(alpha, beta, epsilon, domainSize);
    p = calculated.p;
    q = calculated.q;
  }

  return { alpha, beta, epsilon, p, q };
}

function getProtectionMode(task) {
  return task?.protectionMode || '间接隐私风险防护';
}

function collectProtocolRecords(records, protocol) {
  return records.filter(item => (item?.reportData?.protocol || item?.protocol) === protocol);
}

function buildArrSummary(arrRecords) {
  const sampleCount = arrRecords.length;
  const reportTriggerCount = arrRecords.filter(item => normalizeBinaryValue(item.reportData?.perturbedValue ?? item.reportData?.reportValue ?? item.report_value) === 1).length;
  const reportNonTriggerCount = sampleCount - reportTriggerCount;

  let rawTriggerCount = 0;
  let rawNonTriggerCount = 0;
  let hasRawSummary = false;
  const batchSummaryMap = new Map();

  arrRecords.forEach(item => {
    const batchId = item.batch_id ?? item.sampleMeta?.batchId;
    const summary = item.batchSummary;

    if (batchId && summary) {
      if (!batchSummaryMap.has(batchId)) {
        batchSummaryMap.set(batchId, summary);
      }
      return;
    }

    const rawValue = item.rawData?.fallAlarm;
    if (rawValue === 1 || rawValue === 0 || rawValue === '1' || rawValue === '0') {
      hasRawSummary = true;
      if (normalizeBinaryValue(rawValue) === 1) {
        rawTriggerCount += 1;
      } else {
        rawNonTriggerCount += 1;
      }
    }
  });

  if (batchSummaryMap.size > 0) {
    hasRawSummary = true;
    batchSummaryMap.forEach(summary => {
      rawTriggerCount += Number(summary?.rawTriggerCount ?? 0);
      rawNonTriggerCount += Number(summary?.rawNonTriggerCount ?? 0);
    });
  }

  return {
    sampleCount,
    rawCounts: [rawNonTriggerCount, rawTriggerCount],
    reportCounts: [reportNonTriggerCount, reportTriggerCount],
    hasRawSummary
  };
}

function buildAgrrSummary(agrrRecords) {
  const sampleCount = agrrRecords.length;
  const reportBucketCounts = createEmptyStandBucketCounts();
  const rawBucketCounts = createEmptyStandBucketCounts();
  let hasRawSummary = false;
  const batchSummaryMap = new Map();

  agrrRecords.forEach(item => {
    const batchId = item.batch_id ?? item.sampleMeta?.batchId;
    const summary = item.batchSummary;

    if (batchId && summary) {
      if (!batchSummaryMap.has(batchId)) {
        batchSummaryMap.set(batchId, summary);
      }
      return;
    }

    const rawBucket = item.rawData?.standBucket || item.reportData?.rawBucket;
    const reportBucket = item.reportData?.perturbedBucket
      || item.reportData?.perturbedLabel
      || getStandBucketLabelByCode(item.reportData?.perturbedValue ?? item.reportData?.reportValue ?? item.report_value);

    if (rawBucket && Object.prototype.hasOwnProperty.call(rawBucketCounts, rawBucket)) {
      rawBucketCounts[rawBucket] += 1;
      hasRawSummary = true;
    }
    if (reportBucket && Object.prototype.hasOwnProperty.call(reportBucketCounts, reportBucket)) {
      reportBucketCounts[reportBucket] += 1;
    }
  });

  if (batchSummaryMap.size > 0) {
    hasRawSummary = true;
    batchSummaryMap.forEach(summary => {
      const normalizedRaw = normalizeStandBucketCounts(summary?.rawBucketCounts);
      const normalizedReport = normalizeStandBucketCounts(summary?.reportBucketCounts);
      STAND_BUCKET_ORDER.forEach(bucket => {
        rawBucketCounts[bucket] += Number(normalizedRaw[bucket] ?? 0);
        reportBucketCounts[bucket] += Number(normalizedReport[bucket] ?? 0);
      });
    });
  }

  return {
    sampleCount,
    rawCounts: STAND_BUCKET_ORDER.map(bucket => Number(rawBucketCounts[bucket] ?? 0)),
    reportCounts: STAND_BUCKET_ORDER.map(bucket => Number(reportBucketCounts[bucket] ?? 0)),
    hasRawSummary
  };
}

function buildCompareRows(labels, realDistribution, estimatedCounts, realFrequencies, estimatedFrequencies) {
  return labels.map((label, index) => ({
    label,
    realValue: Number(Number(realDistribution[index] ?? 0).toFixed(4)),
    estimatedValue: Number(Number(estimatedCounts[index] ?? 0).toFixed(4)),
    error: Number(((estimatedCounts[index] ?? 0) - (realDistribution[index] ?? 0)).toFixed(4)),
    realFrequency: Number(Number(realFrequencies[index] ?? 0).toFixed(6)),
    estimatedFrequency: Number(Number(estimatedFrequencies[index] ?? 0).toFixed(6)),
    frequencyError: Number(((estimatedFrequencies[index] ?? 0) - (realFrequencies[index] ?? 0)).toFixed(6))
  }));
}

function buildAggregateCard({
  id,
  attributeName,
  taskId,
  protectionMode,
  algorithm,
  config,
  summary,
  labels,
  estimatedCounts,
  compareRows,
  distributionFit,
  sourceDescription
}) {
  const realDistribution = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const realFrequencies = toFrequencies(realDistribution, summary.sampleCount);
  const estimatedFrequencies = toFrequencies(estimatedCounts, summary.sampleCount);
  const countMse = calculateMSE(realDistribution, estimatedCounts);
  const countMae = calculateMAE(realDistribution, estimatedCounts);
  const freqMse = calculateMSE(realFrequencies, estimatedFrequencies);
  const freqMae = calculateMAE(realFrequencies, estimatedFrequencies);
  const consistency = compareRows.every(row => Math.abs(row.frequencyError) < 0.05) ? '较高' : '一般';

  return {
    id,
    attributeName,
    taskId,
    protectionMode,
    algorithm,
    alpha: config.alpha.toFixed(4),
    beta: config.beta.toFixed(4),
    epsilon: String(config.epsilon),
    sampleCount: summary.sampleCount,
    mse: freqMse.toFixed(6),
    mae: freqMae.toFixed(6),
    countMse: countMse.toFixed(4),
    countMae: countMae.toFixed(4),
    consistency,
    aggVariance: calculateVariance(estimatedCounts).toFixed(4),
    estimationError: compareRows.map(row => Math.abs(row.error)).reduce((max, value) => Math.max(max, value), 0).toFixed(4),
    distributionFit,
    originalData: realDistribution,
    perturbationData: estimatedCounts,
    originalFrequencyData: realFrequencies.map(value => Number(value.toFixed(6))),
    perturbationFrequencyData: estimatedFrequencies.map(value => Number(value.toFixed(6))),
    compareRows,
    metricDescription: '核心 MSE / MAE 指标按论文中的频率估计误差定义计算，计数误差仅用于辅助展示实际恢复偏差。',
    sourceDescription,
    domainSize: labels.length
  };
}

function getArrAggregateResults(records, task, taskId) {
  const arrRecords = collectProtocolRecords(records, 'ARR');
  if (!arrRecords.length) {
    return [];
  }

  const config = getTaskConfig(task, 'ARR', 2);
  const summary = buildArrSummary(arrRecords);
  const perturbedValues = arrRecords
    .map(item => item.reportData?.perturbedValue ?? item.reportData?.reportValue ?? item.report_value)
    .map(normalizeBinaryValue);
  const estimatedCounts = aggregateARR(perturbedValues, config.epsilon, 2, config.p, config.q)
    .map(value => Number(value.toFixed(4)));
  const realDistribution = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const realFrequencies = toFrequencies(realDistribution, summary.sampleCount);
  const estimatedFrequencies = toFrequencies(estimatedCounts, summary.sampleCount);
  const compareRows = buildCompareRows(['未触发', '触发'], realDistribution, estimatedCounts, realFrequencies, estimatedFrequencies);

  return [buildAggregateCard({
    id: 1,
    attributeName: '是否触发异常跌倒告警',
    taskId,
    protectionMode: getProtectionMode(task),
    algorithm: 'ARR',
    config,
    summary,
    labels: ['未触发', '触发'],
    estimatedCounts,
    compareRows,
    distributionFit: summary.hasRawSummary ? '基于批次摘要恢复' : '基于上报分布近似',
    sourceDescription: `当前结果基于 task_id = ${taskId} 下全部已上报的 ${summary.sampleCount} 条 ARR 样本统一统计与估计，用于展示协议在实际采集链路中的恢复效果。`
  })];
}

function getAgrrAggregateResults(records, task, taskId) {
  const agrrRecords = collectProtocolRecords(records, 'AGRR');
  if (!agrrRecords.length) {
    return [];
  }

  const config = getTaskConfig(task, 'AGRR', STAND_BUCKET_ORDER.length);
  const summary = buildAgrrSummary(agrrRecords);
  const perturbedCodes = agrrRecords
    .map(item => item.reportData?.perturbedBucketCode ?? item.reportData?.perturbedValue ?? item.reportData?.reportValue ?? item.report_value)
    .map(normalizeAgrrCode)
    .filter(value => value != null);
  const estimatedCounts = aggregateAGRR(perturbedCodes, config.epsilon, STAND_BUCKET_ORDER.length, config.p, config.q)
    .map(value => Number(value.toFixed(4)));
  const realDistribution = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const realFrequencies = toFrequencies(realDistribution, summary.sampleCount);
  const estimatedFrequencies = toFrequencies(estimatedCounts, summary.sampleCount);
  const compareRows = buildCompareRows(STAND_BUCKET_ORDER, realDistribution, estimatedCounts, realFrequencies, estimatedFrequencies);

  return [buildAggregateCard({
    id: 1,
    attributeName: '日均站立时长分档',
    taskId,
    protectionMode: getProtectionMode(task),
    algorithm: 'AGRR',
    config,
    summary,
    labels: STAND_BUCKET_ORDER,
    estimatedCounts,
    compareRows,
    distributionFit: summary.hasRawSummary ? '基于当前 task_id 下全部批次摘要与单条样本统一恢复' : '基于上报分布近似',
    sourceDescription: `当前结果基于 task_id = ${taskId} 下全部已上报的 ${summary.sampleCount} 条 AGRR 样本统一统计与估计；真实值、聚合估计值与误差均来自该任务下全部样本的四分类恢复结果。`
  })];
}

export function getAggregateResults(taskId) {
  try {
    const records = loadSubmissions(taskId);
    if (!records.length) {
      return [];
    }

    const resolvedTaskId = taskId || records[0]?.task_id || records[0]?.taskId;
    const task = getTaskById(resolvedTaskId);
    const protocol = task?.protocol || records[0]?.reportData?.protocol || records[0]?.protocol;

    if (protocol === 'AGRR') {
      return getAgrrAggregateResults(records, task, resolvedTaskId);
    }

    return getArrAggregateResults(records, task, resolvedTaskId);
  } catch (error) {
    console.error('获取聚合结果失败:', error);
    return [];
  }
}

export function getTotalDataCount(taskId) {
  try {
    return loadSubmissions(taskId).length;
  } catch (error) {
    console.error('获取数据总数失败:', error);
    return 0;
  }
}
