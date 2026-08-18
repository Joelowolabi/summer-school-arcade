/* Shared bits for the social games:
     spy       — Secret Spy    : most players share a secret word, a few are spies; give clues, then vote out the spies
     wordchain — Word Chain    : race to add a word starting with the last letter of the chain
     copycat   — Copycat       : watch a colour sequence grow, then repeat it — last one standing wins
*/
const KINDS = { 'secret-spy':'spy', 'word-chain-blitz':'wordchain', 'copycat':'copycat' };
function slug(file){ return (file||'').replace(/-3d\.html$/,'').replace(/\.html$/,''); }
export function socialKind(file){ return KINDS[slug(file)] || null; }
export function isSocial(file){ return !!socialKind(file); }
export function socialTitle(file){ return { spy:'Secret Spy', wordchain:'Word Chain Blitz', copycat:'Copycat' }[socialKind(file)] || ''; }

/* ---- Secret Spy ---- */
export const SPY_TOPICS = [
  { cat:'Places', word:'Beach' }, { cat:'Places', word:'Airport' }, { cat:'Places', word:'Zoo' },
  { cat:'Food', word:'Pizza' }, { cat:'Food', word:'Ice Cream' }, { cat:'Food', word:'Popcorn' },
  { cat:'Animals', word:'Elephant' }, { cat:'Animals', word:'Penguin' }, { cat:'Animals', word:'Shark' },
  { cat:'School', word:'Library' }, { cat:'School', word:'Playground' },
  { cat:'Space', word:'Rocket' }, { cat:'Space', word:'The Moon' },
  { cat:'Sports', word:'Soccer' }, { cat:'Sports', word:'Swimming' },
];
export function pickTopic(){ return SPY_TOPICS[Math.floor(Math.random()*SPY_TOPICS.length)]; }
export function assignSpies(ids){
  const spyCount = Math.max(1, Math.round(ids.length/6));
  const shuffled=[...ids].sort(()=>Math.random()-0.5);
  return new Set(shuffled.slice(0, spyCount));
}

/* ---- Word Chain ---- */
export const CHAIN_STARTERS = ['apple','tiger','rocket','purple','dragon','sunny','planet','banana','ocean','robot','castle','rainbow'];
export function chainStart(){ return CHAIN_STARTERS[Math.floor(Math.random()*CHAIN_STARTERS.length)]; }
export function normWord(w){ return (w||'').toLowerCase().trim().replace(/[^a-z]/g,''); }
export function validChainWord(w, letter, used){ const n=normWord(w);
  return n.length>=2 && n[0]===letter && !used.has(n); }

/* ---- Copycat ---- */
export const COPY_COLORS = ['#F2683C','#7B5BE8','#3FBF7F','#4F9CF9'];  // orange, purple, green, blue
export const COPY_NAMES  = ['Orange','Purple','Green','Blue'];
export function nextColor(){ return Math.floor(Math.random()*4); }
export function seqEqual(a, b){ if(!a||!b||a.length!==b.length) return false; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }

export function socialHowto(file, phase){
  const k=socialKind(file);
  if(k==='spy'){ if(phase==='vote') return 'Who was faking it? Vote for the sneaky spy!'; return 'Everyone shares a secret word — except the spies! Give a one-word clue that proves you know it.'; }
  if(k==='wordchain') return 'Type a word that starts with the last letter of the word on screen. Fastest valid word scores!';
  if(k==='copycat') return 'Watch the colour sequence, then tap it back in order. One wrong tap and you\'re out!';
  return '';
}
