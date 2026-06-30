import { AGE_GROUP_DISPLAY, FALL_ALARM_ORDER } from './constants.js';
import {
  CONDITION_DISTRIBUTION_KEYS,
  CONDITION_PRESET_DATA_SOURCE_MODE,
  buildMatrixDataFromPreset
} from './conditionDistributionPresets.js';

export const YOUNG_MIN = 18;
export const YOUNG_MAX = 44;
export const MIDDLE_MIN = 45;
export const MIDDLE_MAX = 59;
export const OLD_MIN = 60;

export const FALL_ALARM_DATA_PATH = 'src/data/conditionDistributionPresets.json';
export const ARR_DEFAULT_DATA_SOURCE_MODE = CONDITION_PRESET_DATA_SOURCE_MODE;
export const ARR_DATA_SOURCE_MODES = {
  [CONDITION_PRESET_DATA_SOURCE_MODE]: {
    label: '内置多源校准矩阵',
    description: '当前条件分布采用内置校准矩阵，用于表示年龄段与睡眠异常提醒之间的统计相关性，后续可替换为更大规模公共健康数据库计算结果。'
  }
};

export const AGE_GROUP_ORDER = ['青年', '中年', '老年'];

export function getAgeGroup(age) {
  const numericAge = Number(age);

  if (numericAge >= YOUNG_MIN && numericAge <= YOUNG_MAX) return '青年';
  if (numericAge >= MIDDLE_MIN && numericAge <= MIDDLE_MAX) return '中年';
  if (numericAge >= OLD_MIN) return '老年';

  return null;
}

export function getFallAlarmLabel(value) {
  return Number(value) === 1 ? '触发提醒' : '未触发提醒';
}

export function normalizeFallAlarmRows(rows) {
  return rows
    .map(row => {
      const age = Number(row.age ?? row.Age);
      const ageGroup = getAgeGroup(age);
      const fallAlarmValue = Number(row.fall_alarm ?? row.sleep_alert ?? row.sleepAlert);

      if (!Number.isFinite(age) || !ageGroup || ![0, 1].includes(fallAlarmValue)) {
        return null;
      }

      return {
        userId: row.user_id ?? row['Person ID'],
        age,
        ageGroup,
        fallAlarm: fallAlarmValue,
        fallAlarmLabel: getFallAlarmLabel(fallAlarmValue)
      };
    })
    .filter(Boolean);
}

export function calculatePrAGivenS() {
  const matrix = buildPresetSleepReminderMatrix();
  return {
    conditionalProbs: matrix.conditionalProbs,
    jointCounts: matrix.jointCounts,
    sCounts: matrix.sCounts
  };
}

export function buildPresetSleepReminderMatrix() {
  return buildMatrixDataFromPreset(CONDITION_DISTRIBUTION_KEYS.ARR_SLEEP_ALERT_AGE);
}

export function calculateSmoothedPrAGivenS() {
  return buildPresetSleepReminderMatrix();
}

export function buildMatrixRows(conditionalMatrixData) {
  const matrixData = conditionalMatrixData || buildPresetSleepReminderMatrix();
  return AGE_GROUP_ORDER.map(group => {
    const row = { s: group };
    FALL_ALARM_ORDER.forEach(label => {
      row[label] = matrixData.conditionalProbs[group]?.[label] ?? 0;
    });
    return row;
  });
}

export function calculateColumnStats(conditionalMatrixData) {
  const rows = buildMatrixRows(conditionalMatrixData);

  return FALL_ALARM_ORDER.map(label => {
    const values = rows.map(row => row[label] ?? 0);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const ratio = min === 0 ? Number.POSITIVE_INFINITY : max / min;

    return { label, max, min, ratio };
  });
}

export function selectAlphaBetaSourceColumn(conditionalMatrixData) {
  const stats = calculateColumnStats(conditionalMatrixData);
  const selected = stats.reduce((best, current) => {
    if (!best) return current;
    return current.ratio > best.ratio ? current : best;
  }, null);

  return {
    selectedLabel: selected?.label || '',
    stats
  };
}

export function calculateAlphaBeta(conditionalMatrixData) {
  const rows = buildMatrixRows(conditionalMatrixData);
  const { selectedLabel, stats } = selectAlphaBetaSourceColumn(conditionalMatrixData);
  const values = rows.map(row => row[selectedLabel] ?? 0);

  return {
    selectedLabel,
    alpha: Math.max(...values),
    beta: Math.min(...values),
    stats,
    selectedStat: stats.find(item => item.label === selectedLabel)
  };
}

export async function loadFallAlarmMatrixFromCSV() {
  return {
    rows: [],
    matrix: buildPresetSleepReminderMatrix()
  };
}

export async function loadCSVFile() {
  throw new Error('当前阶段不在前端运行时读取原始 CSV，请使用 conditionDistributionPresets.json。');
}

export function parseCSV() {
  return [];
}

export { AGE_GROUP_DISPLAY };
