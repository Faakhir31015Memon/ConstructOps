/**
 * ConstructOps - Anti-Inspect Protection Module
 *
 * Allows F12 (DevTools) for responsive/device testing only.
 * Blocks direct inspect shortcuts (Ctrl+Shift+I/J/C), View Source, and Right-Click context menu.
 * Console is periodically cleared to discourage casual snooping.
 */
export const initAntiInspect = () => {
  if (typeof window === 'undefined') return;

  // 1. Disable Right Click Context Menu
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  // 2. Disable specific inspect shortcuts — F12 is intentionally allowed for responsive mode
  window.addEventListener('keydown', (e) => {
    const key = (e.key || '').toLowerCase();

    // Ctrl + Shift + I (Inspect), Ctrl + Shift + J (Console), Ctrl + Shift + C (Elements)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + U (View Source)
    if ((e.ctrlKey || e.metaKey) && key === 'u') {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Mac Cmd + Option + I / J / C
    if (e.metaKey && e.altKey && ['i', 'j', 'c'].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, { capture: true });

  // 3. Periodic Console Clearing & Security Warning
  setInterval(() => {
    try {
      console.clear();
      console.log(
        '%cConstructOps Security Notice%c\nDeveloper tools are restricted on this application.',
        'color: #ff6b00; font-size: 20px; font-weight: bold;',
        'color: #888; font-size: 13px;'
      );
    } catch (_) {}
  }, 3000);
};
