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
  if(opts.solo){ // player device: one big balloon + pops
    const me=ps.find(p=>p.id===meId)||ps[0]; if(!me) return;
    const f=Math.min(1, me.fill/snap.target); const rad=Math.min(W,H)*0.16*(0.5+f*0.9);
    balloon(ctx, W/2, H*0.5, rad, me.color, true);
    ctx.fillStyle=opts.dark?'#fff':'#1e1b26'; ctx.textAlign='center';
    ctx.font=`700 ${Math.floor(H*0.12)}px Fredoka, sans-serif`; ctx.fillText(me.pops, W/2, H*0.2);
    ctx.font=`600 ${Math.floor(H*0.05)}px Fredoka, sans-serif`; ctx.fillText('balloons popped', W/2, H*0.27);
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
  // ropes knot->vertex (thickness by rate)
  verts.forEach((v,t)=>{ const rate=(snap.rate&&snap.rate[t])||0; ctx.strokeStyle=TC[t];
    ctx.lineWidth=4+Math.min(16,rate*3); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(px(knot),py(knot)); ctx.lineTo(px(v),py(v)); ctx.stroke(); });
  // team flags
  verts.forEach((v,t)=>{ const x=px(v),y=py(v), R=Math.min(W,H)*0.075;
    ctx.beginPath(); ctx.arc(x,y,R,0,7); ctx.fillStyle=TC[t]; ctx.fill();
    if(opts.myTeam===t){ ctx.strokeStyle='#fff'; ctx.lineWidth=4; ctx.stroke(); }
    ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`700 ${Math.floor(R*0.55)}px Fredoka, sans-serif`; ctx.fillText(TN[t], x, y); });
  // knot
  const kx=px(knot), ky=py(knot), kr=Math.min(W,H)*0.045;
  ctx.beginPath(); ctx.arc(kx,ky,kr,0,7); ctx.fillStyle='#FFD93B'; ctx.fill();
  ctx.strokeStyle='#3E2C6B'; ctx.lineWidth=3; ctx.stroke();
  ctx.font=`${Math.floor(kr*1.1)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🪢', kx, ky+1);
}
