/* Canvas renderers for the mash games (display + players). */
function rr(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function shade(hex,f){ const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  if(f>=0){r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f;}else{r*=(1+f);g*=(1+f);b*=(1+f);} return `rgb(${r|0},${g|0},${b|0})`; }

function balloon(ctx, cx, cy, rad, color, me){
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, rad*0.86, rad, 0, 0, 7); ctx.fillStyle=color; ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx-rad*0.28, cy-rad*0.34, rad*0.22, rad*0.32, -0.5, 0, 7); ctx.fillStyle=shade(color,0.45); ctx.fill(); // shine
  ctx.beginPath(); ctx.moveTo(cx-rad*0.12, cy+rad); ctx.lineTo(cx+rad*0.12, cy+rad); ctx.lineTo(cx, cy+rad*1.16); ctx.closePath(); ctx.fillStyle=shade(color,-0.15); ctx.fill(); // knot
  ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(cx,cy+rad*1.16); ctx.quadraticCurveTo(cx+rad*0.4,cy+rad*1.5,cx,cy+rad*1.9); ctx.stroke();
  if(me){ ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(cx, cy, rad*0.86+2, rad+2, 0, 0, 7); ctx.stroke(); }
  ctx.restore();
}

export function renderBalloon(ctx, snap, opts={}){
  const W=ctx.canvas.width, H=ctx.canvas.height, meId=opts.meId;
  ctx.clearRect(0,0,W,H); ctx.fillStyle=opts.dark?'#241b3a':'#efeafc'; ctx.fillRect(0,0,W,H);
  const ps=snap.players, n=ps.length;
  if(opts.solo){ // player device: one big balloon, pop count from server, fill predicted locally
    const me=ps.find(p=>p.id===meId)||ps[0]; if(!me) return;
    const target=snap.target||20, fill=(opts.meFill!=null?opts.meFill:me.fill);
    const f=Math.min(1, fill/target), cx=W/2, cy=H*0.56, ringR=Math.min(W,H)*0.36;
    // progress ring (this balloon's fill toward a pop)
    ctx.save(); ctx.lineCap='round'; ctx.lineWidth=Math.max(7,W*0.022);
    ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(cx,cy,ringR,0,7); ctx.stroke();
    ctx.strokeStyle=me.color; ctx.beginPath(); ctx.arc(cx,cy,ringR,-Math.PI/2,-Math.PI/2+f*6.283); ctx.stroke(); ctx.restore();
    balloon(ctx, cx, cy, Math.min(W,H)*0.2*(0.55+f*0.85), me.color, true);
    ctx.fillStyle=opts.dark?'#fff':'#1e1b26'; ctx.textAlign='center';
    ctx.font=`800 ${Math.floor(H*0.17)}px Fredoka, sans-serif`; ctx.fillText(me.pops, cx, H*0.2);
    ctx.fillStyle=opts.dark?'rgba(255,255,255,.72)':'#565165'; ctx.font=`700 ${Math.floor(H*0.05)}px Fredoka, sans-serif`;
    ctx.fillText('POPPED — keep tapping!', cx, H*0.27);
    return;
  }
  // display: grid of all balloons
  const cols=Math.ceil(Math.sqrt(n*W/H/1.3))||1, rows=Math.ceil(n/cols);
  const cw=W/cols, chh=H/rows;
  ps.forEach((p,i)=>{ const gx=(i%cols)*cw+cw/2, gy=Math.floor(i/cols)*chh+chh/2;
    const f=Math.min(1,p.fill/snap.target); const rad=Math.min(cw,chh)*0.22*(0.55+f*0.85);
    balloon(ctx, gx, gy-chh*0.08, rad, p.color, p.id===meId);
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font=`700 ${Math.max(11,Math.floor(chh*0.13))}px Fredoka, sans-serif`;
    ctx.fillText(p.name+' · '+p.pops, gx, gy+chh*0.42); });
}

export function renderTug(ctx, snap, opts={}){
  const W=ctx.canvas.width, H=ctx.canvas.height, TC=['#E5484D','#4F9CF9','#3FBF7F'], TN=['Red','Blue','Green'];
  ctx.clearRect(0,0,W,H); ctx.fillStyle=opts.dark?'#241b3a':'#efeafc'; ctx.fillRect(0,0,W,H);
  const px=v=>v.x*W, py=v=>v.y*H, knot=snap.knot, verts=snap.verts;
  // win zones
  verts.forEach((v,t)=>{ ctx.beginPath(); ctx.arc(px(v),py(v),snap.winRadius*Math.min(W,H),0,7);
    ctx.fillStyle=shade(TC[t],0.35); ctx.globalAlpha=0.28; ctx.fill(); ctx.globalAlpha=1; });
  // ropes knot->vertex (thickness by rate; your team highlighted + glows on your pull)
  verts.forEach((v,t)=>{ const rate=(snap.rate&&snap.rate[t])||0, mine=opts.myTeam===t;
    ctx.strokeStyle=TC[t]; ctx.lineWidth=3+Math.min(9,rate*2.2)+(mine?2:0); ctx.lineCap='round';
    if(mine && opts.pull){ ctx.shadowColor=TC[t]; ctx.shadowBlur=22*opts.pull; }
    ctx.beginPath(); ctx.moveTo(px(knot),py(knot)); ctx.lineTo(px(v),py(v)); ctx.stroke(); ctx.shadowBlur=0; });
  // arrow near the knot showing which way YOU pull (bigger as you tap)
  if(opts.myTeam!=null && verts[opts.myTeam]){ const v=verts[opts.myTeam], kx0=px(knot),ky0=py(knot);
    const ang=Math.atan2(py(v)-ky0,px(v)-kx0), boost=1+(opts.pull||0)*0.7, D=Math.min(W,H)*0.13*boost;
    ctx.save(); ctx.translate(kx0+Math.cos(ang)*D, ky0+Math.sin(ang)*D); ctx.rotate(ang);
    ctx.fillStyle='#FFD93B'; ctx.strokeStyle='#3E2C6B'; ctx.lineWidth=1.5;
    const s=Math.min(W,H)*0.03*boost; ctx.beginPath(); ctx.moveTo(-s,-s); ctx.lineTo(s*1.4,0); ctx.lineTo(-s,s); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  // team flags (your team bigger + gold ring)
  verts.forEach((v,t)=>{ const x=px(v),y=py(v), mine=opts.myTeam===t, R=Math.min(W,H)*(mine?0.094:0.072);
    ctx.beginPath(); ctx.arc(x,y,R,0,7); ctx.fillStyle=TC[t]; ctx.fill();
    if(mine){ ctx.strokeStyle='#FFD93B'; ctx.lineWidth=6; ctx.stroke(); }
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`700 ${Math.floor(R*0.5)}px Fredoka, sans-serif`; ctx.fillText(TN[t], x, y-(mine?R*0.18:0));
    if(mine){ ctx.font=`700 ${Math.floor(R*0.34)}px Fredoka, sans-serif`; ctx.fillText('(you)', x, y+R*0.4); } });
  // knot (bigger, clearer)
  const kx=px(knot), ky=py(knot), kr=Math.min(W,H)*0.055;
  ctx.beginPath(); ctx.arc(kx,ky,kr,0,7); ctx.fillStyle='#FFD93B'; ctx.fill();
  ctx.strokeStyle='#3E2C6B'; ctx.lineWidth=3; ctx.stroke();
  ctx.font=`${Math.floor(kr*1.1)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🪢', kx, ky+1);
}

export function renderRocket(ctx, snap, opts={}){
  const W=ctx.canvas.width, H=ctx.canvas.height; ctx.clearRect(0,0,W,H);
  ctx.fillStyle=opts.dark?'#241b3a':'#efeafc'; ctx.fillRect(0,0,W,H);
  const ps=snap.players, target=snap.target||55;
  if(opts.solo){ const me=ps.find(p=>p.id===opts.meId)||ps[0]; if(!me) return;
    const fuel=(opts.meFuel!=null?opts.meFuel:me.fuel), f=Math.min(1,fuel/target);
    const padY=H*0.86, topY=H*0.16, cx=W/2, ry=padY-(padY-topY)*f;
    ctx.strokeStyle='rgba(255,255,255,.14)'; ctx.lineWidth=Math.max(8,W*0.03); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(cx,padY); ctx.lineTo(cx,topY); ctx.stroke();
    ctx.strokeStyle=me.color; ctx.beginPath(); ctx.moveTo(cx,padY); ctx.lineTo(cx,ry); ctx.stroke();
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${Math.floor(H*0.16)}px serif`; ctx.fillText('🚀', cx, ry);
    ctx.fillStyle=opts.dark?'#fff':'#1e1b26'; ctx.font=`800 ${Math.floor(H*0.15)}px Fredoka, sans-serif`;
    ctx.fillText(me.launched?'LAUNCHED! 🎉':Math.round(f*100)+'%', cx, H*0.11);
    ctx.textBaseline='alphabetic'; return; }
  const n=ps.length, cols=Math.ceil(Math.sqrt(n*W/H))||1, rows=Math.ceil(n/cols), cw=W/cols, chh=H/rows;
  ps.forEach((p,i)=>{ const gx=(i%cols)*cw+cw/2, gy0=Math.floor(i/cols)*chh, f=Math.min(1,p.fuel/target);
    const padY=gy0+chh*0.8, topY=gy0+chh*0.2, ry=padY-(padY-topY)*f;
    ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=4; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(gx,padY); ctx.lineTo(gx,topY); ctx.stroke();
    ctx.strokeStyle=p.color; ctx.beginPath(); ctx.moveTo(gx,padY); ctx.lineTo(gx,ry); ctx.stroke();
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${Math.floor(chh*0.24)}px serif`; ctx.fillText('🚀', gx, ry);
    ctx.fillStyle='#fff'; ctx.font=`700 ${Math.max(10,Math.floor(chh*0.11))}px Fredoka, sans-serif`; ctx.fillText(p.name+(p.launched?' 🎉':''), gx, padY+chh*0.12); });
  ctx.textBaseline='alphabetic';
}
export function renderRope(ctx, snap, opts={}){
  const W=ctx.canvas.width, H=ctx.canvas.height, TC=['#E5484D','#4F9CF9','#3FBF7F'], TN=['Red','Blue','Green'];
  ctx.clearRect(0,0,W,H); ctx.fillStyle=opts.dark?'#241b3a':'#efeafc'; ctx.fillRect(0,0,W,H);
  const prog=snap.progress||[0,0,0], padY=H*0.86, topY=H*0.14;
  for(let t=0;t<3;t++){ const cx=W*(0.25+t*0.25), mine=opts.myTeam===t;
    ctx.strokeStyle=mine?shade(TC[t],0.2):'rgba(255,255,255,.28)'; ctx.lineWidth=mine?9:5; ctx.lineCap='round';
    ctx.setLineDash([12,9]); ctx.beginPath(); ctx.moveTo(cx,topY); ctx.lineTo(cx,padY); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${Math.floor(H*0.07)}px serif`; ctx.fillText('🏁', cx, topY-H*0.04);
    const cy=padY-(padY-topY)*prog[t], R=Math.min(W,H)*0.055;
    ctx.save(); if(mine){ ctx.shadowColor='#FFD93B'; ctx.shadowBlur=22; } ctx.beginPath(); ctx.arc(cx,cy,R,0,7); ctx.fillStyle=TC[t]; ctx.fill();
    if(mine){ ctx.strokeStyle='#FFD93B'; ctx.lineWidth=4; ctx.stroke(); } ctx.restore();
    ctx.fillStyle='#fff'; ctx.font=`700 ${Math.floor(R*0.7)}px Fredoka, sans-serif`; ctx.fillText(Math.round(prog[t]*100)+'%', cx, cy+1);
    ctx.fillStyle=mine?'#FFD93B':'#fff'; ctx.font=`700 ${Math.floor(H*0.055)}px Fredoka, sans-serif`; ctx.fillText(mine?TN[t]+' (you)':TN[t], cx, padY+H*0.07);
  }
  ctx.textBaseline='alphabetic';
}
