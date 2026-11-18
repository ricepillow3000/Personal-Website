import { gsap } from 'gsap';
import { MENU_ITEMS } from './menu.js';
import { resume } from '../data/resume.js';
import { menuTeasers } from '../data/script.js';
import { esc, reducedMotion } from '../core/util.js';
import { ransom, NAME_SEED } from '../ui/ransom.js';
import { sfx } from '../audio/audio.js';
import { store } from '../core/store.js';

/* =========================================================================
   THE PLAN — the hub after PRESS START (replaced the crowded heist board, Nov 18).
   One screen, one job: the resume as six chapters in reading order, a big
   Persona-style staircase of chapter names, ONE preview card for the chapter
   you point at (one line, one number), and a big CONTINUE that always points
   to the next chapter you haven't seen. Every detail lives in the chapters.
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
  const seen = store.get().visited || [];
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
      <p class="plan-role">${esc(resume.role)} · GSU ${esc(e.grad.replace('Class of ', "'").replace(/^'20/, "'"))}<span class="plan-status"> · ${esc(resume.status)}</span></p>
      <button type="button" class="progress-chip" id="progressChip"></button>
      ${note}
    </header>

    <div class="plan-body">
      <nav class="plan-list" aria-label="Chapters">
        <p class="plan-kicker" data-board-item>THE PLAN <span>· ${CHAPTERS.length} chapters, in order</span></p>
        <ol>${CHAPTERS.map((id, i) => `<li style="--i:${i}" data-board-item>
          <a class="pl-item${seen.includes(id) ? ' seen' : ''}" href="#/${id}" data-nav data-ch="${id}">
            <span class="pl-no">${no(i)}</span>
            <span class="pl-name">${esc(label(id))}</span>
            <span class="pl-star" aria-label="${seen.includes(id) ? 'seen' : ''}"></span>
            <span class="pl-tease">${esc(menuTeasers[id] || '')}</span>
          </a></li>`).join('')}</ol>
      </nav>

      <aside class="plan-card" data-board-item aria-live="polite">
        <span class="pc-ch"></span>
        <h2 class="pc-name"></h2>
        <p class="pc-tease"></p>
        <a class="btn-cartoon pc-go" href="#/stats" data-nav>ENTER ▸</a>
      </aside>
    </div>

    <a class="plan-continue" href="#/stats" data-nav data-board-item data-magnetic>
      <small class="pcn-kicker">START HERE</small><b class="pcn-title">CHAPTER 01 · STATS ▸</b>
    </a>
  </div>`;
}

/** Mounts THE PLAN into #board. reveal() plays its entrance; refresh() updates the stars and
    the CONTINUE target after the visitor comes back from a chapter. */
export function createBoard(root, ctx) {
  root.innerHTML = planMarkup(ctx);
  ransom(root.querySelector('#boardName'), resume.first, NAME_SEED);
  const items = [...root.querySelectorAll('.pl-item')];
  const card = root.querySelector('.plan-card');
  const cont = root.querySelector('.plan-continue');

  /* the preview card follows whatever chapter you point at */
  let shown = null;
  function preview(id, { silent = false } = {}) {
    if (!id || id === shown) return;
    shown = id;
    const i = CHAPTERS.indexOf(id);
    items.forEach((a) => a.classList.toggle('on', a.dataset.ch === id));
    card.querySelector('.pc-ch').textContent = `CHAPTER ${no(i)}`;
    card.querySelector('.pc-name').textContent = label(id);
    card.querySelector('.pc-tease').textContent = menuTeasers[id] || '';
    card.querySelector('.pc-go').setAttribute('href', `#/${id}`);
    if (!silent) sfx('hover');
    if (!reducedMotion()) gsap.fromTo(card, { x: 18, rotation: 1.5 }, { x: 0, rotation: 0, duration: 0.22, ease: 'back.out(2.4)', clearProps: 'transform' });
  }
  items.forEach((a) => {
    a.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && preview(a.dataset.ch));
    a.addEventListener('focus', () => preview(a.dataset.ch));
  });

  function refresh() {
    const seen = store.get().visited || [];
    items.forEach((a) => {
      const on = seen.includes(a.dataset.ch);
      a.classList.toggle('seen', on);
      a.querySelector('.pl-star').setAttribute('aria-label', on ? 'seen' : '');
    });
    const next = nextChapter();
    const id = next || 'contact';
    const i = CHAPTERS.indexOf(id);
    cont.setAttribute('href', `#/${id}`);
    cont.querySelector('.pcn-kicker').textContent = !seen.some((s) => CHAPTERS.includes(s)) ? 'START HERE' : next ? 'CONTINUE' : 'ALL SIX SEEN · REVISIT';
    cont.querySelector('.pcn-title').textContent = `CHAPTER ${no(i)} · ${label(id)} ▸`;
    shown = null;
    preview(id, { silent: true });
  }
  refresh();

  let revealedOnce = false;
  function reveal(delay = 0) {
    refresh();
    if (reducedMotion()) return;
    const parts = root.querySelectorAll('[data-board-item]');
    if (revealedOnce) {
      // coming back: a quick slam, the full entrance only plays the first time
      return gsap.from(parts, { x: -30, opacity: 0, duration: 0.22, ease: 'power3.out', stagger: 0.025, delay, clearProps: 'transform,opacity' });
    }
    revealedOnce = true;
    const tl = gsap.timeline({ delay });
    // the chapter names slam in one after another along the staircase, the card swings in, CONTINUE punches
    tl.from(root.querySelector('.plan-head'), { y: -40, opacity: 0, duration: 0.3, ease: 'power3.out', clearProps: 'transform,opacity' }, 0)
      .from(root.querySelectorAll('.plan-list li, .plan-kicker'), { x: () => -window.innerWidth * 0.35, rotation: -10, opacity: 0, duration: 0.34, ease: 'back.out(1.8)', stagger: 0.05, clearProps: 'transform,opacity' }, 0.08)
      .from(card, { x: 160, rotation: 8, opacity: 0, duration: 0.36, ease: 'back.out(2)', clearProps: 'transform,opacity' }, 0.3)
      .from(cont, { scale: 1.6, rotation: -10, opacity: 0, duration: 0.3, ease: 'back.out(2.6)', clearProps: 'transform,opacity' }, 0.5);
    return tl;
  }

  return { reveal, refresh, demo() {} };
}
