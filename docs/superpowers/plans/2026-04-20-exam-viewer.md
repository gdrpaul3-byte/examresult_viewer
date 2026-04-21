# Exam Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static exam-answer viewer that groups exams by subject, locks access until a Seoul release time, and allows session-scoped admin override.

**Architecture:** Use a build step that converts Markdown source files with YAML front matter into a precomputed `data/exams.js` bundle for a static `index.html` viewer. Keep runtime logic limited to rendering, release-time gating, countdown clocks, tab switching, and admin session override so the site works both from `file://` and static hosting.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js build/test scripts, Markdown-to-HTML conversion in the generator, browser `sessionStorage`

---

## File Structure

- Create: `scripts/build-exams.mjs`
  Generates `data/exams.js` from all Markdown exam sources.
- Create: `scripts/lib/exam-parser.mjs`
  Shared parsing logic for front matter, section extraction, and data shaping.
- Create: `data/exams.js`
  Generated static data file consumed by the browser.
- Create: `index.html`
  Single-page shell for the viewer UI.
- Create: `app.js`
  Client-side state, rendering, release gating, countdown, and admin unlock flow.
- Create: `styles.css`
  Layout, cards, tabs, clock, lock states, and responsive styling.
- Create: `tests/exam-parser.test.mjs`
  Node tests for generator parsing and validation behavior.
- Create: `tests/app.test.mjs`
  Node tests for runtime release-state and countdown formatting helpers.
- Modify: `2026_뇌과학개론_중간고사_검토_정답_해설.md`
  Add YAML front matter that matches the agreed schema.

## Assumptions

- The existing Markdown file remains in the project root for now. If more files are added later, the generator will scan the root for `*.md`.
- `exam` values are normalized to `midterm` and `final`.
- The generator emits a JS assignment such as `window.__EXAMS__ = [...]` so `index.html` can be opened directly via double-click without fetch/XHR.
- Commit steps are omitted because this workspace is not currently a Git repository.

### Task 1: Add a regression test for Markdown parsing

**Files:**
- Create: `tests/exam-parser.test.mjs`
- Modify: `2026_뇌과학개론_중간고사_검토_정답_해설.md`

- [ ] **Step 1: Write the failing test**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseExamMarkdown } from '../scripts/lib/exam-parser.mjs';
import { readFileSync } from 'node:fs';

test('parseExamMarkdown extracts metadata and split sections', () => {
  const source = readFileSync(
    '2026_뇌과학개론_중간고사_검토_정답_해설.md',
    'utf8'
  );

  const exam = parseExamMarkdown(source, '2026_뇌과학개론_중간고사_검토_정답_해설.md');

  assert.equal(exam.subject, '뇌과학개론');
  assert.equal(exam.exam, 'midterm');
  assert.match(exam.answerKeyHtml, /table/i);
  assert.match(exam.explanationsHtml, /1번/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/exam-parser.test.mjs`

Expected: FAIL because `../scripts/lib/exam-parser.mjs` does not exist yet and/or the Markdown file does not yet have required front matter.

- [ ] **Step 3: Add front matter to the existing Markdown source**

```md
---
title: "2026학년도 1학기 뇌과학개론 중간고사 정답 및 해설"
subject: "뇌과학개론"
exam: "midterm"
releaseAt: "2026-04-21T09:00:00+09:00"
timezone: "Asia/Seoul"
year: 2026
term: "1학기"
---
```

- [ ] **Step 4: Re-run the test**

Run: `node --test tests/exam-parser.test.mjs`

Expected: FAIL, now specifically because the parser is still missing.

### Task 2: Implement the parser library with validation

**Files:**
- Create: `scripts/lib/exam-parser.mjs`
- Modify: `tests/exam-parser.test.mjs`

- [ ] **Step 1: Extend the failing test to cover invalid metadata**

```javascript
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

  assert.throws(
    () => parseExamMarkdown(source, 'broken.md'),
    /releaseAt/
  );
});
```

- [ ] **Step 2: Run tests to verify they fail for the expected reason**

Run: `node --test tests/exam-parser.test.mjs`

Expected: FAIL because `parseExamMarkdown` is undefined or incomplete.

- [ ] **Step 3: Write minimal parser implementation**

```javascript
export function parseExamMarkdown(source, filename) {
  const { data, body } = splitFrontMatter(source, filename);
  validateMetadata(data, filename);
  const sections = splitSections(body);

  return {
    id: createId(data, filename),
    title: data.title,
    subject: data.subject,
    exam: data.exam,
    releaseAt: data.releaseAt,
    timezone: data.timezone ?? 'Asia/Seoul',
    year: data.year ?? null,
    term: data.term ?? null,
    answerKeyHtml: markdownToHtml(sections.answerKey),
    explanationsHtml: markdownToHtml(sections.explanations),
    summaryHtml: sections.summary ? markdownToHtml(sections.summary) : ''
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/exam-parser.test.mjs`

Expected: PASS

- [ ] **Step 5: Refactor parser helpers without changing behavior**

Target helpers:

- `splitFrontMatter`
- `parseSimpleYaml`
- `splitSections`
- `markdownToHtml`
- `createId`

- [ ] **Step 6: Re-run parser tests**

Run: `node --test tests/exam-parser.test.mjs`

Expected: PASS

### Task 3: Add a build test for generated browser data

**Files:**
- Modify: `tests/exam-parser.test.mjs`
- Create: `scripts/build-exams.mjs`

- [ ] **Step 1: Write the failing build test**

```javascript
import { buildExamDataset } from '../scripts/build-exams.mjs';

test('buildExamDataset emits browser-safe JS payload', async () => {
  const output = await buildExamDataset({
    cwd: process.cwd(),
    pattern: /\.md$/i
  });

  assert.match(output, /window\.__EXAMS__ = /);
  assert.match(output, /뇌과학개론/);
  assert.doesNotMatch(output, /undefined/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/exam-parser.test.mjs`

Expected: FAIL because `buildExamDataset` does not exist yet.

- [ ] **Step 3: Implement the generator entry point**

```javascript
export async function buildExamDataset({ cwd, pattern }) {
  const files = await readdir(cwd);
  const exams = [];

  for (const file of files.filter((name) => pattern.test(name))) {
    const source = await readFile(join(cwd, file), 'utf8');
    exams.push(parseExamMarkdown(source, file));
  }

  return `window.__EXAMS__ = ${JSON.stringify(exams, null, 2)};\n`;
}
```

- [ ] **Step 4: Add CLI output behavior**

CLI target:

- Ensure `data/` exists
- Write `data/exams.js`
- Print count of generated exams

- [ ] **Step 5: Re-run parser/build tests**

Run: `node --test tests/exam-parser.test.mjs`

Expected: PASS

### Task 4: Add runtime tests for release gating and countdown formatting

**Files:**
- Create: `tests/app.test.mjs`
- Create: `app.js`

- [ ] **Step 1: Write the failing runtime helper tests**

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isReleased,
  formatCountdownParts,
  normalizeExamLabel
} from '../app.js';

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/app.test.mjs`

Expected: FAIL because `app.js` does not yet export these helpers.

- [ ] **Step 3: Implement helper functions in `app.js`**

```javascript
export function isReleased(releaseAt, nowIso) {
  return new Date(nowIso).getTime() >= new Date(releaseAt).getTime();
}

export function formatCountdownParts(releaseAt, nowIso) {
  const delta = Math.max(0, new Date(releaseAt).getTime() - new Date(nowIso).getTime());
  const hours = Math.floor(delta / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  const seconds = Math.floor((delta % 60_000) / 1_000);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export function normalizeExamLabel(exam) {
  return exam === 'final' ? '기말고사' : '중간고사';
}
```

- [ ] **Step 4: Re-run runtime helper tests**

Run: `node --test tests/app.test.mjs`

Expected: PASS

### Task 5: Build the static HTML shell and rendering flow

**Files:**
- Create: `index.html`
- Modify: `app.js`
- Create: `styles.css`

- [ ] **Step 1: Write a failing rendering test around the empty state**

Add to `tests/app.test.mjs`:

```javascript
import { renderHomeState } from '../app.js';

test('renderHomeState shows empty message when no exams exist', () => {
  const html = renderHomeState([]);
  assert.match(html, /표시 가능한 시험이 없습니다/);
});
```

- [ ] **Step 2: Run runtime tests to verify failure**

Run: `node --test tests/app.test.mjs`

Expected: FAIL because `renderHomeState` does not exist yet.

- [ ] **Step 3: Implement minimal rendering primitives**

Minimum browser structure:

- Subject list panel
- Exam card panel
- Detail panel with `정답표` / `문항별 해설` tabs
- Clock panel
- Admin unlock button/modal container

- [ ] **Step 4: Implement `renderHomeState` and main boot sequence**

Boot sequence:

- Read `window.__EXAMS__`
- Group by subject
- Render subject cards
- Bind click handlers

- [ ] **Step 5: Re-run runtime tests**

Run: `node --test tests/app.test.mjs`

Expected: PASS

### Task 6: Implement lock UI, Seoul clock, and admin session override

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Modify: `tests/app.test.mjs`

- [ ] **Step 1: Write failing tests for admin session state and locked-card rendering**

```javascript
import {
  isAdminUnlocked,
  setAdminUnlocked,
  renderExamCard
} from '../app.js';

test('admin unlock persists through session storage adapter', () => {
  const storage = new Map();
  setAdminUnlocked(storage, true);
  assert.equal(isAdminUnlocked(storage), true);
});

test('renderExamCard shows countdown when exam is locked', () => {
  const html = renderExamCard({
    title: '테스트',
    exam: 'midterm',
    releaseAt: '2026-04-21T09:00:00+09:00'
  }, {
    nowIso: '2026-04-21T08:00:00+09:00',
    adminUnlocked: false
  });

  assert.match(html, /잠김/);
  assert.match(html, /남은 시간/);
});
```

- [ ] **Step 2: Run runtime tests to verify failure**

Run: `node --test tests/app.test.mjs`

Expected: FAIL because the new helpers do not exist yet.

- [ ] **Step 3: Implement session-state and locked-card rendering**

Key behaviors:

- Store admin flag under a fixed key such as `examViewer.adminUnlocked`
- Accept the exact password `RR#890rr`
- Show current Seoul time
- Show release time
- Show countdown
- Unlock all exams after successful admin authentication

- [ ] **Step 4: Re-run runtime tests**

Run: `node --test tests/app.test.mjs`

Expected: PASS

### Task 7: Generate production data and verify the full flow

**Files:**
- Modify: `scripts/build-exams.mjs`
- Modify: `data/exams.js`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Run the generator to create real browser data**

Run: `node scripts/build-exams.mjs`

Expected: `data/exams.js` created with 1 exam record

- [ ] **Step 2: Run the full test suite**

Run: `node --test tests/*.test.mjs`

Expected: PASS with all tests green

- [ ] **Step 3: Perform a manual smoke check**

Manual checklist:

- Open `index.html` by double-click or equivalent local browser open
- Confirm subject list displays
- Confirm midterm card displays
- Confirm lock state reflects current Seoul time
- Confirm admin password unlocks access for the tab session
- Confirm `정답표` and `문항별 해설` tabs switch correctly

- [ ] **Step 4: Document the update workflow in the UI or a short README block**

Minimum operator note:

- Add or update Markdown file
- Run `node scripts/build-exams.mjs`
- Open `index.html` or deploy static files

- [ ] **Step 5: Re-run the verification commands before claiming completion**

Run:

- `node scripts/build-exams.mjs`
- `node --test tests/*.test.mjs`

Expected: both commands exit successfully
