import { gsap } from 'gsap';
import { resume } from '../data/resume.js';
import { reorder } from '../data/companies.js';
import { store } from '../core/store.js';
import { $, esc, reducedMotion, isPhone } from '../core/util.js';
import { ransom, NAME_SEED } from '../ui/ransom.js';
import { sfx } from '../audio/audio.js';

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
  const stats = m.loot.slice(0, 2);
  const opened = store.has('opened', m.id);
  return `<article class="case" data-case="${m.id}" style="--tilt:${i % 2 ? 1.6 : -1.4}deg">
    ${pin}
    <div class="case-top"><span class="case-no">CASE 0${i + 1}</span><span class="case-live">● ${esc(m.status)}</span><span class="case-grade" aria-label="Difficulty ${esc(m.grade)}">${esc(m.grade)}</span></div>
    <h3 class="case-target ransom" data-ransom="${esc(m.target.toUpperCase())}"></h3>
    <p class="case-name">${esc(m.name)} · ${esc(m.stack.join(' · '))}</p>
    <ul class="case-stats">${stats.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <p class="case-brief">${esc(m.brief)}</p>
    <div class="case-actions">
      <button class="btn case-open" type="button" data-nav data-open="${m.id}">OPEN FILE ▸</button>
      <a class="case-link" href="${esc(m.live)}" target="_blank" rel="noopener" data-track="live_${m.id}">Live ↗</a>
      <a class="case-link" href="${esc(m.repo)}" target="_blank" rel="noopener" data-track="repo_${m.id}">Code ↗</a>
    </div>
    ${opened ? '<span class="stamp stamp-cleared">CLEARED!</span>' : ''}
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
  return `<div class="roster">
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
    ? `<aside class="note note-company" data-board-item>${pin}<b>Wait, someone from ${esc(ctx.company.name)}?</b> I've been expecting you. Pick any skill to see where I used it.</aside>`
    : `<aside class="note note-hint" data-board-item>${pin}<b>How to read this board:</b> <span class="hint-desk">hover any skill. The red string shows which project proves it.</span><span class="hint-phone">tap any skill to light up the project that proves it.</span></aside>`;

  return `
  <header class="board-head" data-board-item>
    <div class="board-name">
      <h1 class="ransom" id="boardName"></h1>
      <div class="slab board-slab"><span>${esc(resume.codename)}</span></div>
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
      <div class="edge" data-board-item>${pin}
        <h3>${kin('WHAT MAKES ME DIFFERENT', 5)}</h3>
        <ol>${resume.different.map((d) => `<li><b>${esc(d.title)}.</b> ${esc(d.fact)}</li>`).join('')}</ol>
      </div>
    </section>

    <section class="col col-notes" aria-label="About and contact">
      <article class="note note-about" data-board-item>${pin}
        <h3>${kin('THE PERSON', 4)}</h3>
        <p><b>${esc(e.school)}</b><br>${esc(e.degree)}<br>${esc(e.concentration)} · ${esc(e.grad)}</p>
        <div class="about-stats"><span><b>${esc(e.gpa)}</b>GPA</span><span><b>×2</b>Dean's List</span></div>
        <ul>${resume.funFacts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      </article>
      <article class="note note-quests" data-board-item>${pin}
        <h3>${kin('SIDE QUESTS', 2)}</h3>
        <ul>${resume.sideQuests.map((q) => `<li><b>${esc(q.title)}</b>, ${esc(q.place)}<br><span>${esc(q.lesson)}</span></li>`).join('')}</ul>
        <a class="note-more" href="#/side-quests" data-nav>Full story ▸</a>
      </article>
      <article class="calling" data-board-item>${pin}
        <p class="calling-head">CALLING CARD</p>
        <p class="calling-name">${kin(resume.name.toUpperCase(), 6)}</p>
        <p class="calling-status">${esc(resume.status)} · ${esc(resume.location)}</p>
        <a class="btn btn-primary" data-nav href="${esc(L.linkedin)}" target="_blank" rel="noopener" data-track="linkedin_click">in · Connect ↗</a>
        <div class="calling-row">
          <a class="btn" data-nav href="mailto:${esc(L.email)}" data-track="email_click">✉ Email</a>
          <a class="btn btn-accent" data-nav href="${esc(L.pdf)}" download data-track="pdf_click">⬇ PDF</a>
        </div>
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
  const lit = new Set(JSON.parse(sessionStorageGet('jn-lit') || '[]'));
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
      sessionStorageSet('jn-lit', JSON.stringify([...lit]));
      if (resume.skills.every((s) => lit.has(s.id))) onAllStringsLit?.();
    }
  }

  const clear = () => {
    if (!sticky) highlight(null, null);
  };

  root.querySelectorAll('.skill').forEach((el) => {
    const on = () => {
      sfx('hat');
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

  function reveal() {
    drawStrings();
    if (reducedMotion()) return;
    const items = root.querySelectorAll('[data-board-item], .case, .skill');
    const tl = gsap.timeline();
    tl.from(items, { y: -28, rotation: () => gsap.utils.random(-8, 8), opacity: 0, duration: 0.34, ease: 'back.out(2)', stagger: 0.025, clearProps: 'transform,opacity' }, 0);
    const paths = [...svg.querySelectorAll('.string')];
    paths.forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = `${len}`;
    });
    tl.to(paths, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out', stagger: 0.02, onComplete: () => paths.forEach((p) => (p.style.strokeDasharray = p.style.strokeDashoffset = '')) }, 0.35);
    return tl;
  }

  return { reveal, relayout, highlight };
}

/* Session-only memory for which strings were lit (try/catch: storage may be blocked). */
function sessionStorageGet(k) {
  try {
    return window.sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionStorageSet(k, v) {
  try {
    window.sessionStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

export const caseEl = (id) => $(`.case[data-case="${id}"]`);
