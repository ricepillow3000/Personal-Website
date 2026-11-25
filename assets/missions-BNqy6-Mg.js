import{r as n,a as c,e as a,i as r,b as p,g as i,c as d}from"./main-BfvvJFMO.js";import{b as u,s as $,w as h,h as b,c as y,E as l,a as f}from"./common-08FAouPq.js";function S(s){const t=n(c.missions,s.company?.order?.missions);return{title:"MISSIONS",html:`${h("TARGETS")}${u}${b("MISSIONS","Two problems I set out to solve. Open a file for the whole story.")}
      <ul class="wanted">${t.map((e,o)=>`<li class="wanted-slot" style="--tilt:${o%2?2.4:-2.8}deg;--d:${o*-1.3}s">
          <button class="poster" type="button" data-nav data-mission="${e.id}">
            <span class="poster-tape" aria-hidden="true"></span>
            <span class="poster-top"><span>TARGET 0${o+1}</span><span class="poster-live">${a(e.status)}</span></span>
            <span class="poster-grade" aria-label="Difficulty ${a(e.grade)}">${a(e.grade)}</span>
            <span class="poster-name">${a(e.target)}</span>
            <span class="poster-target">${a(e.name)}</span>
            <span class="poster-stack">${a((e.stack||[]).join(" · "))}</span>
            <span class="poster-brief">${a(e.brief)}</span>
            <span class="poster-open">OPEN FILE ▸</span>
            ${y(r(e.id))}
          </button></li>`).join("")}</ul>`,intro(e){$(e.querySelectorAll(".poster"),{y:-140,rotation:o=>o%2?24:-24,scale:1.25,autoAlpha:0},{stagger:.09})}}}function k(s){return`<div class="dossier" data-id="${s.id}">
    <button class="modal-x" type="button" data-close aria-label="Close">✕</button>
    <header class="dossier-head">
      <p class="dossier-code">MISSION FILE · ${a(s.dates)}</p>
      <h2 class="dossier-title ransom" id="modalTitle" data-ransom="${a(s.target.toUpperCase())}">${a(s.target)}</h2>
      <p class="dossier-sub">${a(s.name)} · <span class="dossier-live">${a(s.status)}</span></p>
      <ul class="dossier-stack">${s.stack.map(t=>`<li>${a(t)}</li>`).join("")}</ul>
    </header>
    <div class="dossier-links">
      <a class="btn" href="${a(s.live)}" target="_blank" rel="noopener noreferrer" data-track="live_${s.id}" data-clear="${s.id}">Try it live ${l}</a>
      <a class="btn" href="${a(s.repo)}" target="_blank" rel="noopener noreferrer" data-track="repo_${s.id}" data-clear="${s.id}">Code on GitHub ${l}</a>
    </div>
    <p class="dossier-hint">${r(s.id)?"Case cleared. Thanks for checking it out.":"Visit the live app or the code to clear this case."}</p>
    ${s.story?`<section class="story" aria-label="The story"><h3>THE STORY</h3>${f(s.story)}</section>`:""}
    <div class="dossier-cols">
      <div><h3>OBJECTIVES</h3><ul class="obj">${s.objectives.map(t=>`<li>${a(t)}</li>`).join("")}</ul></div>
      <div><h3>LOOT</h3><ul class="loot">${s.loot.map(t=>`<li>${a(t)}</li>`).join("")}</ul></div>
    </div>
    ${r(s.id)?d():""}
  </div>`}function T(s,t){if(p())return i.timeline();const e=i.timeline();return e.fromTo(s,{scale:1.25,rotation:-5,y:-50,opacity:0},{scale:1,rotation:0,y:0,opacity:1,duration:.2,ease:"power4.in",clearProps:"transform,opacity"}).from(s.querySelector(".dossier"),{clipPath:"polygon(0 0, 0 0, 0 100%, 0 100%)",duration:.3,ease:"expo.out"},.14).from(s.querySelectorAll(".obj li"),{x:-50,skewX:-18,opacity:0,duration:.24,ease:"expo.out",stagger:.08},"-=0.12").from(s.querySelectorAll(".loot li"),{scale:.2,rotation:-20,opacity:0,duration:.3,ease:"back.out(3)",stagger:.06},"-=0.18").add(()=>t?.()),e}export{T as animateDossier,S as default,k as dossierMarkup};
