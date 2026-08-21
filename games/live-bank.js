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

const TF = [
  ['A group of lions is called a pride',true],['The Sun is a planet',false],['Spiders have eight legs',true],
  ['Bats are completely blind',false],['Honey never goes bad',true],['A tomato is a vegetable',false],
  ['Sharks are mammals',false],['Octopuses have three hearts',true],['Penguins can fly',false],
  ['Water is made of hydrogen and oxygen',true],['Goldfish only remember things for 3 seconds',false],
  ['Some frogs can freeze solid and come back to life',true],['Chocolate is safe for dogs to eat',false],
  ['The human body has more than 200 bones',true],['A caterpillar turns into a butterfly',true],
  ['The Great Wall of China is visible from the Moon',false],['Bananas grow on trees',false],['Lightning is hotter than the surface of the Sun',true],
];
const HL = [
  ['🕐 Hours in a week — more than 100?',true],['⚽ Players on a soccer team on the field — more than 15?',false],
  ['🌈 Colours in a rainbow — more than 5?',true],['🕷️ Legs on a spider — more than 6?',true],
  ['📅 Days in a year — more than 400?',false],['🎹 Keys on a piano — more than 50?',true],
  ['🐙 Arms on an octopus — more than 6?',true],['🔺 Sides on a triangle — more than 4?',false],
  ['⏱️ Seconds in a minute — more than 100?',false],['💯 Years in a century — more than 50?',true],
  ['🐜 Legs on an ant — more than 4?',true],['🎸 Strings on a guitar — more than 10?',false],
  ['🌍 Continents on Earth — more than 5?',true],['✋ Fingers on one hand — more than 5?',false],
];
const FLAGS = [
  ['🇫🇷','France'],['🇯🇵','Japan'],['🇧🇷','Brazil'],['🇨🇦','Canada'],['🇮🇹','Italy'],['🇩🇪','Germany'],
  ['🇬🇧','United Kingdom'],['🇲🇽','Mexico'],['🇮🇳','India'],['🇪🇬','Egypt'],['🇰🇪','Kenya'],['🇳🇬','Nigeria'],
  ['🇿🇦','South Africa'],['🇦🇺','Australia'],['🇨🇳','China'],['🇺🇸','United States'],['🇪🇸','Spain'],['🇰🇷','South Korea'],['🇬🇷','Greece'],['🇸🇪','Sweden'],
];
const WDB = [
  ['Dog','Cat','Rabbit','Apple'],['Red','Blue','Green','Circle'],['Rose','Tulip','Daisy','Oak'],
  ['Car','Bus','Bike','Banana'],['Sun','Moon','Star','Chair'],['Guitar','Drum','Piano','Pencil'],
  ['Apple','Banana','Grape','Carrot'],['Snake','Lizard','Frog','Table'],['Rain','Snow','Wind','Book'],
  ['Nose','Ear','Eye','Shoe'],['Circle','Square','Triangle','Blue'],['Milk','Water','Juice','Bread'],
];  // last item is always the odd one (shuffled at question time)
const CAT = [
  ['animal',['Table','Tiger','Spoon','Cloud'],1],['fruit',['Carrot','Potato','Mango','Onion'],2],
  ['colour',['Chair','Purple','River','Music'],1],['vehicle',['Apple','Banana','Truck','Table'],2],
  ['planet',['Mars','Cheese','Cookie','Sock'],0],['vegetable',['Grape','Cherry','Broccoli','Peach'],2],
  ['instrument',['Violin','Pillow','Bottle','Ladder'],0],['shape',['Yellow','Square','Loud','Fast'],1],
  ['bird',['Shark','Eagle','Frog','Snake'],1],['insect',['Ant','Dog','Fish','Horse'],0],
  ['drink',['Bread','Rice','Juice','Cheese'],2],['body part',['Elbow','Chair','Cloud','Spoon'],0],
];

const SHAPE_PATH = {
  star:'M40 6l9.5 22.5L74 31 55 47l6 25-21-13-21 13 6-25L6 31l24.5-2.5z',
  circle:'M40 10a30 30 0 1 0 0 60 30 30 0 0 0 0-60z',
  heart:'M40 70S10 50 10 29a16 16 0 0 1 30-7 16 16 0 0 1 30 7c0 21-30 41-30 41z',
  square:'M14 14h52v52H14z', triangle:'M40 10l32 56H8z', flash:'M44 6L16 44h18l-6 30 30-40H40z',
};
export function shapeSVG(shape, hex, size){ size=size||64;
  return `<svg width="${size}" height="${size}" viewBox="0 0 80 80" fill="${hex}" stroke="rgba(30,27,38,.14)" stroke-width="1.5" stroke-linejoin="round"><path d="${SHAPE_PATH[shape]||SHAPE_PATH.star}"/></svg>`; }

export function isLive(game){ return /trivia-sprint|number-ninjas|this-or-that|odd-one-out|click-rush|true-or-false|higher-or-lower|flag-frenzy|which-doesnt-belong|category-tap/.test(game||''); }
export function gameTitle(game){
  if(/number-ninjas/.test(game)) return 'Number Ninjas';
  if(/this-or-that/.test(game))  return 'This or That';
  if(/odd-one-out/.test(game))   return 'Odd One Out';
  if(/click-rush/.test(game))    return 'Click Rush';
  if(/true-or-false/.test(game)) return 'True or False Blitz';
  if(/higher-or-lower/.test(game)) return 'Higher or Lower';
  if(/flag-frenzy/.test(game))   return 'Flag Frenzy';
  if(/which-doesnt-belong/.test(game)) return "Which Doesn't Belong";
  if(/category-tap/.test(game))  return 'Category Tap';
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
  if(/true-or-false/.test(game)){ const [s,tf]=rnd(TF);
    return { type:'mcq', prompt:s, hint:'True or false?', options:['✅ True','❌ False'], correct: tf?0:1 }; }
  if(/higher-or-lower/.test(game)){ const [s,hi]=rnd(HL);
    return { type:'mcq', prompt:s, hint:'Higher or lower?', options:['⬆️ Higher','⬇️ Lower'], correct: hi?0:1 }; }
  if(/flag-frenzy/.test(game)){ const [flag,name]=rnd(FLAGS); const opts=new Set([name]);
    while(opts.size<4) opts.add(rnd(FLAGS)[1]); const arr=[...opts].sort(()=>Math.random()-.5);
    return { type:'mcq', prompt:flag, hint:'Which country?', options:arr, correct:arr.indexOf(name) }; }
  if(/which-doesnt-belong/.test(game)){ const it=rnd(WDB), oddItem=it[3];
    const arr=it.slice().sort(()=>Math.random()-.5);
    return { type:'mcq', prompt:'Which does NOT belong?', options:arr, correct:arr.indexOf(oddItem) }; }
  if(/category-tap/.test(game)){ const [cat,opts,ci]=rnd(CAT), correctItem=opts[ci];
    const arr=opts.slice().sort(()=>Math.random()-.5);
    return { type:'mcq', prompt:`Tap the ${cat}`, options:arr, correct:arr.indexOf(correctItem) }; }
  const t=rnd(TRIVIA);
  return { type:'mcq', prompt:t.q, hint:'', options:t.a, correct:t.c };
}

export function howto(game){
  if(/number-ninjas/.test(game)) return 'Solve the maths and tap the right answer — the faster you\'re correct, the more points you grab!';
  if(/this-or-that/.test(game))  return 'Two choices, no wrong answer — pick your side fast. Go with the majority to score!';
  if(/odd-one-out/.test(game))   return 'One tile is a slightly different shade. Spot it and tap it — fastest eyes win!';
  if(/click-rush/.test(game))    return 'It names a shape and colour — find that tile and tap it before anyone else!';
  if(/true-or-false/.test(game)) return 'Is it true or false? Tap fast — quicker correct answers score more!';
  if(/higher-or-lower/.test(game)) return 'Is the real number higher or lower than shown? Tap your guess fast!';
  if(/flag-frenzy/.test(game))   return 'A flag appears — tap the country it belongs to, as fast as you can!';
  if(/which-doesnt-belong/.test(game)) return 'Three of the four go together — tap the odd one out!';
  if(/category-tap/.test(game))  return 'Tap the item that fits the category — fastest correct wins!';
  return 'Read the question and tap your answer fast — the quicker you\'re right, the more you score!';
}
export function speedPoints(rank){ return Math.max(5, 15-rank); }   // 1st correct = 15 … floor 5
export function votePoints(){ return 8; }                            // majority side (This or That)
