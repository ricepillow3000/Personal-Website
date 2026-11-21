import{b as v,g as i,e as a,a as t}from"./main-CYGCKGZK.js";import{b as p,E as u,w as k,h as m}from"./common-D0IjVigK.js";function h(){const e=t.links;return{title:"CONTACT",html:`${k("CALLING")}${p}${m("CONTACT")}
      <div class="card-stage"><div class="pg-rays" aria-hidden="true"></div><div class="ccard" id="ccard">
        <div class="ccard-face ccard-front" aria-hidden="true"><div class="ccard-emblem"></div></div>
        <div class="ccard-face ccard-back">
          <span class="ccard-name">${a(t.name)}</span>
          <span class="ccard-role">${a(t.role)} · ${a(t.education.school)}, ${a(t.education.grad)}</span>
          <span class="ccard-line">${a(t.location)} · ${a(t.status)}</span>
        </div>
      </div></div>
      <div class="contact-btns" data-in>
        <a class="btn btn-primary" data-nav data-magnetic href="${a(e.linkedin)}" target="_blank" rel="noopener" data-track="linkedin_click">in · Connect on LinkedIn ${u}</a>
        <a class="btn" data-nav href="mailto:${a(e.email)}" data-track="email_click">${a(e.email)}</a>
        <a class="btn" data-nav href="${a(e.github)}" target="_blank" rel="noopener" data-track="github_click">GitHub ${u}</a>
        <a class="btn btn-accent" data-nav href="${a(e.pdf)}" download data-track="pdf_click">↓ PDF resume</a>
      </div>`,after(s){const n=s.querySelector("#ccard");if(v())return;i.fromTo(n,{rotationY:180,scale:.8},{rotationY:0,scale:1,duration:.6,ease:"back.out(1.4)",delay:.1});const r=s.querySelector(".card-stage"),d=i.quickTo(n,"rotationY",{duration:.5,ease:"power3.out"}),o=i.quickTo(n,"rotationX",{duration:.5,ease:"power3.out"});r.addEventListener("pointermove",l=>{const c=r.getBoundingClientRect();d(((l.clientX-c.left)/c.width-.5)*22),o(-((l.clientY-c.top)/c.height-.5)*16)}),r.addEventListener("pointerleave",()=>{d(0),o(0)})}}}export{h as default};
