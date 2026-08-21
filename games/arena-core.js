/* ============================================================
   Real-time grid-arena engine (shared motion games).
   Pure, deterministic simulation — the Shared Display runs this
   as the authority; players send inputs and render snapshots.

   Modes:
     paint  — Color Wars : colour the cell you're on; most territory wins (team)
     trail  — Trail Blazer: leave a solid trail; crash into any trail/wall = out
     snake  — Snake Royale: grow by eating pellets; hit a body/wall = out
     maze   — Maze Dash  : fixed maze; first to the exit wins (no death)
   All modes share tick-based movement on a cols×rows grid.
============================================================ */
export const DIRS = [[0,-1],[1,0],[0,1],[-1,0]]; // up,right,down,left
const OPP = d => (d+2)&3;
const b64enc = (typeof btoa!=='undefined')
  ? a=>btoa(String.fromCharCode.apply(null, a))
  : a=>Buffer.from(a).toString('base64');
const b64dec = (typeof atob!=='undefined')
  ? s=>{ const bin=atob(s), a=new Int16Array(bin.length); for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i); return a; }
  : s=>{ const b=Buffer.from(s,'base64'); return new Int16Array(b); };

const MODES = {
  'color-wars':'paint', 'trail-blazer':'trail', 'snake-royale':'snake', 'maze-dash':'maze',
  'king-of-the-hill':'hill', 'star-catcher':'stars',
};
function slug(file){ return (file||'').replace(/-3d\.html$/,'').replace(/\.html$/,''); }
export function motionMode(file){ return MODES[slug(file)] || null; }
export function isMotion(file){ return !!motionMode(file); }
export function motionTitle(file){
  const m=motionMode(file);
  return { paint:'Color Wars', trail:'Trail Blazer', snake:'Snake Royale', maze:'Maze Dash', hill:'King of the Hill', stars:'Star Catcher' }[m] || '';
}
export function motionHowto(file){
  return {
    paint:'Steer with the arrow keys. Colour as many tiles as you can — the team that paints the most wins!',
    trail:'Steer with the arrow keys. You leave a glowing trail — don\'t hit anyone\'s trail or the wall. Last one riding wins!',
    snake:'Steer with the arrow keys. Eat the glowing pellets to grow. Don\'t crash into a snake or the wall!',
    maze:'Steer with the arrow keys. Race through the maze — first one to reach the exit flag wins!',
    hill:'Steer onto the glowing 👑 hill and hold it — every moment on the hill scores. Most time on top wins!',
    stars:'Steer around and scoop up the ⭐ stars as they pop up. Grab the most to win!',
  }[motionMode(file)] || '';
}

const idx=(s,x,y)=>y*s.cols+x;
const inb=(s,x,y)=>x>=0&&y>=0&&x<s.cols&&y<s.rows;

/* ---- maze generation (recursive backtracker on odd lattice) ---- */
function buildMaze(cols, rows, seed){
  const w=new Uint8Array(cols*rows).fill(1);
  let r=seed||12345; const rand=()=>{ r=(r*1103515245+12345)&0x7fffffff; return r/0x7fffffff; };
  const carve=(x,y)=>{ w[y*cols+x]=0;
    const dirs=[[0,-2],[2,0],[0,2],[-2,0]].sort(()=>rand()-.5);
    for(const [dx,dy] of dirs){ const nx=x+dx, ny=y+dy;
      if(nx>0&&ny>0&&nx<cols-1&&ny<rows-1&&w[ny*cols+nx]===1){ w[(y+dy/2)*cols+(x+dx/2)]=0; carve(nx,ny); } }
  };
  carve(1,1);
  return w;
}

/* ---- spawn players spread across the arena ---- */
function spawnSpots(s, n){
  const spots=[], cx=(s.cols-1)/2, cy=(s.rows-1)/2;
  const cols=Math.ceil(Math.sqrt(n*s.cols/s.rows)), rowsN=Math.ceil(n/cols);
  let k=0;
  for(let gy=0; gy<rowsN && k<n; gy++) for(let gx=0; gx<cols && k<n; gx++, k++){
    let x=Math.round((gx+1)*s.cols/(cols+1)), y=Math.round((gy+1)*s.rows/(rowsN+1));
    x=Math.max(1,Math.min(s.cols-2,x)); y=Math.max(1,Math.min(s.rows-2,y));
    const dir = Math.abs(x-cx)>Math.abs(y-cy) ? (x<cx?1:3) : (y<cy?2:0);
    spots.push({x,y,dir});
  }
  return spots;
}

export function createGame(file, roster, opts={}){
  const mode=motionMode(file);
  const cols=opts.cols|| (mode==='maze'?31:40), rows=opts.rows|| (mode==='maze'?19:24);
  const s={ mode, file, cols, rows, tick:0, over:false, winner:null, msg:'',
    maxTicks: opts.maxTicks || (mode==='maze'?1400:(mode==='paint'||mode==='hill'||mode==='stars')?520:900),
    cells:new Int16Array(cols*rows), walls:new Uint8Array(cols*rows),
    exit:null, pellets:[], stars:[], hill:null, players:{}, ids:[] };
  let mazeDir=1;
  if(mode==='maze'){ s.walls=buildMaze(cols,rows,opts.seed); s.exit={x:cols-2,y:rows-2}; s.walls[idx(s,s.exit.x,s.exit.y)]=0;
    for(let d=0;d<4;d++){ const [dx,dy]=DIRS[d]; if(inb(s,1+dx,1+dy) && !s.walls[idx(s,1+dx,1+dy)]){ mazeDir=d; break; } } }  // face an open corridor from the mouth
  if(mode==='hill'){ s.hill={ cx:Math.floor((cols-1)/2), cy:Math.floor((rows-1)/2), rx:3, ry:2 }; }
  if(mode==='stars'){ s.starTarget=Math.max(8, Math.ceil(roster.length*0.8)); }
  const spots=spawnSpots(s, roster.length);
  roster.forEach((p,i)=>{
    const sp=spots[i]||{x:1,y:1,dir:1};
    let x=sp.x,y=sp.y, dir0=sp.dir;
    if(mode==='maze'){ x=1; y=1; dir0=mazeDir; }   // everyone starts at the maze mouth, already facing an open path
    const P={ id:p.id, i:i+1, name:p.name, team:p.team, color:p.color||teamColor(p.team),
      x, y, dir:dir0, ndir:dir0, alive:true, score:0, finished:false, rank:0, body:[], grow:0 };
    if(mode==='snake'){ P.body=[{x,y}]; const [dx,dy]=DIRS[OPP(sp.dir)]; for(let b=1;b<3;b++){ const bx=x+dx*b,by=y+dy*b; if(inb(s,bx,by)) P.body.push({x:bx,y:by}); } P.score=P.body.length; }
    if(mode==='paint'||mode==='trail'){ if(inb(s,x,y)) s.cells[idx(s,x,y)]=P.i; }
    s.players[p.id]=P; s.ids.push(p.id);
  });
  if(mode==='snake') for(let i=0;i<Math.max(6,roster.length);i++) spawnPellet(s);
  if(mode==='stars') while(s.stars.length<s.starTarget) spawnStar(s);
  s.aliveStart = s.ids.length;
  return s;
}
function spawnStar(s){ for(let t=0;t<60;t++){ const x=1+Math.floor(Math.random()*(s.cols-2)), y=1+Math.floor(Math.random()*(s.rows-2));
  if(!s.stars.some(q=>q.x===x&&q.y===y)){ s.stars.push({x,y}); return; } } }
function inHill(s,x,y){ const h=s.hill; return h && Math.abs(x-h.cx)<=h.rx && Math.abs(y-h.cy)<=h.ry; }
function moveFree(s, alive){ for(const p of alive){ p.dir=p.ndir; const [dx,dy]=DIRS[p.dir]; let nx=p.x+dx, ny=p.y+dy;
  if(!inb(s,nx,ny)){ nx=p.x; ny=p.y; } p.x=nx; p.y=ny; } }
function stepHill(s, alive){ moveFree(s, alive); for(const p of alive){ if(inHill(s,p.x,p.y)) p.score++; } }
function stepStars(s, alive){ moveFree(s, alive);
  for(const p of alive){ const i=s.stars.findIndex(q=>q.x===p.x&&q.y===p.y); if(i>=0){ s.stars.splice(i,1); p.score++; spawnStar(s); } }
  while(s.stars.length<s.starTarget) spawnStar(s); }
const TEAMCOLORS=['#E5484D','#4F9CF9','#3FBF7F'];
function teamColor(t){ return TEAMCOLORS[t] || '#7B5BE8'; }

function spawnPellet(s){
  for(let t=0;t<50;t++){ const x=1+Math.floor(Math.random()*(s.cols-2)), y=1+Math.floor(Math.random()*(s.rows-2));
    const occ=Object.values(s.players).some(p=>p.body&&p.body.some(b=>b.x===x&&b.y===y));
    if(!occ && !s.pellets.some(q=>q.x===x&&q.y===y)){ s.pellets.push({x,y}); return; } }
}

export function applyInput(s, id, dir){
  const p=s.players[id]; if(!p||!p.alive||s.over) return;
  if((s.mode==='trail'||s.mode==='snake') && dir===OPP(p.dir)) return; // no instant reverse
  p.ndir=dir;
}

/* ---- one authoritative tick ---- */
export function step(s){
  if(s.over) return s;
  s.tick++;
  const alive=s.ids.map(id=>s.players[id]).filter(p=>p.alive&&!p.finished);
  if(s.mode==='paint') stepPaint(s, alive);
  else if(s.mode==='trail') stepTrail(s, alive);
  else if(s.mode==='snake') stepSnake(s, alive);
  else if(s.mode==='maze') stepMaze(s, alive);
  else if(s.mode==='hill') stepHill(s, alive);
  else if(s.mode==='stars') stepStars(s, alive);
  checkEnd(s);
  return s;
}

function stepPaint(s, alive){
  for(const p of alive){ p.dir=p.ndir; const [dx,dy]=DIRS[p.dir]; let nx=p.x+dx, ny=p.y+dy;
    if(!inb(s,nx,ny)){ nx=p.x; ny=p.y; }            // bounce off walls (stay put)
    p.x=nx; p.y=ny; s.cells[idx(s,nx,ny)]=p.i; }
  countTerritory(s);
}
function countTerritory(s){
  const perPlayer={}, perTeam=[0,0,0];
  for(const id of s.ids) perPlayer[id]=0;
  const byIndex={}; s.ids.forEach(id=>byIndex[s.players[id].i]=s.players[id]);
  for(let c=0;c<s.cells.length;c++){ const v=s.cells[c]; if(v){ const p=byIndex[v]; if(p){ perPlayer[p.id]++; perTeam[p.team]=(perTeam[p.team]||0)+1; } } }
  for(const id of s.ids) s.players[id].score=perPlayer[id];
  s.teamScore=perTeam;
}

function stepTrail(s, alive){
  const nexts=alive.map(p=>{ const nd=p.ndir; const [dx,dy]=DIRS[nd]; return {p,nd,nx:p.x+dx,ny:p.y+dy}; });
  const headCount={};
  nexts.forEach(n=>{ const k=n.nx+','+n.ny; headCount[k]=(headCount[k]||0)+1; });
  for(const n of nexts){ const {p,nd,nx,ny}=n;
    const crash = !inb(s,nx,ny) || s.cells[idx(s,nx,ny)]!==0 || headCount[nx+','+ny]>1;
    if(crash){ p.alive=false; continue; }
    p.dir=nd; p.x=nx; p.y=ny; s.cells[idx(s,nx,ny)]=p.i; p.score=s.tick; }
}

function stepSnake(s, alive){
  const occ=new Set();
  for(const id of s.ids){ const p=s.players[id]; if(p.body) p.body.forEach(b=>occ.add(b.x+','+b.y)); }
  const nexts=alive.map(p=>{ const nd=p.ndir; const [dx,dy]=DIRS[nd]; return {p,nd,nx:p.x+dx,ny:p.y+dy}; });
  const headCount={}; nexts.forEach(n=>headCount[n.nx+','+n.ny]=(headCount[n.nx+','+n.ny]||0)+1);
  for(const n of nexts){ const {p,nd,nx,ny}=n;
    const crash = !inb(s,nx,ny) || occ.has(nx+','+ny) || headCount[nx+','+ny]>1;
    if(crash){ p.alive=false; continue; }
    p.dir=nd; p.x=nx; p.y=ny; p.body.unshift({x:nx,y:ny});
    const pi=s.pellets.findIndex(q=>q.x===nx&&q.y===ny);
    if(pi>=0){ s.pellets.splice(pi,1); spawnPellet(s); } else { p.body.pop(); }
    p.score=p.body.length; }
}

function stepMaze(s, alive){
  for(const p of alive){ p.dir=p.ndir; const [dx,dy]=DIRS[p.dir]; const nx=p.x+dx, ny=p.y+dy;
    if(!inb(s,nx,ny) || s.walls[idx(s,nx,ny)]) continue; // blocked by wall
    p.x=nx; p.y=ny;
    if(s.exit && nx===s.exit.x && ny===s.exit.y){ p.finished=true; s.finishN=(s.finishN||0)+1; p.rank=s.finishN; p.score=s.maxTicks - s.tick + (100-p.rank); }
    else { p.score = -(Math.abs(p.x-s.exit.x)+Math.abs(p.y-s.exit.y)); }
  }
}

function checkEnd(s){
  if(s.over) return;
  const alive=s.ids.filter(id=>s.players[id].alive);
  if(s.mode==='trail'||s.mode==='snake'){
    if(s.aliveStart>1 && alive.length<=1 || s.tick>=s.maxTicks){
      s.over=true; s.winner = ranking(s)[0]; s.msg = alive.length===1 ? s.players[alive[0]].name+' is the last one standing!' : 'Time!'; }
  } else if(s.mode==='maze'){
    const allDone=s.ids.every(id=>s.players[id].finished);
    if(allDone || s.tick>=s.maxTicks){ s.over=true; s.winner=ranking(s)[0]; if(s.winner) s.msg=s.players[s.winner].name+' reached the exit first!'; }
  } else if(s.mode==='paint'){
    if(s.tick>=s.maxTicks){ s.over=true; s.winner=ranking(s)[0]; s.msg='Time! Territory locked in.'; }
  } else if(s.mode==='hill'){
    if(s.tick>=s.maxTicks){ s.over=true; s.winner=ranking(s)[0]; if(s.winner) s.msg=s.players[s.winner].name+' ruled the hill!'; }
  } else if(s.mode==='stars'){
    if(s.tick>=s.maxTicks){ s.over=true; s.winner=ranking(s)[0]; if(s.winner) s.msg=s.players[s.winner].name+' caught the most stars!'; }
  }
}

/* ranking of player ids, best first */
export function ranking(s){
  const arr=[...s.ids];
  if(s.mode==='maze'){
    arr.sort((a,b)=>{ const A=s.players[a],B=s.players[b];
      if(A.finished!==B.finished) return A.finished?-1:1;
      if(A.finished&&B.finished) return A.rank-B.rank;
      return B.score-A.score; });
  } else if(s.mode==='trail'||s.mode==='snake'){
    arr.sort((a,b)=>{ const A=s.players[a],B=s.players[b];
      if(A.alive!==B.alive) return A.alive?-1:1;
      return B.score-A.score; });
  } else { arr.sort((a,b)=>s.players[b].score-s.players[a].score); }
  return arr;
}

/* ---- compact snapshot for broadcast ---- */
export function snapshot(s){
  const snap={ mode:s.mode, file:s.file, cols:s.cols, rows:s.rows, tick:s.tick, over:s.over,
    winner:s.winner, msg:s.msg, exit:s.exit||null, pellets:s.pellets,
    teamScore:s.teamScore||null,
    players:s.ids.map(id=>{ const p=s.players[id]; const o={ i:p.i, id:p.id, name:p.name, team:p.team, color:p.color, x:p.x, y:p.y, alive:p.alive, score:p.score, finished:p.finished, rank:p.rank };
      if(s.mode==='snake') o.body=p.body.map(b=>[b.x,b.y]); return o; }) };
  if(s.mode==='paint'||s.mode==='trail') snap.cells=b64enc(s.cells);
  if(s.mode==='maze') snap.walls=b64enc(s.walls);
  if(s.mode==='hill') snap.hill=s.hill;
  if(s.mode==='stars') snap.stars=s.stars;
  return snap;
}
export function decodeCells(str){ return b64dec(str); }
