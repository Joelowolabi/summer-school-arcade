/* Shared question bank for the live (synchronized) quiz engine.
   The display generates questions from here; players render what's broadcast.
   Question types:
     mcq  — text options, one correct, speed-ranked
     vote — two options, no correct, majority scores
     grid — visual tiles (colour or shape), one correct, speed-ranked
*/
const rnd = a => a[Math.floor(Math.random()*a.length)];
const ri  = (a,b)=>a+Math.floor(Math.random()*(b-a+1));
const cap = s => s[0].toUpperCase()+s.slice(1);

const TRIVIA = [
  {q:'Which planet is known as the Red Planet?',a:['Venus','Mars','Jupiter','Saturn'],c:1},
  {q:'How many legs does a spider have?',a:['6','8','10','12'],c:1},
  {q:'What do bees make?',a:['Milk','Silk','Honey','Butter'],c:2},
  {q:'Which is the largest ocean?',a:['Atlantic','Indian','Arctic','Pacific'],c:3},
  {q:'What colour do you get mixing blue and yellow?',a:['Green','Purple','Orange','Brown'],c:0},
  {q:'Which animal is the king of the jungle?',a:['Tiger','Bear','Lion','Wolf'],c:2},
  {q:'What is frozen water called?',a:['Steam','Ice','Snowman','Cloud'],c:1},
  {q:'Which fruit is yellow and curved?',a:['Apple','Banana','Grape','Cherry'],c:1},
  {q:'How many days are in a week?',a:['5','6','7','8'],c:2},
  {q:'What do you call a baby dog?',a:['Kitten','Cub','Puppy','Foal'],c:2},
  {q:'Which star is closest to Earth?',a:['The Moon','The Sun','Polaris','Sirius'],c:1},
  {q:'What gas do plants breathe in?',a:['Oxygen','Helium','Carbon dioxide','Neon'],c:2},
  {q:'How many continents are there?',a:['5','6','7','8'],c:2},
  {q:'What is the fastest land animal?',a:['Cheetah','Horse','Rabbit','Kangaroo'],c:0},
  {q:'Which shape has no corners?',a:['Square','Circle','Triangle','Star'],c:1},
];

const TOT = [
  ['Pizza','#F2683C','Tacos','#FFD93B'],['Beach','#4F9CF9','Mountains','#3FBF7F'],
  ['Dogs','#F2683C','Cats','#7B5BE8'],['Summer','#FFD93B','Winter','#4F9CF9'],
  ['Super Speed','#F2683C','Flying','#7B5BE8'],['Video Games','#7B5BE8','Board Games','#3FBF7F'],
  ['Ice Cream','#4F9CF9','Cookies','#F2683C'],['Robots','#565165','Dinosaurs','#3FBF7F'],
  ['Pancakes','#FFD93B','Waffles','#F2683C'],['Space','#7B5BE8','Ocean','#4F9CF9'],
];

const PALETTE = [[242,104,60],[123,91,232],[63,191,127],[79,156,249],[245,200,31],[229,72,77]];
const CR_COLORS = [{n:'Orange',h:'#F2683C'},{n:'Purple',h:'#7B5BE8'},{n:'Yellow',h:'#FFD93B'},{n:'Green',h:'#3FBF7F'},{n:'Blue',h:'#4F9CF9'}];
const SHAPES = ['star','circle','heart','square','triangle','flash'];

const SHAPE_PATH = {
  star:'M40 6l9.5 22.5L74 31 55 47l6 25-21-13-21 13 6-25L6 31l24.5-2.5z',
  circle:'M40 10a30 30 0 1 0 0 60 30 30 0 0 0 0-60z',
  heart:'M40 70S10 50 10 29a16 16 0 0 1 30-7 16 16 0 0 1 30 7c0 21-30 41-30 41z',
  square:'M14 14h52v52H14z', triangle:'M40 10l32 56H8z', flash:'M44 6L16 44h18l-6 30 30-40H40z',
};
export function shapeSVG(shape, hex, size){ size=size||64;
  return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="${hex}" stroke="rgba(30,27,38,.14)" stroke-width="1.5" stroke-linejoin="round"><path d="${SHAPE_PATH[shape]||SHAPE_PATH.star}"/></svg>`; }

export function isLive(game){ return /trivia-sprint|number-ninjas|this-or-that|odd-one-out|click-rush/.test(game||''); }
export function gameTitle(game){
  if(/number-ninjas/.test(game)) return 'Number Ninjas';
  if(/this-or-that/.test(game))  return 'This or That';
  if(/odd-one-out/.test(game))   return 'Odd One Out';
  if(/click-rush/.test(game))    return 'Click Rush';
  return 'Trivia Sprint';
}

export function makeQuestion(game, round){
  if(/number-ninjas/.test(game)){
    const hard=round>6, mid=round>3, type=['add','sub','mul','seq'][Math.floor(Math.random()*(mid?4:2))];
    let text='', ans=0, hint='';
    if(type==='add'){ const a=ri(mid?10:2,hard?60:20), b=ri(mid?10:2,hard?40:15); text=`${a} + ${b}`; ans=a+b; }
    else if(type==='sub'){ let a=ri(10,hard?80:30), b=ri(1,a); text=`${a} − ${b}`; ans=a-b; }
    else if(type==='mul'){ const a=ri(2,hard?12:6), b=ri(2,hard?12:6); text=`${a} × ${b}`; ans=a*b; }
    else { const s=ri(1,6), st=ri(2,hard?6:4); text=`${s}, ${s+st}, ${s+2*st}, ?`; ans=s+3*st; hint='What comes next?'; }
    const o=new Set([ans]); while(o.size<4){ const d=ans+ri(-6,6)*(hard?2:1); if(d!==ans&&d>=0) o.add(d); }
    const arr=[...o].sort(()=>Math.random()-.5);
    return { type:'mcq', prompt:text, hint, options:arr.map(String), correct:arr.indexOf(ans) };
  }
  if(/this-or-that/.test(game)){
    const p=rnd(TOT);
    return { type:'vote', prompt:`${p[0]} or ${p[2]}?`, options:[p[0],p[2]], colors:[p[1],p[3]] };
  }
  if(/odd-one-out/.test(game)){
    const n = round<=4?3:4, N=n*n, odd=Math.floor(Math.random()*N);
    const base=rnd(PALETTE), dir=Math.random()<.5?1:-1, delta=Math.max(12, 46-round*4);
    const shade=a=>a.map(v=>Math.max(0,Math.min(255,v+dir*delta)));
    const rgb=a=>`rgb(${a[0]},${a[1]},${a[2]})`;
    const tiles=[]; for(let i=0;i<N;i++) tiles.push({ c: rgb(i===odd?shade(base):base) });
    return { type:'grid', variant:'color', prompt:'Find the odd tile', tiles, cols:n, correct:odd };
  }
  if(/click-rush/.test(game)){
    const target={ color:rnd(CR_COLORS), shape:rnd(SHAPES) }, N=6, slot=Math.floor(Math.random()*N);
    const used=new Set([target.color.h+target.shape]); const tiles=[];
    for(let i=0;i<N;i++){ if(i===slot){ tiles.push({c:target.color.h,s:target.shape}); continue; }
      let c,s,k; do{ c=rnd(CR_COLORS); s=rnd(SHAPES); k=c.h+s; }while(used.has(k)); used.add(k); tiles.push({c:c.h,s}); }
    return { type:'grid', variant:'shape', prompt:`Find the ${target.color.n} ${cap(target.shape)}`, tiles, cols:3, correct:slot };
  }
  const t=rnd(TRIVIA);
  return { type:'mcq', prompt:t.q, hint:'', options:t.a, correct:t.c };
}

export function speedPoints(rank){ return Math.max(5, 15-rank); }   // 1st correct = 15 … floor 5
export function votePoints(){ return 8; }                            // majority side (This or That)
