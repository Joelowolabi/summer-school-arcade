/* Shared canvas renderer for the real-time arena (display + players).
   Draws a snapshot() from arena-core onto a 2D context. */
import { decodeCells } from './arena-core.js';

function rr(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

function shade(hex, f){ // lighten(+)/darken(-) a hex colour
  const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  if(f>=0){ r+=(255-r)*f; g+=(255-g)*f; b+=(255-b)*f; } else { r*=(1+f); g*=(1+f); b*=(1+f); }
  return `rgb(${r|0},${g|0},${b|0})`;
}

// bright pulsing marker on the local player's own character (yellow stands out from team colours)
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
  const W=ctx.canvas.width, H=ctx.canvas.height;
  const pad=10, cs=Math.floor(Math.min((W-pad*2)/cols,(H-pad*2)/rows));
  const gw=cs*cols, gh=cs*rows, ox=Math.floor((W-gw)/2), oy=Math.floor((H-gh)/2);
  const meId=opts.meId;
  ctx.clearRect(0,0,W,H);
  // board
  ctx.fillStyle = opts.dark ? '#241b3a' : '#efeafc';
  rr(ctx,ox-6,oy-6,gw+12,gh+12,18); ctx.fill();
  const colorByI={}; snap.players.forEach(p=>colorByI[p.i]=p.color);

  if(mode==='maze'){
    const walls=decodeCells(snap.walls);
    ctx.fillStyle = opts.dark ? '#0f0a1e' : '#dcd3f7';
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++) if(walls[y*cols+x]){ ctx.fillRect(ox+x*cs,oy+y*cs,cs,cs); }
  }
  if(mode==='paint'||mode==='trail'){
    const cells=decodeCells(snap.cells);
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){ const v=cells[y*cols+x];
      if(v && colorByI[v]){ ctx.fillStyle=mode==='paint'?colorByI[v]:shade(colorByI[v],-0.15);
        if(mode==='trail'){ ctx.globalAlpha=0.85; ctx.fillRect(ox+x*cs,oy+y*cs,cs,cs); ctx.globalAlpha=1; }
        else ctx.fillRect(ox+x*cs,oy+y*cs,cs,cs); } }
  }
  // exit flag (maze)
  if(snap.exit){ const {x,y}=snap.exit; ctx.font=`${Math.floor(cs*0.9)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('🏁', ox+x*cs+cs/2, oy+y*cs+cs*0.55); }
  // pellets (snake)
  if(snap.pellets) for(const q of snap.pellets){ ctx.beginPath(); ctx.fillStyle='#FFD93B';
    ctx.arc(ox+q.x*cs+cs/2, oy+q.y*cs+cs/2, cs*0.32, 0, 7); ctx.fill();
    ctx.strokeStyle='#F2683C'; ctx.lineWidth=2; ctx.stroke(); }

  // players (smooth motion: interpolate head position between the previous and current tick)
  const prevById={}; if(opts.prev&&opts.prev.players) opts.prev.players.forEach(pp=>prevById[pp.id]=pp);
  const tt = (opts.t!=null)?opts.t:1;
  for(const p of snap.players){
    const isMe = p.id===meId;
    if(mode==='snake'){
      if(!p.alive){ continue; }
      for(let b=p.body.length-1;b>=0;b--){ const [bx,by]=p.body[b];
        ctx.fillStyle = b===0 ? shade(p.color,0.12) : shade(p.color,-0.05*Math.min(3,b));
        rr(ctx,ox+bx*cs+1,oy+by*cs+1,cs-2,cs-2,cs*0.35); ctx.fill(); }
      // eyes on head
      const [hx,hy]=p.body[0]; ctx.fillStyle='#fff';
      const e=cs*0.13, cxp=ox+hx*cs+cs/2, cyp=oy+hy*cs+cs/2;
      ctx.beginPath(); ctx.arc(cxp-cs*0.16,cyp-cs*0.05,e,0,7); ctx.arc(cxp+cs*0.16,cyp-cs*0.05,e,0,7); ctx.fill();
      ctx.fillStyle='#1e1b26'; ctx.beginPath(); ctx.arc(cxp-cs*0.16,cyp-cs*0.05,e*0.5,0,7); ctx.arc(cxp+cs*0.16,cyp-cs*0.05,e*0.5,0,7); ctx.fill();
      if(isMe) drawMeMarker(ctx, ox+hx*cs+cs/2, oy+hy*cs+cs/2, cs);
    } else {
      let rx=p.x, ry=p.y; const pp=prevById[p.id];
      if(pp && p.alive){ rx=pp.x+(p.x-pp.x)*tt; ry=pp.y+(p.y-pp.y)*tt; }
      const px=ox+rx*cs, py=oy+ry*cs;
      if(!p.alive){ ctx.globalAlpha=0.5; ctx.font=`${Math.floor(cs*0.8)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('💥',px+cs/2,py+cs*0.55); ctx.globalAlpha=1; continue; }
      ctx.fillStyle=p.color; rr(ctx,px+1,py+1,cs-2,cs-2,cs*0.4); ctx.fill();
      ctx.fillStyle=shade(p.color,0.35); rr(ctx,px+cs*0.24,py+cs*0.18,cs*0.52,cs*0.34,cs*0.2); ctx.fill(); // glossy highlight
      if(p.finished){ ctx.font=`${Math.floor(cs*0.7)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('⭐',px+cs/2,py+cs*0.55); }
      if(isMe) drawMeMarker(ctx, px+cs/2, py+cs/2, cs);
    }
  }
}
