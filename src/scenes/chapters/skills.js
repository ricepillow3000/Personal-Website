/* One chapter page, in its own file so a visitor only downloads the chapters they open (Nov 21, the
   code split; src/scenes/sections.js loads it). Returns { title, html, after(root), intro(root) };
   content comes from resume.js only. */
import { gsap } from 'gsap';
import { resume } from '../../data/resume.js';
import { reorder } from '../../data/companies.js';
import { esc, reducedMotion } from '../../core/util.js';
import { sfx } from '../../audio/audio.js';
import { back, head, watermark, slamIn } from './common.js';

let crewResize = null;
let crewResizeBound = false;
let skillSoundAt = 0;
export default function skills(ctx) {
  const list = reorder(resume.skills, ctx.company?.order?.skills);
  const lv = (r) => (r === 'MAX' ? 10 : Number(r) || 0);
  const total = resume.missions.length;
  return {
    title: 'SKILLS',
    html: `${watermark('LEVELS')}${back}${head('SKILLS', `Level out of 10. ${window.matchMedia?.('(pointer: coarse)').matches ? 'Tap' : 'Point at'} a skill to see where I proved it.`)}
      <div class="crew">
        <div class="crew-star" aria-hidden="true"></div>
                <div class="crew-board">
        <span class="crew-cursor" aria-hidden="true"><i></i></span>
        <ol class="crew-list">
          ${list
            .map((s, i) => {
              const n = lv(s.rank);
              const tag = i === 0 ? '<span class="crew-tag" aria-hidden="true"><b>CORE</b></span>' : i === 3 ? '<span class="crew-tag" aria-hidden="true"><b>KIT</b></span>' : '';
              return `<li class="crew-row" data-nav tabindex="0" data-proof="${esc(s.proof)} · used in ${s.uses.length} of ${total} live apps" data-name="${esc(s.name)}"
                aria-label="${esc(s.name)}: level ${esc(s.rank)}, used in ${s.uses.length} of ${total} projects. ${esc(s.proof)}">
                ${tag}
                <span class="crew-name" aria-hidden="true">${esc(s.name)}</span>
                <span class="crew-dot" aria-hidden="true">${n >= 8 ? '<i class="crew-spark"></i>' : '•'}</span>
                <span class="crew-lv" aria-hidden="true"><small>LV</small>${n >= 10 ? 'MAX' : n}</span>
                <span class="crew-m${n >= 10 ? ' crew-max' : ''}" aria-hidden="true">${Array.from({ length: 10 }, (_, k) => `<b style="--k:${k}"${k < n ? ` class="f${k === n - 1 ? ' t' : ''}"` : ''}></b>`).join('')}</span>
              </li>`;
            })
            .join('')}
        </ol>
        <div class="crew-detail" aria-hidden="true">
          <b class="cd-name"></b>
          <span class="cd-rank"><small>LV</small><b class="cd-lv"></b></span>
          <span class="cd-stars">${'<i></i>'.repeat(5)}</span>
          <p class="cd-proof"></p>
        </div>
        </div>
        <div class="crew-side" aria-hidden="true">
          <div class="ransom crew-word" data-ransom="RECEIPTS"></div>
          <p class="crew-ask">Which skill do you want proof of?</p>
        </div>
      </div>`,
    after(root) {
      const rows = [...root.querySelectorAll('.crew-row')];
      const cursor = root.querySelector('.crew-cursor');
      const say = root.querySelector('.crew-detail');
      let current = null;
      // the highlight follows its row's real size: fonts arriving or a resize change the row heights
      // the highlight starts just left of the longest name, so a long name is never cut off
      const fitLeft = () => {
        const left = Math.min(...rows.map((r) => r.offsetLeft + r.querySelector('.crew-name').offsetLeft));
        if (Number.isFinite(left)) cursor.style.setProperty('--cl', `${Math.max(0, left - 26)}px`);
      };
      const resync = () => { fitLeft(); if (current) gsap.set(cursor, { y: current.offsetTop, height: current.offsetHeight }); };
      if (window.ResizeObserver) new ResizeObserver(resync).observe(root.querySelector('.crew-list'));
      document.fonts?.ready.then(resync);
      const select = (row, instant) => {
        if (!row || row === current) return;
        current = row;
        rows.forEach((r) => r.classList.toggle('on', r === row));
        // the detail strip under the list: name, level, five stars (a star per two levels), the receipt
        const lvTxt = row.querySelector('.crew-lv').lastChild.textContent;
        const lvNum = lvTxt === 'MAX' ? 10 : Number(lvTxt);
        say.querySelector('.cd-name').textContent = row.dataset.name;
        say.querySelector('.cd-lv').textContent = lvTxt;
        say.querySelectorAll('.cd-stars i').forEach((st, k) => st.classList.toggle('on', k < Math.round(lvNum / 2)));
        say.querySelector('.cd-proof').textContent = row.dataset.proof;
        // heard on every pick, mouse, finger or keyboard: the meter's level-up climbs as high as the skill
        // ranks (a fast sweep down the list gets the short tick instead, so it never smears)
        if (!instant) {
          const now = performance.now();
          sfx(now - skillSoundAt > 140 ? 'skillUp' : 'hvRow', lvNum);
          skillSoundAt = now;
        }
        const to = { y: row.offsetTop, height: row.offsetHeight };
        if (instant || reducedMotion()) {
          gsap.set(cursor, to);
          return;
        }
        gsap.to(cursor, { ...to, duration: 0.2, ease: 'back.out(2.2)', overwrite: true });
        gsap.fromTo(cursor.firstElementChild, { scaleX: 0.6 }, { scaleX: 1, duration: 0.22, ease: 'back.out(2.6)' });
        gsap.fromTo(say.children, { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.2, ease: 'back.out(2.4)', stagger: 0.03, clearProps: 'transform,opacity' });
        // the meter levels up: its blocks pop in one by one, the tip star spins on, the LV counts up
        gsap.fromTo(row.querySelectorAll('.crew-m b.f'), { scaleY: 0.2, y: 6 }, { scaleY: 1, y: 0, duration: 0.22, ease: 'back.out(3)', stagger: 0.03, clearProps: 'transform' });
        const lvEl = say.querySelector('.cd-lv');
        if (lvTxt !== 'MAX') {
          const c = { v: 0 };
          gsap.to(c, { v: lvNum, duration: 0.3, ease: 'power2.out', onUpdate: () => { lvEl.textContent = String(Math.round(c.v)); } });
        }
      };
      rows.forEach((r) => {
        r.addEventListener('pointerenter', () => select(r));
        r.addEventListener('focus', () => select(r));
        // tapping the skill that is already picked still answers (the first one starts picked)
        r.addEventListener('click', () => {
          if (r !== current || performance.now() - skillSoundAt < 300) return;
          const t = r.querySelector('.crew-lv').lastChild.textContent;
          sfx('skillUp', t === 'MAX' ? 10 : Number(t));
          skillSoundAt = performance.now();
        });
      });
      requestAnimationFrame(() => { fitLeft(); select(rows[0], true); });
      // one shared listener for every visit (the old page is gone, so only the live cursor is moved)
      crewResize = () => cursor.isConnected && resync();
      if (!crewResizeBound) {
        crewResizeBound = true;
        window.addEventListener('resize', () => crewResize?.(), { passive: true });
      }
    },
    intro(root) {
      if (reducedMotion()) return;
      slamIn(root.querySelectorAll('.crew-row'), { x: 160, skewX: -22, autoAlpha: 0 }, { stagger: 0.04, duration: 0.26 });
      gsap.from(root.querySelector('.crew-star'), { scale: 0, rotation: -180, duration: 0.5, ease: 'back.out(1.8)', clearProps: 'transform' });
      gsap.from(root.querySelector('.crew-cursor i'), { scaleX: 0, duration: 0.3, ease: 'back.out(2.4)', delay: 0.25 });
    }
  };
}
