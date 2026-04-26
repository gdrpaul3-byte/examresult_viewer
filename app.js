const SEOUL_LOCALE = 'ko-KR';
const SEOUL_TIMEZONE = 'Asia/Seoul';
const ADMIN_STORAGE_KEY = 'examViewer.adminUnlocked';
const ADMIN_PASSWORD = 'RR#890rr';

function isReleased(releaseAt, nowIso = new Date().toISOString()) {
  return new Date(nowIso).getTime() >= new Date(releaseAt).getTime();
}

function formatCountdownParts(releaseAt, nowIso = new Date().toISOString()) {
  const delta = Math.max(0, new Date(releaseAt).getTime() - new Date(nowIso).getTime());
  const hours = Math.floor(delta / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  const seconds = Math.floor((delta % 60_000) / 1_000);

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function normalizeExamLabel(exam) {
  return exam === 'final' ? '기말고사' : '중간고사';
}

function renderHomeState(exams) {
  if (!exams.length) {
    return '<section class="panel" data-label="// SUBJECTS"><p class="empty-state">표시 가능한 시험이 없습니다.</p></section>';
  }

  const subjects = groupBySubject(exams);

  return `
    <section class="panel" data-label="// SUBJECTS">
      <div class="panel-header">
        <p class="eyebrow">select_subject</p>
        <h2>시험 과목 목록</h2>
      </div>
      <div class="subject-grid">
        ${subjects
          .map(
            ({ subject, exams: subjectExams }) => `
              <button class="subject-card" type="button" data-subject="${escapeAttribute(subject)}">
                <span class="subject-name">${escapeHtml(subject)}</span>
                <span class="subject-count">${subjectExams.length}개 시험</span>
              </button>
            `
          )
          .join('')}
      </div>
    </section>
  `;
}

function isAdminUnlocked(storage = sessionStorage) {
  return readStorage(storage, ADMIN_STORAGE_KEY) === 'true';
}

function setAdminUnlocked(storage = sessionStorage, value) {
  writeStorage(storage, ADMIN_STORAGE_KEY, value ? 'true' : 'false');
}

function formatSeoulTime(now = new Date()) {
  return new Intl.DateTimeFormat(SEOUL_LOCALE, {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: SEOUL_TIMEZONE,
  }).format(now);
}

function renderExamCard(exam, { nowIso, adminUnlocked }) {
  const unlocked = adminUnlocked || isReleased(exam.releaseAt, nowIso);
  const stateLabel = unlocked ? '공개됨' : '잠김';
  const countdown = unlocked
    ? '<p class="exam-meta">access_granted :: 지금 입장 가능</p>'
    : `<p class="exam-meta">countdown :: ${formatCountdownParts(exam.releaseAt, nowIso)}</p>`;
  const action = unlocked
    ? `<button type="button" class="primary-button" data-action="open-exam" data-exam-id="${escapeAttribute(exam.id)}">./enter</button>`
    : `<button type="button" class="secondary-button" data-action="admin-open" data-exam-id="${escapeAttribute(exam.id)}">sudo open</button>`;

  const stateMark = unlocked ? '[ OK ]' : '[ LOCKED ]';
  return `
    <article class="exam-card ${unlocked ? 'exam-card-open' : 'exam-card-locked'}">
      <div class="exam-card-top">
        <p class="exam-state">${stateMark}</p>
        <p class="exam-label">${normalizeExamLabel(exam.exam)}</p>
      </div>
      <h3>${escapeHtml(exam.title)}</h3>
      <p class="exam-meta">release_at :: ${escapeHtml(exam.releaseAt)}</p>
      ${countdown}
      ${action}
    </article>
  `;
}

function renderExamDetail(exam, activeTab = 'answerKey') {
  const answerActive = activeTab === 'answerKey';
  const explanationActive = activeTab === 'explanations';

  return `
    <section class="panel detail-panel" data-label="// EXAM_DETAIL">
      <div class="panel-header">
        <p class="eyebrow">exam_detail</p>
        <h2>${escapeHtml(exam.title)}</h2>
        <p class="detail-meta">${escapeHtml(exam.subject ?? '')} :: ${normalizeExamLabel(exam.exam ?? 'midterm')}</p>
      </div>
      <div class="tab-row">
        <button type="button" class="tab-button ${answerActive ? 'tab-active' : ''}" data-tab="answerKey">cat answer_key</button>
        <button type="button" class="tab-button ${explanationActive ? 'tab-active' : ''}" data-tab="explanations">cat explanations</button>
      </div>
      <div class="detail-content">
        ${answerActive ? exam.answerKeyHtml : exam.explanationsHtml}
      </div>
    </section>
  `;
}

function groupBySubject(exams) {
  const map = new Map();

  for (const exam of exams) {
    if (!map.has(exam.subject)) {
      map.set(exam.subject, []);
    }
    map.get(exam.subject).push(exam);
  }

  return [...map.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], SEOUL_LOCALE))
    .map(([subject, subjectExams]) => ({
      subject,
      exams: subjectExams
        .slice()
        .sort((left, right) => (left.releaseAt ?? '').localeCompare(right.releaseAt ?? '')),
    }));
}

function renderExamList(subjectExams, state) {
  return `
    <section class="panel" data-label="// EXAM_LIST">
      <div class="panel-header">
        <p class="eyebrow">select_exam</p>
        <h2>${escapeHtml(state.selectedSubject)}</h2>
        <p class="panel-copy">공개 전 시험은 서울 시간 기준 카운트다운 후 자동으로 열립니다.</p>
      </div>
      <div class="exam-grid">
        ${subjectExams
          .map((exam) =>
            renderExamCard(exam, {
              nowIso: state.now.toISOString(),
              adminUnlocked: state.adminUnlocked,
            })
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderHeader(state) {
  return `
    <header class="hero">
      <div data-label="// MAIN_TERMINAL">
        <p class="eyebrow">exam_viewer</p>
        <h1>EXAM RESULT<br>TERMINAL</h1>
        <p class="hero-copy">과목을 선택하면 공개 시간이 지난 시험의 정답표와 문항별 해설을 확인할 수 있습니다.</p>
      </div>
      <div class="clock-card" data-label="// SYSTEM_CLOCK">
        <p class="clock-label">seoul / kst</p>
        <p class="clock-time">${escapeHtml(formatSeoulTime(state.now))}</p>
        <button type="button" class="${state.adminUnlocked ? 'secondary-button' : 'primary-button'}" data-action="toggle-admin">
          ${state.adminUnlocked ? 'logout admin' : 'sudo login'}
        </button>
      </div>
    </header>
  `;
}

function renderApp(state) {
  const subjectGroups = groupBySubject(state.exams);
  const selectedGroup =
    subjectGroups.find((group) => group.subject === state.selectedSubject) ?? null;
  const selectedExam =
    state.exams.find((exam) => exam.id === state.selectedExamId) ?? null;

  return `
    ${renderHeader(state)}
    <main class="app-grid">
      <aside class="app-column app-column-left">
        ${renderHomeState(state.exams)}
      </aside>
      <section class="app-column app-column-main">
        ${
          selectedExam
            ? renderExamDetail(selectedExam, state.activeTab)
            : selectedGroup
              ? renderExamList(selectedGroup.exams, state)
              : `
                <section class="panel placeholder-panel" data-label="// READY">
                  <p class="eyebrow">awaiting_input</p>
                  <h2>$ select subject<span class="cursor"></span></h2>
                  <p class="panel-copy">시험 과목 목록 탭에서 과목을 선택하면 해당 과목의 중간/기말 시험이 이 영역에 표시됩니다.</p>
                </section>
              `
        }
      </section>
    </main>
  `;
}

function boot() {
  const root = document.querySelector('[data-app-root]');
  if (!root) {
    return;
  }

  const exams = Array.isArray(window.__EXAMS__) ? window.__EXAMS__ : [];
  const state = {
    exams,
    selectedSubject: null,
    selectedExamId: null,
    activeTab: 'answerKey',
    adminUnlocked: isAdminUnlocked(window.sessionStorage),
    now: new Date(),
  };

  const render = () => {
    root.innerHTML = renderApp(state);
    bindEvents();
  };

  const bindEvents = () => {
    root.querySelectorAll('[data-subject]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedSubject = button.getAttribute('data-subject');
        state.selectedExamId = null;
        render();
      });
    });

    root.querySelectorAll('[data-action="open-exam"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.selectedExamId = button.getAttribute('data-exam-id');
        state.activeTab = 'answerKey';
        render();
      });
    });

    root.querySelectorAll('[data-action="admin-open"]').forEach((button) => {
      button.addEventListener('click', () => {
        promptAdminUnlock(state, render, button.getAttribute('data-exam-id'));
      });
    });

    root.querySelectorAll('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        state.activeTab = button.getAttribute('data-tab');
        render();
      });
    });

    root.querySelectorAll('[data-action="toggle-admin"]').forEach((button) => {
      button.addEventListener('click', () => {
        if (state.adminUnlocked) {
          setAdminUnlocked(window.sessionStorage, false);
          state.adminUnlocked = false;
          render();
          return;
        }

        promptAdminUnlock(state, render);
      });
    });
  };

  render();
  window.setInterval(() => {
    state.now = new Date();
    state.adminUnlocked = isAdminUnlocked(window.sessionStorage);
    render();
  }, 1000);
}

function promptAdminUnlock(state, render, examId = null) {
  const password = window.prompt('관리자 비밀번호를 입력하세요.');

  if (password === null) {
    return;
  }

  if (password !== ADMIN_PASSWORD) {
    window.alert('관리자 비밀번호가 올바르지 않습니다.');
    return;
  }

  setAdminUnlocked(window.sessionStorage, true);
  state.adminUnlocked = true;
  if (examId) {
    state.selectedExamId = examId;
    state.activeTab = 'answerKey';
  }
  render();
}

function readStorage(storage, key) {
  if (typeof storage?.getItem === 'function') {
    return storage.getItem(key);
  }

  if (typeof storage?.get === 'function') {
    return storage.get(key) ?? null;
  }

  return null;
}

function writeStorage(storage, key, value) {
  if (typeof storage?.setItem === 'function') {
    storage.setItem(key, value);
    return;
  }

  if (typeof storage?.set === 'function') {
    storage.set(key, value);
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttribute(text) {
  return escapeHtml(text).replace(/"/g, '&quot;');
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', boot);
}

globalThis.ExamViewerApp = {
  isReleased,
  formatCountdownParts,
  normalizeExamLabel,
  renderHomeState,
  isAdminUnlocked,
  setAdminUnlocked,
  formatSeoulTime,
  renderExamCard,
  renderExamDetail,
};
