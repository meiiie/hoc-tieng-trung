'use strict';
function micMeter(canvas, ring, clock) {
  const history = new Array(48).fill(0);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let level = 0, frame = 0, active = true, started = null;
  function draw() {
    if (!active || !canvas.isConnected) return;
    const ratio = devicePixelRatio || 1, width = canvas.clientWidth || 240, height = canvas.clientHeight || 44;
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {canvas.width = width * ratio; canvas.height = height * ratio;}
    const g = canvas.getContext('2d');
    g.setTransform(ratio, 0, 0, ratio, 0, 0); g.clearRect(0, 0, width, height);
    g.fillStyle = getComputedStyle(canvas).color;
    history.forEach((v, i) => {
      const h = Math.max(2, v * (height - 4)), step = width / history.length;
      g.fillRect(i * step + step * .2, (height - h) / 2, step * .6, h);
    });
    ring?.style.setProperty('--lv', reduced ? '0' : level.toFixed(3));
    if (clock && started !== null) clock.textContent = `${((performance.now() - started) / 1000).toFixed(1)} s`;
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  return {
    push(value) {
      if (started === null) started = performance.now();
      level = value;
      if (reduced) history.fill(value); else {history.push(value); history.shift();}
    },
    stop() {active = false; cancelAnimationFrame(frame); ring?.style.setProperty('--lv', '0');}
  };
}
