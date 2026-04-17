import { STAND_BUCKET_ORDER } from '../utils/constants';
import {
  aggregateAGRR,
  aggregateARR,
  calculateAGRParameters,
  calculateARRParameters
} from '../utils/ldpAlgorithms';
import { aggregateTspDomainCounts, resolveTspTaskConfig } from '../utils/tspProtocol.js';
import {
  createEmptyStandBucketCounts,
  getStandBucketLabelByCode,
  normalizeStandBucketCounts
} from '../utils/standDurationBuckets';
import { buildAggregateMetrics } from '../utils/aggregate/aggregateMetrics';
import { getPerturbationStatus } from '../utils/perturbationStatus';

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

function normalizeTspCode(value, domainSize = 5) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > domainSize) {
    return null;
  }
  return numericValue;
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
  const mode = String(task?.protectionMode || '').toLowerCase();
  if (mode === 'hybrid') {
    return '混合隐私风险防护';
  }
  if (mode === 'indirect') {
    return '间接隐私风险防护';
  }
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

    const rawBucket = item.original_bucket || item.rawData?.standBucket || item.reportData?.rawBucket;
    const reportBucket = item.perturbed_bucket
      || item.reportData?.perturbedBucket
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

function buildTspSummary(tspRecords, scoreDomainSize = 5) {
  const labels = ['缺失值 0', ...Array.from({ length: scoreDomainSize }, (_, index) => `${index + 1} 分`)];
  const rawCounts = new Array(scoreDomainSize + 1).fill(0);
  const reportCounts = new Array(scoreDomainSize + 1).fill(0);
  let hasRawSummary = false;

  tspRecords.forEach(item => {
    const rawMissing = Number(item.rawData?.sleepMissing);
    const rawScore = Number(item.rawData?.sleepScore);
    const rawValue = rawMissing === 1 ? 0 : normalizeTspCode(rawScore, scoreDomainSize);
    const reportValue = normalizeTspCode(
      item.reportData?.reportValue
        ?? item.reportData?.perturbedValue
        ?? item.report_value,
      scoreDomainSize
    );

    if (rawValue != null) {
      rawCounts[rawValue] += 1;
      hasRawSummary = true;
    }
    if (reportValue != null) {
      reportCounts[reportValue] += 1;
    }
  });

  return {
    sampleCount: tspRecords.length,
    rawCounts,
    reportCounts,
    hasRawSummary,
    labels
  };
}

function aggregateTspCounts(reportCounts, sampleCount, config) {
  return aggregateTspDomainCounts(reportCounts, sampleCount, config);
}

function createCompareRows(metrics) {
  return metrics.comparisonRows.map(row => ({
    label: row.label,
    trueCount: row.trueCount,
    estimatedCount: row.estimatedCount,
    countError: row.countError,
    trueFreq: row.trueFreq,
    estimatedFreq: row.estimatedFreq,
    freqError: row.freqError
  }));
}

function createChartData(compareRows) {
  return compareRows.map(row => ({
    label: row.label,
    trueFreq: row.trueFreq,
    estimatedFreq: row.estimatedFreq
  }));
}

function buildTspResultSections(summary, estimatedCounts) {
  const trueCounts = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const missingTrueCounts = [
    Number(trueCounts[0] ?? 0),
    Number(trueCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0))
  ];
  const missingEstimatedCounts = [
    Number(estimatedCounts[0] ?? 0),
    Number(estimatedCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0).toFixed(4))
  ];
  const scoreTrueCounts = trueCounts.slice(1).map(value => Number(value ?? 0));
  const scoreEstimatedCounts = estimatedCounts.slice(1).map(value => Number(value ?? 0));

  const missingMetrics = buildAggregateMetrics({
    labels: ['缺失', '非缺失'],
    trueCounts: missingTrueCounts,
    estimatedCounts: missingEstimatedCounts,
    sampleCount: summary.sampleCount,
    consistencyThreshold: 0.05
  });
  const scoreMetrics = buildAggregateMetrics({
    labels: ['1 分', '2 分', '3 分', '4 分', '5 分'],
    trueCounts: scoreTrueCounts,
    estimatedCounts: scoreEstimatedCounts,
    sampleCount: summary.sampleCount,
    consistencyThreshold: 0.05
  });

  const missingRows = createCompareRows(missingMetrics);
  const scoreRows = createCompareRows(scoreMetrics);

  return [
    {
      key: 'missing',
      title: '结果块一：缺失状态聚合',
      description: '单独展示缺失 / 非缺失样本的真实分布、聚合估计分布与误差。',
      chartTitle: '缺失状态真实频率 vs 估计频率',
      compareRows: missingRows,
      chartData: createChartData(missingRows)
    },
    {
      key: 'score',
      title: '结果块二：评分分布聚合',
      description: '单独展示睡眠质量评分 1~5 的真实分布、聚合估计分布与误差。',
      chartTitle: '评分分布真实频率 vs 估计频率',
      compareRows: scoreRows,
      chartData: createChartData(scoreRows)
    }
  ];
}

function createAggregateViewModel({
  id,
  attributeName,
  taskId,
  protectionMode,
  algorithm,
  labels,
  config,
  summary,
  estimatedCounts,
  distributionFit,
  sourceDescription
}) {
  const trueCounts = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const metrics = buildAggregateMetrics({
    labels,
    trueCounts,
    estimatedCounts,
    sampleCount: summary.sampleCount,
    consistencyThreshold: 0.05
  });
  const perturbationStatus = getPerturbationStatus(algorithm, config);

  const compareRows = createCompareRows(metrics);

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
    domainSize: labels.length,
    metrics,
    summaryCards: [
      { label: '任务名称', value: attributeName },
      { label: '任务 ID', value: taskId || '--' },
      { label: '协议', value: algorithm },
      { label: '防护模式', value: protectionMode },
      { label: '样本量', value: String(summary.sampleCount || 0) },
      { label: '隐私预算 ε', value: String(config.epsilon) }
    ],
    coreMetricCards: [
      {
        label: '样本总数',
        value: String(summary.sampleCount || 0),
        helper: `本次参与 ${algorithm} 聚合的扰动样本数量`,
        cardClass: ''
      },
      {
        label: '频率 MSE',
        value: metrics.freqMse.toFixed(6),
        helper: '按论文定义计算的平均平方频率误差',
        cardClass: 'core-card--highlight',
        tooltip: {
          formula: 'MSE_f = (1 / |Ω_A|) * Σ_i (f_i - f̂_i)^2',
          notes: [
            'f_i = 真实频率',
            'f̂_i = 聚合估计频率',
            `当前 ${algorithm} 场景中 |Ω_A| = ${labels.length}`,
            'f_i = true_count_i / N',
            'f̂_i = estimated_count_i / N'
          ]
        }
      },
      {
        label: '频率 MAE',
        value: metrics.freqMae.toFixed(6),
        helper: '按论文定义计算的平均绝对频率误差',
        cardClass: 'core-card--highlight core-card--soft',
        tooltip: {
          formula: 'MAE_f = (1 / |Ω_A|) * Σ_i |f_i - f̂_i|',
          notes: [
            'f_i = 真实频率',
            'f̂_i = 聚合估计频率',
            `当前 ${algorithm} 场景中 |Ω_A| = ${labels.length}`,
            'f_i = true_count_i / N',
            'f̂_i = estimated_count_i / N'
          ]
        }
      },
      {
        label: '一致性指标',
        value: metrics.consistencyLevel,
        helper: '根据各分类频率误差的整体稳定性给出一致性判断',
        cardClass: '',
        isStatus: true
      }
    ],
    detailMetricCards: [
      { label: 'Count-MSE', value: metrics.countMse.toFixed(4), description: '计数均方误差，仅用于辅助观察恢复计数偏差。' },
      { label: 'Count-MAE', value: metrics.countMae.toFixed(4), description: '计数平均绝对误差，用于补充查看计数层面的整体偏移。' },
      { label: '聚合估计方差', value: metrics.estimateVariance.toFixed(4), description: '用于观察聚合估计结果的离散程度，不替代频率误差指标。' },
      { label: '估计误差上界', value: metrics.maxCountError.toFixed(4), description: '展示当前类别中最大的计数误差绝对值。' },
      { label: 'α', value: config.alpha.toFixed(4), description: '当前任务配置中保存的内在不确定性参数 α。' },
      { label: 'β', value: config.beta.toFixed(4), description: '当前任务配置中保存的内在不确定性参数 β。' },
      { label: '分布拟合说明', value: distributionFit, description: '说明当前真实分布与聚合估计分布的来源与拟合口径。' }
    ],
    chartData: createChartData(compareRows),
    compareRows,
    resultSections: [
      {
        key: 'overall',
        title: '真实与聚合估计对照',
        description: `对比 ${algorithm} 场景下真实分布与聚合恢复结果。`,
        chartTitle: '真实频率 vs 估计频率',
        compareRows,
        chartData: createChartData(compareRows)
      }
    ],
    perturbationStatus,
    metricDescription: '核心 MSE / MAE 指标按论文中的频率误差定义计算，计数误差仅用于辅助展示。',
    sourceDescription,
    distributionFit
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

  return [createAggregateViewModel({
    id: 1,
    attributeName: '是否触发异常跌倒告警',
    taskId,
    protectionMode: getProtectionMode(task),
    algorithm: 'ARR',
    labels: ['未触发', '触发'],
    config,
    summary,
    estimatedCounts,
    distributionFit: summary.hasRawSummary ? '基于批次摘要恢复' : '基于上报分布近似',
    sourceDescription: `当前结果基于 task_id = ${taskId} 下全部已上报的 ${summary.sampleCount} 条 ARR 样本统一统计与估计。`
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
    .map(item => item.perturbed_bucket_code ?? item.reportData?.perturbedBucketCode ?? item.reportData?.perturbedValue ?? item.reportData?.reportValue ?? item.report_value)
    .map(normalizeAgrrCode)
    .filter(value => value != null);
  const estimatedCounts = aggregateAGRR(perturbedCodes, config.epsilon, STAND_BUCKET_ORDER.length, config.p, config.q)
    .map(value => Number(value.toFixed(4)));

  return [createAggregateViewModel({
    id: 1,
    attributeName: '日均站立时长分档',
    taskId,
    protectionMode: getProtectionMode(task),
    algorithm: 'AGRR',
    labels: STAND_BUCKET_ORDER,
    config,
    summary,
    estimatedCounts,
    distributionFit: summary.hasRawSummary ? '基于当前 task_id 下全部批次摘要与单条样本统一恢复' : '基于上报分布近似',
    sourceDescription: `当前结果基于 task_id = ${taskId} 下全部已上报的 ${summary.sampleCount} 条 AGRR 样本统一统计与估计。`
  })];
}

function getTspAggregateResults(records, task, taskId) {
  const tspRecords = collectProtocolRecords(records, 'TSP');
  if (!tspRecords.length) {
    return [];
  }

  const config = resolveTspTaskConfig(task, 5);
  const summary = buildTspSummary(tspRecords, config.scoreDomainSize);
  const estimatedCounts = aggregateTspCounts(summary.reportCounts, summary.sampleCount, config);

  return [createAggregateViewModel({
    id: 1,
    attributeName: '睡眠质量评分',
    taskId,
    protectionMode: getProtectionMode(task),
    algorithm: 'TSP',
    labels: summary.labels,
    config,
    summary,
    estimatedCounts,
    distributionFit: summary.hasRawSummary ? '基于当前 task_id 下全部 TSP 原始值与最终上报值统一恢复' : '基于最终上报分布近似',
    sourceDescription: `当前结果基于 task_id = ${taskId} 下全部已上报的 ${summary.sampleCount} 条 TSP 样本统一统计与估计。`
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

    if (protocol === 'TSP') {
      return getTspAggregateResults(records, task, resolvedTaskId);
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
