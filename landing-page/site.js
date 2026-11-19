// ═══ PRO CHECKOUT SWITCH ═══════════════════════════════════════════════════════════════
// The HTML ships every Pro button ([data-pro-cta]) with its real label and href="#pricing",
// so crawlers, link previews and no-JS visitors never see a stale "launching soon".
// false → the buttons say PRO_SOON_LABEL and keep linking to #pricing; lemon.js is not
//         even loaded, so nothing can be bought.
// true  → the buttons become the Lemon Squeezy checkout (overlay). An optional
//         data-pro-label replaces their text (the guides use it: "See Pro" → trial label).
// On since 2026-11-16 (v1.9.0 live on the Chrome Web Store). See landing-page/CLAUDE.md.
const PRO_CHECKOUT_ENABLED = true;
const PRO_SOON_LABEL = 'Pro launching soon';
const PRO_CHECKOUT_URL = 'https://speedup-videopro.lemonsqueezy.com/checkout/buy/69ea0406-3835-48e7-b03c-301a23d775cf?embed=1';

// ════════════════════════════════════════════════════════════════════════════════════════

// Shared script for the landing pages. Loaded in <head> WITHOUT defer, so the mobile class
// is set before the first paint (no flash of the desktop CTA on phones).

// Phones and tablets can't install Chrome extensions: site.css swaps the CTAs on html.mobile-ua.
if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
  document.documentElement.classList.add('mobile-ua');
}

/** Copies text to the clipboard; falls back to a hidden textarea where the async API is missing. */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

// "Copy link" buttons: <button data-copy-link>. Copies this page's URL (without #hash).
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy-link]');
  if (!button) return;
  const url = location.origin + location.pathname;
  const original = button.dataset.label || button.textContent;
  button.dataset.label = original;
  button.textContent = (await copyText(url)) ? 'Link copied ✓' : url;
  setTimeout(() => { button.textContent = original; }, 2500);
});

// Pro checkout: the HTML has the real labels; the switch decides what the buttons do.
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('[data-pro-cta]');
  if (!PRO_CHECKOUT_ENABLED) {
    for (const el of buttons) el.textContent = PRO_SOON_LABEL;
    return;
  }
  for (const el of buttons) {
    el.href = PRO_CHECKOUT_URL;
    el.classList.add('lemonsqueezy-button');
    if (el.dataset.proLabel) el.textContent = el.dataset.proLabel;
  }
  const lemon = document.createElement('script');
  lemon.src = 'https://assets.lemonsqueezy.com/lemon.js';
  lemon.onload = () => {
    window.createLemonSqueezy?.(); // bind the buttons converted above
    // After a successful checkout, show the activation steps (license key, install, paste in the popup).
    window.LemonSqueezy?.Setup({
      eventHandler: (event) => {
        if (event.event === 'Checkout.Success') window.location.href = '/thanks.html';
      }
    });
  };
  document.head.appendChild(lemon);
});
