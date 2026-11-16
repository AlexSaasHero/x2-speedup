// ═══ PRO CHECKOUT SWITCH ═══════════════════════════════════════════════════════════════
// false → every Pro button ([data-pro-cta]) says "Pro launching soon" and links to the Pro
//         features; lemon.js is not even loaded, so nothing can be bought.
// true  → the buttons become the Lemon Squeezy checkout (overlay) with their data-pro-label.
// On since 2026-11-16 (v1.9.0 live on the Chrome Web Store). See landing-page/CLAUDE.md.
const PRO_CHECKOUT_ENABLED = true;
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

// Pro checkout: off by default in the HTML ("Pro launching soon"), enabled here by the switch.
document.addEventListener('DOMContentLoaded', () => {
  if (!PRO_CHECKOUT_ENABLED) return;
  for (const el of document.querySelectorAll('[data-pro-cta]')) {
    el.href = PRO_CHECKOUT_URL;
    el.classList.add('lemonsqueezy-button');
    el.textContent = el.dataset.proLabel;
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
