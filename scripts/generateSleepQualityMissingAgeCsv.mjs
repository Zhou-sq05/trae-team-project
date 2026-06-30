import fs from 'node:fs';
import path from 'node:path';

const outputPath = path.resolve('public/data/temp_sleep_quality_missing_age_200.csv');
const groups = [
  { name: '青年', count: 80, missing: 8, ageMin: 18, ageMax: 44, scores: { 1: 6, 2: 10, 3: 18, 4: 22, 5: 16 } },
  { name: '中年', count: 60, missing: 11, ageMin: 45, ageMax: 59, scores: { 1: 7, 2: 10, 3: 14, 4: 11, 5: 7 } },
  { name: '老年', count: 60, missing: 18, ageMin: 60, ageMax: 79, scores: { 1: 10, 2: 12, 3: 10, 4: 6, 5: 4 } }
];

const rows = [];
let userId = 1;

for (const group of groups) {
  const span = group.ageMax - group.ageMin + 1;
  const nonMissingCount = group.count - group.missing;
  const scoreValues = [];

  Object.entries(group.scores).forEach(([score, count]) => {
    for (let i = 0; i < count; i += 1) {
      scoreValues.push(Number(score));
    }
  });

  for (let i = 0; i < group.count; i += 1) {
    const age = group.ageMin + (i % span);
    const isMissing = i < group.missing ? 1 : 0;
    const sleepScore = isMissing ? '' : scoreValues[i - group.missing] ?? ((i % 5) + 1);

    rows.push({
      user_id: userId,
      age,
      age_group: group.name,
      sleep_score: sleepScore,
      sleep_missing: isMissing
    });

    userId += 1;
  }

  if (scoreValues.length !== nonMissingCount) {
    throw new Error(`${group.name} 非缺失评分条数不匹配`);
  }
}

const csv = [
  'user_id,age,age_group,sleep_score,sleep_missing',
  ...rows.map(row => `${row.user_id},${row.age},${row.age_group},${row.sleep_score},${row.sleep_missing}`)
].join('\n');

fs.writeFileSync(outputPath, csv, 'utf8');
console.log(`generated ${rows.length} rows -> ${outputPath}`);
