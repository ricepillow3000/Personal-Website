/* One chapter page, in its own file so a visitor only downloads the chapters they open (Nov 21, the
   code split; src/scenes/sections.js loads it). Returns { title, html, after(root), intro(root) };
   content comes from resume.js only. */
import { gsap } from 'gsap';
import { resume } from '../../data/resume.js';
import { esc, reducedMotion } from '../../core/util.js';
import { back, head, mark, watermark } from './common.js';

export default function different() {
  return {
    title: 'MY EDGE',
    html: `${watermark('FACTS')}${back}${head('MY EDGE', 'Where it all adds up. Four facts, no pitch.')}
      <div class="comic">${resume.different
        .map((d, i) => `<article class="panel panel-${i}" data-nav tabindex="0"><span class="panel-num" aria-hidden="true">${i + 1}</span><h3>${esc(d.title)}</h3><p>${mark(d.fact)}</p></article>`)
        .join('')}</div>`,
    intro(root) {
      if (reducedMotion()) return;
      const panels = [...root.querySelectorAll('.panel')];
      const page = root; // shake the content only (it is clipped), never the scrolling screen
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
