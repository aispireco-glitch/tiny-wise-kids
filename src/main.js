/* ─────────────────────────────────────────────────────────────
   TinyWiseKids v3 — entry point
   ───────────────────────────────────────────────────────────── */

// Styles
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/motion.css';

import { initLenis }           from './lenis-setup.js';
import { initNav }             from './nav.js';
import { initFaq }             from './faq.js';
import { initRevealObserver }  from './observer.js';
import { initHeroFloating }    from './hero/floating.js';
import { initScrollStory, refreshScrollStory } from './scroll-story.js';
import { initStatCounters }    from './stat-counters.js';

const boot = () => {
  initLenis();
  initNav();
  initFaq();
  initRevealObserver();
  initStatCounters();
  initHeroFloating();
  initScrollStory();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => refreshScrollStory());
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
