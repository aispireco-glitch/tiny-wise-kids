/* FAQ — accessible single-open accordion */

export function initFaq() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const btn = item.querySelector('.faq-q');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.dataset.open === 'true';
      // Close all
      items.forEach(other => {
        other.dataset.open = 'false';
        other.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
      });
      // Open clicked if it was closed
      if (!isOpen) {
        item.dataset.open = 'true';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}
