/**
 * ConstructOps — client hardening (production builds only).
 * Keeps DevTools shortcuts, right-click menus and console output away from
 * casual visitors. The bundle is already minified with no source maps.
 */

const BLOCKED_KEYS = ['f12', 'f1'];
const blockedCombo = (e) => {
  const key = (e.key || '').toLowerCase();
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.shiftKey && ['i', 'j', 'c', 'k', 'e', 'm'].includes(key)) return true;
  if (ctrl && !e.shiftKey && ['u', 's'].includes(key)) return true;
  if (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(key)) return true;
  return false;
};

const muteConsole = () => {
  const noop = () => {};
  ['log', 'info', 'warn', 'error', 'debug', 'trace', 'table', 'dir', 'group', 'groupEnd', 'time', 'timeEnd', 'assert']
    .forEach((m) => { console[m] = noop; });
};

export const initAntiInspect = () => {
  if (typeof window === 'undefined') return;

  muteConsole();
  window.addEventListener('error', (e) => { e.preventDefault(); }, true);
  window.addEventListener('unhandledrejection', (e) => { e.preventDefault(); }, true);

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  window.addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();
    if (BLOCKED_KEYS.includes(key) || blockedCombo(e)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  window.addEventListener('dragstart', (e) => e.preventDefault());
};
