/* Keyboard + Gamepad → one set of actions.
   Actions: up, down, left, right, confirm, back, hotkey(n), quick, flip, mute, skip */

const KEYS = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  Escape: 'back', Backspace: 'back',
  q: 'quick', Q: 'quick',
  f: 'flip', F: 'flip',
  m: 'mute', M: 'mute'
};

export function bindInput(handle) {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    let action = KEYS[e.key];
    if (!action && /^[1-7]$/.test(e.key)) action = `hotkey:${e.key}`;
    if (!action && (e.key === 'Enter' || e.key === ' ')) action = 'confirm';
    if (!action) return;
    const used = handle(action, e);
    if (used) e.preventDefault();
  });
}

/* Gamepad API: polled only while a pad is connected. */
export function bindGamepad(handle, onFirstUse) {
  let raf = 0;
  let prev = {};
  let used = false;
  const repeat = {};

  function poll(now) {
    raf = requestAnimationFrame(poll);
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (!pads.length) return;
    const p = pads[0];
    const ax = p.axes[0] || 0;
    const ay = p.axes[1] || 0;
    const state = {
      up: p.buttons[12]?.pressed || ay < -0.6,
      down: p.buttons[13]?.pressed || ay > 0.6,
      left: p.buttons[14]?.pressed || ax < -0.6,
      right: p.buttons[15]?.pressed || ax > 0.6,
      confirm: p.buttons[0]?.pressed,
      back: p.buttons[1]?.pressed,
      quick: p.buttons[3]?.pressed,
      flip: p.buttons[2]?.pressed
    };
    Object.entries(state).forEach(([action, down]) => {
      const was = prev[action];
      const dir = ['up', 'down', 'left', 'right'].includes(action);
      if (down && (!was || (dir && now - (repeat[action] || 0) > 220))) {
        repeat[action] = now;
        if (!used) {
          used = true;
          onFirstUse?.();
        }
        handle(action, null);
      }
    });
    prev = state;
  }

  window.addEventListener('gamepadconnected', () => {
    if (!raf) raf = requestAnimationFrame(poll);
  });
  window.addEventListener('gamepaddisconnected', () => {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    if (!pads.length) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  });
}
