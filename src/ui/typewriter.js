import { reducedMotion } from '../core/util.js';

/** Types text into el at ~45 chars/sec. Returns { done: Promise, finish() }.
    onTick fires every few letters (talk blip + mouth flap). */
export function typewrite(el, text, { cps = 45, onTick, onDone } = {}) {
  let i = 0;
  let timer = null;
  let resolve;
  const done = new Promise((r) => (resolve = r));

  const finish = () => {
    if (timer === null && i >= text.length) return;
    clearInterval(timer);
    timer = null;
    i = text.length;
    el.textContent = text;
    onDone?.();
    resolve();
  };

  if (reducedMotion() || !text) {
    el.textContent = text;
    queueMicrotask(finish);
    return { done, finish };
  }

  el.textContent = '';
  timer = setInterval(() => {
    i += 1;
    el.textContent = text.slice(0, i);
    if (i % 3 === 0 && text[i - 1] !== ' ') onTick?.(i);
    if (i >= text.length) finish();
  }, 1000 / cps);

  return { done, finish };
}
