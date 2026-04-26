/* EXAM_VIEWER :: matrix terminal theme — boot animation + matrix rain */
(function () {
  // ── BOOT SEQUENCE ──
  const boot = document.getElementById('boot');
  if (boot) {
    const lines = boot.querySelectorAll('.boot-line');
    let delay = 100;
    lines.forEach((line, i) => {
      setTimeout(() => line.classList.add('show'), delay);
      delay += i === lines.length - 1 ? 200 : 200 + Math.random() * 120;
    });
    setTimeout(() => {
      boot.classList.add('gone');
      setTimeout(() => boot.remove(), 700);
      const c = document.getElementById('matrix-canvas');
      if (c) {
        c.classList.add('show');
        setTimeout(() => { c.style.opacity = '0'; }, 3200);
      }
    }, delay + 400);
  }

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
  setTimeout(() => clearInterval(interval), 5500);
})();
