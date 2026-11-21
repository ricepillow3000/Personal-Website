import{r as n,a as p,e as s,i,b as c,g as r,c as d}from"./main-CYGCKGZK.js";import{b as u,s as $,w as h,h as b,c as g,E as l}from"./common-D0IjVigK.js";function y(a){const t=n(p.missions,a.company?.order?.missions);return{title:"MISSIONS",html:`${h("TARGETS")}${u}${b("MISSIONS","Two live apps. Pick a target to open its file.")}
      <ul class="wanted">${t.map((e,o)=>`<li class="wanted-slot" style="--tilt:${o%2?2.4:-2.8}deg;--d:${o*-1.3}s">
          <button class="poster" type="button" data-nav data-mission="${e.id}">
            <span class="poster-tape" aria-hidden="true"></span>
            <span class="poster-top"><span>TARGET 0${o+1}</span><span class="poster-live">${s(e.status)}</span></span>
            <span class="poster-grade" aria-label="Difficulty ${s(e.grade)}">${s(e.grade)}</span>
            <span class="poster-name">${s(e.target)}</span>
            <span class="poster-target">${s(e.name)}</span>
            <span class="poster-stack">${s((e.stack||[]).join(" · "))}</span>
            <span class="poster-brief">${s(e.brief)}</span>
            <span class="poster-open">OPEN FILE ▸</span>
            ${g(i(e.id))}
          </button></li>`).join("")}</ul>`,intro(e){$(e.querySelectorAll(".poster"),{y:-140,rotation:o=>o%2?24:-24,scale:1.25,autoAlpha:0},{stagger:.09})}}}function k(a){return`<div class="dossier" data-id="${a.id}">
    <button class="modal-x" type="button" data-close aria-label="Close">✕</button>
    <header class="dossier-head">
      <p class="dossier-code">MISSION FILE · ${s(a.dates)}</p>
      <h2 class="dossier-title ransom" id="modalTitle" data-ransom="${s(a.target.toUpperCase())}">${s(a.target)}</h2>
      <p class="dossier-sub">${s(a.name)} · <span class="dossier-live">${s(a.status)}</span></p>
      <ul class="dossier-stack">${a.stack.map(t=>`<li>${s(t)}</li>`).join("")}</ul>
    </header>
    <div class="dossier-links">
      <a class="btn" href="${s(a.live)}" target="_blank" rel="noopener" data-track="live_${a.id}" data-clear="${a.id}">Try it live ${l}</a>
      <a class="btn" href="${s(a.repo)}" target="_blank" rel="noopener" data-track="repo_${a.id}" data-clear="${a.id}">Code on GitHub ${l}</a>
    </div>
    <p class="dossier-hint">${i(a.id)?"Case cleared. Thanks for checking it out.":"Visit the live app or the code to clear this case."}</p>
    <div class="dossier-cols">
      <div><h3>OBJECTIVES</h3><ul class="obj">${a.objectives.map(t=>`<li>${s(t)}</li>`).join("")}</ul></div>
      <div><h3>LOOT</h3><ul class="loot">${a.loot.map(t=>`<li>${s(t)}</li>`).join("")}</ul></div>
    </div>
    ${i(a.id)?d():""}
  </div>`}function S(a,t){if(c())return r.timeline();const e=r.timeline();return e.fromTo(a,{scale:1.25,rotation:-5,y:-50,opacity:0},{scale:1,rotation:0,y:0,opacity:1,duration:.2,ease:"power4.in",clearProps:"transform,opacity"}).from(a.querySelector(".dossier"),{clipPath:"polygon(0 0, 0 0, 0 100%, 0 100%)",duration:.3,ease:"expo.out"},.14).from(a.querySelectorAll(".obj li"),{x:-50,skewX:-18,opacity:0,duration:.24,ease:"expo.out",stagger:.08},"-=0.12").from(a.querySelectorAll(".loot li"),{scale:.2,rotation:-20,opacity:0,duration:.3,ease:"back.out(3)",stagger:.06},"-=0.18").add(()=>t?.()),e}export{S as animateDossier,y as default,k as dossierMarkup};
