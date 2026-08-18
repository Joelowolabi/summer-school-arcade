/* ============================================================
   Summer School Arcade — shared engine
   Global: window.Arcade
   Handles the 30-player roster, 3-team auto-balance, per-player
   latency/skill model, server-timestamp resolution (250ms buffer),
   scoreboard rendering, HUD, countdown, confetti and Season
   persistence (localStorage). Games call into this so all 11
   behave the same way.
============================================================ */
(function(){
  const TEAMS = [
    { name:'Red',   color:'#E5484D' },
    { name:'Blue',  color:'#4F9CF9' },
    { name:'Green', color:'#3FBF7F' },
  ];
  const FIRST = ['Ava','Leo','Mia','Kai','Zoe','Eli','Nia','Sam','Ivy','Max','Aria','Finn','Luna','Cole','Remy','Jade','Theo','Nova','Beau','Sky','Wren','Rex','Iris','Milo','Ruby','Otis','Cleo','Poppy','Dax','Juno'];
  const AV = ['#F2683C','#7B5BE8','#FFD93B','#3FBF7F','#4F9CF9'];

  const rand = (a,b)=>a+Math.random()*(b-a);
  const pick = a=>a[Math.floor(Math.random()*a.length)];
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const cap = s=>s? s[0].toUpperCase()+s.slice(1):s;

  const SEASON_KEY = 'ssa_season_v1';
  const BUFFER = 0.25;     // 250ms fairness buffer (PRD §6)
  const ROOM = 'ZAP-7Q';

  /* ---- Season store: individual + team totals persist across games ---- */
  function loadSeason(){
    try{ return JSON.parse(localStorage.getItem(SEASON_KEY)) || {}; }catch(e){ return {}; }
  }
  function saveSeason(s){ try{ localStorage.setItem(SEASON_KEY, JSON.stringify(s)); }catch(e){} }

  /* ---- Roster ---- */
  function makeRoster(opts){
    opts = opts||{};
    const season = loadSeason();
    const players = [];
    for(let i=0;i<30;i++){
      const saved = season['p'+i] || {};
      players.push({
        id:i,
        name: i===0 ? (opts.myName||'You') : FIRST[i%FIRST.length] + (i>=FIRST.length?'.':''),
        me: i===0,
        team: (saved.team!=null) ? saved.team : (i%3),   // auto-balance across 3 teams, persists per Season
        seasonPts: saved.pts || 0,                        // carried from prior games this Season
        pts: 0,                                           // this game only
        latency: i===0 ? 0.045 : rand(0.03,0.34),         // seconds each way
        skill:    i===0 ? null : rand(0.28,0.95),
        accuracy: i===0 ? null : rand(0.70,0.98),
        rate:     i===0 ? null : rand(6,13),              // clicks/sec for masher games
        disconnected:false,
      });
    }
    if(opts.dropouts!==false){
      players[17].disconnected = true;
      if(Math.random()<0.5) players[24].disconnected = true;
    }
    return players;
  }

  function teamTotals(players, key){
    key = key||'pts';
    const t=[0,0,0]; players.forEach(p=>t[p.team]+=p[key]); return t;
  }

  /* commit this game's points into the Season store */
  function commitSeason(players){
    const season = loadSeason();
    players.forEach(p=>{
      const rec = season['p'+p.id] || {};
      rec.pts = (rec.pts||0) + p.pts;
      rec.team = p.team;
      rec.name = p.name;
      season['p'+p.id] = rec;
    });
    saveSeason(season);
  }

  /* ============================================================
     Server-timestamp resolver (reflex games)
     Register hits with a server-arrival time; the earliest VALID
     hit within a 250ms buffer window wins. Mirrors PRD §6.
  ============================================================ */
  function Resolver(onResolve){
    let hits=[], resolved=false, bufferTimer=null;
    return {
      register(player, valid, serverT){
        if(resolved) return;
        hits.push({player, valid, serverT});
        if(valid && !bufferTimer){ bufferTimer=setTimeout(()=>this.resolve(), BUFFER*1000); }
      },
      resolve(){
        if(resolved) return; resolved=true;
        clearTimeout(bufferTimer);
        const valid = hits.filter(h=>h.valid).sort((a,b)=>a.serverT-b.serverT);
        onResolve(valid[0]?valid[0].player:null, valid, hits);
      },
      get resolved(){ return resolved; },
      reset(){ hits=[]; resolved=false; clearTimeout(bufferTimer); bufferTimer=null; },
    };
  }

  /* ============================================================
     HUD + scoreboard rendering
  ============================================================ */
  function hud(o){
    o = o||{};
    return `<div class="hud">
      <div class="brand">
        <span class="spark"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg></span>
        <span>${o.title||'Arcade'}<small>Summer School Arcade</small></span>
      </div>
      <div class="grow"></div>
      ${o.extra||''}
      <span class="pu-banner" id="puBanner"></span>
      <span class="chip code hide-s"><span class="k">Room</span> ${ROOM}</span>
      ${o.round!==false?`<span class="chip"><span class="k">Round</span> <b id="hudRound">0</b><span class="k">/</span><span id="hudRoundTot">${o.rounds||10}</span></span>`:''}
      <span class="chip hide-s"><span class="conn"></span> <span id="hudPing">42ms</span></span>
    </div>`;
  }

  function boardEl(){ return document.getElementById('ssaBoard'); }
  function board(title){
    return `<aside class="board" id="ssaBoard">
      <h2><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3"/></svg> ${title||'Live Standings'}</h2>
      <div class="teams" id="ssaTeams"></div>
      <div class="list" id="ssaList"></div>
      <div class="foot"><b id="ssaJoin">0</b> players joined · <b>Season Week 2</b></div>
    </aside>`;
  }

  function renderBoard(players, o){
    o = o||{};
    const useSeason = o.season;
    const key = useSeason ? '_combined' : 'pts';
    if(useSeason) players.forEach(p=>p._combined = p.seasonPts + p.pts);
    const totals = teamTotals(players, useSeason?'_combined':'pts');
    const lead = totals.indexOf(Math.max(...totals));
    const teamsEl = document.getElementById('ssaTeams');
    if(teamsEl) teamsEl.innerHTML = TEAMS.map((t,i)=>`
      <div class="teamcard ${i===lead&&Math.max(...totals)>0?'lead':''}">
        <div class="tn"><span class="dot" style="background:${t.color}"></span>${t.name}</div>
        <div class="ts">${totals[i]}</div>
      </div>`).join('');
    const sorted=[...players].sort((a,b)=>b[key]-a[key]);
    const listEl=document.getElementById('ssaList');
    if(listEl) listEl.innerHTML = sorted.map((p,idx)=>{
      const initial = p.me?'★':p.name[0];
      return `<div class="prow ${p.me?'me':''} ${p.id===o.flash?'flash':''}">
        <span class="rank">${idx+1}</span>
        <span class="av" style="background:${TEAMS[p.team].color}">${initial}</span>
        <span class="pname">${p.name}${p.me?'<span class="youtag">YOU</span>':''}</span>
        ${p.disconnected?'<span class="pdisc" title="disconnected"></span>':''}
        <span class="ppts">${p[key]}</span>
      </div>`;
    }).join('');
    const jc=document.getElementById('ssaJoin');
    if(jc) jc.textContent = players.filter(p=>!p.disconnected).length;
  }

  /* ============================================================
     Countdown 3-2-1-GO
  ============================================================ */
  function countdown(el, done){
    const num = el.querySelector('.count') || el;
    el.classList.remove('hide');
    let c=3;
    const step=(val,go)=>{ num.textContent=val; if(go){num.style.fontSize='84px'; sfx('go');} else {num.style.fontSize=''; sfx('tick');}
      num.style.animation='none'; void num.offsetWidth; num.style.animation='pop .5s var(--ease-pop)'; };
    step(3,false);
    const iv=setInterval(()=>{
      c--;
      if(c===0){ step('GO',true); }
      else if(c<0){ clearInterval(iv); el.classList.add('hide'); num.style.fontSize=''; done&&done(); }
      else { step(c,false); }
    },650);
  }

  /* ============================================================
     Confetti burst (win celebration)
  ============================================================ */
  function confetti(host, n){
    n = n||70;
    const cols=['#F2683C','#7B5BE8','#FFD93B','#3FBF7F','#4F9CF9'];
    for(let i=0;i<n;i++){
      const c=document.createElement('div'); c.className='confetti';
      c.style.left=rand(2,98)+'%'; c.style.background=pick(cols);
      c.style.animationDuration=rand(1.6,3.0)+'s'; c.style.animationDelay=rand(0,.5)+'s';
      c.style.transform='rotate('+rand(0,360)+'deg)';
      host.appendChild(c); setTimeout(()=>c.remove(),3600);
    }
  }

  /* ============================================================
     Sound — tiny Web Audio synth (no asset files). Call Arcade.sfx('name').
     Resumes on first user gesture (games start on a click, so it's ready).
  ============================================================ */
  let _ac=null;
  function ac(){ try{ _ac=_ac||new (window.AudioContext||window.webkitAudioContext)(); if(_ac.state==='suspended') _ac.resume(); return _ac; }catch(e){ return null; } }
  function blip(freq,dur,type,vol,slideTo){ const c=ac(); if(!c) return; const o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine'; o.frequency.setValueAtTime(freq,c.currentTime); if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo,c.currentTime+dur);
    o.connect(g); g.connect(c.destination); g.gain.setValueAtTime(0.0001,c.currentTime); g.gain.exponentialRampToValueAtTime(vol||0.14,c.currentTime+0.012); g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+dur); o.start(); o.stop(c.currentTime+dur+0.03); }
  function noise(dur,vol){ const c=ac(); if(!c) return; const n=c.createBufferSource(); const b=c.createBuffer(1,Math.max(1,c.sampleRate*dur),c.sampleRate); const d=b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2); n.buffer=b; const g=c.createGain(); g.gain.value=vol||0.14; const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=1400; n.connect(f); f.connect(g); g.connect(c.destination); n.start(); n.stop(c.currentTime+dur); }
  const SFX={
    tick:()=>blip(440,0.08,'square',0.06),
    go:()=>blip(680,0.2,'triangle',0.16,1040),
    click:()=>blip(520,0.05,'sine',0.06,620),
    select:()=>blip(600,0.07,'triangle',0.09,760),
    correct:()=>{ blip(660,0.09,'sine',0.12); setTimeout(()=>blip(988,0.14,'sine',0.12),80); },
    wrong:()=>blip(170,0.24,'sawtooth',0.1,110),
    pop:()=>blip(720,0.09,'triangle',0.13,320),
    win:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>blip(f,0.17,'triangle',0.14),i*95)),
    lose:()=>[392,330,262].forEach((f,i)=>setTimeout(()=>blip(f,0.2,'sine',0.12),i*130)),
    crash:()=>{ noise(0.32,0.18); blip(130,0.26,'sawtooth',0.1,60); },
    tally:()=>blip(880,0.06,'sine',0.08),
    whoosh:()=>{ const c=ac(); if(!c) return; blip(300,0.25,'sine',0.05,900); },
  };
  function sfx(name){ try{ (SFX[name]||(()=>{}))(); }catch(e){} }

  /* ============================================================
     Small utilities games use
  ============================================================ */
  function setPing(players){
    const el=document.getElementById('hudPing');
    if(el) el.textContent = Math.round((players?players[0].latency*1000:45) + rand(-6,12))+'ms';
  }
  function setRound(n,tot){
    const r=document.getElementById('hudRound'); if(r) r.textContent=n;
    if(tot!=null){ const t=document.getElementById('hudRoundTot'); if(t) t.textContent=tot; }
  }
  function powerup(text){
    const b=document.getElementById('puBanner'); if(!b) return;
    if(text){ b.textContent=text; b.classList.add('on'); } else { b.classList.remove('on'); }
  }

  /* ============================================================
     Arcade Cup (tournament) support
     A game runs inside cup.html's iframe with ?cup=1. When it ends it
     calls Arcade.finishGame(players); if in a cup, we post the final
     individual ranking up to the tournament controller.
  ============================================================ */
  function inCup(){ try{ return new URLSearchParams(location.search).get('cup')==='1' && window.parent && window.parent!==window; }catch(e){ return false; } }
  function computeRanking(players){
    return [...players].filter(p=>!p.disconnected)
      .sort((a,b)=>b.pts-a.pts)
      .map((p,i)=>({id:p.id, name:p.name, me:!!p.me, team:p.team, pts:p.pts, place:i+1}));
  }
  // placement -> Cup points ladder (normalises across game types)
  function cupPointsForPlace(place){
    const top={1:15,2:12,3:10,4:8,5:7};
    if(top[place]) return top[place];
    if(place<=10) return 5;
    if(place<=20) return 3;
    return 1;
  }
  // ---- room mode: report this player's score to Supabase so the Shared Display updates ----
  const SUPA_URL='https://zbnpyjllbtktmbkqxilq.supabase.co';
  const SUPA_KEY='sb_publishable_G5d5Ncj4X0X2EyBjOmGxjg_KcJ_Fk7B';
  function roomParams(){ try{ const q=new URLSearchParams(location.search); return { room:q.get('room'), player:q.get('player'), code:q.get('code') }; }catch(e){ return {}; } }
  function reportRoom(players){
    const rp=roomParams(); if(!rp.room||!rp.player) return;
    const me=players.find(p=>p.me)||players[0]; const pts=me?me.pts:0;
    const h={ apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json' };
    fetch(SUPA_URL+'/rest/v1/game_scores',{method:'POST',headers:h,body:JSON.stringify({room_id:rp.room,player_id:rp.player,game:document.title,points:pts})}).catch(()=>{});
    fetch(SUPA_URL+'/rest/v1/rpc/add_player_points',{method:'POST',headers:h,body:JSON.stringify({p_player:rp.player,p_points:pts})}).catch(()=>{});
    // hand the player back to the room so they see the next game / summary
    if(rp.code) setTimeout(()=>{ location.href='join.html?code='+encodeURIComponent(rp.code); }, 3600);
  }
  function finishGame(players, opts){
    commitSeason(players);
    if(inCup()){
      const ranking=computeRanking(players);
      try{ window.parent.postMessage({type:'ssa-cup-result', game:(opts&&opts.game)||document.title, ranking}, '*'); }catch(e){}
    }
    reportRoom(players);
  }

  window.Arcade = {
    TEAMS, AV, ROOM, BUFFER,
    rand, pick, clamp, cap,
    makeRoster, teamTotals, commitSeason, loadSeason, saveSeason,
    Resolver, hud, board, renderBoard, countdown, confetti,
    setPing, setRound, powerup, sfx,
    inCup, computeRanking, cupPointsForPlace, finishGame,
  };
})();
