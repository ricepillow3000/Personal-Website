import{b as c,g as r,e as a,a as t}from"./main-9K2xqCgb.js";import{b as l,w as d,h as p,a as u}from"./common-CNjOwbjN.js";function h(){const s=t.education,i=Number(s.gpa)||0;return{title:"STATS",html:`${d("PROFILE")}${l}${p("STATS","Who I am, and why this site exists.")}
      <section class="idcard" data-in>
        <button class="gpa-burst" type="button" aria-label="Off the record. Press to flip for a secret stat." aria-pressed="false"><span class="gb-front"><b>???</b><small>OFF RECORD</small></span><span class="gb-back"><b>MAX</b><small>BEE FEAR</small></span></button>
        <div class="id-band"><span>ID · ${a(t.name.toUpperCase())}</span><span>${a(t.location)}</span></div>
        <div class="id-body">
          <figure class="gpa-card" aria-label="GPA ${a(s.gpa)} out of 4.00">
            <span class="gpa-tag" aria-hidden="true">GPA</span>
            <div class="gpa-num" aria-hidden="true"><b data-to="${a(s.gpa)}">${a(s.gpa)}</b><span>/ 4.00</span></div>
            <div class="gpa-bar" aria-hidden="true" style="--v:${(Math.min(1,i/4)*100).toFixed(1)}%"><i></i></div>
          </figure>
          <div class="id-info">
            <h3>${a(s.school)}</h3>
            <p>${a(s.degree)}<br>Concentration: <b>${a(s.concentration)}</b></p>
            <div class="id-chips"><span>${a(s.grad.toUpperCase())}</span><span>${a(s.dates)}</span></div>
            <p class="id-honors">${a(s.honors)}</p>
          </div>
        </div>
      </section>
      <section class="story story-site" data-in aria-label="Why this site"><h3>WHY THIS SITE</h3>${u(t.siteStory)}</section>
      <ul class="traits">${t.funFacts.map((e,o)=>`<li class="trait t${o}" data-in><i class="ff-star" aria-hidden="true"></i>${a(e)}</li>`).join("")}</ul>
      <blockquote class="motto-strip" data-in>“${a(t.motto.text)}”<cite>— ${a(t.motto.by)}</cite></blockquote>`,intro(e){if(c())return;const o=e.querySelector(".gpa-num b"),n={n:Math.min(3.5,i)};r.to(n,{n:i,duration:.7,ease:"power3.out",delay:.1,onUpdate:()=>o.textContent=n.n.toFixed(2)}),r.from(e.querySelector(".gpa-bar i"),{scaleX:0,duration:.6,ease:"back.out(1.8)",delay:.15,clearProps:"transform"}),r.from(e.querySelector(".gpa-tag"),{scale:2.4,rotation:-30,duration:.3,ease:"back.out(2.5)",delay:.05,clearProps:"transform"})}}}export{h as default};
