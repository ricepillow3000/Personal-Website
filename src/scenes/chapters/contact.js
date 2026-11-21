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
      <div class="card-stage"><div class="pg-rays" aria-hidden="true"></div><div class="ccard" id="ccard">
        <div class="ccard-face ccard-front" aria-hidden="true"><div class="ccard-emblem"></div></div>
        <div class="ccard-face ccard-back">
          <span class="ccard-name">${esc(resume.name)}</span>
          <span class="ccard-role">${esc(resume.role)} · ${esc(resume.education.school)}, ${esc(resume.education.grad)}</span>
          <span class="ccard-line">${esc(resume.location)} · ${esc(resume.status)}</span>
        </div>
      </div></div>
      <div class="contact-btns" data-in>
        <a class="btn btn-primary" data-nav data-magnetic href="${esc(L.linkedin)}" target="_blank" rel="noopener" data-track="linkedin_click">in · Connect on LinkedIn ${EXT}</a>
        <a class="btn" data-nav href="mailto:${esc(L.email)}" data-track="email_click">${esc(L.email)}</a>
        <a class="btn" data-nav href="${esc(L.github)}" target="_blank" rel="noopener" data-track="github_click">GitHub ${EXT}</a>
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
