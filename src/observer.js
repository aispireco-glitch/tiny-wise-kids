/* Reveal observer — adds .is-visible when .reveal-up/.reveal-fade enters viewport */

export function initRevealObserver() {
  const targets = document.querySelectorAll('.reveal-up, .reveal-fade');
  if (!('IntersectionObserver' in window) || !targets.length) {
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  targets.forEach(el => observer.observe(el));
}
