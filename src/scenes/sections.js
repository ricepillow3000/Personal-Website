import { gsap } from 'gsap';
import { resume } from '../data/resume.js';
import { reorder } from '../data/companies.js';
import { store } from '../core/store.js';
import { esc, reducedMotion } from '../core/util.js';
import { listMarkup, allFound } from '../eggs/achievements.js';

/* Each section returns { title, html, after(root) }. Content comes from resume.js only. */

const back = '<button class="btn back-btn" type="button" data-back>◀ BACK <kbd>ESC</kbd></button>';
const head = (title, sub = '') => `
  <div class="page-head"><h2 class="ransom ransom-lg" data-ransom="${esc(title)}"></h2></div>
  ${sub ? `<p class="page-sub" data-in>${sub}</p>` : ''}`;
const cleared = (on) => (on ? '<span class="stamp stamp-cleared">CLEARED!</span>' : '');

/* Highlight numbers in a sentence with the yellow marker. */
const mark = (text) =>
  esc(text).replace(/(\d[\d,.]*\+?\s?(?:%|of \d[\d,]*|lines|tests|years|checks|errors|bugs|workflows)?|−\d+%)/g, '<span class="hl">$1</span>');

function missions(ctx) {
  const list = reorder(resume.missions, ctx.company?.order?.missions);
  return {
    title: 'MISSIONS',
    html: `${back}${head('MISSIONS', 'Two live apps. Pick a file to open it.')}
      <ul class="mlist">${list
        .map(
          (m) => `<li data-in><button class="mrow" type="button" data-nav data-mission="${m.id}">
            <span class="live">${esc(m.status)}</span>
            <span class="mname">${esc(m.name)}</span>
            <span class="grade" aria-label="Difficulty ${esc(m.grade)}">${esc(m.grade)}</span>
            <span class="mtarget"><b>TARGET</b>${esc(m.target)}</span>
            <span class="mbrief">${esc(m.brief)}</span>
            ${cleared(store.has('opened', m.id))}
          </button></li>`
        )
        .join('')}</ul>`
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
export function animateDossier(root) {
  if (reducedMotion()) return gsap.timeline();
  const tl = gsap.timeline();
  tl.from(root.querySelector('.dossier'), { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', duration: 0.35, ease: 'power3.out' })
    .from(root.querySelectorAll('.obj li'), { x: -30, opacity: 0, duration: 0.22, stagger: 0.12 }, '-=0.05')
    .from(root.querySelectorAll('.loot li'), { scale: 0.3, rotation: -14, opacity: 0, duration: 0.25, ease: 'back.out(2.4)', stagger: 0.08 }, '-=0.2')
    .from(root.querySelector('.stamp-big'), { scale: 3.2, opacity: 0, rotation: -50, duration: 0.25, ease: 'back.out(1.6)' }, '+=0.05');
  return tl;
}

function skills(ctx) {
  const list = reorder(resume.skills, ctx.company?.order?.skills);
  return {
    title: 'SKILLS',
    html: `${back}${head('SKILLS', 'Ranks come with receipts. Max rank is 10.')}
      <ol class="ranks">${list
        .map((s, i) => {
          const max = s.rank === 'MAX';
          return `<li class="rank-row ${i < 3 ? 'top' : ''}" data-in data-nav tabindex="0">
            <span class="rank-name">${esc(s.name)}</span>
            <span class="rank-badge ${max ? 'max' : ''}">RANK <b>${esc(s.rank)}</b></span>
            <span class="rank-proof">${esc(s.proof)}</span></li>`;
        })
        .join('')}</ol>`
  };
}

function different() {
  return {
    title: 'DIFFERENT',
    html: `${back}${head('WHAT MAKES ME DIFFERENT', 'Four facts. No pitch.')}
      <div class="cards4">${resume.different
        .map((d, i) => `<article class="dcard jag light" data-in data-nav tabindex="0"><span class="dnum">${i + 1}</span><h3>${esc(d.title)}</h3><p>${mark(d.fact)}</p></article>`)
        .join('')}</div>`
  };
}

function stats() {
  const e = resume.education;
  return {
    title: 'STATS',
    html: `${back}${head('STATS', 'The person behind the projects.')}
      <div class="stats-grid">
        <section class="statbox jag light" data-in>
          <h3>ACADEMICS</h3>
          <p style="margin:0;font-weight:800;font-size:18px">${esc(e.school)}</p>
          <p style="margin:2px 0 0">${esc(e.degree)}<br>Concentration: ${esc(e.concentration)} · ${esc(e.grad)}</p>
          <div class="big-stats"><div><b>${esc(e.gpa)}</b>GPA</div><div><b>×2</b>DEAN’S LIST</div><div><b>2029</b>GRAD</div></div>
          <p style="margin:0;font-size:14px">${esc(e.honors)}</p>
        </section>
        <section class="statbox jag light" data-in>
          <h3>OFF THE CLOCK</h3>
          <ul class="facts">${resume.funFacts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
          <blockquote class="motto">“${esc(resume.motto.text)}”<cite>— ${esc(resume.motto.by)}</cite></blockquote>
        </section>
      </div>`
  };
}

function sideQuests() {
  return {
    title: 'SIDE QUESTS',
    html: `${back}${head('SIDE QUESTS', 'Not everything I learned came from a keyboard.')}
      <div class="sq-list">${resume.sideQuests
        .map(
          (q) => `<article class="sq jag light" data-in data-nav tabindex="0">
          <div class="sq-head"><span class="sq-title">${esc(q.title)}</span><span class="sq-meta">${esc(q.place)} · ${esc(q.dates)}</span></div>
          <ul>${q.did.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
          <span class="lesson">${esc(q.lesson)}</span></article>`
        )
        .join('')}</div>`
  };
}

function contact() {
  const L = resume.links;
  return {
    title: 'CONTACT',
    html: `${back}${head('CONTACT')}
      <div class="card-stage"><div class="ccard" id="ccard">
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
    }
  };
}

function system() {
  const s = store.get().settings;
  const reduce = s.reduceMotion === null ? reducedMotion() : s.reduceMotion;
  return {
    title: 'SYSTEM',
    html: `${back}${head('SYSTEM')}
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
        <article class="sq jag light" data-in><h3>THE ART</h3><p>Everything you see is code: the spray-painted wall, the graffiti tag, the stencils and the walking crowd are inline SVG and canvas. No images were downloaded to make the title screen appear.</p></article>
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
