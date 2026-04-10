import fs from 'node:fs';
import path from 'node:path';

const outputPath = path.resolve('public/data/temp_steps_weight_200.csv');

const bucketDefs = [
  { label: '0-1999', min: 0, max: 1999, countMap: { '偏瘦': 2, '正常': 3, '超重': 10 } },
  { label: '2000-3999', min: 2000, max: 3999, countMap: { '偏瘦': 3, '正常': 5, '超重': 12 } },
  { label: '4000-5999', min: 4000, max: 5999, countMap: { '偏瘦': 5, '正常': 8, '超重': 13 } },
  { label: '6000-7999', min: 6000, max: 7999, countMap: { '偏瘦': 7, '正常': 13, '超重': 11 } },
  { label: '8000-9999', min: 8000, max: 9999, countMap: { '偏瘦': 11, '正常': 18, '超重': 7 } },
  { label: '10000-11999', min: 10000, max: 11999, countMap: { '偏瘦': 13, '正常': 16, '超重': 4 } },
  { label: '12000-13999', min: 12000, max: 13999, countMap: { '偏瘦': 11, '正常': 11, '超重': 2 } },
  { label: '14000+', min: 14000, max: 17999, countMap: { '偏瘦': 8, '正常': 6, '超重': 1 } }
];

const statuses = ['偏瘦', '正常', '超重'];
const rows = [];
let userId = 1;

for (const status of statuses) {
  for (const bucket of bucketDefs) {
    const count = bucket.countMap[status];
    const span = Math.max(bucket.max - bucket.min, 1);

    for (let i = 0; i < count; i += 1) {
      const offset = Math.floor(((i + 1) * span) / (count + 1));
      const steps = bucket.min + offset;
      rows.push({
        user_id: userId,
        steps,
        steps_bucket: bucket.label,
        weight_status: status
      });
      userId += 1;
    }
  }
}

const csv = [
  'user_id,steps,steps_bucket,weight_status',
  ...rows.map(row => `${row.user_id},${row.steps},${row.steps_bucket},${row.weight_status}`)
].join('\n');

fs.writeFileSync(outputPath, csv, 'utf8');
console.log(`generated ${rows.length} rows -> ${outputPath}`);
