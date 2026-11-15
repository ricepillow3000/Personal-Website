import { gsap } from 'gsap';
import { $, esc, reducedMotion } from '../core/util.js';
import { store } from '../core/store.js';
import { typewrite } from '../ui/typewriter.js';
import { createPortrait } from '../ui/portrait.js';
import { sfx, duck } from '../audio/audio.js';

/* Talking-John: the dialog box, the portrait and the reply bubbles. */
export function createConversation() {
  const textEl = $('#dialogText');
  const dialog = $('#dialog');
  const choicesEl = $('#choices');
  const splashes = document.querySelectorAll('.splash');
  const portrait = createPortrait($('#portrait'));
  let typing = null;
  let flap = null;

  function stopFlap() {
    clearTimeout(flap);
    portrait.mouth(false);
  }

  /** John says a line. Resolves when the line is fully shown. */
  function say(line, vars = {}) {
    const text = line.text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    portrait.set(line.expr || 'neutral');
    portrait.bounce();
    dialog.classList.remove('ready');
    typing?.finish();
    duck(true);
    typing = typewrite(textEl, text, {
      onTick: () => {
        sfx('tick');
        portrait.mouth(true);
        clearTimeout(flap);
        flap = setTimeout(() => portrait.mouth(false), 70);
      }
    });
    return typing.done.then(() => {
      stopFlap();
      duck(false);
      dialog.classList.add('ready');
    });
  }

  /** Finish the current line instantly (click on the box). */
  function finishLine() {
    if (typing) typing.finish();
  }
  dialog.addEventListener('click', finishLine);

  /** Render reply bubbles. items: [{ key, label, cleared, primary }] */
  function showChoices(items, onPick) {
    choicesEl.innerHTML = items
      .map(
        (c, i) => `<button class="choice${c.more ? ' more' : ''}${c.primary ? ' primary' : ''}" type="button" data-nav data-choice="${esc(c.key)}">
          <span class="tail" aria-hidden="true"></span><span class="num" aria-hidden="true">${i + 1}</span>${esc(c.label)}
          ${c.cleared ? '<span class="stamp">CLEARED!</span>' : ''}</button>`
      )
      .join('');
    const buttons = [...choicesEl.querySelectorAll('.choice')];
    buttons.forEach((b) => {
      b.addEventListener('pointerenter', () => hover(b));
      b.addEventListener('focus', () => hover(b));
      b.addEventListener('click', () => pick(b, onPick));
    });
    if (!reducedMotion()) {
      gsap.from(buttons, { x: 140, opacity: 0, duration: 0.32, ease: 'back.out(2)', stagger: 0.06, clearProps: 'x,opacity' });
    }
    return buttons;
  }

  function hover(b) {
    sfx('hat');
    splashes.forEach((el) => el.classList.toggle('alt'));
    if (!reducedMotion()) gsap.fromTo(b, { x: -4 }, { x: 0, duration: 0.18, ease: 'elastic.out(2, .3)', clearProps: 'x' });
  }

  function pick(b, onPick) {
    if (choicesEl.dataset.locked) return;
    choicesEl.dataset.locked = '1';
    sfx('snare');
    if (!reducedMotion()) {
      gsap.timeline()
        .to(b, { scale: 1.08, duration: 0.06 })
        .to(b, { scale: 1, duration: 0.12 })
        .to([...choicesEl.children].filter((x) => x !== b), { x: 80, opacity: 0, duration: 0.18, stagger: 0.03 }, 0);
    }
    Promise.resolve(onPick(b.dataset.choice)).finally(() => delete choicesEl.dataset.locked);
  }

  function clearChoices() {
    choicesEl.innerHTML = '';
  }

  return { say, showChoices, clearChoices, finishLine, portrait, isTyping: () => !dialog.classList.contains('ready') };
}

/** Choice list for the hub, with CLEARED! stamps for visited sections. */
export function hubItems(script, page, order) {
  const keys = page === 2 ? script.page2 : order || script.page1;
  const items = keys.map((k) => ({ key: k, label: script.choices[k].label, cleared: store.has('visited', script.choices[k].to) }));
  items.push(page === 2 ? { key: '__back', label: script.backLabel, more: true } : { key: '__more', label: `${script.moreLabel} ↻`, more: true });
  return items;
}
