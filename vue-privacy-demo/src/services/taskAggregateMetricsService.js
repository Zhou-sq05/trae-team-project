import { STAND_BUCKET_ORDER, STEP_BUCKET_ORDER } from '../utils/constants';
import {
  aggregateAGRR,
  aggregateARR,
  aggregateAOUE,
  calculateAGRParameters,
  calculateARRParameters,
  calculateAOUEParameters
} from '../utils/ldpAlgorithms';
import {
  createEmptyStandBucketCounts,
  getStandBucketLabelByCode,
  normalizeStandBucketCounts
} from '../utils/standDurationBuckets';
import {
  createEmptyStepsBucketCounts,
  getStepsBucketLabelByCode,
  normalizeStepsBucketCounts
} from '../utils/stepsBuckets';
import { aggregateTspDomainCounts, resolveTspTaskConfig } from '../utils/tspProtocol.js';
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

function normalizeCountsForDisplay(estimatedCounts, targetSum) {
  const counts = Array.isArray(estimatedCounts)
    ? estimatedCounts.map(value => Math.max(0, Number(value) || 0))
    : [];
  const resolvedTargetSum = Math.max(0, Number(targetSum) || 0);
  const currentSum = counts.reduce((sum, value) => sum + value, 0);

  if (!counts.length) {
    return [];
  }

  if (!resolvedTargetSum) {
    return counts.map(() => 0);
  }

  if (currentSum <= 0) {
    const uniformValue = resolvedTargetSum / counts.length;
    return counts.map(() => Number(uniformValue.toFixed(4)));
  }

  return counts.map(value => Number(((value / currentSum) * resolvedTargetSum).toFixed(4)));
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
      : protocol === 'AOUE'
        ? calculateAOUEParameters(alpha, beta, epsilon)
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

function collectBatchSummaries(records) {
  const batchSummaryMap = new Map();

  records.forEach(item => {
    const batchId = item.batch_id ?? item.sampleMeta?.batchId;
    if (batchId && item.batchSummary && !batchSummaryMap.has(batchId)) {
      batchSummaryMap.set(batchId, item.batchSummary);
    }
  });

  return batchSummaryMap;
}

function buildArrSummary(arrRecords) {
  const sampleCount = arrRecords.length;
  const reportTriggerCount = arrRecords.filter(item => normalizeBinaryValue(item.reportData?.perturbedValue ?? item.reportData?.reportValue ?? item.report_value) === 1).length;
  const reportNonTriggerCount = sampleCount - reportTriggerCount;

  let rawTriggerCount = 0;
  let rawNonTriggerCount = 0;
  let hasRawSummary = false;
  const batchSummaryMap = collectBatchSummaries(arrRecords);

  arrRecords.forEach(item => {
    const batchId = item.batch_id ?? item.sampleMeta?.batchId;
    if (batchId && batchSummaryMap.has(batchId)) {
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
  const batchSummaryMap = collectBatchSummaries(agrrRecords);

  agrrRecords.forEach(item => {
    const batchId = item.batch_id ?? item.sampleMeta?.batchId;
    if (batchId && batchSummaryMap.has(batchId)) {
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

function buildAoueSummary(aoueRecords) {
  const sampleCount = aoueRecords.length;
  const reportBucketCounts = createEmptyStepsBucketCounts();
  const rawBucketCounts = createEmptyStepsBucketCounts();
  let hasRawSummary = false;
  const batchSummaryMap = collectBatchSummaries(aoueRecords);

  aoueRecords.forEach(item => {
    const batchId = item.batch_id ?? item.sampleMeta?.batchId;
    if (batchId && batchSummaryMap.has(batchId)) {
      return;
    }

    const rawBucket = item.original_bucket || item.rawData?.stepsBucket || item.reportData?.rawBucket;
    // 对于 AOUE，如果是单条上报，perturbed_bucket 可能存在。
    // 如果是向量，我们需要处理向量统计。
    const reportBucket = item.perturbed_bucket
      || item.reportData?.perturbedBucket
      || item.reportData?.perturbedLabel;

    if (rawBucket && Object.prototype.hasOwnProperty.call(rawBucketCounts, rawBucket)) {
      rawBucketCounts[rawBucket] += 1;
      hasRawSummary = true;
    }
    // 只有在单条非批次上报且有明确扰动后标签时才计入 reportBucketCounts。
    // 注意：真正的 AOUE 聚合是基于向量位的，这里的 reportCounts 仅用于 UI 的“上报分布”展示。
    if (reportBucket && Object.prototype.hasOwnProperty.call(reportBucketCounts, reportBucket)) {
      reportBucketCounts[reportBucket] += 1;
    } else if (Array.isArray(item.report_value)) {
      // 如果是向量，按位累计 1 的数量作为 UI 展示的扰动后编码向量分布
      item.report_value.forEach((bit, index) => {
        if (bit === 1) {
          const label = getStepsBucketLabelByCode(index + 1);
          if (label) reportBucketCounts[label] += 1;
        }
      });
    }
  });

  if (batchSummaryMap.size > 0) {
    hasRawSummary = true;
    batchSummaryMap.forEach(summary => {
      const normalizedRaw = normalizeStepsBucketCounts(summary?.rawBucketCounts);
      const normalizedReport = normalizeStepsBucketCounts(summary?.reportBucketCounts);
      STEP_BUCKET_ORDER.forEach(bucket => {
        rawBucketCounts[bucket] += Number(normalizedRaw[bucket] ?? 0);
        reportBucketCounts[bucket] += Number(normalizedReport[bucket] ?? 0);
      });
    });
  }

  return {
    sampleCount,
    rawCounts: STEP_BUCKET_ORDER.map(bucket => Number(rawBucketCounts[bucket] ?? 0)),
    reportCounts: STEP_BUCKET_ORDER.map(bucket => Number(reportBucketCounts[bucket] ?? 0)),
    hasRawSummary
  };
}

function buildTspSummary(tspRecords, scoreDomainSize = 5) {
  const labels = ['缺失值 0', ...Array.from({ length: scoreDomainSize }, (_, index) => `${index + 1} 分`)];
  const rawCounts = new Array(scoreDomainSize + 1).fill(0);
  const reportCounts = new Array(scoreDomainSize + 1).fill(0);
  let hasRawSummary = false;

  tspRecords.forEach(item => {
    const rawMissing = Number(item.original_missing ?? item.rawData?.sleepMissing);
    const rawScore = Number(item.original_score ?? item.rawData?.sleepScore);
    const rawValue = rawMissing === 1 ? 0 : normalizeTspCode(rawScore, scoreDomainSize);
    const reportValue = normalizeTspCode(
      item.report_value
        ?? item.reportData?.reportValue
        ?? item.reportData?.perturbedValue,
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

function buildTspResultSections(summary, estimatedCounts, useDisplayConstraint = false) {
  const trueCounts = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const missingTrueCounts = [
    Number(trueCounts[0] ?? 0),
    Number(trueCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0))
  ];
  const rawMissingEstimatedCounts = [
    Number(estimatedCounts[0] ?? 0),
    Number(estimatedCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0).toFixed(4))
  ];
  const scoreTrueCounts = trueCounts.slice(1).map(value => Number(value ?? 0));
  const rawScoreEstimatedCounts = estimatedCounts.slice(1).map(value => Number(value ?? 0));
  const scoreSampleCount = scoreTrueCounts.reduce((sum, value) => sum + value, 0);
  
  return [
    createSection(
      ['缺失', '非缺失'],
      missingTrueCounts,
      rawMissingEstimatedCounts,
      summary.sampleCount,
      'missing',
      '结果块一：缺失状态聚合',
      '单独展示缺失 / 非缺失样本的真实分布、聚合估计分布与误差。',
      '缺失状态真实频率 vs 估计频率'
    ),
    createSection(
      ['1 分', '2 分', '3 分', '4 分', '5 分'],
      scoreTrueCounts,
      rawScoreEstimatedCounts,
      scoreSampleCount,
      'score',
      '结果块二：评分分布聚合',
      '单独展示睡眠质量评分 1~5 的真实分布、聚合估计分布与误差。',
      '评分分布真实频率 vs 估计频率'
    )
  ];
}

function createSection(labels, trueCounts, estimatedCounts, sampleCount, key, title, description, chartTitle) {
  const metrics = buildAggregateMetrics({
    labels,
    trueCounts,
    estimatedCounts,
    sampleCount,
    consistencyThreshold: 0.05
  });
  const compareRows = metrics.comparisonRows.map(row => ({
    label: row.label,
    trueCount: row.trueCount,
    estimatedCount: row.estimatedCount,
    countError: row.countError,
    trueFreq: row.trueFreq,
    estimatedFreq: row.estimatedFreq,
    freqError: row.freqError
  }));
  return {
    key,
    title,
    description,
    chartTitle,
    metrics,
    compareRows,
    chartData: compareRows.map(row => ({
      label: row.label,
      trueFreq: row.trueFreq,
      estimatedFreq: row.estimatedFreq
    }))
  };
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
  resultSections,
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

  const compareRows = metrics.comparisonRows.map(row => ({
    label: row.label,
    trueCount: row.trueCount,
    estimatedCount: row.estimatedCount,
    countError: row.countError,
    trueFreq: row.trueFreq,
    estimatedFreq: row.estimatedFreq,
    freqError: row.freqError
  }));

  // 如果没有传入 resultSections，创建默认的
  const finalResultSections = resultSections || [
    createSection(
      labels,
      trueCounts,
      estimatedCounts,
      summary.sampleCount,
      'overall',
      '真实与聚合估计对照',
      `对比 ${algorithm} 场景下真实分布与聚合恢复结果。`,
      '真实频率 vs 估计频率'
    )
  ];

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
    chartData: compareRows.map(row => ({
      label: row.label,
      trueFreq: row.trueFreq,
      estimatedFreq: row.estimatedFreq
    })),
    compareRows,
    resultSections: finalResultSections,
    perturbationStatus,
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
    attributeName: '是否触发睡眠异常提醒',
    taskId,
    protectionMode: getProtectionMode(task),
    algorithm: 'ARR',
    labels: ['未触发提醒', '触发提醒'],
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

function getAoueAggregateResults(records, task, taskId) {
  const aoueRecords = collectProtocolRecords(records, 'AOUE');
  if (!aoueRecords.length) {
    return [];
  }

  const config = getTaskConfig(task, 'AOUE', STEP_BUCKET_ORDER.length);
  const summary = buildAoueSummary(aoueRecords);
  
  // 对于 AOUE，我们需要提取向量形式的上报数据
  const perturbedData = aoueRecords.map(item => {
    const val = item.report_value ?? item.reportData?.reportValue ?? item.reportData?.perturbedValue;
    if (Array.isArray(val)) return val;
    // 如果不是数组（可能是单条记录且某种原因没存成数组），尝试构造一个
    const code = item.perturbed_bucket_code || item.reportData?.perturbedBucketCode;
    if (code) {
      const arr = new Array(STEP_BUCKET_ORDER.length).fill(0);
      arr[code - 1] = 1;
      return arr;
    }
    return new Array(STEP_BUCKET_ORDER.length).fill(0);
  });

  const rawEstimatedCounts = aggregateAOUE(perturbedData, config.epsilon, STEP_BUCKET_ORDER.length, config.p, config.q)
    .map(value => Number(value.toFixed(4)));
  const estimatedCounts = normalizeCountsForDisplay(rawEstimatedCounts, summary.sampleCount);
  const resultSections = [
    createSection(
      STEP_BUCKET_ORDER,
      summary.hasRawSummary ? summary.rawCounts : summary.reportCounts,
      estimatedCounts,
      summary.sampleCount,
      'overall',
      'AOUE 归一化展示结果',
      'AOUE 原始无偏估计可能出现负数或总量偏移；此处将估计计数做非负截断，并按样本总数归一化，便于观察分布形态。',
      '真实频率 vs 归一化估计频率'
    )
  ];

  return [createAggregateViewModel({
    id: 1,
    attributeName: '每日步数分桶',
    taskId,
    protectionMode: getProtectionMode(task),
    algorithm: 'AOUE',
    labels: STEP_BUCKET_ORDER,
    config,
    summary,
    estimatedCounts,
    resultSections,
    distributionFit: summary.hasRawSummary ? '基于当前 task_id 下全部批次摘要与单条样本向量统一恢复，展示值已做非负归一化' : '基于扰动后编码向量分布近似，展示值已做非负归一化',
    sourceDescription: `当前结果基于 task_id = ${taskId} 下全部已上报的 ${summary.sampleCount} 条 AOUE 样本（向量形式）统一统计与估计。`
  })];
}

function getTspAggregateResults(records, task, taskId) {
  const tspRecords = collectProtocolRecords(records, 'TSP');
  if (!tspRecords.length) {
    return [];
  }

  const config = resolveTspTaskConfig(task, 5);
  const summary = buildTspSummary(tspRecords, config.scoreDomainSize);
  const estimatedCounts = aggregateTspDomainCounts(summary.reportCounts, summary.sampleCount, config)
    .map(value => Number(value.toFixed(4)));
  const resultSections = buildTspResultSections(summary, estimatedCounts, false);

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
    resultSections,
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
    if (protocol === 'AOUE') {
      return getAoueAggregateResults(records, task, resolvedTaskId);
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
