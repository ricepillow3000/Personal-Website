/* One chapter page, in its own file so a visitor only downloads the chapters they open (Nov 21, the
   code split; src/scenes/sections.js loads it). Returns { title, html, after(root), intro(root) };
   content comes from resume.js only. */
import { gsap } from 'gsap';
import { resume } from '../../data/resume.js';
import { esc, reducedMotion } from '../../core/util.js';
import { back, head, watermark } from './common.js';

export default function stats() {
  const e = resume.education;
  const gpa = Number(e.gpa) || 0;
  return {
    title: 'STATS',
    html: `${watermark('PROFILE')}${back}${head('STATS', 'The person behind the projects.')}
      <section class="idcard" data-in>
        <button class="gpa-burst" type="button" aria-label="Off the record. Press to flip for a secret stat." aria-pressed="false"><span class="gb-front"><b>???</b><small>OFF RECORD</small></span><span class="gb-back"><b>MAX</b><small>BEE FEAR</small></span></button>
        <div class="id-band"><span>ID · ${esc(resume.name.toUpperCase())}</span><span>${esc(resume.location)}</span></div>
        <div class="id-body">
          <figure class="gpa-card" aria-label="GPA ${esc(e.gpa)} out of 4.00">
            <span class="gpa-tag" aria-hidden="true">GPA</span>
            <div class="gpa-num" aria-hidden="true"><b data-to="${esc(e.gpa)}">${esc(e.gpa)}</b><span>/ 4.00</span></div>
            <div class="gpa-bar" aria-hidden="true" style="--v:${(Math.min(1, gpa / 4) * 100).toFixed(1)}%"><i></i></div>
          </figure>
          <div class="id-info">
            <h3>${esc(e.school)}</h3>
            <p>${esc(e.degree)}<br>Concentration: <b>${esc(e.concentration)}</b></p>
            <div class="id-chips"><span>DEAN’S LIST ×2</span><span>${esc(e.grad.toUpperCase())}</span><span>${esc(e.dates)}</span></div>
            <p class="id-honors">${esc(e.honors)}</p>
          </div>
        </div>
      </section>
      <ul class="traits">${resume.funFacts.map((f, i) => `<li class="trait t${i}" data-in><i class="ff-star" aria-hidden="true"></i>${esc(f)}</li>`).join('')}</ul>
      <blockquote class="motto-strip" data-in>“${esc(resume.motto.text)}”<cite>— ${esc(resume.motto.by)}</cite></blockquote>`,
    intro(root) {
      if (reducedMotion()) return;
      const num = root.querySelector('.gpa-num b');
      const v = { n: Math.min(3.5, gpa) };
      gsap.to(v, { n: gpa, duration: 0.7, ease: 'power3.out', delay: 0.1, onUpdate: () => (num.textContent = v.n.toFixed(2)) });
      gsap.from(root.querySelector('.gpa-bar i'), { scaleX: 0, duration: 0.6, ease: 'back.out(1.8)', delay: 0.15, clearProps: 'transform' });
      gsap.from(root.querySelector('.gpa-tag'), { scale: 2.4, rotation: -30, duration: 0.3, ease: 'back.out(2.5)', delay: 0.05, clearProps: 'transform' });
    }
  };
}
