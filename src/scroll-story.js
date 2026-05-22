/* ─────────────────────────────────────────────────────────────
   Scroll Storytelling
   GSAP ScrollTrigger for signature reveals (pillars, orbits,
   eyebrows, why-visual scrub). Stat counters live in
   stat-counters.js (pure RAF, more robust).
   ───────────────────────────────────────────────────────────── */

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initScrollStory() {
  // ── 1. Pillars — stagger-rise as the section enters view
  const pillars = gsap.utils.toArray('.pillar');
  if (pillars.length) {
    gsap.fromTo(
      pillars,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: '.pillars-section',
          start: 'top 70%'
        }
      }
    );
  }

  // ── 2. Facts orbits — scale-in with a touch of back ease
  const orbits = gsap.utils.toArray('.orbit');
  if (orbits.length) {
    gsap.fromTo(
      orbits,
      { scale: 0.85, opacity: 0 },
      {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        stagger: 0.12,
        ease: 'back.out(1.4)',
        scrollTrigger: {
          trigger: '.facts-orbits',
          start: 'top 75%'
        }
      }
    );
  }

  // ── 3. Why visual — age "7" subtly scales as user scrolls past
  ScrollTrigger.create({
    trigger: '.why-visual',
    start: 'top 80%',
    end: 'bottom top',
    scrub: 2,
    onUpdate: (self) => {
      const visual = document.querySelector('.why-visual');
      if (!visual) return;
      const ageNum = visual.querySelector('.age-number');
      if (ageNum) {
        ageNum.style.transform = `scale(${1 + self.progress * 0.05}) rotate(${self.progress * 4}deg)`;
      }
    }
  });

  // ── 4. Eyebrows slide in from the left
  const eyebrows = gsap.utils.toArray('.eyebrow');
  eyebrows.forEach((el) => {
    gsap.fromTo(
      el,
      { x: -16, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 90%'
        }
      }
    );
  });

  // Other reveals (tips, testi-cards, age-cards, faq-items, printables-box,
  // cta-box, statbar) use .reveal-up + IntersectionObserver — simpler, no
  // double-animation conflicts.
}

export function refreshScrollStory() {
  ScrollTrigger.refresh();
}
