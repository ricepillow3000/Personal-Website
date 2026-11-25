import{r as A,a as y,b,g as r,s as S,e as d}from"./main-C9JZSz4z.js";import{b as C,s as M,w as T,h as X}from"./common-DDsF8TIb.js";let $=null,g=!1,f=0;function P(k){const L=A(y.skills,k.company?.order?.skills),q=e=>e==="MAX"?10:Number(e)||0,h=y.missions.length;return{title:"SKILLS",html:`${T("LEVELS")}${C}${X("SKILLS",`Level out of 10. ${window.matchMedia?.("(pointer: coarse)").matches?"Tap":"Point at"} a skill to see where I proved it.`)}
      <div class="crew">
        <div class="crew-star" aria-hidden="true"></div>
                <div class="crew-board">
        <span class="crew-cursor" aria-hidden="true"><i></i></span>
        <ol class="crew-list">
          ${L.map((e,c)=>{const a=q(e.rank),o=c===0?'<span class="crew-tag" aria-hidden="true"><b>CORE</b></span>':c===3?'<span class="crew-tag" aria-hidden="true"><b>KIT</b></span>':"";return`<li class="crew-row" data-nav tabindex="0" data-proof="${d(e.proof)} · used in ${e.uses.length} of ${h} live apps" data-name="${d(e.name)}"
                aria-label="${d(e.name)}: level ${d(e.rank)}, used in ${e.uses.length} of ${h} projects. ${d(e.proof)}">
                ${o}
                <span class="crew-name" aria-hidden="true">${d(e.name)}</span>
                <span class="crew-dot" aria-hidden="true">${a>=8?'<i class="crew-spark"></i>':"•"}</span>
                <span class="crew-lv" aria-hidden="true"><small>LV</small>${a>=10?"MAX":a}</span>
                <span class="crew-m${a>=10?" crew-max":""}" aria-hidden="true">${Array.from({length:10},(l,i)=>`<b style="--k:${i}"${i<a?` class="f${i===a-1?" t":""}"`:""}></b>`).join("")}</span>
              </li>`}).join("")}
        </ol>
        <div class="crew-detail" aria-hidden="true">
          <b class="cd-name"></b>
          <span class="cd-rank"><small>LV</small><b class="cd-lv"></b></span>
          <span class="cd-stars">${"<i></i>".repeat(5)}</span>
          <p class="cd-proof"></p>
        </div>
        </div>
        <div class="crew-side" aria-hidden="true">
          <div class="ransom crew-word" data-ransom="RECEIPTS"></div>
          <p class="crew-ask">Which skill do you want proof of?</p>
        </div>
      </div>`,after(e){const c=[...e.querySelectorAll(".crew-row")],a=e.querySelector(".crew-cursor"),o=e.querySelector(".crew-detail");let l=null;const i=()=>{const t=Math.min(...c.map(n=>n.offsetLeft+n.querySelector(".crew-name").offsetLeft));Number.isFinite(t)&&a.style.setProperty("--cl",`${Math.max(0,t-26)}px`)},p=()=>{i(),l&&r.set(a,{y:l.offsetTop,height:l.offsetHeight})};window.ResizeObserver&&new ResizeObserver(p).observe(e.querySelector(".crew-list")),document.fonts?.ready.then(p);const m=(t,n)=>{if(!t||t===l)return;l=t,c.forEach(s=>s.classList.toggle("on",s===t));const u=t.querySelector(".crew-lv").lastChild.textContent,w=u==="MAX"?10:Number(u);if(o.querySelector(".cd-name").textContent=t.dataset.name,o.querySelector(".cd-lv").textContent=u,o.querySelectorAll(".cd-stars i").forEach((s,E)=>s.classList.toggle("on",E<Math.round(w/2))),o.querySelector(".cd-proof").textContent=t.dataset.proof,!n){const s=performance.now();S(s-f>140?"skillUp":"hvRow",w),f=s}const v={y:t.offsetTop,height:t.offsetHeight};if(n||b()){r.set(a,v);return}r.to(a,{...v,duration:.2,ease:"back.out(2.2)",overwrite:!0}),r.fromTo(a.firstElementChild,{scaleX:.6},{scaleX:1,duration:.22,ease:"back.out(2.6)"}),r.fromTo(o.children,{x:24,opacity:0},{x:0,opacity:1,duration:.2,ease:"back.out(2.4)",stagger:.03,clearProps:"transform,opacity"}),r.fromTo(t.querySelectorAll(".crew-m b.f"),{scaleY:.2,y:6},{scaleY:1,y:0,duration:.22,ease:"back.out(3)",stagger:.03,clearProps:"transform"});const x=o.querySelector(".cd-lv");if(u!=="MAX"){const s={v:0};r.to(s,{v:w,duration:.3,ease:"power2.out",onUpdate:()=>{x.textContent=String(Math.round(s.v))}})}};c.forEach(t=>{t.addEventListener("pointerenter",()=>m(t)),t.addEventListener("focus",()=>m(t)),t.addEventListener("click",()=>{if(t!==l||performance.now()-f<300)return;const n=t.querySelector(".crew-lv").lastChild.textContent;S("skillUp",n==="MAX"?10:Number(n)),f=performance.now()})}),requestAnimationFrame(()=>{i(),m(c[0],!0)}),$=()=>a.isConnected&&p(),g||(g=!0,window.addEventListener("resize",()=>$?.(),{passive:!0}))},intro(e){b()||(M(e.querySelectorAll(".crew-row"),{x:160,skewX:-22,autoAlpha:0},{stagger:.04,duration:.26}),r.from(e.querySelector(".crew-star"),{scale:0,rotation:-180,duration:.5,ease:"back.out(1.8)",clearProps:"transform"}),r.from(e.querySelector(".crew-cursor i"),{scaleX:0,duration:.3,ease:"back.out(2.4)",delay:.25}))}}}export{P as default};
