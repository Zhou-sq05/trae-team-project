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
import { buildAggregateMetrics } from '../utils/aggregate/aggregateMetrics';
import { getPerturbationStatus } from '../utils/perturbationStatus';
import {
  aggregateTspDomainCounts,
  buildTspAggregationTrace,
  calculateTspFrequencyVarianceMetrics,
  resolveTspTaskConfig
} from '../utils/tspProtocol.js';

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`解析 ${key} 失败:`, error);
    return fallback;
  }
}

function resolveAggregateScope(scopeInput) {
  if (scopeInput && typeof scopeInput === 'object') {
    return {
      taskId: scopeInput.taskId ? String(scopeInput.taskId) : '',
      batchId: scopeInput.batchId ? String(scopeInput.batchId) : '',
      protocol: scopeInput.protocol ? String(scopeInput.protocol) : ''
    };
  }

  return {
    taskId: scopeInput ? String(scopeInput) : '',
    batchId: '',
    protocol: ''
  };
}

function loadSubmissions(scopeInput) {
  const scope = resolveAggregateScope(scopeInput);
  const allData = safeParse('submittedData', []);
  return allData.filter(item => {
    const taskMatches = !scope.taskId || String(item.task_id ?? item.taskId) === scope.taskId;
    const batchMatches = !scope.batchId || String(item.batch_id ?? item.sampleMeta?.batchId ?? '') === scope.batchId;
    const protocolMatches = !scope.protocol || String(item?.reportData?.protocol || item?.protocol || '') === scope.protocol;
    return taskMatches && batchMatches && protocolMatches;
  });
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

  const calculated = protocol === 'AGRR'
    ? calculateAGRParameters(alpha, beta, epsilon, domainSize)
    : calculateARRParameters(alpha, beta, epsilon, domainSize);

  return { alpha, beta, epsilon, p: calculated.p, q: calculated.q };
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

function aggregateTspCounts(reportCounts, sampleCount, config) {
  return aggregateTspDomainCounts(reportCounts, sampleCount, config);
}

function constrainCountsForDisplay(estimatedCounts, targetSum) {
  const normalizedCounts = Array.isArray(estimatedCounts)
    ? estimatedCounts.map(value => Math.max(0, Number(value) || 0))
    : [];
  const resolvedTargetSum = Math.max(0, Number(targetSum) || 0);
  const currentSum = normalizedCounts.reduce((sum, value) => sum + value, 0);

  if (!normalizedCounts.length) {
    return [];
  }

  if (!resolvedTargetSum) {
    return normalizedCounts.map(() => 0);
  }

  if (currentSum <= 0) {
    const uniformValue = resolvedTargetSum / normalizedCounts.length;
    return normalizedCounts.map(() => Number(uniformValue.toFixed(4)));
  }

  return normalizedCounts.map(value => Number(((value / currentSum) * resolvedTargetSum).toFixed(4)));
}

function formatCountSnapshot(labels, counts, digits = 2) {
  return labels
    .map((label, index) => `${label}: ${Number(counts[index] ?? 0).toFixed(digits)}`)
    .join('；');
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

function countBy(values = []) {
  return values.reduce((accumulator, value) => {
    const key = value == null || value === '' ? '--' : String(value);
    accumulator[key] = Number(accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function buildTspRecordRows(tspRecords) {
  return tspRecords.map((item, index) => {
    const originalMissing = Number(item.original_missing ?? item.rawData?.sleepMissing);
    const originalScore = item.original_score ?? item.rawData?.sleepScore ?? null;
    const stage1Result = item.stage1_result ?? item.reportData?.stageOneResult ?? null;
    const stage2Input = item.stage2_input ?? item.reportData?.stageTwoInput ?? null;
    const reportValue = item.report_value ?? item.reportData?.reportValue ?? item.reportData?.perturbedValue ?? null;

    return {
      index: index + 1,
      taskId: String(item.task_id ?? item.taskId ?? '--'),
      batchId: String(item.batch_id ?? item.sampleMeta?.batchId ?? '--'),
      originalMissing: Number.isFinite(originalMissing) ? originalMissing : null,
      originalScore: originalScore == null ? null : Number(originalScore),
      stage1Result: stage1Result === 'skipped' ? 'skipped' : stage1Result == null ? null : Number(stage1Result),
      stage2Input: stage2Input == null ? null : Number(stage2Input),
      reportValue: reportValue == null ? null : Number(reportValue)
    };
  });
}

function buildTspStageOneCounts(tspRecords, scoreDomainSize = 5) {
  const counts = new Array(scoreDomainSize + 1).fill(0);
  tspRecords.forEach(item => {
    const originalMissing = Number(item.original_missing ?? item.rawData?.sleepMissing);
    if (originalMissing === 1) {
      counts[0] += 1;
      return;
    }
    const stage1Result = item.stage1_result ?? item.reportData?.stageOneResult;
    const value = stage1Result === 'skipped' ? 0 : normalizeTspCode(stage1Result, scoreDomainSize);
    if (value != null) {
      counts[value] += 1;
    }
  });
  return counts;
}

function logTspAggregationDebug({ scope, records, summary, rawEstimatedCounts, displayEstimatedCounts, config }) {
  const trueCounts = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const trace = buildTspAggregationTrace(summary.reportCounts, summary.sampleCount, config);
  console.groupCollapsed?.(`[TSP聚合调试] task_id=${scope?.taskId || '--'} batch_id=${scope?.batchId || 'ALL'} n=${summary.sampleCount}`);
  console.log('原始真实分布 trueCounts', trueCounts);
  console.log('用户端生成的原始睡眠评分分布 rawCountsBeforePerturb', trueCounts);
  console.log('第一阶段扰动结果计数 stage1PerturbedCounts', buildTspStageOneCounts(records, config.scoreDomainSize));
  console.log('第二阶段扰动结果计数 stage2PerturbedCounts', summary.reportCounts);
  console.log('TSP 参数', trace.parameters);
  console.table?.(trace.categorySteps);
  console.log('原始无偏估计值 rawEstimatedCounts', rawEstimatedCounts);
  console.log('约束后处理估计值 displayEstimatedCounts', displayEstimatedCounts);
  console.log('sum(rawEstimatedCounts)', trace.sumEstimatedCounts);
  console.log('sum(displayEstimatedCounts)', displayEstimatedCounts.reduce((sum, value) => sum + Number(value ?? 0), 0));
  console.groupEnd?.();
}

function buildTspDiagnostics({
  scope,
  records,
  summary,
  estimatedCounts,
  rawResultSections,
  displayResultSections,
  trueValueSource
}) {
  const reportDomainCounts = summary.reportCounts.map(value => Number(value ?? 0));
  const trueDomainCounts = (summary.hasRawSummary ? summary.rawCounts : summary.reportCounts).map(value => Number(value ?? 0));
  const unbiasedMissingEstimates = rawResultSections.find(section => section.key === 'missing')?.metrics?.estimatedCounts || [];
  const unbiasedScoreEstimates = rawResultSections.find(section => section.key === 'score')?.metrics?.estimatedCounts || [];
  const displayAdjustedMissingEstimates = displayResultSections.find(section => section.key === 'missing')?.metrics?.estimatedCounts || [];
  const displayAdjustedScoreEstimates = displayResultSections.find(section => section.key === 'score')?.metrics?.estimatedCounts || [];

  let displayDistortionReason = '当前页面展示直接使用原始恢复结果，不再执行额外的截断和归一化覆盖。';
  if (unbiasedMissingEstimates.some(value => Number(value) < 0)) {
    displayDistortionReason = '若采用额外的非负截断与重新归一化处理，当某一类原始恢复值为负时，另一类可能会被直接拉满，出现 100/0 或 0/100。';
  }

  return {
    scope: {
      taskId: scope.taskId || '--',
      batchId: scope.batchId || 'ALL',
      recordCount: records.length,
      taskDistribution: countBy(records.map(item => item.task_id ?? item.taskId ?? '--')),
      batchDistribution: countBy(records.map(item => item.batch_id ?? item.sampleMeta?.batchId ?? '--')),
      protocolDistribution: countBy(records.map(item => item?.reportData?.protocol || item?.protocol || '--'))
    },
    trueValueSource,
    trueDomainCounts,
    reportDomainCounts,
    rawMissingCounts: [
      Number(trueDomainCounts[0] ?? 0),
      Number(trueDomainCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0))
    ],
    rawScoreCounts: trueDomainCounts.slice(1),
    reportMissingCounts: [
      Number(reportDomainCounts[0] ?? 0),
      Number(reportDomainCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0))
    ],
    reportScoreCounts: reportDomainCounts.slice(1),
    unbiasedDomainEstimates: estimatedCounts.map(value => Number(value ?? 0)),
    unbiasedMissingEstimates: unbiasedMissingEstimates.map(value => Number(value ?? 0)),
    unbiasedScoreEstimates: unbiasedScoreEstimates.map(value => Number(value ?? 0)),
    displayAdjustedMissingEstimates: displayAdjustedMissingEstimates.map(value => Number(value ?? 0)),
    displayAdjustedScoreEstimates: displayAdjustedScoreEstimates.map(value => Number(value ?? 0)),
    displayDistortionReason,
    config: {
      version: config.version,
      versionLabel: config.versionMeta.label,
      alpha: config.alpha,
      beta: config.beta,
      epsilon: config.epsilon,
      p1: config.p1,
      q1: config.q1,
      p2: config.p2,
      q2: config.q2,
      pStar: config.pStar,
      qStar: config.qStar
    },
    recordsTable: buildTspRecordRows(records)
  };
}

function createSection(labels, trueCounts, estimatedCounts, sampleCount, key, title, description, chartTitle) {
  const metrics = buildAggregateMetrics({
    labels,
    trueCounts,
    estimatedCounts,
    sampleCount,
    consistencyThreshold: 0.05
  });
  const compareRows = createCompareRows(metrics);
  return {
    key,
    title,
    description,
    chartTitle,
    metrics,
    compareRows,
    chartData: createChartData(compareRows)
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
  const missingEstimatedCounts = useDisplayConstraint
    ? constrainCountsForDisplay(rawMissingEstimatedCounts, summary.sampleCount)
    : rawMissingEstimatedCounts;
  const scoreEstimatedCounts = useDisplayConstraint
    ? constrainCountsForDisplay(rawScoreEstimatedCounts, scoreSampleCount)
    : rawScoreEstimatedCounts;

  return [
    createSection(
      ['缺失', '非缺失'],
      missingTrueCounts,
      missingEstimatedCounts,
      summary.sampleCount,
      'missing',
      '结果块一：缺失状态聚合',
      '单独展示缺失 / 非缺失样本的真实分布、聚合估计分布与误差。',
      '缺失状态真实频率 vs 估计频率'
    ),
    createSection(
      ['1 分', '2 分', '3 分', '4 分', '5 分'],
      scoreTrueCounts,
      scoreEstimatedCounts,
      scoreSampleCount,
      'score',
      '结果块二：评分分布聚合',
      '单独展示睡眠质量评分 1~5 的真实分布、聚合估计分布与误差。',
      '评分分布真实频率 vs 估计频率'
    )
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
  sourceDescription,
  summaryCards,
  coreMetricCards,
  detailMetricCards,
  resultSections,
  diagnostics
}) {
  const trueCounts = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const metrics = buildAggregateMetrics({
    labels,
    trueCounts,
    estimatedCounts,
    sampleCount: summary.sampleCount,
    consistencyThreshold: 0.05
  });
  const compareRows = createCompareRows(metrics);
  const protectionStatus = getPerturbationStatus(algorithm, config);

  return {
    id,
    attributeName,
    taskId,
    protectionMode,
    algorithm,
    alpha: config.alpha.toFixed(4),
    beta: config.beta.toFixed(4),
    epsilon: String(config.epsilon),
    perturbParams: {
      p: Number(config.p),
      q: Number(config.q),
      p1: Number(config.p1),
      q1: Number(config.q1),
      p2: Number(config.p2),
      q2: Number(config.q2),
      pStar: Number(config.pStar),
      qStar: Number(config.qStar)
    },
    sampleCount: summary.sampleCount,
    domainSize: labels.length,
    metrics,
    summaryCards: summaryCards || [
      { label: '任务名称', value: attributeName },
      { label: '任务 ID', value: taskId || '--' },
      { label: '协议', value: algorithm },
      { label: '防护模式', value: protectionMode },
      { label: '样本量', value: String(summary.sampleCount || 0) },
      { label: '隐私预算 ε', value: String(config.epsilon) }
    ],
    coreMetricCards: coreMetricCards || [
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
          formula: 'MSE_f = (1 / |A|) * Σ_i (f_i - f̂_i)^2',
          notes: [
            'f_i = 真实频率',
            'f̂_i = 聚合估计频率',
            `当前 ${algorithm} 场景中 |A| = ${labels.length}`,
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
    detailMetricCards: detailMetricCards || [
      { label: 'Count-MSE', value: metrics.countMse.toFixed(4), description: '计数均方误差，仅用于辅助观察恢复计数偏差。' },
      { label: '聚合估计方差', value: metrics.estimateVariance.toFixed(4), description: '用于观察聚合估计结果的离散程度，不替代频率误差指标。' },
      { label: '估计误差上界', value: metrics.maxCountError.toFixed(4), description: '展示当前类别中最大的计数误差绝对值。' },
      { label: 'α', value: config.alpha.toFixed(4), description: '当前任务配置中的内在不确定性参数 α。' },
      { label: 'β', value: config.beta.toFixed(4), description: '当前任务配置中的内在不确定性参数 β。' },
      { label: '分布拟合说明', value: distributionFit, description: '说明当前真实分布与聚合估计分布的来源和拟合口径。' }
    ],
    chartData: createChartData(compareRows),
    compareRows,
    resultSections: resultSections || [
      {
        key: 'overall',
        title: '真实与聚合估计对照',
        description: `对比 ${algorithm} 场景下真实分布与聚合恢复结果。`,
        chartTitle: '真实频率 vs 估计频率',
        compareRows,
        chartData: createChartData(compareRows)
      }
    ],
    perturbationStatus: protectionStatus,
    sourceDescription,
    distributionFit,
    diagnostics: diagnostics || null
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

function getTspAggregateResults(records, task, taskId, scope) {
  const tspRecords = collectProtocolRecords(records, 'TSP');
  if (!tspRecords.length) {
    return [];
  }

  const config = resolveTspTaskConfig(task, 5);
  const summary = buildTspSummary(tspRecords, config.scoreDomainSize);
  const rawEstimatedCounts = aggregateTspCounts(summary.reportCounts, summary.sampleCount, config);
  const estimatedCounts = constrainCountsForDisplay(rawEstimatedCounts, summary.sampleCount);
  const trueCounts = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const overallMetrics = buildAggregateMetrics({
    labels: summary.labels,
    trueCounts,
    estimatedCounts: rawEstimatedCounts,
    sampleCount: summary.sampleCount,
    consistencyThreshold: 0.05
  });
  const varianceMetrics = calculateTspFrequencyVarianceMetrics({
    trueCounts,
    estimatedCounts: rawEstimatedCounts,
    sampleCount: summary.sampleCount,
    config
  });
  const displayOverallMetrics = buildAggregateMetrics({
    labels: summary.labels,
    trueCounts,
    estimatedCounts,
    sampleCount: summary.sampleCount,
    consistencyThreshold: 0.05
  });
  const rawResultSections = buildTspResultSections(summary, rawEstimatedCounts, false);
  const displayResultSections = buildTspResultSections(summary, rawEstimatedCounts, true);
  const resultSections = displayResultSections;
  const missingSection = rawResultSections.find(section => section.key === 'missing');
  const scoreSection = rawResultSections.find(section => section.key === 'score');
  const displayMissingSection = displayResultSections.find(section => section.key === 'missing');
  const displayScoreSection = displayResultSections.find(section => section.key === 'score');
  const stageOneConstraint = config.p1 + (config.scoreDomainSize - 1) * config.q1;
  const stageTwoConstraint = config.p2 + config.scoreDomainSize * config.q2;
  const trueValueSource = summary.hasRawSummary
    ? '真实值直接按当前参与聚合记录中的 original_missing / original_score 统计'
    : '当前记录缺少原始字段，真实值退化为基于扰动后编码值的近似统计';
  const diagnostics = buildTspDiagnostics({
    scope,
    records: tspRecords,
    summary,
    estimatedCounts,
    rawResultSections,
    displayResultSections,
    trueValueSource
  });
  logTspAggregationDebug({
    scope,
    records: tspRecords,
    summary,
    rawEstimatedCounts,
    displayEstimatedCounts: estimatedCounts,
    config
  });

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
    distributionFit: summary.hasRawSummary ? '基于当前 task_id 下全部 TSP 原始值与扰动后编码值统一恢复，默认展示非负归一化后的稳定估计' : '基于最终上报分布近似，默认展示非负归一化后的稳定估计',
    sourceDescription: `当前结果基于 task_id = ${taskId}、${scope?.batchId ? `batch_id = ${scope.batchId}` : '全部批次'} 下全部已上报的 ${summary.sampleCount} 条 TSP 样本统一统计与估计。${config.versionMeta.description} 页面默认展示经过非负归一化后处理的稳定估计，原始无偏估计和逐类中间量保留在 TSP 聚合调试日志与诊断数据中。`,
    summaryCards: [
      { label: '任务名称', value: '睡眠质量评分' },
      { label: '任务 ID', value: taskId || '--' },
      { label: '协议', value: 'TSP' },
      { label: '防护模式', value: getProtectionMode(task) },
      { label: '样本量', value: String(summary.sampleCount || 0) },
      { label: '总隐私预算 ε', value: String(config.epsilon) },
      { label: 'TSP 版本', value: config.versionMeta.label },
      { label: 'α / β', value: `${config.alpha.toFixed(4)} / ${config.beta.toFixed(4)}` }
    ],
    detailMetricCards: [
      { label: '统一域频率 MSE', value: overallMetrics.freqMse.toFixed(6), description: '辅助实验指标。基于真实频率与估计频率的均方误差，只用于展示本次实验恢复误差，不作为 TSP 理论主指标。' },
      { label: 'Count-MSE', value: overallMetrics.countMse.toFixed(4), description: '辅助实验指标。计数均方误差，用于补充观察恢复计数偏差。' },
      { label: '统一域平均方差', value: varianceMetrics.avgVariance.toFixed(8), description: '核心理论口径。将统一域 {0,1,2,3,4,5} 中各类别频率估计方差取平均，衡量 TSP 频率估计器的整体波动大小。' },
      { label: '统一域总方差', value: varianceMetrics.totalVariance.toFixed(8), description: '将每个类别频率估计方差求和得到的总方差，可用于辅助观察整体波动规模。' },
      { label: '标准误', value: varianceMetrics.stdError.toFixed(8), description: '由平均方差开方得到，用于直观表示典型频率估计波动尺度。' },
      { label: '95% 置信区间宽度', value: varianceMetrics.ciWidth95.toFixed(8), description: '按 2 × 1.96 × 标准误给出的近似区间宽度，用于辅助展示理论波动范围。' },
      { label: '每类频率估计方差', value: formatCountSnapshot(summary.labels, summary.labels.map((_, index) => varianceMetrics.varianceByCategory[String(index)] ?? 0), 8), description: '按统一域类别分别给出频率估计方差，变量命名为 varianceByCategory。0 表示缺失值，1~5 表示评分。' },
      { label: '预算逻辑', value: config.versionMeta.label, description: '当前任务按论文定义使用统一的总隐私预算 ε 联合求解两阶段参数，不再拆分预算。' },
      { label: '原始无偏缺失块估计值', value: formatCountSnapshot(['缺失', '非缺失'], [rawEstimatedCounts[0], rawEstimatedCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0)]), description: '保留未加展示约束的原始无偏恢复结果，供理论参考。' },
      { label: '原始无偏评分块估计值', value: formatCountSnapshot(['1 分', '2 分', '3 分', '4 分', '5 分'], rawEstimatedCounts.slice(1)), description: '保留未加展示约束的原始无偏恢复结果，供理论参考。' },
      { label: '原始无偏统一域计数离散度', value: overallMetrics.estimateVariance.toFixed(4), description: '这是对无偏估计计数向量本身做的离散度统计，不等同于论文中更常用的频率估计方差。保留它仅用于辅助观察。' },
      { label: '原始无偏统一域误差上界', value: String(overallMetrics.maxCountError), description: '保留未加展示约束的统一域最大计数误差绝对值，供理论参考。' },
      { label: '约束后缺失块估计值', value: formatCountSnapshot(['缺失', '非缺失'], displayMissingSection?.metrics?.estimatedCounts || []), description: '表格与图表当前默认展示这一版约束后结果：先做非负截断，再归一化到总样本数 N。' },
      { label: '约束后评分块估计值', value: formatCountSnapshot(['1 分', '2 分', '3 分', '4 分', '5 分'], displayScoreSection?.metrics?.estimatedCounts || []), description: '表格与图表当前默认展示这一版约束后结果：先做非负截断，再归一化到有效评分样本数 N_valid。' },
      { label: '缺失状态块频率 MSE', value: missingSection?.metrics?.freqMse?.toFixed(6) || '0.000000', description: '仅对“缺失 / 非缺失”二分类结果块单独计算的频率 MSE。' },
      { label: '评分分布块频率 MSE', value: scoreSection?.metrics?.freqMse?.toFixed(6) || '0.000000', description: '仅对有效评分 1~5 结果块单独计算的频率 MSE。该块频率以有效评分样本总数为分母。' },
      { label: 'α', value: config.alpha.toFixed(4), description: '基于缺失状态 M 的条件分布 Pr(M|S) 学习得到的内在不确定性参数 α。' },
      { label: 'β', value: config.beta.toFixed(4), description: '基于缺失状态 M 的条件分布 Pr(M|S) 学习得到的内在不确定性参数 β。' },
      { label: 'p1', value: config.p1.toFixed(4), description: '第一阶段只在有效评分域 {1,2,3,4,5} 上扰动，d = 5；p1 是保留真实评分的概率。' },
      { label: 'q1', value: config.q1.toFixed(4), description: '第一阶段只会落到其余 d - 1 = 4 个错误评分之一，因此 q1 是对单个错误评分的均匀概率。' },
      { label: 'p1 + (d - 1)q1', value: stageOneConstraint.toFixed(4), description: '检查第一阶段参数是否满足 p1 + (d - 1)q1 = 1。这里不是 p1 + dq1 = 1，因为真值之外只有 4 个错误候选。' },
      { label: 'p1 - q1', value: (config.p1 - config.q1).toFixed(4), description: '第一阶段恢复分辨率。该值越小，第一阶段有效评分恢复的方差通常越大。' },
      { label: 'p2', value: config.p2.toFixed(4), description: '第二阶段在统一域 {0,1,2,3,4,5} 上扰动；统一域总大小是 d + 1 = 6，但 p2 仍是命中真实输入的概率。' },
      { label: 'q2', value: config.q2.toFixed(4), description: '第二阶段只会落到真值之外的 d = 5 个错误候选之一，因此 q2 是对单个错误候选的均匀概率。' },
      { label: 'p2 + dq2', value: stageTwoConstraint.toFixed(4), description: '检查第二阶段参数是否满足 p2 + dq2 = 1。这里不是 p2 + (d + 1)q2 = 1，因为统一域虽然有 6 个值，但真值之外只有 5 个错误候选。' },
      { label: 'p2 - q2', value: (config.p2 - config.q2).toFixed(4), description: '第二阶段恢复分辨率。该值越小，统一域恢复的方差通常越大。' },
      { label: 'p*', value: config.pStar.toFixed(4), description: '有效值 1~5 的恢复使用组合参数 p* = p1 × p2 + (1 - p1) × q2。' },
      { label: 'q*', value: config.qStar.toFixed(4), description: '有效值 1~5 的恢复使用组合参数 q* = q1 × p2 + (1 - q1) × q2。' },
      { label: 'p* - q*', value: (config.pStar - config.qStar).toFixed(4), description: '有效评分 1~5 的最终恢复分辨率。若该值过小，即使公式正确，评分块恢复方差也会明显放大。' },
      { label: '缺失状态块计数离散度', value: missingSection?.metrics?.estimateVariance?.toFixed(4) || '0.0000', description: '仅对缺失 / 非缺失结果块的估计计数做离散度观察，不作为论文主指标。' },
      { label: '评分分布块计数离散度', value: scoreSection?.metrics?.estimateVariance?.toFixed(4) || '0.0000', description: '仅对有效评分 1~5 结果块的估计计数做离散度观察，不作为论文主指标。' }
    ],
    resultSections,
    coreMetricCards: [
      {
        label: '样本总数',
        value: String(summary.sampleCount || 0),
        helper: '当前 task_id 下参与 TSP 聚合恢复的全部已上报样本数',
        cardClass: ''
      },
      {
        label: '平均方差',
        value: varianceMetrics.avgVariance.toFixed(8),
        helper: '核心理论指标。表示统一域各类别频率估计方差的平均值，用来衡量 TSP 频率估计器的整体波动大小',
        cardClass: 'core-card--highlight'
      },
      {
        label: '标准误',
        value: varianceMetrics.stdError.toFixed(8),
        helper: '标准误 = sqrt(avgVariance)，用于直观表示典型频率估计波动尺度',
        cardClass: 'core-card--highlight core-card--soft'
      },
      {
        label: '95% 置信区间宽度',
        value: varianceMetrics.ciWidth95.toFixed(8),
        helper: '近似按 2 × 1.96 × 标准误计算，用于辅助理解理论波动范围',
        cardClass: ''
      }
    ],
    diagnostics,
  })];
}

export function getAggregateResults(scopeInput) {
  try {
    const scope = resolveAggregateScope(scopeInput);
    const records = loadSubmissions(scope);
    if (!records.length) {
      return [];
    }

    const resolvedTaskId = scope.taskId || records[0]?.task_id || records[0]?.taskId;
    const task = getTaskById(resolvedTaskId);
    const protocol = task?.protocol || records[0]?.reportData?.protocol || records[0]?.protocol;

    if (protocol === 'AGRR') {
      return getAgrrAggregateResults(records, task, resolvedTaskId);
    }

    if (protocol === 'TSP') {
      return getTspAggregateResults(records, task, resolvedTaskId, scope);
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
