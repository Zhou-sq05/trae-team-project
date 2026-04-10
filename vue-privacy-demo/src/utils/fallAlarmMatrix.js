export const YOUNG_MIN = 18;
export const YOUNG_MAX = 44;
export const MIDDLE_MIN = 45;
export const MIDDLE_MAX = 59;
export const OLD_MIN = 60;

export const FALL_ALARM_DATA_PATH = '/data/temp_fall_alarm_age_200.csv';

export const AGE_GROUP_ORDER = ['青年', '中年', '老年'];
export const FALL_ALARM_ORDER = ['未触发（A=0）', '触发（A=1）'];

export const AGE_GROUP_DISPLAY = [
  { name: '青年', range: `${YOUNG_MIN}-${YOUNG_MAX}岁` },
  { name: '中年', range: `${MIDDLE_MIN}-${MIDDLE_MAX}岁` },
  { name: '老年', range: `${OLD_MIN}岁及以上` }
];

export function getAgeGroup(age) {
  const numericAge = Number(age);

  if (numericAge >= YOUNG_MIN && numericAge <= YOUNG_MAX) {
    return '青年';
  }
  if (numericAge >= MIDDLE_MIN && numericAge <= MIDDLE_MAX) {
    return '中年';
  }
  if (numericAge >= OLD_MIN) {
    return '老年';
  }

  return null;
}

export function getFallAlarmLabel(value) {
  return Number(value) === 1 ? '触发（A=1）' : '未触发（A=0）';
}

export function parseCSV(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map(header => header.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim());
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return row;
  });
}

export async function loadCSVFile(filePath) {
  const response = await fetch(filePath);

  if (!response.ok) {
    throw new Error(`加载 CSV 失败: ${response.status}`);
  }

  return response.text();
}

export function normalizeFallAlarmRows(rows) {
  return rows
    .map(row => {
      const age = Number(row.age);
      const ageGroup = getAgeGroup(age);
      const fallAlarmValue = Number(row.fall_alarm);

      if (!Number.isFinite(age) || !ageGroup || ![0, 1].includes(fallAlarmValue)) {
        return null;
      }

      return {
        userId: row.user_id,
        age,
        ageGroup,
        fallAlarm: fallAlarmValue,
        fallAlarmLabel: getFallAlarmLabel(fallAlarmValue)
      };
    })
    .filter(Boolean);
}

export function calculatePrAGivenS(rows) {
  const conditionalProbs = {};
  const jointCounts = {};
  const sCounts = {};

  AGE_GROUP_ORDER.forEach(group => {
    conditionalProbs[group] = {
      '未触发（A=0）': 0,
      '触发（A=1）': 0
    };
    jointCounts[group] = {
      '未触发（A=0）': 0,
      '触发（A=1）': 0
    };
    sCounts[group] = 0;
  });

  rows.forEach(row => {
    jointCounts[row.ageGroup][row.fallAlarmLabel] += 1;
    sCounts[row.ageGroup] += 1;
  });

  AGE_GROUP_ORDER.forEach(group => {
    const total = sCounts[group];

    if (total === 0) {
      return;
    }

    FALL_ALARM_ORDER.forEach(label => {
      conditionalProbs[group][label] = jointCounts[group][label] / total;
    });
  });

  return {
    conditionalProbs,
    jointCounts,
    sCounts
  };
}

export function buildMatrixRows(conditionalMatrixData) {
  if (!conditionalMatrixData) {
    return [];
  }

  return AGE_GROUP_ORDER.map(group => {
    const row = { s: group };

    FALL_ALARM_ORDER.forEach(label => {
      row[label] = conditionalMatrixData.conditionalProbs[group]?.[label] ?? 0;
    });

    return row;
  });
}

export function calculateAlphaBeta(conditionalMatrixData) {
  const rows = buildMatrixRows(conditionalMatrixData);

  let alpha = 0;
  let beta = 1;

  rows.forEach(row => {
    const probabilities = FALL_ALARM_ORDER.map(label => row[label] ?? 0);
    const rowMin = Math.min(...probabilities);
    const rowMax = Math.max(...probabilities);

    alpha = Math.max(alpha, rowMin);
    beta = Math.min(beta, rowMax);
  });

  return {
    alpha,
    beta
  };
}

export async function loadFallAlarmMatrixFromCSV(filePath = FALL_ALARM_DATA_PATH) {
  const csvContent = await loadCSVFile(filePath);
  const parsedRows = parseCSV(csvContent);
  const normalizedRows = normalizeFallAlarmRows(parsedRows);
  const matrix = calculatePrAGivenS(normalizedRows);

  return {
    rows: normalizedRows,
    matrix
  };
}
