import{b as u,g as n,e as a,a as i}from"./main-D7xjSmyb.js";import{b as k,E as v,w as m,h as p}from"./common-BI3duj6_.js";function g(){const e=i.links;return{title:"CONTACT",html:`${m("CALLING")}${k}${p("CONTACT")}
      <div class="card-stage"><div class="pg-rays-win" aria-hidden="true"><div class="pg-rays"></div></div><div class="ccard" id="ccard">
        <div class="ccard-face ccard-front" aria-hidden="true"><div class="ccard-emblem"></div></div>
        <div class="ccard-face ccard-back">
          <span class="ccard-name">${a(i.name)}</span>
          <span class="ccard-role">${a(i.role)}</span>
        </div>
      </div></div>
      <div class="contact-btns" data-in>
        <a class="btn btn-primary" data-nav data-magnetic href="${a(e.linkedin)}" target="_blank" rel="noopener noreferrer" data-track="linkedin_click">in · Connect on LinkedIn ${v}</a>
        <a class="btn" data-nav href="mailto:${a(e.email)}" data-track="email_click">${a(e.email)}</a>
        <a class="btn" data-nav href="${a(e.github)}" target="_blank" rel="noopener noreferrer" data-track="github_click">GitHub ${v}</a>
        <a class="btn btn-accent" data-nav href="${a(e.pdf)}" download data-track="pdf_click">↓ PDF resume</a>
      </div>`,after(d){const c=d.querySelector("#ccard");if(u())return;n.fromTo(c,{rotationY:180,scale:.8},{rotationY:0,scale:1,duration:.6,ease:"back.out(1.4)",delay:.1});const r=d.querySelector(".card-stage"),s=n.quickTo(c,"rotationY",{duration:.5,ease:"power3.out"}),o=n.quickTo(c,"rotationX",{duration:.5,ease:"power3.out"});r.addEventListener("pointermove",l=>{const t=r.getBoundingClientRect();s(((l.clientX-t.left)/t.width-.5)*22),o(-((l.clientY-t.top)/t.height-.5)*16)}),r.addEventListener("pointerleave",()=>{s(0),o(0)})}}}export{g as default};
