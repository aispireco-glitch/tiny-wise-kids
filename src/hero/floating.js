/* ─────────────────────────────────────────────────────────────
   Hero floating PNGs
   Mouse parallax (depth-weighted) + idle sin/cos drift.
   Replaces the Three.js scene with a lightweight 2D system.
   ───────────────────────────────────────────────────────────── */

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHeroFloating() {
  const stage = document.getElementById('hero-stage');
  if (!stage) return;

  const items = Array.from(stage.querySelectorAll('.hero-float'));
  if (!items.length) return;

  // Each item stores its parsed config + current/target offsets
  const state = items.map((el) => {
    const depth     = parseFloat(el.dataset.depth)  || 0.6;
    const phase     = parseFloat(el.dataset.phase)  || 0;
    const freq      = parseFloat(el.dataset.freq)   || 1;
    const driftAmt  = parseFloat(el.dataset.drift)  || 14;  // px
    const baseRot   = parseFloat(el.dataset.rot)    || 0;   // deg
    return {
      el,
      depth,
      phase,
      freq,
      driftAmt,
      baseRot,
      // current rendered
      px: 0, py: 0, rot: baseRot,
      // mouse-driven target
      mx: 0, my: 0
    };
  });

  // Mouse tracking — normalized [-1, 1] relative to stage center
  const mouse = { tx: 0, ty: 0, x: 0, y: 0 };

  const onPointerMove = (e) => {
    const r = stage.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    mouse.ty = ((e.clientY - r.top)  / r.height - 0.5) * 2;
  };
  const onPointerLeave = () => { mouse.tx = 0; mouse.ty = 0; };
  stage.addEventListener('pointermove',  onPointerMove,  { passive: true });
  stage.addEventListener('pointerleave', onPointerLeave, { passive: true });

  // Reveal the stage once first frame has computed
  requestAnimationFrame(() => {
    stage.removeAttribute('data-loading');
    document.getElementById('hero')?.classList.add('is-loaded');
  });

  let raf, t0;
  const tick = (t) => {
    if (!t0) t0 = t;
    const time = (t - t0) / 1000;

    // Smooth mouse
    mouse.x += (mouse.tx - mouse.x) * 0.07;
    mouse.y += (mouse.ty - mouse.y) * 0.07;

    state.forEach((s, i) => {
      // Idle drift (each item has own phase + frequency so movement looks organic)
      // Use slightly different X vs Y axes so motion is an ellipse, not a straight line
      const driftX = REDUCE_MOTION ? 0 : Math.sin(time * 0.55 * s.freq + s.phase)           * s.driftAmt;
      const driftY = REDUCE_MOTION ? 0 : Math.cos(time * 0.42 * s.freq + s.phase * 1.3)     * s.driftAmt * 0.9;

      // Parallax — bumped multipliers so depth difference between items is felt
      const parX = mouse.x * s.depth * 32;
      const parY = mouse.y * s.depth * 22;

      // Gentle rotation tied to time for liveliness (4° amplitude)
      const rot = s.baseRot + (REDUCE_MOTION ? 0 : Math.sin(time * 0.4 * s.freq + s.phase) * 4);

      const x = driftX + parX;
      const y = driftY + parY;

      // Use transform — composited, GPU-accelerated
      s.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg)`;
    });

    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);

  // Clean up on page hide (saves battery on mobile)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      t0 = null;
      raf = requestAnimationFrame(tick);
    }
  });
}
