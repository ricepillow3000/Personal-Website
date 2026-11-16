import { gsap } from 'gsap';
import { clearStampMarkup, isCleared } from '../ui/clear.js';
import { resume } from '../data/resume.js';
import { reorder } from '../data/companies.js';
import { $, esc, reducedMotion, isPhone } from '../core/util.js';
import { ransom, NAME_SEED } from '../ui/ransom.js';
import { sfx } from '../audio/audio.js';
import { store } from '../core/store.js';

/* =========================================================================
   HEIST BOARD — the portfolio as one planning board.
   Skills (left) are pinned tags; case files (centre) are the projects; notes
   (right) hold the person + contact. RED STRING runs from every skill to the
   projects that prove it. Hover/focus/tap a skill or case and its strings light
   up. Everything is readable at a glance; the string is the optional fun.
   ========================================================================= */

const pin = '<span class="pin" aria-hidden="true"></span>';

/** Kinetic heading type: condensed, slanted, a bigger first letter and one letter
    flipped to a contrasting box. Screen readers get the plain text. */
function kin(text, inv = null) {
  const chars = [...text];
  const flip = inv ?? chars.findIndex((c, i) => i > 1 && /[A-Za-z]/.test(c));
  const letters = chars
    .map((c, i) => (c === ' ' ? '<span class="k-sp"> </span>' : `<span class="k${i === 0 ? ' k-first' : ''}${i === flip ? ' k-inv' : ''}">${esc(c)}</span>`))
    .join('');
  return `<span class="kin" aria-label="${esc(text)}"><span aria-hidden="true">${letters}</span></span>`;
}

function caseCard(m, i) {
  const stickers = m.loot.slice(0, 2);
  const v = i % 2 ? 'v2' : 'v1';
  const mark = v === 'v1'
    ? `<svg class="cc-chart" viewBox="0 0 300 200" aria-hidden="true"><polygon points="0,200 0,150 40,120 70,140 105,80 140,110 175,40 205,75 240,20 270,55 300,10 300,200"/><polyline points="0,150 40,120 70,140 105,80 140,110 175,40 205,75 240,20 270,55 300,10"/></svg>`
    : '<span class="cc-star" aria-hidden="true"></span>';
  return `<article class="case card-pop cc ${v}" data-case="${m.id}" style="--tilt:${i % 2 ? 1.6 : -1.4}deg">
    ${pin}${mark}
    <span class="case-grade" aria-label="Difficulty ${esc(m.grade)}"><span>${esc(m.grade)}</span></span>
    <div class="case-top"><span class="case-no">CASE 0${i + 1}</span><span class="case-live">${esc(m.status)}</span></div>
    <h3 class="case-target ransom" data-ransom="${esc(m.target.toUpperCase())}"></h3>
    <p class="case-name">${esc(m.name)} <span>· ${esc(m.stack.join(' · '))}</span></p>
    <ul class="case-stats">${stickers.map((t, k) => `<li class="sticker s${k}">${esc(t)}</li>`).join('')}</ul>
    <p class="case-brief bubble-say">${esc(m.brief)}</p>
    <div class="case-actions">
      <button class="btn-cartoon case-open" type="button" data-nav data-open="${m.id}">OPEN FILE ▸</button>
      <a class="case-link" href="${esc(m.live)}" target="_blank" rel="noopener" data-track="live_${m.id}" data-clear="${m.id}">Live ↗</a>
      <a class="case-link" href="${esc(m.repo)}" target="_blank" rel="noopener" data-track="repo_${m.id}" data-clear="${m.id}">Code ↗</a>
    </div>
    <span class="case-fold" aria-hidden="true"></span>
    ${isCleared(m.id) ? clearStampMarkup() : ''}
  </article>`;
}

/* Skills roster: name · big slanted rank · teal rank meter · pink "used in" meter.
   The proof line shows on the selected row (and is always in the aria-label). */
function skillTag(s) {
  const max = s.rank === 'MAX';
  const pct = max ? 100 : Number(s.rank) * 10;
  return `<button class="skill" type="button" data-nav data-skill="${s.id}"
      aria-label="${esc(s.name)}, rank ${esc(s.rank)}, used in ${s.uses.length} project${s.uses.length > 1 ? 's' : ''}. ${esc(s.proof)}">
    <span class="skill-hl" aria-hidden="true"></span>
    <span class="skill-name">${esc(s.name)}</span>
    <span class="skill-dot" aria-hidden="true">•</span>
    <span class="skill-stat rank${max ? ' max' : ''}" aria-hidden="true"><small>RK</small><b>${max ? 'MAX' : esc(s.rank)}</b><i style="--v:${pct}%"></i></span>
    <span class="skill-stat used" aria-hidden="true"><small>IN</small><b>${s.uses.length}</b><i style="--v:${s.uses.length * 50}%"></i></span>
    <span class="skill-proof">${esc(s.proof)}</span>
    ${pin}
  </button>`;
}

function roster(skills) {
  const badge = (t, cls) => `<div class="roster-badge ${cls}" aria-hidden="true"><span>${t}</span></div>`;
  return `<div class="roster card-pop dark">
    ${badge('CORE', 'b-core')}${skills.slice(0, 3).map(skillTag).join('')}
    ${badge('KIT', 'b-kit')}${skills.slice(3).map(skillTag).join('')}
  </div>`;
}

export function boardMarkup(ctx) {
  const e = resume.education;
  const L = resume.links;
  const missions = reorder(resume.missions, ctx.company?.order?.missions);
  const skills = reorder(resume.skills, ctx.company?.order?.skills);
  const note = ctx.company
    ? `<aside class="note note-company card-pop" data-board-item>${pin}<b>Wait, someone from ${esc(ctx.company.name)}?</b> I've been expecting you. Pick any skill to see where I used it.</aside>`
    : `<aside class="note note-hint card-pop" data-board-item>${pin}<b>How to read this board:</b> <span class="hint-desk">hover any skill. The red string shows which project proves it.</span><span class="hint-phone">tap any skill to light up the project that proves it.</span></aside>`;

  return `
  <header class="board-head" data-board-item>
    <div class="board-name">
      <h1 class="ransom" id="boardName"></h1>
      <div class="slab board-slab"><span>${esc(resume.codename)}</span></div>
      <div class="progress-chip" id="progressChip" role="status"></div>
    </div>
    <p class="board-hook">${esc(resume.role)}. ${esc(resume.hook)}</p>
    ${note}
  </header>

  <div class="board-grid">
    <svg class="strings" id="strings" aria-hidden="true"></svg>

    <section class="col col-skills" aria-label="Skills">
      <h2 class="col-label" data-board-item><span class="ransom" data-ransom="SKILLS"></span><small>rank · proof</small></h2>
      ${roster(skills)}
    </section>

    <section class="col col-cases" aria-label="Projects">
      <h2 class="col-label" data-board-item><span class="ransom" data-ransom="CASE FILES"></span><small>2 live apps</small></h2>
      <div class="cases">${missions.map(caseCard).join('')}</div>
      <div class="edge card-pop cc edge-v" data-board-item>${pin}
        <svg class="cc-bolt" viewBox="0 0 100 160" aria-hidden="true"><polygon points="62,0 14,88 46,88 30,160 88,62 54,62 76,0"/></svg>
        <div class="cc-banner light"><h3>${kin('WHAT MAKES ME DIFFERENT', 5)}</h3></div>
        <ol class="edge-grid">${resume.different
          .map((d, i) => `<li class="edge-tile"><span class="edge-no" aria-hidden="true"><span>${i + 1}</span></span>
            <b>${esc(d.title)}</b><span class="edge-fact">${esc(d.fact)}</span></li>`)
          .join('')}</ol>
      </div>
    </section>

    <section class="col col-notes" aria-label="About and contact">
      <article class="note note-about card-pop" data-board-item>${pin}
        <div class="note-band"><h3>${kin('THE PERSON', 4)}</h3></div>
        <span class="gpa-burst" aria-label="GPA ${esc(e.gpa)}"><span><b>${esc(e.gpa)}</b><small>GPA</small></span></span>
        <p class="person-school">${esc(e.school.toUpperCase())}</p>
        <p class="person-degree">${esc(e.degree)}</p>
        <div class="person-tags">
          <span class="sticker s0">${esc(e.concentration)}</span>
          <span class="sticker s1">Dean's List ×2</span>
          <span class="sticker s2">${esc(e.grad)}</span>
        </div>
        <p class="bubble-say person-facts">${resume.funFacts.map((f, i) => `<span><i class="ff-star" aria-hidden="true"></i>${esc(f)}</span>`).join('')}</p>
      </article>
      <article class="note note-quests card-pop" data-board-item>${pin}
        <div class="note-band"><h3>${kin('SIDE QUESTS', 2)}</h3></div>
        <ol class="quest-log">${resume.sideQuests
          .map((q, i) => `<li class="quest">
            <span class="quest-no" aria-hidden="true"><span>${i + 1}</span></span>
            <div><b class="quest-title">${esc(q.title)}</b><span class="quest-place">${esc(q.place)}</span>
            <span class="quest-lesson">${esc(q.lesson)}</span></div>
            <span class="quest-done" aria-hidden="true">CLEAR</span></li>`)
          .join('')}</ol>
        <a class="btn-cartoon quest-more" href="#/side-quests" data-nav>FULL STORY ▸</a>
      </article>
      <article class="calling card-pop" data-board-item>${pin}
        <span class="calling-star" aria-hidden="true"></span>
        <div class="calling-banner"><span>CALLING CARD</span></div>
        <p class="calling-to">TO: ${esc(ctx.company ? ctx.company.name.toUpperCase() : 'WHOEVER IS READING THIS')}</p>
        <p class="calling-msg">I direct AI agents, ship real apps and test everything. You know where to find me.</p>
        <h3 class="calling-name ransom" data-ransom="${esc(resume.name.toUpperCase())}"></h3>
        <p class="calling-sign">— ${esc(resume.codename)} · ${esc(resume.location)}</p>
        <a class="btn-cartoon cta" data-nav href="${esc(L.linkedin)}" target="_blank" rel="noopener" data-track="linkedin_click">in · Connect on LinkedIn ↗</a>
        <div class="calling-row">
          <a class="btn-cartoon" data-nav href="mailto:${esc(L.email)}" data-track="email_click">Email</a>
          <a class="btn-cartoon alt" data-nav href="${esc(L.pdf)}" download data-track="pdf_click">↓ PDF</a>
        </div>
        <span class="calling-status">${esc(resume.status)}</span>
      </article>
    </section>
  </div>`;
}

/** Mounts the board into #board and wires strings + interactions. */
export function createBoard(root, ctx, { onOpenCase, onAllStringsLit }) {
  root.innerHTML = boardMarkup(ctx);
  ransom(root.querySelector('#boardName'), resume.first, NAME_SEED);
  root.querySelectorAll('[data-ransom]').forEach((el, i) => ransom(el, el.dataset.ransom, 21 + i * 7));
  const svg = root.querySelector('#strings');
  const grid = root.querySelector('.board-grid');
  const lit = new Set(store.get().lit || []); // saved: survives coming back another day
  let sticky = null; // a tapped skill/case stays lit until tapped again

  /* ---------- red string geometry ---------- */
  function centerOf(el) {
    const p = el.querySelector('.pin') || el;
    const r = p.getBoundingClientRect();
    const g = grid.getBoundingClientRect();
    return { x: r.left + r.width / 2 - g.left, y: r.top + r.height / 2 - g.top };
  }

  function drawStrings() {
    if (isPhone()) {
      svg.innerHTML = '';
      return;
    }
    const g = grid.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${g.width} ${g.height}`);
    svg.setAttribute('width', g.width);
    svg.setAttribute('height', g.height);
    let out = '';
    resume.skills.forEach((s) => {
      const a = root.querySelector(`.skill[data-skill="${s.id}"]`);
      s.uses.forEach((caseId) => {
        const b = root.querySelector(`.case[data-case="${caseId}"]`);
        if (!a || !b) return;
        const p1 = centerOf(a);
        const p2 = centerOf(b);
        const sag = Math.min(70, Math.abs(p2.x - p1.x) * 0.18);
        const mx = (p1.x + p2.x) / 2;
        const my = Math.max(p1.y, p2.y) + sag;
        out += `<path class="string" data-skill="${s.id}" data-case="${caseId}" d="M${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}"/>`;
      });
    });
    svg.innerHTML = out;
  }

  /* ---------- highlight logic ---------- */
  function highlight(kind, id) {
    root.classList.toggle('board-focus', Boolean(id));
    root.querySelectorAll('.string').forEach((p) => p.classList.toggle('lit', Boolean(id) && p.dataset[kind] === id));
    const skills = new Set();
    const cases = new Set();
    if (kind === 'skill' && id) {
      skills.add(id);
      resume.skills.find((s) => s.id === id)?.uses.forEach((c) => cases.add(c));
    }
    if (kind === 'case' && id) {
      cases.add(id);
      resume.skills.filter((s) => s.uses.includes(id)).forEach((s) => skills.add(s.id));
    }
    root.querySelectorAll('[data-skill].skill').forEach((el) => el.classList.toggle('lit', skills.has(el.dataset.skill)));
    root.querySelectorAll('.case').forEach((el) => el.classList.toggle('lit', cases.has(el.dataset.case)));
    if (kind === 'skill' && id && !lit.has(id)) {
      lit.add(id);
      store.addTo('lit', id);
      if (resume.skills.every((s) => lit.has(s.id))) onAllStringsLit?.();
    }
  }

  const clear = () => {
    if (!sticky) highlight(null, null);
  };

  root.querySelectorAll('.skill').forEach((el) => {
    const on = () => {
      sfx('hover');
      highlight('skill', el.dataset.skill);
    };
    el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && on());
    el.addEventListener('focus', on);
    el.addEventListener('pointerleave', clear);
    el.addEventListener('blur', clear);
    el.addEventListener('click', () => {
      sticky = sticky === el.dataset.skill ? null : el.dataset.skill;
      if (sticky) on();
      else highlight(null, null);
    });
  });

  root.querySelectorAll('.case').forEach((el) => {
    el.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && !sticky && highlight('case', el.dataset.case));
    el.addEventListener('pointerleave', clear);
  });

  root.querySelectorAll('[data-open]').forEach((b) =>
    b.addEventListener('click', () => onOpenCase(b.dataset.open, b.closest('.case')))
  );

  /* ---------- layout + intro ---------- */
  let raf = 0;
  const relayout = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawStrings);
  };
  window.addEventListener('resize', relayout);
  if (document.fonts?.ready) document.fonts.ready.then(relayout);

  function reveal(delay = 0) {
    drawStrings();
    if (reducedMotion()) return;
    const items = root.querySelectorAll('[data-board-item], .case, .skill');
    const tl = gsap.timeline({ delay });
    tl.from(items, {
      y: () => gsap.utils.random(-90, -50),
      x: () => gsap.utils.random(-30, 30),
      scale: 1.3,
      rotation: () => gsap.utils.random(-16, 16),
      opacity: 0,
      duration: 0.4,
      ease: 'back.out(2.8)',
      stagger: 0.022,
      clearProps: 'transform,opacity'
    }, 0);
    const paths = [...svg.querySelectorAll('.string')];
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
    });
    tl.to(paths, { strokeDashoffset: 0, duration: 0.42, ease: 'expo.out', stagger: 0.018, onComplete: () => paths.forEach((p) => (p.style.strokeDasharray = p.style.strokeDashoffset = '')) }, 0.35);
    return tl;
  }

  return { reveal, relayout, highlight };
}

export const caseEl = (id) => $(`.case[data-case="${id}"]`);
