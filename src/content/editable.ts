// Decides whether a key event belongs to a text-editing context (never steal those keys).

const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file', 'image']);
const TEXT_ROLES = new Set(['textbox', 'searchbox', 'combobox', 'spinbutton']);
/** Rich editors that handle keys on non-editable wrappers (Monaco, CodeMirror, Ace, ProseMirror, Slate, Quill, Docs). */
const EDITOR_SELECTOR = [
  '.monaco-editor',
  '.cm-editor',
  '.CodeMirror',
  '.ace_editor',
  '.ProseMirror',
  '[data-slate-editor]',
  '.ql-editor',
  '.notion-page-content',
  '.docs-texteventtarget-iframe',
  '.kix-appview-editor'
].join(',');

export function isEditableElement(el: Element): boolean {
  const tag = el.tagName;
  if (tag === 'INPUT') return !NON_TEXT_INPUTS.has((el as HTMLInputElement).type);
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  const role = el.getAttribute('role');
  return !!role && TEXT_ROLES.has(role);
}

function deepActiveElement(): Element | null {
  let a: Element | null = document.activeElement;
  while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

export function isEditableEvent(e: Event): boolean {
  if (document.designMode === 'on') return true;
  for (const n of e.composedPath()) {
    if (!(n instanceof Element)) continue;
    if (isEditableElement(n) || n.matches(EDITOR_SELECTOR)) return true;
  }
  // Fallback for focus inside open shadow roots that the event was retargeted out of.
  const active = deepActiveElement();
  return !!active && active !== document.body && (isEditableElement(active) || !!active.closest(EDITOR_SELECTOR));
}
