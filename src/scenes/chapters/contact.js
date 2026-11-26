/* One chapter page, in its own file so a visitor only downloads the chapters they open (Nov 21, the
   code split; src/scenes/sections.js loads it). Returns { title, html, after(root), intro(root) };
   content comes from resume.js only. */
import { gsap } from 'gsap';
import { resume } from '../../data/resume.js';
import { esc, reducedMotion } from '../../core/util.js';
import { EXT, back, head, watermark } from './common.js';

export default function contact() {
  const L = resume.links;
  return {
    title: 'CONTACT',
    html: `${watermark('CALLING')}${back}${head('CONTACT')}
      <div class="card-stage"><div class="pg-rays-win" aria-hidden="true"><div class="pg-rays"></div></div><div class="ccard" id="ccard">
        <div class="ccard-face ccard-front" aria-hidden="true"><div class="ccard-emblem"></div></div>
        <div class="ccard-face ccard-back">
          <span class="ccard-name">${esc(resume.name)}</span>
          <span class="ccard-role">${esc(resume.role)}</span>
        </div>
      </div></div>
      <div class="contact-btns" data-in>
        <a class="btn btn-primary" data-nav data-magnetic href="${esc(L.linkedin)}" target="_blank" rel="noopener noreferrer" data-track="linkedin_click"><svg class="btn-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 2h20v20H2z M5.5 9.5h3v9h-3zM7 4.6a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5zM10.5 9.5h2.9v1.3c.5-.9 1.6-1.6 3.1-1.6 2.6 0 3.5 1.6 3.5 4.2v5.1h-3v-4.6c0-1.2-.3-2.1-1.4-2.1-1.2 0-1.6.9-1.6 2.1v4.6h-3z" fill="currentColor" fill-rule="evenodd"/></svg> Connect on LinkedIn ${EXT}</a>
        <a class="btn" data-nav href="mailto:${esc(L.email)}" data-track="email_click"><svg class="btn-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><mask id="ccMailCut"><rect width="24" height="24" fill="#fff"/><path d="M3.5 6.5 12 13l8.5-6.5" fill="none" stroke="#000" stroke-width="2.2" stroke-linejoin="miter"/></mask><path d="M2 5h20v14H2z" fill="currentColor" mask="url(#ccMailCut)"/></svg> ${esc(L.email)}</a>
        <a class="btn" data-nav href="${esc(L.github)}" target="_blank" rel="noopener noreferrer" data-track="github_click">GitHub ${EXT}</a>
        <a class="btn btn-accent" data-nav href="${esc(L.pdf)}" download data-track="pdf_click">↓ PDF resume</a>
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
