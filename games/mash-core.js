/* ============================================================
   Broadcast "mash" games — display is the authority, players tap.
     balloon — Balloon Pop Race: pump your balloon; pop as many as you can
     tug     — Team Tug of War : 3-way triangular tug, teams pull the knot
   Players batch their taps (~8/s) and send {id, taps:n}; the display applies.
============================================================ */
const KINDS = { 'balloon-pop-race':'balloon', 'team-tug-of-war':'tug', 'rocket-fuel':'rocket', 'rope-climb':'rope' };
function slug(file){ return (file||'').replace(/-3d\.html$/,'').replace(/\.html$/,''); }
export function mashKind(file){ return KINDS[slug(file)] || null; }
export function isMash(file){ return !!mashKind(file); }
export function mashTitle(file){ return { balloon:'Balloon Pop Race', tug:'Team Tug of War', rocket:'Rocket Fuel', rope:'Rope Climb' }[mashKind(file)] || ''; }
export function mashHowto(file){
  return { balloon:'Tap SPACE or the PUMP button as fast as you can — pop as many balloons as you can before time runs out!',
           tug:'Tap SPACE or PULL as fast as you can — help your team drag the knot to your flag!',
           rocket:'Tap SPACE or the button as fast as you can to fuel your rocket — first to launch wins!',
           rope:'Tap fast to help your team climb — first team to reach the top of the rope wins!' }[mashKind(file)] || '';
}

/* difficulty: easy = lower goal + more time, hard = higher goal + less time */
function mdf(opts){ const d=(opts&&opts.difficulty)||'med'; return d==='easy'?{chal:0.75,time:1.15}:d==='hard'?{chal:1.3,time:0.85}:{chal:1,time:1}; }

/* ---------- Balloon Pop Race ---------- */
export function createBalloon(roster, opts={}){
  const D=mdf(opts);
  const s={ kind:'balloon', target:opts.target||Math.round(20*D.chal), dur:opts.dur||Math.round(30000*D.time), startAt:0, endsAt:0, over:false, players:{}, ids:[] };
  roster.forEach(p=>{ s.players[p.id]={ id:p.id, name:p.name, team:p.team, color:p.color, fill:0, pops:0 }; s.ids.push(p.id); });
  return s;
}
export function startBalloon(s){ s.startAt=Date.now(); s.endsAt=s.startAt+s.dur; }
export function pumpBalloon(s,id,n=1){ const p=s.players[id]; if(!p||s.over) return;
  for(let i=0;i<n;i++){ p.fill++; if(p.fill>=s.target){ p.pops++; p.fill=0; } } }
export function stepBalloon(s){ if(!s.over && s.endsAt && Date.now()>=s.endsAt) s.over=true; }
export function snapshotBalloon(s){ return { kind:'balloon', target:s.target, over:s.over,
  remain: Math.max(0, Math.ceil((s.endsAt-Date.now())/1000)),
  players: s.ids.map(id=>{ const p=s.players[id]; return { id:p.id, name:p.name, team:p.team, color:p.color, fill:p.fill, pops:p.pops }; }) }; }

/* ---------- Team Tug of War (3-way triangle) ---------- */
export function createTug(roster, opts={}){
  const s={ kind:'tug', over:false, winner:null,
    knot:{ x:0.5, y:0.52 },
    verts:[{x:0.5,y:0.2},{x:0.2,y:0.8},{x:0.8,y:0.8}],  // team 0 top, 1 lower-left, 2 lower-right — inset from the frame
    recent:{0:[],1:[],2:[]}, teamPlayers:[0,0,0], rate:[0,0,0], winRadius:0.13,
    dur:opts.dur||Math.round(45000*mdf(opts).time), startAt:0, endsAt:0,
    players:{}, ids:[], startAt:0 };
  roster.forEach(p=>{ s.players[p.id]={ id:p.id, name:p.name, team:p.team, color:p.color, pulls:0 }; s.ids.push(p.id);
    s.teamPlayers[p.team]=(s.teamPlayers[p.team]||0)+1; });
  return s;
}
export function startTug(s){ s.startAt=Date.now(); s.endsAt=s.startAt+s.dur; }
export function pullTug(s,id,n=1){ const p=s.players[id]; if(!p||s.over) return;
  p.pulls+=n; const now=Date.now(); for(let i=0;i<n;i++) s.recent[p.team].push(now); }
export function stepTug(s){ if(s.over) return;
  const now=Date.now(), WIN=600;
  const rate=[0,1,2].map(t=>{ s.recent[t]=s.recent[t].filter(ts=>now-ts<WIN);
    return s.recent[t].length / Math.max(1, s.teamPlayers[t]); });   // per-player rate = fair across team sizes
  const K=0.055;
  for(let t=0;t<3;t++){ const f=Math.min(0.3, rate[t]*K);   // cap keeps 3-way pull stable (3·0.3<1)
    s.knot.x += (s.verts[t].x - s.knot.x)*f; s.knot.y += (s.verts[t].y - s.knot.y)*f; }
  s.knot.x += (0.5 - s.knot.x)*0.006; s.knot.y += (0.52 - s.knot.y)*0.006;  // gentle recenter
  s.knot.x=Math.max(0.03,Math.min(0.97,s.knot.x)); s.knot.y=Math.max(0.03,Math.min(0.97,s.knot.y));
  for(let t=0;t<3;t++){ if(Math.hypot(s.knot.x-s.verts[t].x, s.knot.y-s.verts[t].y) < s.winRadius){ s.over=true; s.winner=t; break; } }
  if(!s.over && s.endsAt && Date.now()>=s.endsAt){   // time up → team pulling the knot closest to home wins
    let best=0, bd=Infinity; for(let t=0;t<3;t++){ const d=Math.hypot(s.knot.x-s.verts[t].x, s.knot.y-s.verts[t].y); if(d<bd){ bd=d; best=t; } }
    s.over=true; s.winner=best; s.timeout=true; }
  s.rate=rate;
}
export function snapshotTug(s){ return { kind:'tug', over:s.over, winner:s.winner, knot:s.knot, verts:s.verts,
  winRadius:s.winRadius, teamPlayers:s.teamPlayers, rate:s.rate,
  remain: s.endsAt ? Math.max(0, Math.ceil((s.endsAt-Date.now())/1000)) : null }; }

/* ---------- Rocket Fuel (individual: first to launch) ---------- */
export function createRocket(roster, opts={}){
  const D=mdf(opts);
  const s={ kind:'rocket', target:opts.target||Math.round(55*D.chal), dur:opts.dur||Math.round(35000*D.time), startAt:0, endsAt:0, over:false, finishN:0, players:{}, ids:[] };
  roster.forEach(p=>{ s.players[p.id]={ id:p.id, name:p.name, team:p.team, color:p.color, fuel:0, launched:false, rank:0 }; s.ids.push(p.id); });
  return s;
}
export function startRocket(s){ s.startAt=Date.now(); s.endsAt=s.startAt+s.dur; }
export function pumpRocket(s,id,n=1){ const p=s.players[id]; if(!p||s.over||p.launched) return;
  p.fuel=Math.min(s.target, p.fuel+n); if(p.fuel>=s.target){ p.launched=true; s.finishN++; p.rank=s.finishN; } }
export function stepRocket(s){ if(s.over) return;
  if(s.ids.every(id=>s.players[id].launched) || (s.endsAt && Date.now()>=s.endsAt)) s.over=true; }
export function snapshotRocket(s){ return { kind:'rocket', target:s.target, over:s.over,
  remain: Math.max(0, Math.ceil((s.endsAt-Date.now())/1000)),
  players: s.ids.map(id=>{ const p=s.players[id]; return { id:p.id, name:p.name, team:p.team, color:p.color, fuel:p.fuel, launched:p.launched, rank:p.rank }; }) }; }
export function rocketRanking(s){ return [...s.ids].sort((a,b)=>{ const A=s.players[a],B=s.players[b];
  if(A.launched!==B.launched) return A.launched?-1:1; if(A.launched&&B.launched) return A.rank-B.rank; return B.fuel-A.fuel; }); }

/* ---------- Rope Climb (team: first team to the top) ---------- */
export function createRope(roster, opts={}){
  const D=mdf(opts);
  const s={ kind:'rope', over:false, winner:null, threshold:opts.threshold||Math.round(65*D.chal), dur:opts.dur||Math.round(40000*D.time), startAt:0, endsAt:0,
    teamTaps:[0,0,0], teamPlayers:[0,0,0], players:{}, ids:[] };
  roster.forEach(p=>{ s.players[p.id]={ id:p.id, name:p.name, team:p.team, color:p.color, pulls:0 }; s.ids.push(p.id);
    s.teamPlayers[p.team]=(s.teamPlayers[p.team]||0)+1; });
  return s;
}
export function startRope(s){ s.startAt=Date.now(); s.endsAt=s.startAt+s.dur; }
export function pullRope(s,id,n=1){ const p=s.players[id]; if(!p||s.over) return; p.pulls+=n; s.teamTaps[p.team]+=n; }
function ropeProgress(s,t){ return Math.min(1, s.teamTaps[t]/(Math.max(1,s.teamPlayers[t])*s.threshold)); }
export function stepRope(s){ if(s.over) return;
  for(let t=0;t<3;t++){ if(ropeProgress(s,t)>=1){ s.over=true; s.winner=t; break; } }
  if(!s.over && s.endsAt && Date.now()>=s.endsAt){ let best=0,bp=-1; for(let t=0;t<3;t++){ const pr=ropeProgress(s,t); if(pr>bp){bp=pr;best=t;} } s.over=true; s.winner=best; s.timeout=true; } }
export function snapshotRope(s){ return { kind:'rope', over:s.over, winner:s.winner, teamPlayers:s.teamPlayers,
  progress:[0,1,2].map(t=>ropeProgress(s,t)), remain: s.endsAt?Math.max(0,Math.ceil((s.endsAt-Date.now())/1000)):null }; }
export function ropeRanking(s){ const wt=s.winner; return [...s.ids].sort((a,b)=>{ const A=s.players[a],B=s.players[b];
  const aw=A.team===wt?1:0,bw=B.team===wt?1:0; if(aw!==bw) return bw-aw; return B.pulls-A.pulls; }); }

/* ---------- rankings (best first) ---------- */
export function balloonRanking(s){ return [...s.ids].sort((a,b)=> s.players[b].pops-s.players[a].pops || s.players[b].fill-s.players[a].fill); }
export function tugRanking(s){ // winners' team first, then by personal pulls
  const wt=s.winner; return [...s.ids].sort((a,b)=>{ const A=s.players[a], B=s.players[b];
    const aw=A.team===wt?1:0, bw=B.team===wt?1:0; if(aw!==bw) return bw-aw; return B.pulls-A.pulls; }); }
