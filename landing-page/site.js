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
