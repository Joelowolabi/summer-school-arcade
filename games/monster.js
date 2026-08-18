/* Build-a-Monster parts + deterministic canvas renderer.
   A monster is described by small integer part indices, so it travels
   cheaply through the events table and renders identically everywhere. */
export const PARTS = {
  body:  ['blob','round','box','tall'],
  color: ['#7B5BE8','#F2683C','#FFD93B','#3FBF7F','#4F9CF9','#E5484D'],
  eyes:  ['two','one','three','sleepy','wide'],
  mouth: ['smile','teeth','open','flat','fangs'],
  acc:   ['none','horns','antenna','crown','ears'],
};
export const PART_KEYS = ['body','color','eyes','mouth','acc'];
export function randomMonster(){ const m={}; for(const k of PART_KEYS) m[k]=Math.floor(Math.random()*PARTS[k].length); return m; }
export function clampMonster(m){ const o={}; for(const k of PART_KEYS){ const v=(m&&m[k])|0; o[k]=Math.max(0,Math.min(PARTS[k].length-1,v)); } return o; }

function rr(ctx,x,y,w,h,r){ r=Math.min(r,w/2,h/2); ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function shade(hex,f){ const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  if(f>=0){r+=(255-r)*f;g+=(255-g)*f;b+=(255-b)*f;}else{r*=(1+f);g*=(1+f);b*=(1+f);} return `rgb(${r|0},${g|0},${b|0})`; }

export function renderMonster(ctx, cx, cy, size, mon){
  const m=clampMonster(mon), s=size, col=PARTS.color[m.color], body=PARTS.body[m.body];
  ctx.save(); ctx.translate(cx,cy);
  // accessory behind body
  const acc=PARTS.acc[m.acc]; ctx.fillStyle=shade(col,-0.25);
  if(acc==='horns'){ ctx.beginPath(); ctx.moveTo(-s*0.28,-s*0.34); ctx.lineTo(-s*0.42,-s*0.62); ctx.lineTo(-s*0.14,-s*0.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s*0.28,-s*0.34); ctx.lineTo(s*0.42,-s*0.62); ctx.lineTo(s*0.14,-s*0.4); ctx.closePath(); ctx.fill(); }
  if(acc==='ears'){ ctx.beginPath(); ctx.arc(-s*0.34,-s*0.3,s*0.14,0,7); ctx.arc(s*0.34,-s*0.3,s*0.14,0,7); ctx.fill(); }
  if(acc==='antenna'){ ctx.strokeStyle=shade(col,-0.25); ctx.lineWidth=s*0.05; ctx.beginPath(); ctx.moveTo(0,-s*0.4); ctx.lineTo(0,-s*0.66); ctx.stroke();
    ctx.fillStyle='#FFD93B'; ctx.beginPath(); ctx.arc(0,-s*0.7,s*0.08,0,7); ctx.fill(); }
  if(acc==='crown'){ ctx.fillStyle='#FFD93B'; ctx.beginPath(); ctx.moveTo(-s*0.26,-s*0.36); ctx.lineTo(-s*0.26,-s*0.56); ctx.lineTo(-s*0.1,-s*0.44);
    ctx.lineTo(0,-s*0.6); ctx.lineTo(s*0.1,-s*0.44); ctx.lineTo(s*0.26,-s*0.56); ctx.lineTo(s*0.26,-s*0.36); ctx.closePath(); ctx.fill(); }
  // body
  ctx.fillStyle=col;
  if(body==='round'){ ctx.beginPath(); ctx.arc(0,0,s*0.42,0,7); ctx.fill(); }
  else if(body==='box'){ rr(ctx,-s*0.4,-s*0.4,s*0.8,s*0.8,s*0.14); ctx.fill(); }
  else if(body==='tall'){ rr(ctx,-s*0.3,-s*0.46,s*0.6,s*0.92,s*0.28); ctx.fill(); }
  else { ctx.beginPath(); ctx.ellipse(0,s*0.04,s*0.44,s*0.4,0,0,7); ctx.fill();
    ctx.beginPath(); ctx.arc(0,-s*0.2,s*0.34,0,7); ctx.fill(); } // blob
  // belly highlight
  ctx.fillStyle=shade(col,0.3); ctx.beginPath(); ctx.ellipse(0,s*0.12,s*0.24,s*0.2,0,0,7); ctx.fill();
  // feet
  ctx.fillStyle=shade(col,-0.2); ctx.beginPath(); ctx.ellipse(-s*0.2,s*0.42,s*0.1,s*0.06,0,0,7); ctx.ellipse(s*0.2,s*0.42,s*0.1,s*0.06,0,0,7); ctx.fill();
  // eyes
  const eye=PARTS.eyes[m.eyes]; const drawEye=(x,r)=>{ ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(x,-s*0.06,r,0,7); ctx.fill();
    ctx.fillStyle='#1e1b26'; ctx.beginPath(); ctx.arc(x,-s*0.04,r*0.5,0,7); ctx.fill(); };
  if(eye==='one'){ drawEye(0,s*0.16); }
  else if(eye==='three'){ drawEye(-s*0.2,s*0.1); drawEye(0,s*0.1); drawEye(s*0.2,s*0.1); }
  else if(eye==='wide'){ drawEye(-s*0.17,s*0.15); drawEye(s*0.17,s*0.15); }
  else if(eye==='sleepy'){ ctx.strokeStyle='#1e1b26'; ctx.lineWidth=s*0.03; ctx.beginPath(); ctx.arc(-s*0.16,-s*0.04,s*0.1,0.1,Math.PI-0.1); ctx.arc(s*0.16,-s*0.04,s*0.1,0.1,Math.PI-0.1); ctx.stroke(); }
  else { drawEye(-s*0.16,s*0.1); drawEye(s*0.16,s*0.1); }
  // mouth
  const mo=PARTS.mouth[m.mouth]; ctx.strokeStyle='#1e1b26'; ctx.fillStyle='#3E2C6B'; ctx.lineWidth=s*0.035; ctx.lineCap='round';
  if(mo==='smile'){ ctx.beginPath(); ctx.arc(0,s*0.12,s*0.14,0.15,Math.PI-0.15); ctx.stroke(); }
  else if(mo==='flat'){ ctx.beginPath(); ctx.moveTo(-s*0.12,s*0.2); ctx.lineTo(s*0.12,s*0.2); ctx.stroke(); }
  else if(mo==='open'){ ctx.beginPath(); ctx.ellipse(0,s*0.2,s*0.1,s*0.09,0,0,7); ctx.fill(); }
  else if(mo==='teeth'){ ctx.fillStyle='#3E2C6B'; rr(ctx,-s*0.13,s*0.13,s*0.26,s*0.12,s*0.03); ctx.fill();
    ctx.fillStyle='#fff'; for(let i=0;i<3;i++){ ctx.fillRect(-s*0.11+i*s*0.08, s*0.13, s*0.05, s*0.06); } }
  else { ctx.fillStyle='#3E2C6B'; ctx.beginPath(); ctx.arc(0,s*0.16,s*0.12,0,Math.PI); ctx.fill();
    ctx.fillStyle='#fff'; ctx.beginPath(); ctx.moveTo(-s*0.09,s*0.16); ctx.lineTo(-s*0.05,s*0.24); ctx.lineTo(-s*0.01,s*0.16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(s*0.09,s*0.16); ctx.lineTo(s*0.05,s*0.24); ctx.lineTo(s*0.01,s*0.16); ctx.fill(); } // fangs
  ctx.restore();
}
