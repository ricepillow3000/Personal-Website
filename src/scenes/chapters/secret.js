/* One chapter page, in its own file so a visitor only downloads the chapters they open (Nov 21, the
   code split; src/scenes/sections.js loads it). Returns { title, html, after(root), intro(root) };
   content comes from resume.js only. */
import { resume } from '../../data/resume.js';
import { esc } from '../../core/util.js';
import { back, head } from './common.js';

export default function secret() {
  return {
    title: "DIRECTOR'S CUT",
    html: `${back}${head("DIRECTOR'S CUT", 'You found every secret. Here is how this site was made.')}
      <div class="sq-list bts">
        <article class="sq jag light" data-in><h3>THE CREW</h3><p>Same workflow as my projects. An orchestrator agent planned it, a researcher agent checked the details, a builder agent wrote the code, and I directed and reviewed every step. Every click path is covered by automated browser tests.</p></article>
        <article class="sq jag light" data-in><h3>THE ART</h3><p>The subway, the city, the train and the trash on the platform are cel-shaded art I directed Google's Nano Banana to generate. The train that roars past is drawn live in perspective by code, and every sticker, poster and comic shape is inline SVG and CSS.</p></article>
        <article class="sq jag light" data-in><h3>THE SOUND</h3><p>The music, every click, the wind on the fall and the train's horn are synthesized live in your browser. The trains, the breaking glass and a few hits (a whoosh, a paper slide, the stamp's clang, a passing car) are real recordings, free Creative Commons sounds, each kept only after an AI listening test picked it over the synthesized version.</p></article>
      </div>`
  };
}
