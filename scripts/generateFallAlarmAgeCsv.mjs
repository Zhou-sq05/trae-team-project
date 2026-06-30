import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, '..', 'public', 'data', 'temp_fall_alarm_age_200.csv');

function buildRecords() {
  const plan = [
    {
      ageGroup: '青年',
      startId: 1,
      total: 80,
      alarmCount: 6,
      ages: [18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44]
    },
    {
      ageGroup: '中年',
      startId: 81,
      total: 60,
      alarmCount: 11,
      ages: [45, 47, 49, 51, 53, 55, 57, 59]
    },
    {
      ageGroup: '老年',
      startId: 141,
      total: 60,
      alarmCount: 23,
      ages: [60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82]
    }
  ];

  const records = [];

  plan.forEach(group => {
    for (let index = 0; index < group.total; index += 1) {
      const userId = group.startId + index;
      const age = group.ages[index % group.ages.length];
      const fallAlarm = index < group.alarmCount ? 1 : 0;

      records.push({
        user_id: `U${String(userId).padStart(3, '0')}`,
        age,
        age_group: group.ageGroup,
        fall_alarm: fallAlarm
      });
    }
  });

  return records;
}

function toCSV(records) {
  const header = 'user_id,age,age_group,fall_alarm';
  const lines = records.map(record =>
    [record.user_id, record.age, record.age_group, record.fall_alarm].join(',')
  );

  return [header, ...lines].join('\n');
}

const records = buildRecords();
const csvContent = toCSV(records);

fs.writeFileSync(outputPath, csvContent, 'utf-8');

console.log(`generated: ${outputPath}`);
console.log(`rows: ${records.length}`);
