/* ─────────────────────────────────────────────────────────────
   /get-printable — lead capture + secure PDF delivery
   Flow:
     1. User fills form
     2. POST to Supabase Edge Function `download-printable`
     3. Function validates (regex + disposable blocklist + MX record),
        inserts the lead, returns a signed URL (10 min)
     4. Frontend shows success screen with that signed URL
   PDFs live in a PRIVATE Supabase Storage bucket. The signed URL is
   the only way to access them, and it expires after 10 minutes.
   ───────────────────────────────────────────────────────────── */

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/motion.css';
import './styles/form.css';

import { initNav } from './nav.js';

/* ──────────────── Supabase config ──────────────── */

const SUPABASE = {
  url:            'https://dnabxqumfivvamvrjzmh.supabase.co',
  publishableKey: 'sb_publishable_nPVlH-bcOcv-R6TI0ccyLw_naB0sJBc',
  functionName:   'download-printable'
};

/* ──────────────── Printable catalog (frontend display only) ──────────────── */

const PRINTABLES = {
  'needs-vs-wants': {
    title:   'Needs vs. Wants Workbook',
    icon:    '📄',
    desc:    'A printable PDF for kids ages 4 to 8. Color, cut, sort, and play your way through one of the most important money concepts kids will ever learn.',
    includes: [
      'Color-cut-sort card game',
      'Spinner wheel activity',
      'Family piggy bank board game',
      'Progress checklist + reward badge'
    ]
  },
  'savings-jar': {
    title:   'My Big Saving Goal',
    icon:    '🏦',
    desc:    'A printable saving system for kids ages 4 to 8. Teach goal-setting with a fun spend, save, and share framework and a tracker that grows with your child.',
    includes: [
      'Spend / Save / Share chart',
      'Goal-setting worksheet',
      'Progress sticker tracker',
      'Family conversation prompts'
    ]
  }
};

const DEFAULT_SLUG = 'needs-vs-wants';
const AUTO_DOWNLOAD_DELAY_SECONDS = 3;

/* ──────────────── Page customization ──────────────── */

function customizePageFromSlug() {
  const params  = new URLSearchParams(window.location.search);
  const rawSlug = params.get('slug') || '';
  const slug    = Object.prototype.hasOwnProperty.call(PRINTABLES, rawSlug)
    ? rawSlug
    : DEFAULT_SLUG;
  const product = PRINTABLES[slug];

  document.getElementById('page-title').textContent =
    `Get the ${product.title}, Free, Tiny Wise Kids`;
  document.getElementById('form-product-title').textContent = product.title;
  document.getElementById('form-product-desc').textContent  = product.desc;
  document.getElementById('form-cover-icon').textContent    = product.icon;
  document.getElementById('field-printable').value          = slug;

  const ul = document.getElementById('form-includes');
  ul.innerHTML = '';
  product.includes.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    ul.appendChild(li);
  });

  if (rawSlug && rawSlug !== slug) {
    window.history.replaceState({}, '', `${window.location.pathname}?slug=${slug}`);
  }

  return { slug, product };
}

/* ──────────────── Strict client-side validation ──────────────── */

// Same regex used server-side; catches typos immediately
const STRICT_EMAIL_RE =
  /^[a-z0-9._%+\-]+@[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/i;

const validators = {
  email: (v) => {
    if (!v) return 'Please add your email.';
    if (v.length > 200) return 'That email is too long.';
    return STRICT_EMAIL_RE.test(v) ? '' : 'That email doesn\'t look right. Use the format name@example.com.';
  },
  firstName: (v) => {
    if (!v || v.trim().length < 2) return 'Please add your first name.';
    if (v.trim().length > 60) return 'Name is too long.';
    return '';
  },
  childAge: (v) => v ? '' : 'Pick the age range that fits best.',
  role:     (v) => v ? '' : 'Tell us which role applies to you.',
  country:  (v) => v ? '' : 'Pick your country.'
};

function showError(name, msg) {
  const el = document.querySelector(`.field-error[data-for="${name}"]`);
  if (el) el.textContent = msg;
  const input = document.querySelector(`[name="${name}"]`);
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach((e) => (e.textContent = ''));
  document.querySelectorAll('[aria-invalid="true"]').forEach((e) => e.removeAttribute('aria-invalid'));
}

function validateForm(formData) {
  let firstInvalid = null;
  Object.entries(validators).forEach(([key, fn]) => {
    const msg = fn(formData.get(key));
    showError(key, msg);
    if (msg && !firstInvalid) firstInvalid = key;
  });
  if (firstInvalid) {
    const el = document.querySelector(`[name="${firstInvalid}"]`);
    if (el?.focus) el.focus();
  }
  return !firstInvalid;
}

/* ──────────────── Edge Function call ──────────────── */

async function requestSignedDownload(payload) {
  const url = `${SUPABASE.url}/functions/v1/${SUPABASE.functionName}`;
  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE.publishableKey,
      'Authorization': `Bearer ${SUPABASE.publishableKey}`
    },
    body: JSON.stringify(payload)
  });

  // Always try to parse the JSON body — function returns { error, message } or { url, filename }
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    const message = data?.message || `Server error (${res.status}). Please try again.`;
    const code    = data?.error   || 'http_error';
    throw Object.assign(new Error(message), { code, status: res.status, data });
  }

  if (!data?.url) {
    throw new Error('Server did not return a download URL.');
  }

  return data; // { url, filename, expiresInSeconds }
}

/* ──────────────── Success state + download ──────────────── */

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || '';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function showSuccessState({ product, downloadUrl, filename }) {
  const form    = document.getElementById('lead-form');
  const success = document.getElementById('form-success');
  const dlBtn   = document.getElementById('success-download');
  const dlName  = document.getElementById('download-filename');
  const pname   = document.getElementById('success-product');
  const cd      = document.getElementById('success-countdown');

  pname.textContent  = product.title;
  dlName.textContent = filename;
  dlBtn.setAttribute('href', downloadUrl);
  dlBtn.setAttribute('download', filename);

  form.hidden    = true;
  success.hidden = false;

  // Auto-download countdown (gives time to read; browsers may block silent downloads)
  let remaining = AUTO_DOWNLOAD_DELAY_SECONDS;
  cd.textContent = remaining;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tick = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(tick);
      cd.textContent = '0';
      triggerDownload(downloadUrl, filename);
    } else {
      cd.textContent = remaining;
    }
  }, reduceMotion ? 1500 : 1000);

  dlBtn.addEventListener('click', () => clearInterval(tick), { once: true });

  if (typeof window.gtag === 'function') {
    window.gtag('event', 'lead_capture', {
      event_category: 'printable',
      event_label:    product.title
    });
  }
}

function showErrorState(message) {
  const errorEl = document.getElementById('form-error');
  const errorP  = errorEl.querySelector('p');
  if (errorP && message) {
    // Replace the first text node with the friendly message, but keep the link
    const retryHtml = ' <button type="button" id="form-retry" class="form-error-retry">Try again</button> or email us at <a href="mailto:hello@tinywisekids.com">hello@tinywisekids.com</a>.';
    errorP.innerHTML = `${escapeHtml(message)}${retryHtml}`;
    document.getElementById('form-retry')?.addEventListener('click', () => (errorEl.hidden = true));
  }
  errorEl.hidden = false;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ──────────────── Wire everything ──────────────── */

function init() {
  initNav();

  const { product } = customizePageFromSlug();

  const form    = document.getElementById('lead-form');
  const submit  = document.getElementById('form-submit');
  const errorEl = document.getElementById('form-error');

  if (!form) return;

  // Live re-validation on blur
  form.querySelectorAll('input, select').forEach((el) => {
    el.addEventListener('blur', () => {
      const name = el.name;
      const v = (el.type === 'radio')
        ? form.querySelector(`[name="${name}"]:checked`)?.value
        : el.value;
      if (validators[name]) showError(name, validators[name](v));
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();
    errorEl.hidden = true;

    const fd = new FormData(form);
    if (!validateForm(fd)) return;

    const submittedSlug = fd.get('printable');
    const safeSlug = Object.prototype.hasOwnProperty.call(PRINTABLES, submittedSlug)
      ? submittedSlug
      : DEFAULT_SLUG;

    const payload = {
      email:          fd.get('email').trim().toLowerCase(),
      firstName:      fd.get('firstName').trim(),
      childAge:       fd.get('childAge'),
      role:           fd.get('role'),
      country:        fd.get('country'),
      printable:      safeSlug,
      marketingOptIn: fd.get('marketingOptIn') === 'yes',
      userAgent:      (navigator.userAgent || '').slice(0, 500),
      referrer:       (document.referrer || '').slice(0, 500)
    };

    submit.dataset.loading = 'true';
    try {
      const data = await requestSignedDownload(payload);
      submit.dataset.loading = 'false';
      showSuccessState({
        product:     PRINTABLES[safeSlug],
        downloadUrl: data.url,
        filename:    data.filename
      });
    } catch (err) {
      console.error('Download flow failed:', err);
      submit.dataset.loading = 'false';

      // If the error came from server validation, pin it to the specific field
      const fieldMap = {
        invalid_email_format:  'email',
        disposable_email:      'email',
        unreachable_domain:    'email',
        invalid_name:          'firstName',
        invalid_child_age:     'childAge',
        invalid_role:          'role',
        invalid_country:       'country',
        invalid_printable:     null
      };
      const field = fieldMap[err.code];
      if (field) {
        showError(field, err.message);
        document.querySelector(`[name="${field}"]`)?.focus();
      } else {
        showErrorState(err.message || 'Something went wrong. Please try again.');
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
