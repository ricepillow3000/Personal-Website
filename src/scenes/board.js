import { gsap } from 'gsap';
import { MENU_ITEMS } from './menu.js';
import { resume } from '../data/resume.js';
import { menuTeasers } from '../data/script.js';
import { esc, reducedMotion } from '../core/util.js';
import { ransom, NAME_SEED } from '../ui/ransom.js';
import { sfx } from '../audio/audio.js';
import { store } from '../core/store.js';

/* =========================================================================
   THE PLAN — the hub after PRESS START, drawn as ONE SUBWAY LINE (Nov 18, John's pick).
   The resume is a red train line with six stations in reading order. The screen shows
   one thing to do: the NEXT STOP sign (one chapter, one line) and BOARD THE TRAIN.
   Seen stations light up and the line fills as the visitor rides it start to finish.
   ========================================================================= */

/** The resume, start to finish: who he is, what he built, what he can do, where he worked,
    why he's different, how to reach him. Each chapter ends with NEXT EPISODE to the next one. */
export const CHAPTERS = ['stats', 'missions', 'skills', 'side-quests', 'different', 'contact'];
const label = (id) => MENU_ITEMS.find((m) => m.id === id)?.label || id.toUpperCase();
const no = (i) => String(i + 1).padStart(2, '0');

/** The first chapter the visitor hasn't opened yet (or null when all six are done). */
export function nextChapter() {
  const seen = store.get().visited || [];
  return CHAPTERS.find((id) => !seen.includes(id)) || null;
}

function planMarkup(ctx) {
  const e = resume.education;
  const note = ctx.company
    ? `<p class="plan-note"><b>Wait, someone from ${esc(ctx.company.name)}?</b> I've been expecting you.</p>`
    : '';
  return `<div class="plan">
    <header class="plan-head" data-board-item>
      <div class="plan-name">
        <h1 class="ransom" id="boardName"></h1>
        <div class="slab board-slab"><span>${esc(resume.name.split(' ').slice(1).join(' ').toUpperCase())}</span></div>
      </div>
      <p class="plan-role">${esc(resume.role)}<span class="plan-status"> · GSU ${esc(e.grad.replace('Class of ', "'").replace(/^'20/, "'"))} · ${esc(resume.status)}</span></p>
      ${note}
    </header>

    <section class="plan-stop" data-board-item aria-live="polite">
      <p class="ps-kicker">NEXT STOP</p>
      <div class="plan-card">
        <span class="pc-ch"></span>
        <h2 class="pc-name"></h2>
        <p class="pc-tease"></p>
      </div>
      <a class="plan-continue" href="#/stats" data-nav data-magnetic>
        <small class="pcn-kicker">START HERE</small><b class="pcn-title">BOARD THE TRAIN ▸</b>
      </a>
    </section>

    <nav class="plan-line" aria-label="The resume, one stop at a time" data-board-item>
      <ol style="--n:${CHAPTERS.length}">${CHAPTERS.map((id, i) => `<li style="--i:${i}">
        <a class="pl-item" href="#/${id}" data-nav data-ch="${id}" aria-label="Chapter ${no(i)}, ${esc(label(id))}">
          <span class="pl-dot" aria-hidden="true"><span class="pl-no">${no(i)}</span></span>
          <span class="pl-name" aria-hidden="true">${esc(label(id))}</span>
          <span class="pl-here" aria-hidden="true">YOU ARE HERE</span>
        </a></li>`).join('')}</ol>
    </nav>

    <div class="plan-foot" data-board-item><button type="button" class="progress-chip" id="progressChip"></button></div>
  </div>`;
}

/** Mounts THE PLAN into #board. reveal() plays its entrance; refresh() updates the stars and
    the CONTINUE target after the visitor comes back from a chapter. */
export function createBoard(root, ctx) {
  root.innerHTML = planMarkup(ctx);
  ransom(root.querySelector('#boardName'), resume.first, NAME_SEED);
  const items = [...root.querySelectorAll('.pl-item')];
  const line = root.querySelector('.plan-line ol');
  const card = root.querySelector('.plan-card');
  const cont = root.querySelector('.plan-continue');
  let next = 'stats';

  /* the sign shows the station you point at; let go and it returns to the next stop */
  let shown = null;
  function preview(id, { silent = false } = {}) {
    if (!id || id === shown) return;
    shown = id;
    const i = CHAPTERS.indexOf(id);
    const seen = store.get().visited || [];
    items.forEach((a) => a.classList.toggle('on', a.dataset.ch === id));
    card.querySelector('.pc-ch').textContent = `CHAPTER ${no(i)}`;
    card.querySelector('.pc-name').textContent = label(id);
    card.querySelector('.pc-tease').textContent = menuTeasers[id] || '';
    cont.setAttribute('href', `#/${id}`);
    cont.querySelector('.pcn-kicker').textContent = id !== next
      ? (seen.includes(id) ? 'RIDE AGAIN' : 'JUMP AHEAD')
      : !seen.some((s) => CHAPTERS.includes(s)) ? 'START HERE' : nextChapter() ? 'CONTINUE' : 'ALL STOPS SEEN';
    if (!silent) sfx('hover');
    if (!reducedMotion()) gsap.fromTo(card, { x: 22, rotation: 1.5 }, { x: 0, rotation: 0, duration: 0.22, ease: 'back.out(2.4)', clearProps: 'transform' });
  }
  items.forEach((a) => {
    a.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && preview(a.dataset.ch));
    a.addEventListener('focus', () => preview(a.dataset.ch));
  });
  root.querySelector('.plan-line').addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && preview(next, { silent: true }));

  function refresh() {
    const seen = store.get().visited || [];
    items.forEach((a) => a.classList.toggle('seen', seen.includes(a.dataset.ch)));
    next = nextChapter() || 'contact';
    const hereAt = nextChapter() ? CHAPTERS.indexOf(next) : CHAPTERS.length - 1;
    items.forEach((a, i) => a.classList.toggle('here', i === hereAt));
    line.style.setProperty('--done', String(hereAt));
    shown = null;
    preview(next, { silent: true });
  }
  refresh();

  let revealedOnce = false;
  function reveal(delay = 0) {
    refresh();
    if (reducedMotion()) return;
    const parts = root.querySelectorAll('[data-board-item]');
    if (revealedOnce) {
      return gsap.from(parts, { x: -30, opacity: 0, duration: 0.22, ease: 'power3.out', stagger: 0.03, delay, clearProps: 'transform,opacity' });
    }
    revealedOnce = true;
    const tl = gsap.timeline({ delay });
    // the sign swings down like a station board, the line draws itself left to right, the stations
    // punch in one after another, and the YOU ARE HERE pin drops on the next stop
    tl.from(root.querySelector('.plan-head'), { y: -40, opacity: 0, duration: 0.3, ease: 'power3.out', clearProps: 'transform,opacity' }, 0)
      .from(root.querySelector('.plan-stop'), { y: -90, rotation: -6, opacity: 0, duration: 0.42, ease: 'back.out(1.9)', clearProps: 'transform,opacity' }, 0.1)
      .fromTo(line, { '--draw': 0 }, { '--draw': 1, duration: 0.5, ease: 'power2.inOut' }, 0.3)
      .from(root.querySelectorAll('.pl-dot'), { scale: 0, rotation: -90, duration: 0.3, ease: 'back.out(3)', stagger: 0.07, clearProps: 'transform' }, 0.35)
      .from(root.querySelectorAll('.pl-name'), { y: 12, opacity: 0, duration: 0.2, stagger: 0.07, clearProps: 'transform,opacity' }, 0.45)
      .from(root.querySelector('.pl-item.here .pl-here'), { y: -40, opacity: 0, duration: 0.32, ease: 'bounce.out', clearProps: 'transform,opacity' }, 0.85)
      .from(root.querySelector('.plan-foot'), { opacity: 0, duration: 0.2, clearProps: 'opacity' }, 0.9);
    return tl;
  }

  return { reveal, refresh, demo() {} };
}
