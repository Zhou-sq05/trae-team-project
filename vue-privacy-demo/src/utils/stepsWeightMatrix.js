import { STEP_BUCKET_ORDER, WEIGHT_STATUS_ORDER } from './constants.js';
import { choose } from './ldpAlgorithms.js';

export { STEP_BUCKET_ORDER, WEIGHT_STATUS_ORDER };

export const STEPS_WEIGHT_DATA_PATH = '/data/temp_steps_weight_200.csv';

const STEP_BUCKET_RANGES = [
  { label: '0-1999', min: 0, max: 1999 },
  { label: '2000-3999', min: 2000, max: 3999 },
  { label: '4000-5999', min: 4000, max: 5999 },
  { label: '6000-7999', min: 6000, max: 7999 },
  { label: '8000-9999', min: 8000, max: 9999 },
  { label: '10000-11999', min: 10000, max: 11999 },
  { label: '12000-13999', min: 12000, max: 13999 },
  { label: '14000+', min: 14000, max: Number.POSITIVE_INFINITY }
];

export function getStepsBucket(steps) {
  const numericSteps = Number(steps);
  const bucket = STEP_BUCKET_RANGES.find(item => numericSteps >= item.min && numericSteps <= item.max);
  return bucket?.label || null;
}

export function parseCSV(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = lines[0].split(',').map(item => item.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(item => item.trim());
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

export async function loadCSVFile(filePath) {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`加载 CSV 失败: ${response.status}`);
  }
  return response.text();
}

export function normalizeStepsRows(rows) {
  return rows
    .map(row => {
      const steps = Number(row.steps);
      const stepsBucket = getStepsBucket(steps);
      const weightStatus = row.weight_status?.trim();

      if (!Number.isFinite(steps) || !stepsBucket || !WEIGHT_STATUS_ORDER.includes(weightStatus)) {
        return null;
      }

      return {
        userId: row.user_id,
        steps,
        stepsBucket,
        weightStatus
      };
    })
    .filter(Boolean);
}

export function calculatePrAGivenS(rows) {
  const conditionalProbs = {};
  const jointCounts = {};
  const sCounts = {};

  WEIGHT_STATUS_ORDER.forEach(status => {
    conditionalProbs[status] = Object.fromEntries(STEP_BUCKET_ORDER.map(bucket => [bucket, 0]));
    jointCounts[status] = Object.fromEntries(STEP_BUCKET_ORDER.map(bucket => [bucket, 0]));
    sCounts[status] = 0;
  });

  rows.forEach(row => {
    jointCounts[row.weightStatus][row.stepsBucket] += 1;
    sCounts[row.weightStatus] += 1;
  });

  WEIGHT_STATUS_ORDER.forEach(status => {
    const total = sCounts[status];
    if (!total) return;

    STEP_BUCKET_ORDER.forEach(bucket => {
      conditionalProbs[status][bucket] = jointCounts[status][bucket] / total;
    });
  });

  return { conditionalProbs, jointCounts, sCounts };
}

export function buildStepsMatrixRows(matrixData) {
  if (!matrixData) return [];

  return WEIGHT_STATUS_ORDER.map(status => {
    const row = { s: status };
    STEP_BUCKET_ORDER.forEach(bucket => {
      row[bucket] = matrixData.conditionalProbs[status]?.[bucket] ?? 0;
    });
    return row;
  });
}

function getPairwiseSupportCandidates(matrixData) {
  const pairs = [
    ['偏瘦', '正常'],
    ['偏瘦', '超重'],
    ['正常', '超重']
  ];

  return pairs.map(([left, right]) => {
    const diffEntries = STEP_BUCKET_ORDER.map(bucket => ({
      bucket,
      diff: Math.abs((matrixData.conditionalProbs[left]?.[bucket] ?? 0) - (matrixData.conditionalProbs[right]?.[bucket] ?? 0))
    }));

    const avgDiff = diffEntries.reduce((sum, item) => sum + item.diff, 0) / diffEntries.length;
    let supportBuckets = diffEntries.filter(item => item.diff >= avgDiff).map(item => item.bucket);

    if (!supportBuckets.length) {
      supportBuckets = [diffEntries.slice().sort((a, b) => b.diff - a.diff)[0].bucket];
    }

    return {
      label: `${left} vs ${right}`,
      sourcePair: [left, right],
      buckets: supportBuckets,
      diffScore: diffEntries.reduce((sum, item) => sum + item.diff, 0),
      bucketText: supportBuckets.join('、')
    };
  });
}

function calculateSupportProbabilities(matrixData, buckets, statuses = WEIGHT_STATUS_ORDER) {
  return statuses.map(status => {
    const terms = buckets.map(bucket => matrixData.conditionalProbs[status]?.[bucket] ?? 0);
    const sum = terms.reduce((acc, value) => acc + value, 0);

    return {
      status,
      buckets,
      terms,
      sum
    };
  });
}

export function calculateStepsAlphaBeta(matrixData, epsilon = 1) {
  if (!matrixData) {
    return {
      alpha: null,
      beta: null,
      selectedLabel: null,
      selectedSupportSet: null,
      supportStats: []
    };
  }

  const expEpsilon = Math.exp(epsilon);
  const supportStats = getPairwiseSupportCandidates(matrixData).map((candidate, index) => {
    const pairValues = calculateSupportProbabilities(matrixData, candidate.buckets, candidate.sourcePair);
    const alphaItem = pairValues.reduce((best, current) => (current.sum > best.sum ? current : best));
    const betaItem = pairValues.reduce((best, current) => (current.sum < best.sum ? current : best));
    const alpha = alphaItem.sum;
    const beta = betaItem.sum;

    return {
      ...candidate,
      alpha,
      beta,
      ratio: beta === 0 ? Number.POSITIVE_INFINITY : alpha / beta,
      supportIndex: index,
      pairValues,
      alphaSource: alphaItem.status,
      betaSource: betaItem.status,
      alphaTerms: alphaItem.terms,
      betaTerms: betaItem.terms
    };
  });

  let selectedPair = null;
  let selectedSupportSet = null;

  supportStats.forEach(stat => {
    if (!selectedPair) {
      selectedPair = [stat.alpha, stat.beta];
      selectedSupportSet = stat;
      return;
    }

    const [nextAlpha, nextBeta] = choose(stat.alpha, stat.beta, selectedPair[0], selectedPair[1], expEpsilon);
    if (nextAlpha === stat.alpha && nextBeta === stat.beta) {
      selectedPair = [stat.alpha, stat.beta];
      selectedSupportSet = stat;
    }
  });

  return {
    alpha: selectedPair?.[0] ?? null,
    beta: selectedPair?.[1] ?? null,
    selectedLabel: selectedSupportSet?.label ?? null,
    selectedSupportSet,
    supportStats,
    selectionRule: '系统依据不确定性参数选择规则，从候选支持集的 (α, β) 中选出最终结果。',
    expEpsilon
  };
}

export async function loadStepsMatrixFromCSV(filePath = STEPS_WEIGHT_DATA_PATH) {
  const csvContent = await loadCSVFile(filePath);
  const parsedRows = parseCSV(csvContent);
  const normalizedRows = normalizeStepsRows(parsedRows);
  const matrix = calculatePrAGivenS(normalizedRows);

  return {
    rows: normalizedRows,
    matrix
  };
}
