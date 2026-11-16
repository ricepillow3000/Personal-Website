import { gsap } from 'gsap';
import { resume } from '../data/resume.js';
import { reorder } from '../data/companies.js';
import { store } from '../core/store.js';
import { esc, reducedMotion } from '../core/util.js';
import { listMarkup, allFound } from '../eggs/achievements.js';

/* Each section returns { title, html, after(root) }. Content comes from resume.js only. */

const back = '<button class="btn back-btn" type="button" data-back>◀ BOARD <kbd>ESC</kbd></button>';
const head = (title, sub = '') => `
  <div class="page-head"><h2 class="ransom ransom-lg" data-ransom="${esc(title)}"></h2></div>
  ${sub ? `<p class="page-sub" data-in>${sub}</p>` : ''}`;
const cleared = (on) => (on ? '<span class="stamp stamp-cleared">CLEARED!</span>' : '');

/* Highlight numbers in a sentence with the yellow marker. */
const mark = (text) =>
  esc(text).replace(/(\d[\d,.]*\+?\s?(?:%|of \d[\d,]*|lines|tests|years|checks|errors|bugs|workflows)?|−\d+%)/g, '<span class="hl">$1</span>');

/* Big outlined word drifting behind each page (background depth layer). */
const watermark = (word) => `<div class="pg-mark" aria-hidden="true"><span>${word}</span><span>${word}</span></div>`;

/* Shared slam for page-specific intros: offset by ~3 frames, overshoot, settle. */
const slamIn = (els, from, extra = {}) =>
  gsap.from(els, { ...from, duration: 0.34, ease: 'back.out(2.4)', stagger: 0.05, clearProps: 'transform,opacity,visibility', ...extra });

function missions(ctx) {
  const list = reorder(resume.missions, ctx.company?.order?.missions);
  return {
    title: 'MISSIONS',
    html: `${watermark('TARGETS')}${back}${head('MISSIONS', 'Two live apps. Pick a poster to open the file.')}
      <ul class="wanted">${list
        .map(
          (m, i) => `<li class="wanted-slot" style="--tilt:${i % 2 ? 2.4 : -2.8}deg;--d:${i * -1.3}s">
          <button class="poster" type="button" data-nav data-mission="${m.id}">
            <span class="poster-tape" aria-hidden="true"></span>
            <span class="poster-top"><span>TARGET 0${i + 1}</span><span class="poster-live">${esc(m.status)}</span></span>
            <span class="poster-grade" aria-label="Difficulty ${esc(m.grade)}">${esc(m.grade)}</span>
            <span class="poster-name">${esc(m.target)}</span>
            <span class="poster-target">${esc(m.name)}</span>
            <span class="poster-stack">${esc((m.stack || []).join(' · '))}</span>
            <span class="poster-brief">${esc(m.brief)}</span>
            <span class="poster-open">OPEN FILE ▶</span>
            ${cleared(store.has('opened', m.id))}
          </button></li>`
        )
        .join('')}</ul>`,
    intro(root) {
      slamIn(root.querySelectorAll('.poster'), { y: -140, rotation: (i) => (i % 2 ? 24 : -24), scale: 1.25, autoAlpha: 0 }, { stagger: 0.09 });
    }
  };
}

export function dossierMarkup(m) {
  return `<div class="dossier">
    <button class="modal-x" type="button" data-close aria-label="Close">✕</button>
    <p class="dossier-code">MISSION FILE · ${esc(m.dates)} · DIFFICULTY ${esc(m.grade)}</p>
    <h2 class="dossier-title" id="modalTitle">${esc(m.target)}</h2>
    <p class="dossier-sub">${esc(m.name)} — <span style="color:var(--red)">● ${esc(m.status)}</span></p>
    <ul class="dossier-stack">${m.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <div class="dossier-cols">
      <div><h3>OBJECTIVES</h3><ul class="obj">${m.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>
      <div><h3>LOOT</h3><ul class="loot">${m.loot.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
    </div>
    <div class="dossier-links">
      <a class="btn" href="${esc(m.live)}" target="_blank" rel="noopener" data-track="live_${m.id}">▶ Try it live ↗</a>
      <a class="btn" href="${esc(m.repo)}" target="_blank" rel="noopener" data-track="repo_${m.id}">⌥ Code on GitHub ↗</a>
    </div>
    <div class="stamp stamp-big">MISSION<br>COMPLETE</div>
  </div>`;
}

/** Dossier choreography: objectives type in, loot pops, stamp slams. Returns timeline. */
export function animateDossier(root, onLand) {
  if (reducedMotion()) return gsap.timeline();
  const tl = gsap.timeline();
  tl.fromTo(root, { scale: 1.25, rotation: -5, y: -50, opacity: 0 }, { scale: 1, rotation: 0, y: 0, opacity: 1, duration: 0.2, ease: 'power4.in', clearProps: 'transform,opacity' })
    .from(root.querySelector('.dossier'), { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', duration: 0.3, ease: 'expo.out' }, 0.14)
    .from(root.querySelectorAll('.obj li'), { x: -50, skewX: -18, opacity: 0, duration: 0.24, ease: 'expo.out', stagger: 0.08 }, '-=0.12')
    .from(root.querySelectorAll('.loot li'), { scale: 0.2, rotation: -20, opacity: 0, duration: 0.3, ease: 'back.out(3)', stagger: 0.06 }, '-=0.18')
    .fromTo(root.querySelector('.stamp-big'), { scale: 3.6, opacity: 0, rotation: -50 }, { scale: 0.92, opacity: 1, rotation: -12, duration: 0.16, ease: 'power4.in' }, '+=0.02')
    .add(() => onLand?.())
    .to(root.querySelector('.stamp-big'), { scale: 1, duration: 0.3, ease: 'elastic.out(1.4, .4)' });
  return tl;
}

function skills(ctx) {
  const list = reorder(resume.skills, ctx.company?.order?.skills);
  const lv = (r) => (r === 'MAX' ? 10 : Number(r) || 0);
  const total = resume.missions.length;
  return {
    title: 'SKILLS',
    html: `${watermark('LEVELS')}${back}${head('SKILLS', 'Level = how deep I go. IN = how many live projects prove it.')}
      <div class="crew">
        <div class="crew-star" aria-hidden="true"></div>
        <div class="crew-tabs" aria-hidden="true"><span class="tab-a">THE SKILL SET</span><span class="tab-b">RANKS</span><span class="tab-c">RECEIPTS</span></div>
        <div class="crew-board">
        <span class="crew-cursor" aria-hidden="true"><i></i></span>
        <ol class="crew-list">
          ${list
            .map((s, i) => {
              const n = lv(s.rank);
              const tag = i === 0 ? '<span class="crew-tag t-core" aria-hidden="true">CORE</span>' : i === 3 ? '<span class="crew-tag t-kit" aria-hidden="true">KIT</span>' : '';
              return `<li class="crew-row" data-nav tabindex="0" data-proof="${esc(s.proof)}" data-name="${esc(s.name)}"
                aria-label="${esc(s.name)}: level ${esc(s.rank)}, used in ${s.uses.length} of ${total} projects. ${esc(s.proof)}">
                ${tag}
                <span class="crew-name" aria-hidden="true">${esc(s.name)}</span>
                <span class="crew-dot" aria-hidden="true">•</span>
                <span class="crew-lv" aria-hidden="true"><small>LV</small>${n >= 10 ? 'MAX' : n}</span>
                <span class="crew-m rk" aria-hidden="true"><small>RK</small><b>${n * 10}</b><i style="--v:${n * 10}%"></i></span>
                <span class="crew-m in" aria-hidden="true"><small>IN</small><b>${s.uses.length}/${total}</b><i style="--v:${(s.uses.length / total) * 100}%"></i></span>
              </li>`;
            })
            .join('')}
        </ol>
        </div>
        <div class="crew-side" aria-hidden="true">
          <p class="crew-say"><b class="crew-say-name"></b><span class="crew-say-proof"></span></p>
          <div class="ransom crew-word" data-ransom="RECEIPTS"></div>
        </div>
      </div>`,
    after(root) {
      const rows = [...root.querySelectorAll('.crew-row')];
      const cursor = root.querySelector('.crew-cursor');
      const say = root.querySelector('.crew-say');
      let current = null;
      const select = (row, instant) => {
        if (!row || row === current) return;
        current = row;
        rows.forEach((r) => r.classList.toggle('on', r === row));
        say.querySelector('.crew-say-name').textContent = row.dataset.name;
        say.querySelector('.crew-say-proof').textContent = row.dataset.proof;
        const to = { y: row.offsetTop, height: row.offsetHeight };
        if (instant || reducedMotion()) {
          gsap.set(cursor, to);
          return;
        }
        gsap.to(cursor, { ...to, duration: 0.2, ease: 'back.out(2.2)', overwrite: true });
        gsap.fromTo(cursor.firstElementChild, { scaleX: 0.6 }, { scaleX: 1, duration: 0.22, ease: 'back.out(2.6)' });
        gsap.fromTo(say, { scale: 0.7, rotation: -6 }, { scale: 1, rotation: -3, duration: 0.24, ease: 'back.out(2.8)' });
        gsap.fromTo(row.querySelectorAll('.crew-m i'), { scaleX: 0 }, { scaleX: 1, duration: 0.26, ease: 'back.out(2)', stagger: 0.04 });
      };
      rows.forEach((r) => {
        r.addEventListener('pointerenter', () => select(r));
        r.addEventListener('focus', () => select(r));
      });
      requestAnimationFrame(() => select(rows[0], true));
      window.addEventListener('resize', () => current && gsap.set(cursor, { y: current.offsetTop, height: current.offsetHeight }), { passive: true });
    },
    intro(root) {
      if (reducedMotion()) return;
      slamIn(root.querySelectorAll('.crew-row'), { x: 160, skewX: -22, autoAlpha: 0 }, { stagger: 0.04, duration: 0.26 });
      slamIn(root.querySelectorAll('.crew-tabs span'), { y: -60, rotation: -12, autoAlpha: 0 }, { stagger: 0.06 });
      gsap.from(root.querySelector('.crew-star'), { scale: 0, rotation: -180, duration: 0.5, ease: 'back.out(1.8)', clearProps: 'transform' });
      gsap.from(root.querySelector('.crew-cursor i'), { scaleX: 0, duration: 0.3, ease: 'back.out(2.4)', delay: 0.25 });
    }
  };
}

function different() {
  return {
    title: 'DIFFERENT',
    html: `${watermark('FACTS')}${back}${head('WHAT MAKES ME DIFFERENT', 'Four facts. No pitch.')}
      <div class="comic">${resume.different
        .map((d, i) => `<article class="panel panel-${i}" data-nav tabindex="0"><span class="panel-num" aria-hidden="true">${i + 1}</span><h3>${esc(d.title)}</h3><p>${mark(d.fact)}</p></article>`)
        .join('')}</div>`,
    intro(root) {
      if (reducedMotion()) return;
      const panels = [...root.querySelectorAll('.panel')];
      const page = root.closest('.screen') || root;
      const from = [{ x: -260, y: -80 }, { x: 260, y: -80 }, { x: -260, y: 80 }, { x: 260, y: 80 }];
      const tl = gsap.timeline();
      panels.forEach((p, i) => {
        tl.from(p, { ...from[i % 4], scale: 1.35, rotation: i % 2 ? 9 : -9, autoAlpha: 0, duration: 0.2, ease: 'power4.in', clearProps: 'transform,opacity,visibility' }, i * 0.11)
          .add(() => {
            page.classList.remove('shake');
            void page.offsetWidth;
            page.classList.add('shake');
          }, i * 0.11 + 0.2)
          .from(p.querySelector('.panel-num'), { scale: 2.6, rotation: -30, duration: 0.3, ease: 'back.out(2.5)', clearProps: 'transform' }, i * 0.11 + 0.18);
      });
    }
  };
}

function stats() {
  const e = resume.education;
  const gpa = Number(e.gpa) || 0;
  const angle = -90 + 180 * Math.min(1, gpa / 4);
  const icons = ['🥁', '🎸', '🐝'];
  return {
    title: 'STATS',
    html: `${watermark('PROFILE')}${back}${head('STATS', 'The person behind the projects.')}
      <section class="idcard" data-in>
        <div class="id-band"><span>ID · ${esc(resume.codename)}</span><span>${esc(resume.location)}</span></div>
        <div class="id-body">
          <figure class="gauge" aria-label="GPA ${esc(e.gpa)} out of 4.0">
            <svg viewBox="0 0 220 130" aria-hidden="true">
              <path class="g-bg" d="M20 115 A90 90 0 0 1 200 115" pathLength="100"/>
              <path class="g-fill" d="M20 115 A90 90 0 0 1 200 115" pathLength="100" style="--to:${(100 - Math.min(1, gpa / 4) * 100).toFixed(1)}"/>
              ${Array.from({ length: 9 }, (_, i) => {
                const a = Math.PI * (1 - i / 8);
                return `<line class="g-tick" x1="${110 + Math.cos(a) * 76}" y1="${115 - Math.sin(a) * 76}" x2="${110 + Math.cos(a) * 66}" y2="${115 - Math.sin(a) * 66}"/>`;
              }).join('')}
              <g class="g-wobble"><g class="g-needle" style="--a:${angle.toFixed(1)}deg"><polygon points="106,115 110,32 114,115"/></g></g>
              <circle cx="110" cy="115" r="11" class="g-hub"/>
            </svg>
            <figcaption><b>${esc(e.gpa)}</b><span>GPA / 4.00</span></figcaption>
          </figure>
          <div class="id-info">
            <h3>${esc(e.school)}</h3>
            <p>${esc(e.degree)}<br>Concentration: <b>${esc(e.concentration)}</b></p>
            <div class="id-chips"><span>DEAN’S LIST ×2</span><span>${esc(e.grad.toUpperCase())}</span><span>${esc(e.dates)}</span></div>
            <p class="id-honors">${esc(e.honors)}</p>
          </div>
        </div>
      </section>
      <ul class="traits">${resume.funFacts.map((f, i) => `<li class="trait t${i}" data-in><span aria-hidden="true">${icons[i] || '★'}</span>${esc(f)}</li>`).join('')}</ul>
      <blockquote class="motto-strip" data-in>“${esc(resume.motto.text)}”<cite>— ${esc(resume.motto.by)}</cite></blockquote>`,
    intro(root) {
      if (reducedMotion()) return;
      const needle = root.querySelector('.g-needle');
      gsap.fromTo(needle, { rotation: -90, svgOrigin: '110 115' }, { rotation: angle, svgOrigin: '110 115', duration: 1.1, ease: 'elastic.out(1.1, .35)', delay: 0.15 });
      gsap.fromTo(root.querySelector('.g-fill'), { strokeDashoffset: 100 }, { strokeDashoffset: 100 - Math.min(1, gpa / 4) * 100, duration: 0.7, ease: 'expo.out', delay: 0.15 });
    }
  };
}

function sideQuests() {
  const n = resume.sideQuests.length;
  let d = 'M50 0';
  for (let i = 0; i < n; i++) d += ` C ${i % 2 ? 90 : 10} ${i * 100 + 35}, ${i % 2 ? 10 : 90} ${i * 100 + 65}, 50 ${i * 100 + 100}`;
  return {
    title: 'SIDE QUESTS',
    html: `${watermark('ROUTE')}${back}${head('SIDE QUESTS', 'Not everything I learned came from a keyboard. Follow the route.')}
      <div class="route" style="--n:${n}">
        <svg class="route-line" viewBox="0 0 100 ${n * 100}" preserveAspectRatio="none" aria-hidden="true">
          <path class="route-under" d="${d}" pathLength="1"/><path class="route-dash" d="${d}"/>
        </svg>
        ${resume.sideQuests
          .map(
            (q, i) => `<article class="stop ${i % 2 ? 'right' : 'left'}" data-nav tabindex="0">
            <span class="stop-pin" aria-hidden="true">${i + 1}</span>
            <div class="stop-card">
              <div class="stop-head"><span class="stop-title">${esc(q.title)}</span><span class="stop-meta">${esc(q.place)} · ${esc(q.dates)}</span></div>
              <ul>${q.did.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
              <span class="lesson">${esc(q.lesson)}</span>
              <span class="stop-clear" aria-hidden="true">CLEAR</span>
            </div></article>`
          )
          .join('')}
      </div>`,
    intro(root) {
      if (reducedMotion()) return;
      const path = root.querySelector('.route-under');
      gsap.fromTo(path, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' });
      root.querySelectorAll('.stop').forEach((st, i) => {
        const at = 0.1 + i * 0.22;
        gsap.from(st.querySelector('.stop-pin'), { scale: 0, rotation: -120, duration: 0.3, ease: 'back.out(3)', delay: at, clearProps: 'transform' });
        gsap.from(st.querySelector('.stop-card'), { x: st.classList.contains('right') ? 160 : -160, skewX: st.classList.contains('right') ? -14 : 14, autoAlpha: 0, duration: 0.32, ease: 'back.out(2)', delay: at + 0.05, clearProps: 'transform,opacity,visibility' });
        gsap.from(st.querySelector('.stop-clear'), { scale: 3, rotation: -40, autoAlpha: 0, duration: 0.2, ease: 'power4.in', delay: at + 0.35, clearProps: 'transform,opacity,visibility' });
      });
    }
  };
}

function contact() {
  const L = resume.links;
  return {
    title: 'CONTACT',
    html: `${watermark('CALLING')}${back}${head('CONTACT')}
      <div class="card-stage"><div class="pg-rays" aria-hidden="true"></div><div class="ccard" id="ccard">
        <div class="ccard-face ccard-front" aria-hidden="true"><div class="ccard-emblem"></div></div>
        <div class="ccard-face ccard-back">
          <span class="ccard-name">${esc(resume.name)}</span>
          <span class="ccard-code">${esc(resume.codename)}</span>
          <span class="ccard-role">${esc(resume.role)} · ${esc(resume.education.school)}, ${esc(resume.education.grad)}</span>
          <span class="ccard-line">${esc(resume.location)} · ${esc(resume.status)}</span>
        </div>
      </div></div>
      <div class="contact-btns" data-in>
        <a class="btn btn-primary" data-nav href="${esc(L.linkedin)}" target="_blank" rel="noopener" data-track="linkedin_click">in · Connect on LinkedIn ↗</a>
        <a class="btn" data-nav href="mailto:${esc(L.email)}" data-track="email_click">✉ ${esc(L.email)}</a>
        <a class="btn" data-nav href="${esc(L.github)}" target="_blank" rel="noopener" data-track="github_click">⌥ GitHub ↗</a>
        <a class="btn btn-accent" data-nav href="${esc(L.pdf)}" download data-track="pdf_click">⬇ PDF resume</a>
      </div>`,
    after(root) {
      const card = root.querySelector('#ccard');
      if (reducedMotion()) return;
      gsap.fromTo(card, { rotationY: 180, scale: 0.8 }, { rotationY: 0, scale: 1, duration: 0.6, ease: 'back.out(1.4)', delay: 0.1 });
      // the card follows the pointer in 3D, so it never sits frozen
      const stage = root.querySelector('.card-stage');
      const qx = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      const qy = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        qx(((e.clientX - r.left) / r.width - 0.5) * 22);
        qy(-((e.clientY - r.top) / r.height - 0.5) * 16);
      });
      stage.addEventListener('pointerleave', () => {
        qx(0);
        qy(0);
      });
    }
  };
}

function system() {
  const s = store.get().settings;
  const reduce = s.reduceMotion === null ? reducedMotion() : s.reduceMotion;
  return {
    title: 'SYSTEM',
    html: `${watermark('CONFIG')}${back}${head('SYSTEM')}
      <div class="sys-grid">
        <section class="sys jag light" data-in>
          <h3>RESUME</h3>
          <div class="row">One-page version <a class="btn" data-nav href="#/quick">⚡ Quick View</a></div>
          <div class="row">Standard PDF <a class="btn" data-nav href="${esc(resume.links.pdf)}" download data-track="pdf_click">⬇ Download</a></div>
        </section>
        <section class="sys jag light" data-in>
          <h3>SETTINGS</h3>
          <div class="row">Sound <button class="toggle" type="button" data-nav data-toggle="sound" aria-pressed="${s.sound}">${s.sound ? 'ON' : 'OFF'}</button></div>
          <div class="row"><label for="musicVol">Music volume</label><input id="musicVol" type="range" min="0" max="1" step="0.05" value="${s.music}" data-nav></div>
          <div class="row">Reduce motion <button class="toggle" type="button" data-nav data-toggle="motion" aria-pressed="${reduce}">${reduce ? 'ON' : 'OFF'}</button></div>
        </section>
        <section class="sys jag light" data-in style="grid-column:1/-1">
          <h3>ACHIEVEMENTS</h3>
          ${listMarkup()}
          ${allFound() ? '<p style="margin:14px 0 0"><a class="btn" data-nav href="#/secret">★ Behind the scenes</a></p>' : ''}
        </section>
      </div>`
  };
}

function secret() {
  return {
    title: 'BEHIND THE SCENES',
    html: `${back}${head('BEHIND THE SCENES', 'You found every secret. Here is how this site was made.')}
      <div class="sq-list bts">
        <article class="sq jag light" data-in><h3>THE CREW</h3><p>Same workflow as my projects: an orchestrator agent planned it, a researcher agent checked the details, a builder agent wrote the code, and I directed and reviewed every step. Every click path is covered by automated browser tests.</p></article>
        <article class="sq jag light" data-in><h3>THE ART</h3><p>Everything you see is code: the spray-painted wall, the torn posters, the stickers and the page rip are inline SVG and CSS. No images were downloaded to make the title screen appear.</p></article>
        <article class="sq jag light" data-in><h3>THE SOUND</h3><p>Every click is a drum hit. I play drums, so the plan is my own e-kit recordings; until then the kit is synthesized in the browser.</p></article>
        <article class="sq jag light" data-in><blockquote class="motto" style="margin:0">“${esc(resume.motto.text)}”<cite>— ${esc(resume.motto.by)}</cite></blockquote></article>
      </div>`
  };
}

export const SECTION_RENDERERS = {
  missions,
  skills,
  different,
  stats,
  'side-quests': sideQuests,
  contact,
  system,
  secret
};
