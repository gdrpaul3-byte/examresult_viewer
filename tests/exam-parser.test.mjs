import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseExamMarkdown } from '../scripts/lib/exam-parser.mjs';
import { buildExamDataset } from '../scripts/build-exams.mjs';

const EXAM_FILE = '2026_뇌과학개론_중간고사_검토_정답_해설.md';

test('parseExamMarkdown extracts metadata and split sections', () => {
  const source = readFileSync(EXAM_FILE, 'utf8');
  const exam = parseExamMarkdown(source, EXAM_FILE);

  assert.equal(exam.subject, '뇌과학개론');
  assert.equal(exam.exam, 'midterm');
  assert.equal(exam.releaseAt, '2026-04-21T14:00:00+09:00');
  assert.match(exam.answerKeyHtml, /<table>/i);
  assert.match(exam.explanationsHtml, /1번/);
});

test('parseExamMarkdown rejects missing releaseAt', () => {
  const source = `---
title: "제목"
subject: "과목"
exam: "midterm"
---

## 채점용 정답표

없음

## 문항별 정오답 해설

없음`;

  assert.throws(() => parseExamMarkdown(source, 'broken.md'), /releaseAt/);
});

test('buildExamDataset emits browser-safe JS payload', async () => {
  const output = await buildExamDataset({
    cwd: process.cwd(),
    pattern: /\.md$/i,
  });

  assert.match(output, /window\.__EXAMS__ = /);
  assert.match(output, /뇌과학개론/);
  assert.doesNotMatch(output, /undefined/);
});
