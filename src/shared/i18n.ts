// i18n: thin wrapper over chrome.i18n. Locale sources live in src/_locales/<lang>.json and are
// compiled to _locales/<lang>/messages.json by scripts/build.mjs ({1} → $1 placeholders).

type Subs = string | number | (string | number)[];

export function t(key: string, subs?: Subs): string {
  const list = subs === undefined ? undefined : (Array.isArray(subs) ? subs : [subs]).map(String);
  let msg = '';
  try {
    msg = globalThis.chrome?.i18n?.getMessage(key, list) ?? '';
  } catch {
    msg = '';
  }
  // Missing key: show the key itself so it is obvious in QA instead of silently blank.
  return msg || key;
}

/**
 * Fill static markup:
 *   data-i18n="key"              → textContent
 *   data-i18n-title / -placeholder / -aria-label="key" → attribute
 */
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  for (const attr of ['title', 'placeholder', 'aria-label'] as const) {
    root.querySelectorAll<HTMLElement>(`[data-i18n-${attr}]`).forEach((el) => {
      el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)!));
    });
  }
  if (root === document) {
    try {
      document.documentElement.lang = chrome.i18n.getUILanguage();
    } catch {
      /* not in an extension context */
    }
  }
}
