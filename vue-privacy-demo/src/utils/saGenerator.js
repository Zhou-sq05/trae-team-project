import { parseCSV, getBloodPressureGroup, getSleepDurationGroup } from './dataProcessing.js';

const DEFAULT_OUTPUT_HEADERS = ['S', 'A'];

function getColumnKeys(rawData) {
  return rawData.length > 0 ? Object.keys(rawData[0]) : [];
}

function resolveColumnKey(rawData, column) {
  const keys = getColumnKeys(rawData);

  if (typeof column === 'number') {
    return keys[column];
  }

  return column;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSystolicBloodPressure(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const [systolic] = value.split('/').map(part => Number(part.trim()));
  return Number.isFinite(systolic) ? systolic : null;
}

function normalizeValue(rawValue, parser = 'identity') {
  if (typeof parser === 'function') {
    return parser(rawValue);
  }

  switch (parser) {
    case 'number':
      return toNumber(rawValue);
    case 'bloodPressureSystolic':
      return getSystolicBloodPressure(rawValue);
    case 'identity':
    default:
      return rawValue;
  }
}

function mapByRanges(value, ranges = []) {
  for (const range of ranges) {
    const minValid = range.min === undefined || value >= range.min;
    const maxValid = range.max === undefined || value < range.max;

    if (minValid && maxValid) {
      return range.label;
    }
  }

  return null;
}

function transformValue(rawValue, config = {}) {
  const normalizedValue = normalizeValue(rawValue, config.parser);

  if (normalizedValue === null || normalizedValue === undefined || normalizedValue === '') {
    return null;
  }

  if (typeof config.transform === 'function') {
    return config.transform(normalizedValue, rawValue);
  }

  if (Array.isArray(config.groups)) {
    return mapByRanges(normalizedValue, config.groups);
  }

  return normalizedValue;
}

export const defaultSAConfig = {
  sensitive: {
    column: 'Blood Pressure',
    parser: 'bloodPressureSystolic',
    transform: getBloodPressureGroup
  },
  nonSensitive: {
    column: 'Sleep Duration',
    parser: 'number',
    transform: getSleepDurationGroup
  },
  outputHeaders: DEFAULT_OUTPUT_HEADERS
};

export async function loadCSVFile(filePath) {
  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('加载 CSV 文件失败:', error);
    return null;
  }
}

export function extractSensitiveAndNonSensitiveData(rawData, config = defaultSAConfig) {
  const sensitiveKey = resolveColumnKey(rawData, config.sensitive?.column);
  const nonSensitiveKey = resolveColumnKey(rawData, config.nonSensitive?.column);

  if (!sensitiveKey || !nonSensitiveKey) {
    throw new Error('无法根据传入的位置解析 S 或 A 对应的列');
  }

  return rawData
    .map(row => {
      const sValue = transformValue(row[sensitiveKey], config.sensitive);
      const aValue = transformValue(row[nonSensitiveKey], config.nonSensitive);

      return { S: sValue, A: aValue };
    })
    .filter(item => item.S !== null && item.S !== undefined && item.A !== null && item.A !== undefined);
}

export function convertToCSV(processedData, headers = DEFAULT_OUTPUT_HEADERS) {
  const rows = processedData.map(item => `${item.S},${item.A}`);
  return [headers.join(','), ...rows].join('\n');
}

export function processDataToTwoColumns(csvContent, config = defaultSAConfig) {
  const rawData = parseCSV(csvContent);
  const processedData = extractSensitiveAndNonSensitiveData(rawData, config);
  const csvString = convertToCSV(processedData, config.outputHeaders || DEFAULT_OUTPUT_HEADERS);

  return {
    data: processedData,
    csv: csvString,
    count: processedData.length,
    columnKeys: getColumnKeys(rawData)
  };
}

export function downloadCSV(csvContent, filename = 'processed_data.csv') {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function calculateConditionalProbabilityMatrix(processedData) {
  const jointCounts = {};
  const sCounts = {};

  processedData.forEach(item => {
    const s = item.S;
    const a = item.A;

    if (!jointCounts[s]) {
      jointCounts[s] = {};
    }
    if (!jointCounts[s][a]) {
      jointCounts[s][a] = 0;
    }
    jointCounts[s][a]++;

    if (!sCounts[s]) {
      sCounts[s] = 0;
    }
    sCounts[s]++;
  });

  const conditionalProbs = {};

  Object.keys(jointCounts).forEach(s => {
    conditionalProbs[s] = {};
    const totalCount = sCounts[s];

    Object.keys(jointCounts[s]).forEach(a => {
      conditionalProbs[s][a] = jointCounts[s][a] / totalCount;
    });
  });

  return {
    conditionalProbs,
    jointCounts,
    sCounts
  };
}

export function convertMatrixToArray(conditionalProbs) {
  const sGroups = Object.keys(conditionalProbs);
  const aGroups = [...new Set(Object.values(conditionalProbs).flatMap(probs => Object.keys(probs)))];

  return sGroups.map(s => aGroups.map(a => conditionalProbs[s][a] || 0));
}

export function validateConditionalMatrix(conditionalProbs) {
  const results = {};
  let allValid = true;

  Object.keys(conditionalProbs).forEach(s => {
    let sum = 0;
    Object.keys(conditionalProbs[s]).forEach(a => {
      sum += conditionalProbs[s][a];
    });

    const isValid = Math.abs(sum - 1.0) < 0.0001;
    results[s] = {
      sum,
      isValid
    };

    if (!isValid) {
      allValid = false;
    }
  });

  return {
    allValid,
    details: results
  };
}
