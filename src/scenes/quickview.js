import { resume } from '../data/resume.js';
import { esc } from '../core/util.js';
import { ransom } from '../ui/ransom.js';

/* One-page, ATS-friendly resume. Readable text, red/black accents only. */
export function renderQuickView(el) {
  const r = resume;
  const e = r.education;
  const L = r.links;
  el.innerHTML = `
    <header>
      <h1 class="ransom" id="qName"></h1>
      <p class="q-hook">${esc(r.role)}. ${esc(r.hook)}</p>
      <div class="q-contact">
        <span>${esc(r.location)}</span>
        <a href="mailto:${esc(L.email)}" data-track="email_click">${esc(L.email)}</a>
        <a href="${esc(L.linkedin)}" target="_blank" rel="noopener" data-track="linkedin_click">LinkedIn</a>
        <a href="${esc(L.github)}" target="_blank" rel="noopener" data-track="github_click">GitHub</a>
      </div>
    </header>
    <div class="paper-body">
      <aside>
        <section>
          <h2>EDUCATION</h2>
          <h3>${esc(e.school)}</h3>
          <p class="meta">${esc(e.place)} · ${esc(e.dates)}</p>
          <p style="margin:0">${esc(e.degree)}</p>
          <ul><li>Concentration: ${esc(e.concentration)}</li><li>GPA: <span class="q-num">${esc(e.gpa)}</span></li><li>${esc(e.honors)}</li></ul>
        </section>
        <section>
          <h2>SKILLS</h2>
          <ul class="chips">${r.skillsLine.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </section>
        <section>
          <h2>LEADERSHIP</h2>
          ${r.sideQuests
            .slice(0, 1)
            .map((q) => `<h3>${esc(q.title)}</h3><p class="meta">${esc(q.place)} · ${esc(q.dates)}</p><ul>${q.did.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`)
            .join('')}
        </section>
      </aside>
      <div>
        <section>
          <h2>PROJECTS</h2>
          ${r.missions
            .map(
              (m) => `<h3><a href="${esc(m.live)}" target="_blank" rel="noopener">${esc(m.target)} — ${esc(m.name)}</a></h3>
              <p class="meta">${esc(m.stack.join(', '))} · ${esc(m.dates)} · <a href="${esc(m.repo)}" target="_blank" rel="noopener">code</a></p>
              <ul>${m.objectives.map((o) => `<li>${esc(o)}</li>`).join('')}<li><span class="q-num">${esc(m.loot.slice(0, 2).join(' · '))}</span></li></ul>`
            )
            .join('')}
        </section>
        <section>
          <h2>EXPERIENCE</h2>
          ${r.sideQuests
            .slice(1)
            .map((q) => `<h3>${esc(q.place)} — ${esc(q.title)}</h3><p class="meta">${esc(q.dates)}</p><ul>${q.did.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`)
            .join('')}
        </section>
      </div>
    </div>`;
  ransom(el.querySelector('#qName'), r.name.toUpperCase(), 3);
}
