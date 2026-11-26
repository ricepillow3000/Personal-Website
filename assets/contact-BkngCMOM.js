import{b as h,g as c,e as a,a as n}from"./main-DIpvbAX5.js";import{b as u,E as v,w as f,h as k}from"./common-TrjWRssN.js";function g(){const t=n.links;return{title:"CONTACT",html:`${f("CALLING")}${u}${k("CONTACT")}
      <div class="card-stage"><div class="pg-rays-win" aria-hidden="true"><div class="pg-rays"></div></div><div class="ccard" id="ccard">
        <div class="ccard-face ccard-front" aria-hidden="true"><div class="ccard-emblem"></div></div>
        <div class="ccard-face ccard-back">
          <span class="ccard-name">${a(n.name)}</span>
          <span class="ccard-role">${a(n.role)}</span>
        </div>
      </div></div>
      <div class="contact-btns" data-in>
        <a class="btn btn-primary" data-nav data-magnetic href="${a(t.linkedin)}" target="_blank" rel="noopener noreferrer" data-track="linkedin_click"><svg class="btn-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M2 2h20v20H2z M5.5 9.5h3v9h-3zM7 4.6a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5zM10.5 9.5h2.9v1.3c.5-.9 1.6-1.6 3.1-1.6 2.6 0 3.5 1.6 3.5 4.2v5.1h-3v-4.6c0-1.2-.3-2.1-1.4-2.1-1.2 0-1.6.9-1.6 2.1v4.6h-3z" fill="currentColor" fill-rule="evenodd"/></svg> Connect on LinkedIn ${v}</a>
        <a class="btn" data-nav href="mailto:${a(t.email)}" data-track="email_click"><svg class="btn-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><mask id="ccMailCut"><rect width="24" height="24" fill="#fff"/><path d="M3.5 6.5 12 13l8.5-6.5" fill="none" stroke="#000" stroke-width="2.2" stroke-linejoin="miter"/></mask><path d="M2 5h20v14H2z" fill="currentColor" mask="url(#ccMailCut)"/></svg> ${a(t.email)}</a>
        <a class="btn" data-nav href="${a(t.github)}" target="_blank" rel="noopener noreferrer" data-track="github_click">GitHub ${v}</a>
        <a class="btn btn-accent" data-nav href="${a(t.pdf)}" download data-track="pdf_click">↓ PDF resume</a>
      </div>`,after(d){const r=d.querySelector("#ccard");if(h())return;c.fromTo(r,{rotationY:180,scale:.8},{rotationY:0,scale:1,duration:.6,ease:"back.out(1.4)",delay:.1});const i=d.querySelector(".card-stage"),s=c.quickTo(r,"rotationY",{duration:.5,ease:"power3.out"}),o=c.quickTo(r,"rotationX",{duration:.5,ease:"power3.out"});i.addEventListener("pointermove",l=>{const e=i.getBoundingClientRect();s(((l.clientX-e.left)/e.width-.5)*22),o(-((l.clientY-e.top)/e.height-.5)*16)}),i.addEventListener("pointerleave",()=>{s(0),o(0)})}}}export{g as default};
