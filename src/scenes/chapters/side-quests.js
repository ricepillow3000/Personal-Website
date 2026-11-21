/* One chapter page, in its own file so a visitor only downloads the chapters they open (Nov 21, the
   code split; src/scenes/sections.js loads it). Returns { title, html, after(root), intro(root) };
   content comes from resume.js only. */
import { gsap } from 'gsap';
import { resume } from '../../data/resume.js';
import { esc, reducedMotion } from '../../core/util.js';
import { sfx } from '../../audio/audio.js';
import { back, head, watermark } from './common.js';

export default function sideQuests() {
  const n = resume.sideQuests.length;
  let d = 'M50 0';
  for (let i = 0; i < n; i++) d += ` C ${i % 2 ? 90 : 10} ${i * 100 + 35}, ${i % 2 ? 10 : 90} ${i * 100 + 65}, 50 ${i * 100 + 100}`;
  return {
    title: 'SIDE QUESTS',
    html: `${watermark('ROUTE')}${back}${head('SIDE QUESTS', 'Not everything I learned came from a keyboard.')}
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
              <p class="stop-stat"><b>${esc(q.stat[0])}</b><span>${esc(q.stat[1])}</span></p>
              <span class="lesson"><b class="ql-tag">REWARD ★</b><span class="ql-text">${esc(q.lesson)}</span></span>
              <span class="stop-clear${/present/i.test(q.dates) ? ' active' : ''}" aria-hidden="true">${/present/i.test(q.dates) ? 'ACTIVE' : 'CLEAR'}</span>
            </div></article>`
          )
          .join('')}
      </div>`,
    intro(root) {
      if (reducedMotion()) return;
      const path = root.querySelector('.route-under');
      gsap.fromTo(path, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut', clearProps: 'strokeDasharray,strokeDashoffset' });
      // every stop is heard once, the first time it is on screen: as its pin lands if it is on screen
      // from the start, else as it comes into view (one watcher, so a stop at the fold is never missed)
      const t0 = performance.now();
      const io = 'IntersectionObserver' in window && new IntersectionObserver((entries) => entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const i = Number(en.target.dataset.i);
        const wait = Math.max(0, (0.1 + i * 0.22 + 0.12) * 1000 - (performance.now() - t0)); // (never before its pin lands)
        setTimeout(() => root.isConnected && sfx('questPin', i), wait);
      }), { threshold: 0.15 });
      root.querySelectorAll('.stop').forEach((st, i) => {
        const at = 0.1 + i * 0.22;
        gsap.from(st.querySelector('.stop-pin'), { scale: 0, rotation: -120, duration: 0.3, ease: 'back.out(3)', delay: at, clearProps: 'transform' });
        st.dataset.i = String(i);
        if (io) io.observe(st);
        gsap.from(st.querySelector('.stop-card'), { x: st.classList.contains('right') ? 160 : -160, skewX: st.classList.contains('right') ? -14 : 14, autoAlpha: 0, duration: 0.32, ease: 'back.out(2)', delay: at + 0.05, clearProps: 'transform,opacity,visibility' });
        gsap.from(st.querySelector('.stop-clear'), { scale: 3, rotation: -40, autoAlpha: 0, duration: 0.2, ease: 'power4.in', delay: at + 0.35, clearProps: 'transform,opacity,visibility' });
      });
    }
  };
}
