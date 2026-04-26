/* EXAM_VIEWER :: matrix terminal theme — boot animation + matrix rain */
(function () {
  // ── BOOT SEQUENCE (organic typewriter) ──
  const stack = document.getElementById('boot-stack');
  const boot = document.getElementById('boot');

  const SCRIPT = [
    { t: 'EXAM_VIEWER :: 부팅 시퀀스 v1.0.4', cls: 'green' },
    { t: '[*] hsmu.ac.kr 서버 연결 중 ...', cls: '', tail: ' 성공', tailCls: 'ok' },
    { t: '[*] 방화벽 우회 (port 443) ...', cls: '', tail: ' 통과', tailCls: 'ok' },
    { t: '[!] examresult_viewer 해킹 시도 ...', cls: 'amber' },
    { t: '    > 페이로드 주입 .', cls: '', dots: 3 },
    { t: '[*] 시험 DB 로딩 ...', cls: '', tail: ' 완료', tailCls: 'ok' },
    { t: '[*] answer_key.bin 복호화 ...', cls: '', tail: ' 완료', tailCls: 'ok' },
    { t: '[!] root 권한 획득. 들키지 마세요.', cls: 'amber' },
    { t: '접속 허가 :: 터미널 온라인', cls: 'green' },
  ];

  function makeLine(cls) {
    const el = document.createElement('div');
    el.className = 'boot-line show' + (cls ? ' ' + cls : '');
    stack.appendChild(el);
    return el;
  }

  // organic per-char delay: faster on common letters, slower on space/punctuation,
  // occasional micro-stutter so it doesn't feel mechanical.
  function charDelay(ch, prev) {
    const base = 8 + Math.random() * 14;          // 8-22ms baseline (faster)
    const slow = (ch === ' ' || ch === '.' || ch === ',' || ch === ':') ? 18 : 0;
    const stutter = Math.random() < 0.03 ? 60 + Math.random() * 60 : 0;
    const burst = Math.random() < 0.22 ? -6 : 0;
    return Math.max(4, base + slow + stutter + burst);
  }

  async function typeText(el, text) {
    let prev = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      el.appendChild(document.createTextNode(ch));
      prev = ch;
      await sleep(charDelay(ch, prev));
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function runBoot() {
    if (!stack || !boot) return;

    // initial pause then start
    await sleep(120);

    for (let i = 0; i < SCRIPT.length; i++) {
      const item = SCRIPT[i];
      const line = makeLine(item.cls);

      // attach a temporary live cursor at the end while typing
      const cursorEl = document.createElement('span');
      cursorEl.className = 'boot-cursor';
      cursorEl.textContent = '▋';
      line.appendChild(cursorEl);

      await typeText({ appendChild: (n) => line.insertBefore(n, cursorEl) }, item.t);

      // animated trailing dots
      if (item.dots) {
        for (let d = 0; d < item.dots; d++) {
          await sleep(140 + Math.random() * 80);
          line.insertBefore(document.createTextNode(' .'), cursorEl);
        }
      }

      // tail badge (e.g. " OK")
      if (item.tail) {
        await sleep(60 + Math.random() * 90);
        const tail = document.createElement('span');
        tail.className = item.tailCls || '';
        tail.textContent = item.tail;
        line.insertBefore(tail, cursorEl);
      }

      // remove the live cursor (next line will get its own)
      cursorEl.remove();

      // inter-line pause — longer after dramatic lines
      const pause = (item.cls === 'amber' ? 160 : 40) + Math.random() * 80;
      await sleep(pause);
    }

    // progress bar finale
    const barLine = makeLine('');
    barLine.style.marginTop = '10px';
    const wrap = document.createElement('div');
    wrap.className = 'progress-bar-wrap';
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    wrap.appendChild(bar);
    barLine.appendChild(wrap);

    await sleep(900);

    boot.classList.add('gone');
    setTimeout(() => boot.remove(), 700);
    const c = document.getElementById('matrix-canvas');
    if (c) {
      c.classList.add('show');
      setTimeout(() => { c.style.opacity = '0'; }, 3200);
    }
  }

  runBoot();

  // ── MATRIX RAIN ──
  const canvas = document.getElementById('matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()αβγδεζηθλμπστφψω가나다라마바사아자차카타파하';
  const fontSize = 13;
  let cols = Math.floor(canvas.width / fontSize);
  let drops = Array(cols).fill(1);

  function draw() {
    ctx.fillStyle = 'rgba(2,11,2,0.06)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = fontSize + 'px Share Tech Mono, monospace';
    cols = Math.floor(canvas.width / fontSize);
    if (drops.length < cols) drops = drops.concat(Array(cols - drops.length).fill(1));
    for (let i = 0; i < cols; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillStyle = i % 4 === 0 ? '#00ff41' : '#00bb30';
      ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  const interval = setInterval(draw, 45);
  setTimeout(() => clearInterval(interval), 6000);
})();
