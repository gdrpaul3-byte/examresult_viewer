import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import '../app.js';

const {
  isReleased,
  formatCountdownParts,
  normalizeExamLabel,
  renderHomeState,
  isAdminUnlocked,
  setAdminUnlocked,
  renderExamCard,
  renderExamDetail,
} = globalThis.ExamViewerApp;

test('isReleased compares release time correctly', () => {
  assert.equal(
    isReleased('2026-04-21T09:00:00+09:00', '2026-04-21T08:59:59+09:00'),
    false
  );
  assert.equal(
    isReleased('2026-04-21T09:00:00+09:00', '2026-04-21T09:00:00+09:00'),
    true
  );
});

test('formatCountdownParts returns zeroed clock after release', () => {
  assert.equal(
    formatCountdownParts('2026-04-21T09:00:00+09:00', '2026-04-21T10:00:00+09:00'),
    '00:00:00'
  );
});

test('normalizeExamLabel maps internal values to Korean labels', () => {
  assert.equal(normalizeExamLabel('midterm'), '중간고사');
  assert.equal(normalizeExamLabel('final'), '기말고사');
});

test('renderHomeState shows empty message when no exams exist', () => {
  const html = renderHomeState([]);
  assert.match(html, /표시 가능한 시험이 없습니다/);
});

test('admin unlock persists through session storage adapter', () => {
  const storage = new Map();
  setAdminUnlocked(storage, true);
  assert.equal(isAdminUnlocked(storage), true);
});

test('renderExamCard shows countdown when exam is locked', () => {
  const html = renderExamCard(
    {
      title: '테스트',
      exam: 'midterm',
      releaseAt: '2026-04-21T09:00:00+09:00',
    },
    {
      nowIso: '2026-04-21T08:00:00+09:00',
      adminUnlocked: false,
    }
  );

  assert.match(html, /잠김/);
  assert.match(html, /남은 시간/);
});

test('renderHomeState renders subject cards when exams exist', () => {
  const html = renderHomeState([
    { subject: '뇌과학개론', exam: 'midterm' },
    { subject: '뇌과학개론', exam: 'final' },
  ]);

  assert.match(html, /뇌과학개론/);
  assert.match(html, /2개 시험/);
});

test('renderExamDetail includes answer and explanation tabs', () => {
  const html = renderExamDetail({
    title: '테스트 시험',
    answerKeyHtml: '<table></table>',
    explanationsHtml: '<p>해설</p>',
  });

  assert.match(html, /정답표/);
  assert.match(html, /문항별 해설/);
  assert.match(html, /테스트 시험/);
});

test('index.html uses classic script entrypoint for file double-click compatibility', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.doesNotMatch(html, /type="module"\s+src="\.\/*app\.js"/);
  assert.match(html, /<script src="\.\/app\.js"><\/script>/);
});
