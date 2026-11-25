/* One chapter page, in its own file so a visitor only downloads the chapters they open (Nov 21, the
   code split; src/scenes/sections.js loads it). Returns { title, html, after(root), intro(root) };
   content comes from resume.js only. */
import { gsap } from 'gsap';
import { resume } from '../../data/resume.js';
import { reorder } from '../../data/companies.js';
import { esc, reducedMotion } from '../../core/util.js';
import { clearStampMarkup, isCleared } from '../../ui/clear.js';
import { EXT, back, head, cleared, watermark, slamIn, storyList } from './common.js';

export default function missions(ctx) {
  const list = reorder(resume.missions, ctx.company?.order?.missions);
  return {
    title: 'MISSIONS',
    html: `${watermark('TARGETS')}${back}${head('MISSIONS', 'Two problems I set out to solve. Open a file for the whole story.')}
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
            <span class="poster-open">OPEN FILE ▸</span>
            ${cleared(isCleared(m.id))}
          </button></li>`
        )
        .join('')}</ul>`,
    intro(root) {
      slamIn(root.querySelectorAll('.poster'), { y: -140, rotation: (i) => (i % 2 ? 24 : -24), scale: 1.25, autoAlpha: 0 }, { stagger: 0.09 });
    }
  };
}

export function dossierMarkup(m) {
  return `<div class="dossier" data-id="${m.id}">
    <button class="modal-x" type="button" data-close aria-label="Close">✕</button>
    <header class="dossier-head">
      <p class="dossier-code">MISSION FILE · ${esc(m.dates)}</p>
      <h2 class="dossier-title ransom" id="modalTitle" data-ransom="${esc(m.target.toUpperCase())}">${esc(m.target)}</h2>
      <p class="dossier-sub">${esc(m.name)} · <span class="dossier-live">${esc(m.status)}</span></p>
      <ul class="dossier-stack">${m.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </header>
    <div class="dossier-links">
      <a class="btn" href="${esc(m.live)}" target="_blank" rel="noopener noreferrer" data-track="live_${m.id}" data-clear="${m.id}">Try it live ${EXT}</a>
      <a class="btn" href="${esc(m.repo)}" target="_blank" rel="noopener noreferrer" data-track="repo_${m.id}" data-clear="${m.id}">Code on GitHub ${EXT}</a>
    </div>
    <p class="dossier-hint">${isCleared(m.id) ? 'Case cleared. Thanks for checking it out.' : 'Visit the live app or the code to clear this case.'}</p>
    ${m.story ? `<section class="story" aria-label="The story"><h3>THE STORY</h3>${storyList(m.story)}</section>` : ''}
    <div class="dossier-cols">
      <div><h3>OBJECTIVES</h3><ul class="obj">${m.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div>
      <div><h3>LOOT</h3><ul class="loot">${m.loot.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>
    </div>
    ${isCleared(m.id) ? clearStampMarkup() : ''}
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
    .add(() => onLand?.());
  return tl;
}
