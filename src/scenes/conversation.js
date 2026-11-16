import { gsap } from 'gsap';
import { $, esc, reducedMotion } from '../core/util.js';
import { store } from '../core/store.js';
import { typewrite } from '../ui/typewriter.js';
import { createTag } from '../ui/tag.js';
import { sfx, duck } from '../audio/audio.js';

/* Talking-John: the dialog box, the name and the RADIAL BURST MENU.
   Choices are jagged black blades fanning out from one centre point (red shards
   behind, one letter flipped black-on-white). Original design: no console glyphs. */

/* Blade slots around the centre point, in reading order of the choices.
   side: which way the blade points away from the centre. x/y in px at 1440×900. */
const SLOTS = [
  { side: 'l', x: 40, y: -132, w: 360, rot: 24 },
  { side: 'r', x: 46, y: -150, w: 360, rot: -24 },
  { side: 'l', x: 56, y: -8, w: 410, rot: 5 },
  { side: 'r', x: 66, y: -52, w: 400, rot: -8 },
  { side: 'l', x: 40, y: 130, w: 330, rot: -18 },
  { side: 'r', x: 60, y: 70, w: 400, rot: 10 },
  { side: 'r', x: 36, y: 178, w: 330, rot: 24 }
];
const BLADE_H = 112;

function wordMarkup(word, inv) {
  return [...word]
    .map((ch, i) => {
      if (ch === ' ') return '<span class="sp"> </span>';
      const cls = ['ch', i === 0 ? 'first' : '', i === inv ? 'inv' : ''].filter(Boolean).join(' ');
      return `<span class="${cls}">${esc(ch)}</span>`;
    })
    .join('');
}

export function createConversation() {
  const textEl = $('#dialogText');
  const dialog = $('#dialog');
  const choicesEl = $('#choices');
  const tag = createTag($('#nameTag'));
  let typing = null;
  let flap = null;

  function stopFlap() {
    clearTimeout(flap);
    tag.mouth(false);
  }

  /** John says a line. Resolves when the line is fully shown. */
  function say(line, vars = {}) {
    const text = line.text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    tag.set(line.expr || 'neutral');
    tag.bounce();
    dialog.classList.remove('ready');
    typing?.finish();
    duck(true);
    typing = typewrite(textEl, text, {
      onTick: () => {
        sfx('tick');
        tag.mouth(true);
        clearTimeout(flap);
        flap = setTimeout(() => tag.mouth(false), 70);
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

  /* Keep the whole burst inside the viewport on smaller desktops. */
  function fit() {
    const s = Math.min(1, window.innerWidth / 1440, window.innerHeight / 940);
    choicesEl.style.setProperty('--rs', s.toFixed(3));
  }
  window.addEventListener('resize', fit);
  fit();

  /** Render the radial menu. items: [{ key, word, sub, inv, cleared, primary }] */
  function showChoices(items, onPick) {
    const blades = items.filter((c) => !c.primary);
    const center = items.find((c) => c.primary);
    choicesEl.innerHTML = `
      <div class="radial-burst" aria-hidden="true"></div>
      ${center
        ? `<button class="choice core-btn" type="button" data-nav data-choice="${esc(center.key)}"><span class="core-star" aria-hidden="true"></span><span class="core-label">${esc(center.label)}</span></button>`
        : '<div class="radial-core" aria-hidden="true"><span class="core-star"></span></div>'}
      ${blades
        .map((c, i) => {
          const s = SLOTS[i % SLOTS.length];
          const left = s.side === 'r' ? s.x : -(s.x + s.w);
          return `<button class="choice blade blade-${s.side}" type="button" data-nav data-choice="${esc(c.key)}"
            style="left:${left}px;top:${s.y - BLADE_H / 2}px;width:${s.w}px;--rot:${s.rot}deg" aria-label="${esc(c.word)}: ${esc(c.sub)}">
            <span class="blade-inner">
              <span class="blade-red" aria-hidden="true"></span>
              <span class="blade-bg" aria-hidden="true"></span>
              <span class="blade-txt" aria-hidden="true"><span class="blade-word">${wordMarkup(c.word, c.inv)}</span><span class="blade-sub">${esc(c.sub)}</span></span>
              ${c.cleared ? '<span class="stamp">CLEARED!</span>' : ''}
            </span>
          </button>`;
        })
        .join('')}`;

    const buttons = [...choicesEl.querySelectorAll('.choice')];
    buttons.forEach((b) => {
      b.addEventListener('pointerenter', () => hover(b));
      b.addEventListener('focus', () => hover(b));
      b.addEventListener('click', () => pick(b, onPick));
    });
    popOut();
    return buttons;
  }

  /** The opening: a white flash at the centre point, then every blade bursts out
      of that point (scaling from its tip), overshoots and settles; letters pop last. */
  function popOut() {
    if (reducedMotion()) return;
    const blades = [...choicesEl.querySelectorAll('.blade')];
    const inners = blades.map((b) => b.querySelector('.blade-inner'));
    const tl = gsap.timeline();
    tl.fromTo(choicesEl.querySelector('.radial-burst'), { scale: 0, opacity: 1 }, { scale: 3.2, opacity: 0, duration: 0.5, ease: 'power3.out' }, 0)
      .from(choicesEl.querySelectorAll('.radial-core, .core-btn'), { scale: 0, rotation: -120, duration: 0.35, ease: 'back.out(2.4)', clearProps: 'transform' }, 0)
      .from(inners, {
        scale: 0,
        rotation: (i) => (blades[i].classList.contains('blade-r') ? -28 : 28),
        opacity: 0,
        duration: 0.42,
        ease: 'back.out(2.1)',
        stagger: 0.045,
        clearProps: 'transform,opacity'
      }, 0.06)
      .from(choicesEl.querySelectorAll('.blade-red'), { scaleX: 0.2, duration: 0.3, ease: 'power3.out', stagger: 0.045, clearProps: 'transform' }, 0.16)
      .from(choicesEl.querySelectorAll('.ch'), { y: -18, opacity: 0, duration: 0.18, stagger: 0.008, ease: 'back.out(3)', clearProps: 'transform,opacity' }, 0.24);
  }

  function hover(b) {
    sfx('hat');
    choicesEl.querySelectorAll('.choice').forEach((x) => x.classList.toggle('on', x === b));
    choicesEl.classList.add('has-on');
  }

  function pick(b, onPick) {
    if (choicesEl.dataset.locked) return;
    choicesEl.dataset.locked = '1';
    sfx('snare');
    if (!reducedMotion()) {
      const others = [...choicesEl.querySelectorAll('.blade')].filter((x) => x !== b).map((x) => x.querySelector('.blade-inner'));
      const mine = b.querySelector('.blade-inner') || b;
      gsap.timeline()
        .to(others, { scale: 0, opacity: 0, duration: 0.2, ease: 'power3.in', stagger: 0.02 }, 0)
        .to(mine, { scale: 1.14, duration: 0.08, ease: 'power2.out' }, 0)
        .to(mine, { scale: 1, duration: 0.14 });
    }
    Promise.resolve(onPick(b.dataset.choice)).finally(() => delete choicesEl.dataset.locked);
  }

  function clearChoices() {
    choicesEl.innerHTML = '';
    choicesEl.classList.remove('has-on');
  }

  return { say, showChoices, clearChoices, finishLine, tag, isTyping: () => !dialog.classList.contains('ready') };
}

/** Every hub choice as a blade, with CLEARED! stamps for visited sections. */
export function hubItems(script, order) {
  const all = [...script.page1, ...script.page2];
  const keys = order ? [...order, ...all.filter((k) => !order.includes(k))] : all;
  return keys.map((k) => ({
    key: k,
    ...script.radial[k],
    label: script.choices[k].label,
    cleared: store.has('visited', script.choices[k].to)
  }));
}
