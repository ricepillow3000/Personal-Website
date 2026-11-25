/* One chapter page, in its own file so a visitor only downloads the chapters they open (Nov 21, the
   code split; src/scenes/sections.js loads it). Returns { title, html, after(root), intro(root) };
   content comes from resume.js only. */
import { resume } from '../../data/resume.js';
import { SOUND_CREDITS } from '../../data/credits.js';
import { store } from '../../core/store.js';
import { esc, reducedMotion } from '../../core/util.js';
import { listMarkup, allFound } from '../../eggs/achievements.js';
import { back, head, watermark } from './common.js';

export default function system() {
  const s = store.get().settings;
  const reduce = s.reduceMotion === null ? reducedMotion() : s.reduceMotion;
  return {
    title: 'SETTINGS',
    html: `${watermark('CONFIG')}${back}${head('SETTINGS')}
      <div class="sys-grid">
        <section class="sys jag light" data-in>
          <h3>RESUME</h3>
          <div class="row">One-page version <a class="btn" data-nav href="#/quick">Quick View ▸</a></div>
          <div class="row">Standard PDF <a class="btn" data-nav href="${esc(resume.links.pdf)}" download data-track="pdf_click">↓ Download</a></div>
        </section>
        <section class="sys jag light" data-in>
          <h3>SETTINGS</h3>
          <div class="row">Sound <button class="toggle" type="button" data-nav data-toggle="sound" aria-pressed="${s.sound ? 'true' : 'false'}">${s.sound ? 'ON' : 'OFF'}</button></div>
          <div class="row"><label for="musicVol">Music volume</label><input id="musicVol" type="range" min="0" max="1" step="0.05" value="${Number(s.music) || 0}" data-nav></div>
          <div class="row">Reduce motion <button class="toggle" type="button" data-nav data-toggle="motion" aria-pressed="${reduce ? 'true' : 'false'}">${reduce ? 'ON' : 'OFF'}</button></div>
        </section>
        <section class="sys jag light" data-in style="grid-column:1/-1">
          <h3>ACHIEVEMENTS</h3>
          ${listMarkup()}
          ${allFound() ? `<p class="ach-cut"><a class="btn" data-nav href="#/secret">★ OPEN THE DIRECTOR'S CUT</a></p>` : ''}
        </section>
        <section class="sys jag light sys-credits" data-in style="grid-column:1/-1">
          <h3>SOUND CREDITS</h3>
          <p>Most sounds are synthesized live. These are real recordings, free under Creative Commons:</p>
          <ul>${SOUND_CREDITS.map((c) => `<li><b>${esc(c.what)}</b> · <a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">${esc(c.pack)}</a> by ${c.authorUrl ? `<a href="${esc(c.authorUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.author)}</a>` : esc(c.author)} · <a href="${esc(c.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(c.license)}</a>${c.changes ? ` · ${esc(c.changes)}` : ''}</li>`).join('')}</ul>
        </section>
      </div>
      <p class="legal">Independent, non-commercial personal portfolio inspired by Persona 5. Persona 5 and related marks are trademarks of ATLUS / SEGA. No affiliation implied. Copyright 2026 John Nguyen. <a href="privacy.html">Privacy and terms</a></p>`,
    after(root) {
      // the slider's red runs as far as its knob (the track is drawn by the page, not the browser)
      const vol = root.querySelector('#musicVol');
      const fill = () => vol.style.setProperty('--fill', `${Math.round(Number(vol.value) * 100)}%`);
      if (vol) { fill(); vol.addEventListener('input', fill); }
    }
  };
}
