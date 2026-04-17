import { calculateTSPParameters } from '../utils/ldpAlgorithms';

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

function approximatelyEqual(left, right, tolerance = 1e-3) {
  return Math.abs(Number(left) - Number(right)) <= tolerance;
}

function getTspTaskConfig(task, scoreDomainSize = 5) {
  const snapshot = task?.configSnapshot || {};
  const alpha = Number(snapshot.alphaBetaResult?.alpha ?? snapshot.alpha ?? 0);
  const beta = Number(snapshot.alphaBetaResult?.beta ?? snapshot.beta ?? 0);
  const epsilon = Number(snapshot.epsilon ?? task?.privacyBudget ?? 1);
  const calculated = calculateTSPParameters(alpha, beta, epsilon, scoreDomainSize);

  let p1 = Number(snapshot.calibratedParams?.p1);
  let q1 = Number(snapshot.calibratedParams?.q1);
  let p2 = Number(snapshot.calibratedParams?.p2);
  let q2 = Number(snapshot.calibratedParams?.q2);
  let pStar = Number(snapshot.calibratedParams?.pStar);
  let qStar = Number(snapshot.calibratedParams?.qStar);
  let epsilonStage1 = Number(snapshot.calibratedParams?.epsilonStage1 ?? snapshot.epsilonStage1);
  let epsilonStage2 = Number(snapshot.calibratedParams?.epsilonStage2 ?? snapshot.epsilonStage2);

  const stageOneOthers = scoreDomainSize - 1;
  const stageTwoOthers = scoreDomainSize;
  const stageOneConstraint = p1 + stageOneOthers * q1;
  const stageTwoConstraint = p2 + stageTwoOthers * q2;
  const expectedPStar = p1 * p2 + (1 - p1) * q2;
  const expectedQStar = q1 * p2 + (1 - q1) * q2;
  const hasValidSnapshotParams = [p1, q1, p2, q2].every(Number.isFinite)
    && approximatelyEqual(stageOneConstraint, 1)
    && approximatelyEqual(stageTwoConstraint, 1)
    && (!Number.isFinite(pStar) || approximatelyEqual(pStar, expectedPStar))
    && (!Number.isFinite(qStar) || approximatelyEqual(qStar, expectedQStar));

  if (!hasValidSnapshotParams) {
    p1 = calculated.p1;
    q1 = calculated.q1;
    p2 = calculated.p2;
    q2 = calculated.q2;
    pStar = calculated.pStar;
    qStar = calculated.qStar;
  }

  if (!Number.isFinite(pStar) || !Number.isFinite(qStar)) {
    pStar = p1 * p2 + (1 - p1) * q2;
    qStar = q1 * p2 + (1 - q1) * q2;
  }

  if (!Number.isFinite(epsilonStage1) || !Number.isFinite(epsilonStage2)) {
    epsilonStage1 = calculated.epsilonStage1;
    epsilonStage2 = calculated.epsilonStage2;
  }

  return {
    alpha,
    beta,
    epsilon,
    p1,
    q1,
    p2,
    q2,
    pStar,
    qStar,
    epsilonStage1,
    epsilonStage2,
    scoreDomainSize,
    unifiedDomainSize: scoreDomainSize + 1
  };
}

function aggregateTspCounts(reportCounts, sampleCount, config) {
  const estimatedCounts = new Array(config.unifiedDomainSize).fill(0);
  const total = Number(sampleCount) || 0;
  if (!total) {
    return estimatedCounts;
  }

  const n0Hat = (Number(reportCounts[0] ?? 0) - total * config.q2) / (config.p2 - config.q2);
  estimatedCounts[0] = Number(n0Hat.toFixed(4));

  for (let value = 1; value < config.unifiedDomainSize; value += 1) {
    estimatedCounts[value] = Number(((
      Number(reportCounts[value] ?? 0)
      - n0Hat * config.q2
      - (total - n0Hat) * config.qStar
    ) / (config.pStar - config.qStar)).toFixed(4));
  }

  return estimatedCounts;
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

  const config = getTspTaskConfig(task, 5);
  const summary = buildTspSummary(records, config.scoreDomainSize);
  const estimatedCounts = aggregateTspCounts(summary.reportCounts, summary.sampleCount, config);
  const trueCounts = summary.hasRawSummary ? summary.rawCounts : summary.reportCounts;
  const rawMissingCounts = [Number(trueCounts[0] ?? 0), Number(trueCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0))];
  const rawScoreCounts = trueCounts.slice(1).map(value => Number(value ?? 0));
  const rawMissingEstimates = [Number(estimatedCounts[0] ?? 0), Number(estimatedCounts.slice(1).reduce((sum, value) => sum + Number(value ?? 0), 0).toFixed(4))];
  const rawScoreEstimates = estimatedCounts.slice(1).map(value => Number(value ?? 0));
  const legacyDisplayMissingEstimates = constrainCountsForDisplay(rawMissingEstimates, summary.sampleCount);
  const legacyDisplayScoreEstimates = constrainCountsForDisplay(rawScoreEstimates, rawScoreCounts.reduce((sum, value) => sum + value, 0));

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
    legacyDisplayMissingEstimates,
    legacyDisplayScoreEstimates,
    displayDistortionReason: rawMissingEstimates.some(value => Number(value) < 0)
      ? '旧版页面会先把负估计截断为 0，再按总样本数归一化，所以一旦某一类原始恢复值为负，另一类就会被拉成 100%。'
      : '当前样本下旧版展示后处理没有把结果推到极端值。',
    config: {
      alpha: config.alpha,
      beta: config.beta,
      epsilon: config.epsilon,
      epsilonStage1: config.epsilonStage1,
      epsilonStage2: config.epsilonStage2,
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
