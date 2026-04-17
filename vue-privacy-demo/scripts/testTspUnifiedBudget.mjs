import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyTSP,
  calculateLegacySplitBudgetTSPParameters,
  calculateTSPParameters,
  tspFirstPerturb,
  tspSecondPerturb
} from '../src/utils/ldpAlgorithms.js';
import {
  aggregateTspDomainCounts,
  resolveTspTaskConfig,
  TSP_VERSION_LEGACY_SPLIT_BUDGET,
  TSP_VERSION_PAPER_UNIFIED_BUDGET
} from '../src/utils/tspProtocol.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

function approx(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(Number(actual) - Number(expected)) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`
  );
}

function buildExpectedReportCounts(trueCounts, config) {
  const total = trueCounts.reduce((sum, value) => sum + value, 0);
  const counts = new Array(config.unifiedDomainSize).fill(0);
  const n0 = trueCounts[0];

  counts[0] = n0 * config.p2 + (total - n0) * config.q2;

  for (let value = 1; value < config.unifiedDomainSize; value += 1) {
    const ni = trueCounts[value];
    counts[value] = n0 * config.q2 + ni * config.pStar + (total - n0 - ni) * config.qStar;
  }

  return counts;
}

function calculateTeacherTspParameters(alpha, beta, epsilon, scoreDomainSize) {
  const expEpsilon = Math.exp(epsilon);

  let p2 = 1;
  if (!(beta > 0 && alpha / beta <= expEpsilon)) {
    p2 = Math.min(
      ((1 - alpha) - (1 - beta) * expEpsilon)
      / ((1 - (scoreDomainSize + 1) * alpha) - (1 - (scoreDomainSize + 1) * beta) * expEpsilon),
      1
    );
  }

  const q2 = (1 - p2) / scoreDomainSize;
  const p1 = Math.min(
    (
      expEpsilon * p2
      + ((scoreDomainSize - 2) * expEpsilon - (scoreDomainSize - 1)) * q2
    ) / ((scoreDomainSize - 1 + expEpsilon) * (p2 - q2)),
    1
  );
  const q1 = Math.max(0, (1 - p1) / (scoreDomainSize - 1));

  return {
    p1,
    q1,
    p2,
    q2,
    pStar: p1 * p2 + (1 - p1) * q2,
    qStar: q1 * p2 + (1 - q1) * q2
  };
}

function withMockedRandom(sequence, callback) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => {
    const value = sequence[Math.min(index, sequence.length - 1)];
    index += 1;
    return value;
  };

  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function assertNoLegacyBudgetLabels() {
  const filesToCheck = [
    path.join(projectRoot, 'src/views/user/UserDevice.vue'),
    path.join(projectRoot, 'src/views/admin/AttrConfig.vue'),
    path.join(projectRoot, 'src/services/taskAggregateResultService.js')
  ];
  const forbiddenLabels = [
    '第一阶段预算 ε1',
    '第二阶段预算 ε2',
    '使用预算 ε1',
    '使用预算 ε2',
    '默认均分 ε1 / ε2'
  ];

  filesToCheck.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    forbiddenLabels.forEach(label => {
      assert.ok(!content.includes(label), `${path.basename(filePath)} still contains forbidden label: ${label}`);
    });
  });
}

function run() {
  const alpha = 0.408333;
  const beta = 0.2;
  const epsilon = 1;
  const scoreDomainSize = 5;
  const expEpsilon = Math.exp(epsilon);
  const secondarySample = { alpha: 0.6, beta: 0.1, epsilon: 1, scoreDomainSize: 5 };

  const paper = calculateTSPParameters(alpha, beta, epsilon, scoreDomainSize);
  const legacy = calculateLegacySplitBudgetTSPParameters(alpha, beta, epsilon, scoreDomainSize);
  const teacher = calculateTeacherTspParameters(alpha, beta, epsilon, scoreDomainSize);
  const secondaryPaper = calculateTSPParameters(
    secondarySample.alpha,
    secondarySample.beta,
    secondarySample.epsilon,
    secondarySample.scoreDomainSize
  );
  const secondaryTeacher = calculateTeacherTspParameters(
    secondarySample.alpha,
    secondarySample.beta,
    secondarySample.epsilon,
    secondarySample.scoreDomainSize
  );

  assert.equal(paper.version, TSP_VERSION_PAPER_UNIFIED_BUDGET);
  assert.ok(!('epsilonStage1' in paper));
  assert.ok(!('epsilonStage2' in paper));
  assert.equal(paper.p2, 1, 'paper p2 should follow TSP threshold branch when alpha / beta <= exp(epsilon)');
  assert.equal(paper.q2, 0, 'paper q2 should be 0 when p2 is 1');
  approx(paper.p1 + (scoreDomainSize - 1) * paper.q1, 1, 1e-9, 'paper stage-one normalization');
  approx(paper.p2 + scoreDomainSize * paper.q2, 1, 1e-9, 'paper stage-two normalization');
  approx(paper.pStar, paper.p1 * paper.p2 + (1 - paper.p1) * paper.q2, 1e-9, 'paper p* formula');
  approx(paper.qStar, paper.q1 * paper.p2 + (1 - paper.q1) * paper.q2, 1e-9, 'paper q* formula');
  approx(paper.pStar / paper.qStar, expEpsilon, 1e-9, 'paper p* / q* should satisfy exp(epsilon)');
  approx(
    paper.p1,
    expEpsilon / ((scoreDomainSize - 1) + expEpsilon),
    1e-12,
    'paper p1 should match unified-epsilon TSP formula when p2 = 1'
  );
  approx(paper.p1, teacher.p1, 1e-12, 'paper p1 should match teacher TSP.py');
  approx(paper.q1, teacher.q1, 1e-12, 'paper q1 should match teacher TSP.py');
  approx(paper.p2, teacher.p2, 1e-12, 'paper p2 should match teacher TSP.py');
  approx(paper.q2, teacher.q2, 1e-12, 'paper q2 should match teacher TSP.py');
  approx(paper.pStar, teacher.pStar, 1e-12, 'paper p* should match teacher TSP.py');
  approx(paper.qStar, teacher.qStar, 1e-12, 'paper q* should match teacher TSP.py');
  approx(secondaryPaper.p1, secondaryTeacher.p1, 1e-12, 'secondary paper p1 should match teacher TSP.py');
  approx(secondaryPaper.q1, secondaryTeacher.q1, 1e-12, 'secondary paper q1 should match teacher TSP.py');
  approx(secondaryPaper.p2, secondaryTeacher.p2, 1e-12, 'secondary paper p2 should match teacher TSP.py');
  approx(secondaryPaper.q2, secondaryTeacher.q2, 1e-12, 'secondary paper q2 should match teacher TSP.py');

  assert.equal(legacy.version, TSP_VERSION_LEGACY_SPLIT_BUDGET);
  assert.ok('epsilonStage1' in legacy && 'epsilonStage2' in legacy);
  assert.notEqual(Number(legacy.p2.toFixed(8)), Number(paper.p2.toFixed(8)), 'legacy and paper p2 should differ for the sample');

  assert.equal(withMockedRandom([0.2], () => tspFirstPerturb(0, scoreDomainSize, 0.3)), 0);
  assert.equal(withMockedRandom([0.1], () => tspFirstPerturb(4, scoreDomainSize, 1)), 4);
  assert.equal(withMockedRandom([0.9, 0.0], () => tspFirstPerturb(4, scoreDomainSize, 0)), 1);
  assert.equal(withMockedRandom([0.1], () => tspSecondPerturb(3, scoreDomainSize, 1)), 3);
  assert.equal(withMockedRandom([0.9, 0.0], () => tspSecondPerturb(3, scoreDomainSize, 0)), 0);

  const appliedMissing = withMockedRandom([0.2], () => applyTSP(0, paper));
  assert.equal(appliedMissing.stageOneSkipped, true);
  assert.equal(appliedMissing.stageTwoInput, 0);
  assert.equal(appliedMissing.stageTwoValue, 0);

  const appliedScore = withMockedRandom([0.2, 0.1], () => applyTSP(5, { ...paper, p1: 1, p2: 1 }));
  assert.equal(appliedScore.stageOneSkipped, false);
  assert.equal(appliedScore.stageOneValue, 5);
  assert.equal(appliedScore.stageTwoInput, 5);
  assert.equal(appliedScore.stageTwoValue, 5);

  const paperSnapshot = {
    epsilon,
    alphaBetaResult: { alpha, beta },
    tspVersion: TSP_VERSION_PAPER_UNIFIED_BUDGET,
    calibratedParams: {
      tspVersion: TSP_VERSION_PAPER_UNIFIED_BUDGET,
      p1: paper.p1.toFixed(4),
      q1: paper.q1.toFixed(4),
      p2: paper.p2.toFixed(4),
      q2: paper.q2.toFixed(4),
      pStar: paper.pStar.toFixed(4),
      qStar: paper.qStar.toFixed(4),
      d: scoreDomainSize
    }
  };
  const legacySnapshot = {
    epsilon,
    alphaBetaResult: { alpha, beta },
    calibratedParams: {
      p1: legacy.p1.toFixed(4),
      q1: legacy.q1.toFixed(4),
      p2: legacy.p2.toFixed(4),
      q2: legacy.q2.toFixed(4),
      pStar: legacy.pStar.toFixed(4),
      qStar: legacy.qStar.toFixed(4),
      epsilonStage1: legacy.epsilonStage1.toFixed(4),
      epsilonStage2: legacy.epsilonStage2.toFixed(4),
      d: scoreDomainSize
    }
  };

  assert.equal(resolveTspTaskConfig(paperSnapshot, scoreDomainSize).version, TSP_VERSION_PAPER_UNIFIED_BUDGET);
  assert.equal(resolveTspTaskConfig(legacySnapshot, scoreDomainSize).version, TSP_VERSION_LEGACY_SPLIT_BUDGET);

  const trueCounts = [18, 17, 16, 19, 14, 16];
  const expectedReportCounts = buildExpectedReportCounts(trueCounts, paper);
  const recoveredCounts = aggregateTspDomainCounts(expectedReportCounts, trueCounts.reduce((sum, value) => sum + value, 0), paper);

  trueCounts.forEach((value, index) => {
    approx(recoveredCounts[index], value, 1e-3, `recovered count for domain value ${index}`);
  });

  assertNoLegacyBudgetLabels();

  console.log('TSP unified-budget checks passed.');
  console.log(JSON.stringify({
    sample: { alpha, beta, epsilon, scoreDomainSize },
    paper: {
      p1: Number(paper.p1.toFixed(6)),
      q1: Number(paper.q1.toFixed(6)),
      p2: Number(paper.p2.toFixed(6)),
      q2: Number(paper.q2.toFixed(6)),
      pStar: Number(paper.pStar.toFixed(6)),
      qStar: Number(paper.qStar.toFixed(6))
    },
    teacherTspPy: {
      p1: Number(teacher.p1.toFixed(6)),
      q1: Number(teacher.q1.toFixed(6)),
      p2: Number(teacher.p2.toFixed(6)),
      q2: Number(teacher.q2.toFixed(6)),
      pStar: Number(teacher.pStar.toFixed(6)),
      qStar: Number(teacher.qStar.toFixed(6))
    },
    legacy: {
      epsilonStage1: Number(legacy.epsilonStage1.toFixed(6)),
      epsilonStage2: Number(legacy.epsilonStage2.toFixed(6)),
      p1: Number(legacy.p1.toFixed(6)),
      q1: Number(legacy.q1.toFixed(6)),
      p2: Number(legacy.p2.toFixed(6)),
      q2: Number(legacy.q2.toFixed(6)),
      pStar: Number(legacy.pStar.toFixed(6)),
      qStar: Number(legacy.qStar.toFixed(6))
    },
    paperVsTeacherDelta: {
      p1: Number((paper.p1 - teacher.p1).toFixed(12)),
      q1: Number((paper.q1 - teacher.q1).toFixed(12)),
      p2: Number((paper.p2 - teacher.p2).toFixed(12)),
      q2: Number((paper.q2 - teacher.q2).toFixed(12)),
      pStar: Number((paper.pStar - teacher.pStar).toFixed(12)),
      qStar: Number((paper.qStar - teacher.qStar).toFixed(12))
    },
    secondaryTeacherComparison: {
      sample: secondarySample,
      paper: {
        p1: Number(secondaryPaper.p1.toFixed(6)),
        q1: Number(secondaryPaper.q1.toFixed(6)),
        p2: Number(secondaryPaper.p2.toFixed(6)),
        q2: Number(secondaryPaper.q2.toFixed(6))
      },
      teacherTspPy: {
        p1: Number(secondaryTeacher.p1.toFixed(6)),
        q1: Number(secondaryTeacher.q1.toFixed(6)),
        p2: Number(secondaryTeacher.p2.toFixed(6)),
        q2: Number(secondaryTeacher.q2.toFixed(6))
      }
    },
    aggregateRecovery: {
      trueCounts,
      expectedReportCounts: expectedReportCounts.map(value => Number(value.toFixed(4))),
      recoveredCounts
    }
  }, null, 2));
}

run();
