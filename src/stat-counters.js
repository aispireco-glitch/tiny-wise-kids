/* ─────────────────────────────────────────────────────────────
   Stat counters
   Pure IntersectionObserver + requestAnimationFrame tween.
   No GSAP dependency, no ScrollTrigger races with reveal-up.
   ───────────────────────────────────────────────────────────── */

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const duration = 1600;

  if (Number.isNaN(target)) return;

  if (REDUCE_MOTION) {
    el.textContent = target + suffix;
    return;
  }

  const start = performance.now();
  const step = (now) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const v = target * easeOutCubic(t);
    // Integer counters for clean readability
    el.textContent = Math.round(v) + suffix;
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  };
  requestAnimationFrame(step);
}

export function initStatCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;

  if (!('IntersectionObserver' in window)) {
    els.forEach(animateCount);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.35, rootMargin: '0px 0px -8% 0px' }
  );

  els.forEach((el) => observer.observe(el));
}
