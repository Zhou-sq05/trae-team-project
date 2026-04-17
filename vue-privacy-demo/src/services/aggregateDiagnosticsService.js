import { aggregateTspDomainCounts, resolveTspTaskConfig } from '../utils/tspProtocol.js';

function safeParse(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`解析 ${key} 失败:`, error);
    return fallback;
  }
}

function resolveScope(scopeInput) {
  if (scopeInput && typeof scopeInput === 'object') {
    return {
      taskId: scopeInput.taskId ? String(scopeInput.taskId) : '',
      batchId: scopeInput.batchId ? String(scopeInput.batchId) : ''
    };
  }

  return {
    taskId: scopeInput ? String(scopeInput) : '',
    batchId: ''
  };
}

function loadSubmissions(scopeInput) {
  const scope = resolveScope(scopeInput);
  const allData = safeParse('submittedData', []);

  return allData.filter(item => {
    const taskMatches = !scope.taskId || String(item.task_id ?? item.taskId) === scope.taskId;
    const batchMatches = !scope.batchId || String(item.batch_id ?? item.sampleMeta?.batchId ?? '') === scope.batchId;
    return taskMatches && batchMatches;
  });
}

function getTaskById(taskId) {
  const tasks = safeParse('tasks', []);
  return tasks.find(task => String(task.id) === String(taskId)) || null;
}

function normalizeTspCode(value, domainSize = 5) {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > domainSize) {
    return null;
  }
  return numericValue;
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
    return normalizedCounts.map(value => Number(uniformValue.toFixed(4)));
  }

  return normalizedCounts.map(value => Number(((value / currentSum) * resolvedTargetSum).toFixed(4)));
}

function countBy(values = []) {
  return values.reduce((accumulator, value) => {
    const key = value == null || value === '' ? '--' : String(value);
    accumulator[key] = Number(accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function buildTspSummary(tspRecords, scoreDomainSize = 5) {
  const labels = ['0', ...Array.from({ length: scoreDomainSize }, (_, index) => `${index + 1}`)];
  const rawCounts = new Array(scoreDomainSize + 1).fill(0);
  const reportCounts = new Array(scoreDomainSize + 1).fill(0);
  let hasRawSummary = false;

  tspRecords.forEach(item => {
    const rawMissing = Number(item.original_missing ?? item.rawData?.sleepMissing);
    const rawScore = Number(item.original_score ?? item.rawData?.sleepScore);
    const rawValue = rawMissing === 1 ? 0 : normalizeTspCode(rawScore, scoreDomainSize);
    const reportValue = normalizeTspCode(
      item.report_value ?? item.reportData?.reportValue ?? item.reportData?.perturbedValue,
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
    labels,
    rawCounts,
    reportCounts,
    sampleCount: tspRecords.length,
    hasRawSummary
  };
}

function buildRecordRows(records) {
  return records.map((item, index) => ({
    index: index + 1,
    taskId: String(item.task_id ?? item.taskId ?? '--'),
    batchId: String(item.batch_id ?? item.sampleMeta?.batchId ?? '--'),
    originalMissing: item.original_missing ?? item.rawData?.sleepMissing ?? null,
    originalScore: item.original_score ?? item.rawData?.sleepScore ?? null,
    stage1Result: item.stage1_result ?? item.reportData?.stageOneResult ?? null,
    stage2Input: item.stage2_input ?? item.reportData?.stageTwoInput ?? null,
    reportValue: item.report_value ?? item.reportData?.reportValue ?? item.reportData?.perturbedValue ?? null
  }));
}

export function getScopedDataCount(scopeInput) {
  return loadSubmissions(scopeInput).length;
}

export function getAvailableBatches(taskId) {
  const records = loadSubmissions({ taskId });
  const latestByBatch = new Map();

  records.forEach(item => {
    const batchId = item.batch_id ?? item.sampleMeta?.batchId;
    if (!batchId) {
      return;
    }
    const uploadTime = item.upload_time ?? item.uploadTime ?? '';
    const current = latestByBatch.get(String(batchId));
    if (!current || String(uploadTime) > String(current.uploadTime)) {
      latestByBatch.set(String(batchId), {
        batchId: String(batchId),
        uploadTime: String(uploadTime)
      });
    }
  });

  return Array.from(latestByBatch.values()).sort((left, right) => right.uploadTime.localeCompare(left.uploadTime));
}

export function getTspAggregateDiagnostics(scopeInput) {
  const scope = resolveScope(scopeInput);
  const taskId = scope.taskId;
  const task = getTaskById(taskId);
  const records = loadSubmissions(scope).filter(item => (item?.reportData?.protocol || item?.protocol) === 'TSP');

  if (!records.length) {
    return null;
  }

  const config = resolveTspTaskConfig(task, 5);
  const summary = buildTspSummary(records, config.scoreDomainSize);
  const estimatedCounts = aggregateTspDomainCounts(summary.reportCounts, summary.sampleCount, config);
  const trueCounts = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const rawMissingCounts = [Number(trueCounts[0] ?? 0), Number(trueCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0))];
  const rawScoreCounts = trueCounts.slice(1).map(value => Number(value ?? 0));
  const rawMissingEstimates = [Number(estimatedCounts[0] ?? 0), Number(estimatedCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0).toFixed(4))];
  const rawScoreEstimates = estimatedCounts.slice(1).map(value => Number(value ?? 0));
  const displayAdjustedMissingEstimates = constrainCountsForDisplay(rawMissingEstimates, summary.sampleCount);
  const displayAdjustedScoreEstimates = constrainCountsForDisplay(rawScoreEstimates, rawScoreCounts.reduce((sum, value) => sum + value, 0));

  return {
    scope: {
      taskId: taskId || '--',
      batchId: scope.batchId || 'ALL',
      recordCount: records.length,
      taskDistribution: countBy(records.map(item => item.task_id ?? item.taskId ?? '--')),
      batchDistribution: countBy(records.map(item => item.batch_id ?? item.sampleMeta?.batchId ?? '--')),
      protocolDistribution: countBy(records.map(item => item?.reportData?.protocol || item?.protocol || '--'))
    },
    trueValueSource: summary.hasRawSummary
      ? '真实值直接按当前参与聚合记录中的 original_missing / original_score 统计'
      : '当前记录缺少原始字段，真实值退化为基于上报值的近似统计',
    rawMissingCounts,
    rawScoreCounts,
    reportMissingCounts: [
      Number(summary.reportCounts[0] ?? 0),
      Number(summary.reportCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0))
    ],
    reportScoreCounts: summary.reportCounts.slice(1).map(value => Number(value ?? 0)),
    reportDomainCounts: summary.reportCounts.map(value => Number(value ?? 0)),
    unbiasedDomainEstimates: estimatedCounts,
    unbiasedMissingEstimates: rawMissingEstimates,
    unbiasedScoreEstimates: rawScoreEstimates,
    displayAdjustedMissingEstimates,
    displayAdjustedScoreEstimates,
    displayDistortionReason: rawMissingEstimates.some(value => Number(value) < 0)
      ? '若采用额外的非负截断与归一化处理，一旦某一类原始恢复值为负，另一类就可能被拉成 100%。'
      : '当前样本下，额外展示后处理没有把结果推到极端值。',
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
    recordsTable: buildRecordRows(records)
  };
}
