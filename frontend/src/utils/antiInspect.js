/**
 * ConstructOps - Anti-Inspect & DevTools Protection Module
 * 
 * 1. Blocks right-click context menu (prevents right-click -> Inspect).
 * 2. Blocks developer keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, etc.).
 * 3. Continuous debugger trap: freezes DevTools execution if opened via browser menu.
 * 4. Clears browser console and warns unauthorized access.
 */
export const initAntiInspect = () => {
  if (typeof window === 'undefined') return;

  // 1. Disable Right Click Context Menu
  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  }, { capture: true });

  // 2. Disable Developer Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    const key = (e.key || '').toLowerCase();

    // Ctrl + Shift + I (Inspect), Ctrl + Shift + J (Console), Ctrl + Shift + C (Elements Inspector)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl + U (View Source), Ctrl + S (Save Page)
    if ((e.ctrlKey || e.metaKey) && ['u', 's'].includes(key)) {
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

  // 3. DevTools Detection & Infinite Debugger Loop
  // If someone opens DevTools via browser menu (Three dots -> More tools -> DevTools),
  // the debugger statement will halt execution on loop so elements cannot be inspected.
  const debugTrap = () => {
    try {
      const runDebugger = Function('debugger');
      runDebugger();
    } catch (_) {}
  };

  setInterval(debugTrap, 200);

  // 4. Periodic Console Clearing & Security Warning
  setInterval(() => {
    try {
      console.clear();
      console.log(
        '%cConstructOps Security Notice%c\nInspect Element and developer tools are restricted on this application.',
        'color: #ff6b00; font-size: 22px; font-weight: bold;',
        'color: #888; font-size: 13px;'
      );
    } catch (_) {}
  }, 2500);
};
