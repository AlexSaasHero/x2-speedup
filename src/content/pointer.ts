// Last known pointer position in this frame (viewport coordinates); shared by targeting and overlay.
export const pointer = { x: -1, y: -1, at: 0 };

export function trackPointer(onMove?: () => void): void {
  let scheduled = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = performance.now();
      if (onMove && !scheduled) {
        scheduled = true;
        setTimeout(() => {
          scheduled = false;
          onMove();
        }, 100);
      }
    },
    { capture: true, passive: true }
  );
}

export function pointerInside(el: Element): boolean {
  if (pointer.x < 0) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && pointer.x >= r.left && pointer.x <= r.right && pointer.y >= r.top && pointer.y <= r.bottom;
}
