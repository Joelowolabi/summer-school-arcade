/* ============================================================
   Summer School Arcade — sound effects (pure Web Audio synth).
   No asset files. AudioContext starts suspended by browser policy,
   so call unlock() from a user gesture (a click/tap) before it plays.
   Primary use is the projector/display speakers; players can also
   unlock it for light local feedback.
============================================================ */
let ctx=null, master=null, muted=false, ready=false;
function ac(){ if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return null;
    ctx=new AC(); master=ctx.createGain(); master.gain.value=0.5; master.connect(ctx.destination); } return ctx; }
export function unlock(){ const c=ac(); if(!c) return false; if(c.state==='suspended') c.resume(); ready=(c.state==='running'); return true; }
export function isReady(){ return ready && ctx && ctx.state==='running'; }
export function setMuted(m){ muted=!!m; if(master) master.gain.value = muted?0:0.5; }
export function toggleMuted(){ setMuted(!muted); return muted; }
export function isMuted(){ return muted; }

function tone(freq, t0, dur, type='sine', vol=0.3, glideTo){
  const c=ac(); if(!c||muted) return;
  const o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(freq, t0);
  if(glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1,glideTo), t0+dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0+dur+0.03);
}
function noiseHit(t0, dur, vol=0.14){ const c=ac(); if(!c||muted) return;
  const n=Math.floor(c.sampleRate*dur), buf=c.createBuffer(1,n,c.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
  const s=c.createBufferSource(), g=c.createGain(); s.buffer=buf; g.gain.value=vol; s.connect(g); g.connect(master); s.start(t0); }
function T(){ const c=ac(); return c?c.currentTime:0; }

export const sfx = {
  tick(){ const t=T(); tone(680,t,0.11,'square',0.22); },
  go(){ const t=T(); [523,659,784,1047].forEach((f,i)=>tone(f,t+i*0.05,0.32,'triangle',0.3)); },
  correct(){ const t=T(); tone(784,t,0.13,'sine',0.32); tone(1175,t+0.1,0.22,'sine',0.32); },
  wrong(){ const t=T(); tone(240,t,0.3,'sawtooth',0.2,150); },
  reveal(){ const t=T(); tone(494,t,0.15,'triangle',0.26); tone(659,t+0.12,0.22,'triangle',0.26); },
  pop(){ const t=T(); tone(760,t,0.08,'square',0.2,1250); },
  whoosh(){ const t=T(); tone(180,t,0.45,'sawtooth',0.16,1000); noiseHit(t,0.35,0.08); },
  win(){ const t=T(); [523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*0.085,0.42,'triangle',0.3)); },
  drumroll(){ const t=T(); for(let i=0;i<26;i++) noiseHit(t+i*0.045,0.05,0.09+i*0.002); },
  fanfare(){ const t=T(); const seq=[[523,0,.16],[523,.16,.16],[523,.32,.16],[659,.52,.28],[784,.84,.3],[659,1.12,.18],[784,1.32,.22],[1047,1.56,.5]];
    seq.forEach(([f,dt,du])=>tone(f,t+dt,du,'triangle',0.32)); },
};
