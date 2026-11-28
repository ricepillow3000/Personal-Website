import{a as p,b as h,g as n,s as f,e as r}from"./main-BYQi0xjP.js";import{b as m,w as $,h as v}from"./common-CByueLnX.js";function g(){const i=p.sideQuests.length;let c="M50 0";for(let s=0;s<i;s++)c+=` C ${s%2?90:10} ${s*100+35}, ${s%2?10:90} ${s*100+65}, 50 ${s*100+100}`;return{title:"SIDE QUESTS",html:`${$("ROUTE")}${m}${v("SIDE QUESTS","Not everything I learned came from a keyboard.")}
      <div class="route" style="--n:${i}">
        <svg class="route-line" viewBox="0 0 100 ${i*100}" preserveAspectRatio="none" aria-hidden="true">
          <path class="route-under" d="${c}" pathLength="1"/><path class="route-dash" d="${c}"/>
        </svg>
        ${p.sideQuests.map((s,o)=>`<article class="stop ${o%2?"right":"left"}" data-nav tabindex="0">
            <span class="stop-pin" aria-hidden="true">${o+1}</span>
            <div class="stop-card">
              <div class="stop-head"><span class="stop-title">${r(s.title)}</span><span class="stop-meta">${r(s.place)} · ${r(s.dates)}</span></div>
              <p class="stop-stat"><b>${r(s.stat[0])}</b><span>${r(s.stat[1])}</span></p>
              <span class="lesson"><b class="ql-tag">REWARD ★</b><span class="ql-text">${r(s.lesson)}</span></span>
              <span class="stop-clear${/present/i.test(s.dates)?" active":""}" aria-hidden="true">${/present/i.test(s.dates)?"ACTIVE":"CLEAR"}</span>
            </div></article>`).join("")}
      </div>`,intro(s){if(h())return;const o=s.querySelector(".route-under");n.fromTo(o,{strokeDasharray:1,strokeDashoffset:1},{strokeDashoffset:0,duration:.8,ease:"power3.out",clearProps:"strokeDasharray,strokeDashoffset"});const d=performance.now(),l="IntersectionObserver"in window&&new IntersectionObserver(e=>e.forEach(t=>{if(!t.isIntersecting)return;l.unobserve(t.target);const a=Number(t.target.dataset.i),u=Math.max(0,(.1+a*.22+.12)*1e3-(performance.now()-d));setTimeout(()=>s.isConnected&&f("questPin",a),u)}),{threshold:.15});s.querySelectorAll(".stop").forEach((e,t)=>{const a=.1+t*.22;n.from(e.querySelector(".stop-pin"),{scale:0,rotation:-120,duration:.3,ease:"back.out(3)",delay:a,clearProps:"transform"}),e.dataset.i=String(t),l&&l.observe(e),n.from(e.querySelector(".stop-card"),{x:e.classList.contains("right")?160:-160,skewX:e.classList.contains("right")?-14:14,autoAlpha:0,duration:.32,ease:"back.out(2)",delay:a+.05,clearProps:"transform,opacity,visibility"}),n.from(e.querySelector(".stop-clear"),{scale:3,rotation:-40,autoAlpha:0,duration:.2,ease:"power4.in",delay:a+.35,clearProps:"transform,opacity,visibility"})})}}}export{g as default};
