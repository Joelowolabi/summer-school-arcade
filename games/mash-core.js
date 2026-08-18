/* ============================================================
   Broadcast "mash" games — display is the authority, players tap.
     balloon — Balloon Pop Race: pump your balloon; pop as many as you can
     tug     — Team Tug of War : 3-way triangular tug, teams pull the knot
   Players batch their taps (~8/s) and send {id, taps:n}; the display applies.
============================================================ */
const KINDS = { 'balloon-pop-race':'balloon', 'team-tug-of-war':'tug' };
function slug(file){ return (file||'').replace(/-3d\.html$/,'').replace(/\.html$/,''); }
export function mashKind(file){ return KINDS[slug(file)] || null; }
export function isMash(file){ return !!mashKind(file); }
export function mashTitle(file){ return { balloon:'Balloon Pop Race', tug:'Team Tug of War' }[mashKind(file)] || ''; }
export function mashHowto(file){
  return { balloon:'Tap SPACE or the PUMP button as fast as you can — pop as many balloons as you can before time runs out!',
           tug:'Tap SPACE or PULL as fast as you can — help your team drag the knot to your flag!' }[mashKind(file)] || '';
}

/* ---------- Balloon Pop Race ---------- */
export function createBalloon(roster, opts={}){
  const s={ kind:'balloon', target:opts.target||20, dur:opts.dur||30000, startAt:0, endsAt:0, over:false, players:{}, ids:[] };
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
    verts:[{x:0.5,y:0.13},{x:0.14,y:0.88},{x:0.86,y:0.88}],  // team 0 top, 1 lower-left, 2 lower-right
    recent:{0:[],1:[],2:[]}, teamPlayers:[0,0,0], rate:[0,0,0], winRadius:0.13,
    dur:opts.dur||45000, startAt:0, endsAt:0,
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

/* ---------- rankings (best first) ---------- */
export function balloonRanking(s){ return [...s.ids].sort((a,b)=> s.players[b].pops-s.players[a].pops || s.players[b].fill-s.players[a].fill); }
export function tugRanking(s){ // winners' team first, then by personal pulls
  const wt=s.winner; return [...s.ids].sort((a,b)=>{ const A=s.players[a], B=s.players[b];
    const aw=A.team===wt?1:0, bw=B.team===wt?1:0; if(aw!==bw) return bw-aw; return B.pulls-A.pulls; }); }
