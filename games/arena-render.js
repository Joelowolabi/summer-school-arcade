/* Shared canvas renderer for the real-time arena (display + players).
   Clay-styled, juicy, and interpolated for smooth 30–60fps motion. */
import { decodeCells } from './arena-core.js';

function rr(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function shade(hex, f){ const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  if(f>=0){ r+=(255-r)*f; g+=(255-g)*f; b+=(255-b)*f; } else { r*=(1+f); g*=(1+f); b*=(1+f); }
  return `rgb(${r|0},${g|0},${b|0})`; }

// a soft clay ball with drop shadow, radial shading and a gloss highlight
function clayBlob(ctx, cx, cy, r, color){
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.26)'; ctx.beginPath(); ctx.ellipse(cx, cy+r*0.6, r*0.82, r*0.36, 0, 0, 7); ctx.fill();
  const g=ctx.createRadialGradient(cx-r*0.32, cy-r*0.38, r*0.12, cx, cy, r*1.15);
  g.addColorStop(0, shade(color,0.42)); g.addColorStop(0.52, color); g.addColorStop(1, shade(color,-0.30));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.ellipse(cx-r*0.30, cy-r*0.36, r*0.30, r*0.17, -0.5, 0, 7); ctx.fill();
  ctx.restore();
}
// crash burst — a ring + sparks that plays out over one tick (t: 0→1)
function drawBurst(ctx, cx, cy, cs, color, t){
  ctx.save(); ctx.globalAlpha=Math.max(0,1-t*0.85);
  ctx.strokeStyle=color; ctx.lineWidth=Math.max(1,cs*0.2*(1-t)); ctx.beginPath(); ctx.arc(cx,cy,cs*(0.4+t*1.5),0,7); ctx.stroke();
  for(let i=0;i<8;i++){ const a=i/8*6.283, d=cs*(0.5+t*1.7); ctx.fillStyle=color;
    ctx.beginPath(); ctx.arc(cx+Math.cos(a)*d, cy+Math.sin(a)*d, Math.max(0.5,cs*0.13*(1-t)), 0,7); ctx.fill(); }
  ctx.restore();
}
// bright pulsing marker on the local player's own character
function drawMeMarker(ctx, cx, cy, cs){
  const t=Date.now()/1000, pulse=1+0.15*Math.sin(t*6);
  ctx.save();
  ctx.strokeStyle='#FFD93B'; ctx.lineWidth=Math.max(3,cs*0.16); ctx.shadowColor='#FFD93B'; ctx.shadowBlur=cs*0.6;
  ctx.beginPath(); ctx.arc(cx,cy,cs*0.66*pulse,0,7); ctx.stroke(); ctx.shadowBlur=0;
  const bob=Math.abs(Math.sin(t*4))*cs*0.2, ay=cy-cs*0.9-bob;
  ctx.fillStyle='#FFD93B'; ctx.beginPath(); ctx.moveTo(cx-cs*0.32,ay-cs*0.28); ctx.lineTo(cx+cs*0.32,ay-cs*0.28); ctx.lineTo(cx,ay+cs*0.08); ctx.closePath();
  ctx.strokeStyle='#3E2C6B'; ctx.lineWidth=Math.max(1.5,cs*0.05); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#FFD93B'; ctx.font=`800 ${Math.max(12,Math.floor(cs*0.6))}px Fredoka, sans-serif`; ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText('YOU', cx, ay-cs*0.34);
  ctx.restore();
}

export function renderArena(ctx, snap, opts={}){
  const { cols, rows, mode } = snap;
  const W=ctx.canvas.width, H=ctx.canvas.height, dark=opts.dark!==false, meId=opts.meId;
  const pad=12, cs=Math.floor(Math.min((W-pad*2)/cols,(H-pad*2)/rows));
  const gw=cs*cols, gh=cs*rows, ox=Math.floor((W-gw)/2), oy=Math.floor((H-gh)/2);
  ctx.clearRect(0,0,W,H);
  ctx.textBaseline='alphabetic';
  // board — rounded panel with a soft top-to-bottom gradient
  const bg=ctx.createLinearGradient(0,oy-8,0,oy+gh+8);
  bg.addColorStop(0, dark?'#2c2149':'#efeafc'); bg.addColorStop(1, dark?'#1a1330':'#e4ddfa');
  ctx.fillStyle=bg; rr(ctx, ox-8, oy-8, gw+16, gh+16, 22); ctx.fill();
  const colorByI={}; snap.players.forEach(p=>colorByI[p.i]=p.color);

  // maze walls — rounded clay blocks with a top sheen
  if(mode==='maze'){ const walls=decodeCells(snap.walls);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){ if(!walls[y*cols+x]) continue;
      const wx=ox+x*cs, wy=oy+y*cs;
      ctx.fillStyle=dark?'#0e0a20':'#c9baf0'; rr(ctx,wx+0.5,wy+0.5,cs-1,cs-1,cs*0.26); ctx.fill();
      ctx.fillStyle=dark?'rgba(255,255,255,.05)':'rgba(255,255,255,.45)'; rr(ctx,wx+cs*0.18,wy+cs*0.14,cs*0.64,cs*0.26,cs*0.12); ctx.fill(); } }

  // paint / trail cells
  if(mode==='paint'||mode==='trail'){ const cells=decodeCells(snap.cells);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){ const v=cells[y*cols+x]; if(!v||!colorByI[v]) continue;
      const col=colorByI[v], cx0=ox+x*cs, cy0=oy+y*cs;
      if(mode==='trail'){ ctx.fillStyle=col; rr(ctx,cx0+0.5,cy0+0.5,cs-1,cs-1,cs*0.24); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,.14)'; ctx.fillRect(cx0+cs*0.16,cy0+cs*0.12,cs*0.68,cs*0.24); }
      else { ctx.fillStyle=col; ctx.fillRect(cx0,cy0,cs,cs); } }
    // depth vignette
    const vg=ctx.createRadialGradient(ox+gw/2,oy+gh/2,gh*0.22,ox+gw/2,oy+gh/2,gh*0.8);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1, dark?'rgba(0,0,0,.30)':'rgba(62,44,107,.12)');
    ctx.fillStyle=vg; ctx.fillRect(ox,oy,gw,gh); }

  // exit flag (maze) — glowing
  if(snap.exit){ const ex=ox+snap.exit.x*cs+cs/2, ey=oy+snap.exit.y*cs+cs/2;
    ctx.save(); ctx.shadowColor='#FFD93B'; ctx.shadowBlur=cs*0.9; ctx.fillStyle='rgba(255,217,59,.85)';
    ctx.beginPath(); ctx.arc(ex,ey,cs*0.44,0,7); ctx.fill(); ctx.restore();
    ctx.font=`${Math.floor(cs*0.82)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🏁', ex, ey+1); ctx.textBaseline='alphabetic'; }

  // pellets (snake)
  if(snap.pellets) for(const q of snap.pellets){ const gx=ox+q.x*cs+cs/2, gy=oy+q.y*cs+cs/2;
    ctx.save(); ctx.shadowColor='#FFD93B'; ctx.shadowBlur=cs*0.5; ctx.fillStyle='#FFD93B';
    ctx.beginPath(); ctx.arc(gx,gy,cs*0.3,0,7); ctx.fill(); ctx.restore();
    ctx.strokeStyle='#F2683C'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(gx,gy,cs*0.3,0,7); ctx.stroke(); }

  // king-of-the-hill glowing zone
  if(mode==='hill' && snap.hill){ const h=snap.hill;
    const x0=ox+(h.cx-h.rx)*cs, y0=oy+(h.cy-h.ry)*cs, w=(h.rx*2+1)*cs, ht=(h.ry*2+1)*cs;
    ctx.save(); ctx.fillStyle='rgba(255,217,59,.16)'; rr(ctx,x0,y0,w,ht,16); ctx.fill();
    ctx.strokeStyle='#FFD93B'; ctx.lineWidth=Math.max(3,cs*0.12); ctx.setLineDash([cs*0.55,cs*0.35]);
    rr(ctx,x0,y0,w,ht,16); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha=0.5; ctx.font=`${Math.floor(cs*1.5)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('👑', ox+h.cx*cs+cs/2, oy+h.cy*cs+cs/2); ctx.globalAlpha=1; ctx.textBaseline='alphabetic'; ctx.restore(); }
  // star-catcher stars
  if(mode==='stars' && snap.stars){ ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${Math.floor(cs*0.9)}px serif`;
    for(const q of snap.stars){ ctx.save(); ctx.shadowColor='#FFD93B'; ctx.shadowBlur=cs*0.55;
      ctx.fillText('⭐', ox+q.x*cs+cs/2, oy+q.y*cs+cs/2); ctx.restore(); } ctx.textBaseline='alphabetic'; }

  // players — interpolated between the previous and current tick
  const prevById={}; if(opts.prev&&opts.prev.players) opts.prev.players.forEach(pp=>prevById[pp.id]=pp);
  const tt=(opts.t!=null)?opts.t:1;
  for(const p of snap.players){
    const isMe=p.id===meId;
    if(mode==='snake'){
      if(!p.alive) continue;
      for(let b=p.body.length-1;b>=0;b--){ const [bx,by]=p.body[b];
        clayBlob(ctx, ox+bx*cs+cs/2, oy+by*cs+cs/2, cs*0.46, b===0?shade(p.color,0.08):p.color); }
      const [hx,hy]=p.body[0], cxp=ox+hx*cs+cs/2, cyp=oy+hy*cs+cs/2, e=cs*0.12;
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(cxp-cs*0.15,cyp-cs*0.06,e,0,7); ctx.arc(cxp+cs*0.15,cyp-cs*0.06,e,0,7); ctx.fill();
      ctx.fillStyle='#1e1b26'; ctx.beginPath(); ctx.arc(cxp-cs*0.15,cyp-cs*0.06,e*0.5,0,7); ctx.arc(cxp+cs*0.15,cyp-cs*0.06,e*0.5,0,7); ctx.fill();
      if(isMe) drawMeMarker(ctx, cxp, cyp, cs);
      continue;
    }
    // paint / trail / maze
    const pp=prevById[p.id];
    if(!p.alive){ // crash: animate a burst on the tick it dies, then a faint mark
      const cxp=ox+p.x*cs+cs/2, cyp=oy+p.y*cs+cs/2;
      if(pp && pp.alive) drawBurst(ctx, ox+pp.x*cs+cs/2, oy+pp.y*cs+cs/2, cs, p.color, tt);
      else { ctx.globalAlpha=0.45; ctx.font=`${Math.floor(cs*0.8)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('💥',cxp,cyp+cs*0.05); ctx.globalAlpha=1; ctx.textBaseline='alphabetic'; }
      continue;
    }
    let rx=p.x, ry=p.y; if(pp && pp.alive){ rx=pp.x+(p.x-pp.x)*tt; ry=pp.y+(p.y-pp.y)*tt; }
    if(isMe && opts.meLead){ rx+=opts.meLead.dx*opts.meLead.amt; ry+=opts.meLead.dy*opts.meLead.amt; }  // bounded local input-lead (masks round-trip latency)
    const cxp=ox+rx*cs+cs/2, cyp=oy+ry*cs+cs/2;
    clayBlob(ctx, cxp, cyp, cs*0.46, p.color);
    if(p.finished){ ctx.font=`${Math.floor(cs*0.7)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⭐',cxp,cyp); ctx.textBaseline='alphabetic'; }
    if(isMe) drawMeMarker(ctx, cxp, cyp, cs);
  }
}
