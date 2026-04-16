import { aggregateARR, calculateARRParameters } from '../utils/ldpAlgorithms';

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

function getArrTaskConfig(task) {
  const snapshot = task?.configSnapshot || {};
  const alpha = Number(snapshot.alphaBetaResult?.alpha ?? snapshot.alpha ?? 0);
  const beta = Number(snapshot.alphaBetaResult?.beta ?? snapshot.beta ?? 0);
  const epsilon = Number(snapshot.epsilon ?? task?.privacyBudget ?? 1);

  let p = Number(snapshot.calibratedParams?.p);
  let q = Number(snapshot.calibratedParams?.q);

  if (!Number.isFinite(p) || !Number.isFinite(q)) {
    const calculated = calculateARRParameters(alpha, beta, epsilon, 2);
    p = calculated.p;
    q = calculated.q;
  }

  return { alpha, beta, epsilon, p, q };
}

function collectArrRecords(records) {
  return records.filter(item => item?.reportData?.protocol === 'ARR');
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
    rawTriggerCount,
    rawNonTriggerCount,
    reportTriggerCount,
    reportNonTriggerCount,
    hasRawSummary
  };
}

function getArrAggregateResults(records, task, taskId) {
  const arrRecords = collectArrRecords(records);
  if (!arrRecords.length) {
    return [];
  }

  const config = getArrTaskConfig(task);
  const summary = buildArrSummary(arrRecords);
  const perturbedValues = arrRecords
    .map(item => item.reportData?.perturbedValue ?? item.reportData?.reportValue ?? item.report_value)
    .map(normalizeBinaryValue);

  const estimatedCounts = aggregateARR(perturbedValues, config.epsilon, 2, config.p, config.q)
    .map(value => Number(value.toFixed(4)));

  const realDistribution = summary.hasRawSummary
    ? [summary.rawNonTriggerCount, summary.rawTriggerCount]
    : [summary.reportNonTriggerCount, summary.reportTriggerCount];

  const realFrequencies = toFrequencies(realDistribution, summary.sampleCount);
  const estimatedFrequencies = toFrequencies(estimatedCounts, summary.sampleCount);
  const countMse = calculateMSE(realDistribution, estimatedCounts);
  const countMae = calculateMAE(realDistribution, estimatedCounts);
  const freqMse = calculateMSE(realFrequencies, estimatedFrequencies);
  const freqMae = calculateMAE(realFrequencies, estimatedFrequencies);

  const compareRows = [
    {
      label: '未触发',
      realValue: Number(realDistribution[0].toFixed ? realDistribution[0].toFixed(4) : Number(realDistribution[0]).toFixed(4)),
      estimatedValue: estimatedCounts[0],
      error: Number((estimatedCounts[0] - realDistribution[0]).toFixed(4)),
      realFrequency: Number(realFrequencies[0].toFixed(6)),
      estimatedFrequency: Number(estimatedFrequencies[0].toFixed(6)),
      frequencyError: Number((estimatedFrequencies[0] - realFrequencies[0]).toFixed(6))
    },
    {
      label: '触发',
      realValue: Number(realDistribution[1].toFixed ? realDistribution[1].toFixed(4) : Number(realDistribution[1]).toFixed(4)),
      estimatedValue: estimatedCounts[1],
      error: Number((estimatedCounts[1] - realDistribution[1]).toFixed(4)),
      realFrequency: Number(realFrequencies[1].toFixed(6)),
      estimatedFrequency: Number(estimatedFrequencies[1].toFixed(6)),
      frequencyError: Number((estimatedFrequencies[1] - realFrequencies[1]).toFixed(6))
    }
  ];

  const consistency = compareRows.every(row => Math.abs(row.error) < 5) ? '较高' : '一般';

  return [{
    id: 1,
    attributeName: '是否触发异常跌倒告警',
    taskId: taskId,
    protectionMode: '间接隐私风险防护',
    algorithm: 'ARR',
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
    distributionFit: summary.hasRawSummary ? '基于批次摘要恢复' : '基于上报分布近似',
    originalData: realDistribution,
    perturbationData: estimatedCounts,
    originalFrequencyData: realFrequencies.map(value => Number(value.toFixed(6))),
    perturbationFrequencyData: estimatedFrequencies.map(value => Number(value.toFixed(6))),
    compareRows,
    metricDescription: '核心 MSE / MAE 指标按论文中的频率估计误差定义计算，计数误差仅用于辅助展示实际恢复偏差。',
    sourceDescription: `当前结果基于该任务下全部已上报的 ${summary.sampleCount} 条 ARR 样本统一统计与估计，用于展示协议在实际采集链路中的恢复效果。当前页面展示的是本次累计样本的单次恢复结果，论文实验曲线基于多次重复实验的平均值。`
  }];
}

export function getAggregateResults(taskId) {
  try {
    const records = loadSubmissions(taskId);
    if (!records.length) {
      return [];
    }

    const resolvedTaskId = taskId || records[0]?.task_id || records[0]?.taskId;
    const task = getTaskById(resolvedTaskId);
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
