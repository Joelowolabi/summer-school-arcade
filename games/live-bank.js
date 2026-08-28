/* Shared question bank for the live (synchronized) quiz engine.
   The display generates questions from here; players render what's broadcast.
   Question types:
     mcq  — text options, one correct, speed-ranked
     vote — two options, no correct, majority scores
     grid — visual tiles (colour or shape), one correct, speed-ranked

   Difficulty: every text bank is tiered { easy, med, hard }. makeQuestion takes
   { difficulty, used } — `used` is a Set the display keeps per game so questions
   don't repeat within a session (falls back to allowing repeats once exhausted).
*/
const rnd = a => a[Math.floor(Math.random()*a.length)];
const ri  = (a,b)=>a+Math.floor(Math.random()*(b-a+1));
const cap = s => s[0].toUpperCase()+s.slice(1);

/* ---------- pick an unused item from a tiered bank ---------- */
const USED = {};                                  // per-game used sets (session-persistent)
function usedSet(game){ return USED[game] || (USED[game]=new Set()); }
export function resetUsed(game){ if(game) delete USED[game]; else Object.keys(USED).forEach(k=>delete USED[k]); }
function order(diff){ return diff==='hard' ? ['hard','med','easy'] : diff==='easy' ? ['easy','med','hard'] : ['med','hard','easy']; }
function pickTiered(bank, key, diff, used){
  for(const tier of order(diff)){ const arr=bank[tier]||[]; const free=[];
    for(let i=0;i<arr.length;i++) if(!used.has(key+tier+i)) free.push(i);
    if(free.length){ const i=free[Math.floor(Math.random()*free.length)]; used.add(key+tier+i); return arr[i]; } }
  const tier=order(diff)[0], arr=bank[tier]||bank.med||bank.easy||[];   // exhausted → allow repeats
  return arr[Math.floor(Math.random()*arr.length)];
}

/* ---------- Trivia Sprint ---------- */
const TRIVIA = {
  easy:[
    {q:'Which planet is known as the Red Planet?',a:['Venus','Mars','Jupiter','Saturn'],c:1},
    {q:'How many legs does a spider have?',a:['6','8','10','12'],c:1},
    {q:'What do bees make?',a:['Milk','Silk','Honey','Butter'],c:2},
    {q:'What colour do you get mixing blue and yellow?',a:['Green','Purple','Orange','Brown'],c:0},
    {q:'Which animal is the king of the jungle?',a:['Tiger','Bear','Lion','Wolf'],c:2},
    {q:'What is frozen water called?',a:['Steam','Ice','Snowman','Cloud'],c:1},
    {q:'Which fruit is yellow and curved?',a:['Apple','Banana','Grape','Cherry'],c:1},
    {q:'How many days are in a week?',a:['5','6','7','8'],c:2},
    {q:'What do you call a baby dog?',a:['Kitten','Cub','Puppy','Foal'],c:2},
    {q:'Which shape has no corners?',a:['Square','Circle','Triangle','Star'],c:1},
    {q:'What sound does a cow make?',a:['Woof','Moo','Meow','Quack'],c:1},
    {q:'How many wheels does a bicycle have?',a:['1','2','3','4'],c:1},
    {q:'What do we call frozen rain?',a:['Snow','Fog','Mud','Dew'],c:0},
    {q:'Which is the biggest land animal?',a:['Horse','Elephant','Giraffe','Rhino'],c:1},
    {q:'What do plants need to grow?',a:['Darkness','Sunlight','Ice','Sand'],c:1},
  ],
  med:[
    {q:'Which is the largest ocean?',a:['Atlantic','Indian','Arctic','Pacific'],c:3},
    {q:'Which star is closest to Earth?',a:['The Moon','The Sun','Polaris','Sirius'],c:1},
    {q:'How many continents are there?',a:['5','6','7','8'],c:2},
    {q:'What is the fastest land animal?',a:['Cheetah','Horse','Rabbit','Kangaroo'],c:0},
    {q:'What gas do plants breathe in?',a:['Oxygen','Helium','Carbon dioxide','Neon'],c:2},
    {q:'How many colours are in a rainbow?',a:['5','6','7','8'],c:2},
    {q:'Which planet is the largest?',a:['Earth','Mars','Jupiter','Neptune'],c:2},
    {q:'What is the tallest animal?',a:['Elephant','Giraffe','Horse','Camel'],c:1},
    {q:'Which country has the Eiffel Tower?',a:['Italy','Spain','France','Germany'],c:2},
    {q:'What do you call molten rock from a volcano?',a:['Lava','Mud','Sap','Coal'],c:0},
    {q:'How many sides does a hexagon have?',a:['5','6','7','8'],c:1},
    {q:'Which ocean animal is the largest?',a:['Shark','Blue whale','Octopus','Dolphin'],c:1},
    {q:'What is the capital of Japan?',a:['Seoul','Beijing','Tokyo','Bangkok'],c:2},
    {q:'What do we call animals that eat only plants?',a:['Carnivores','Herbivores','Omnivores','Insects'],c:1},
    {q:'Which metal is attracted to magnets?',a:['Gold','Iron','Silver','Copper'],c:1},
  ],
  hard:[
    {q:'What is the hardest natural material?',a:['Gold','Iron','Diamond','Granite'],c:2},
    {q:'Which planet spins on its side?',a:['Mars','Uranus','Venus','Saturn'],c:1},
    {q:'How many hearts does an octopus have?',a:['1','2','3','4'],c:2},
    {q:'What is the smallest bone in the body?',a:['Stapes (ear)','Rib','Toe bone','Wrist bone'],c:0},
    {q:'Which gas makes up most of Earth\'s air?',a:['Oxygen','Nitrogen','Carbon dioxide','Hydrogen'],c:1},
    {q:'What is the largest desert on Earth?',a:['Sahara','Gobi','Antarctic','Arabian'],c:2},
    {q:'Which language has the most native speakers?',a:['English','Spanish','Mandarin','Hindi'],c:2},
    {q:'What is the powerhouse of the cell?',a:['Nucleus','Mitochondria','Ribosome','Membrane'],c:1},
    {q:'How long does light take to reach Earth from the Sun?',a:['8 minutes','8 seconds','8 hours','1 minute'],c:0},
    {q:'Which country has the most time zones?',a:['USA','Russia','China','France'],c:3},
    {q:'What is a group of crows called?',a:['A pack','A murder','A flock','A herd'],c:1},
    {q:'Which vitamin does the sun help make?',a:['Vitamin A','Vitamin C','Vitamin D','Vitamin K'],c:2},
    {q:'What is the chemical symbol for gold?',a:['Go','Gd','Au','Ag'],c:2},
    {q:'How many bones are in the adult human body?',a:['106','206','306','406'],c:1},
    {q:'Which planet has the most moons?',a:['Earth','Mars','Saturn','Mercury'],c:2},
  ],
};

/* ---------- This or That (opinion vote — no difficulty) ---------- */
const TOT = [
  ['Pizza','#F2683C','Tacos','#FFD93B'],['Beach','#4F9CF9','Mountains','#3FBF7F'],
  ['Dogs','#F2683C','Cats','#7B5BE8'],['Summer','#FFD93B','Winter','#4F9CF9'],
  ['Super Speed','#F2683C','Flying','#7B5BE8'],['Video Games','#7B5BE8','Board Games','#3FBF7F'],
  ['Ice Cream','#4F9CF9','Cookies','#F2683C'],['Robots','#565165','Dinosaurs','#3FBF7F'],
  ['Pancakes','#FFD93B','Waffles','#F2683C'],['Space','#7B5BE8','Ocean','#4F9CF9'],
  ['Chocolate','#8B5E34','Vanilla','#FFD93B'],['Cats videos','#7B5BE8','Dog videos','#F2683C'],
  ['Morning','#FFD93B','Night','#3E2C6B'],['Sweet','#F2683C','Salty','#4F9CF9'],
  ['Movies','#7B5BE8','Books','#3FBF7F'],['Sneakers','#4F9CF9','Sandals','#FFD93B'],
  ['Invisibility','#565165','Teleporting','#7B5BE8'],['Rollercoaster','#F2683C','Water slide','#4F9CF9'],
  ['Cake','#F2683C','Pie','#3FBF7F'],['City','#7B5BE8','Countryside','#3FBF7F'],
];

const PALETTE = [[242,104,60],[123,91,232],[63,191,127],[79,156,249],[245,200,31],[229,72,77]];
const CR_COLORS = [{n:'Orange',h:'#F2683C'},{n:'Purple',h:'#7B5BE8'},{n:'Yellow',h:'#FFD93B'},{n:'Green',h:'#3FBF7F'},{n:'Blue',h:'#4F9CF9'},{n:'Red',h:'#E5484D'}];
const SHAPES = ['star','circle','heart','square','triangle','flash'];

/* ---------- True or False Blitz ---------- */
const TF = {
  easy:[
    ['Spiders have eight legs',true],['A tomato is a fruit',true],['Penguins can fly',false],
    ['Cows say moo',true],['The Sun is a planet',false],['A week has seven days',true],
    ['Fish can breathe underwater',true],['Ice is frozen water',true],['Cats bark',false],
    ['Bananas are blue',false],['A triangle has three sides',true],['The sky is green',false],
    ['Bees make honey',true],['You have two eyes',true],['Snow is hot',false],
  ],
  med:[
    ['A group of lions is called a pride',true],['Honey never goes bad',true],['Sharks are mammals',false],
    ['Octopuses have three hearts',true],['Water is made of hydrogen and oxygen',true],
    ['Goldfish only remember things for 3 seconds',false],['A caterpillar turns into a butterfly',true],
    ['Bananas grow on trees',false],['Bats are completely blind',false],['Humans have five senses',true],
    ['The Great Wall of China is visible from the Moon',false],['A baby kangaroo is called a joey',true],
    ['Tomatoes are vegetables',false],['Sound travels faster than light',false],['Owls can turn their heads almost all the way around',true],
  ],
  hard:[
    ['Lightning is hotter than the surface of the Sun',true],['Some frogs can freeze solid and come back to life',true],
    ['The human body has more than 200 bones',true],['Chocolate is safe for dogs to eat',false],
    ['A day on Venus is longer than its year',true],['Sharks existed before trees',true],
    ['The heart is on the right side of the body',false],['Sound cannot travel in space',true],
    ['Bananas are slightly radioactive',true],['Humans share about 60% of their DNA with bananas',true],
    ['An octopus has blue blood',true],['Glass is a very slow-moving liquid at room temperature',false],
    ['Antarctica is the largest desert on Earth',true],['A jiffy is an actual unit of time',true],
    ['The Eiffel Tower can be taller in summer',true],
  ],
};

/* ---------- Higher or Lower ---------- */
const HL = {
  easy:[
    ['✋ Fingers on one hand — more than 3?',true],['🔺 Sides on a triangle — more than 4?',false],
    ['📅 Days in a week — more than 5?',true],['🌈 Colours in a rainbow — more than 5?',true],
    ['👀 Eyes on your face — more than 1?',true],['🕐 Hours on a clock face — more than 20?',false],
    ['🐜 Legs on an ant — more than 4?',true],['🍩 Holes in a donut — more than 2?',false],
    ['🐶 Legs on a dog — more than 3?',true],['⭐ Points on a classic star — more than 4?',true],
  ],
  med:[
    ['🕐 Hours in a week — more than 100?',true],['⚽ Players on a soccer team on the field — more than 15?',false],
    ['🕷️ Legs on a spider — more than 6?',true],['📅 Days in a year — more than 400?',false],
    ['🎹 Keys on a piano — more than 50?',true],['🐙 Arms on an octopus — more than 6?',true],
    ['⏱️ Seconds in a minute — more than 100?',false],['💯 Years in a century — more than 50?',true],
    ['🎸 Strings on a guitar — more than 10?',false],['🌍 Continents on Earth — more than 5?',true],
    ['🏀 Players per basketball team on court — more than 6?',false],['♟️ Pieces per side in chess — more than 12?',true],
  ],
  hard:[
    ['🎹 Keys on a full piano — more than 90?',false],['🦴 Bones in the human body — more than 300?',false],
    ['🌡️ Boiling point of water in °C — more than 90?',true],['🇺🇳 Countries in the world — more than 150?',true],
    ['🐝 Eyes on a honeybee — more than 2?',true],['🌕 Moons of Jupiter — more than 50?',true],
    ['⏳ Minutes in a full day — more than 1000?',true],['🧬 Chromosomes in a human cell — more than 50?',false],
    ['🎬 Frames per second in most films — more than 40?',false],['🏔️ Height of Everest in metres — more than 8000?',true],
    ['🐘 Weight of an elephant in kg — more than 2000?',true],['💨 Speed of sound in mph — more than 500?',true],
  ],
};

/* ---------- Flag Frenzy ---------- */
const FLAGS = {
  easy:[
    ['🇫🇷','France'],['🇯🇵','Japan'],['🇧🇷','Brazil'],['🇨🇦','Canada'],['🇮🇹','Italy'],
    ['🇺🇸','United States'],['🇬🇧','United Kingdom'],['🇩🇪','Germany'],['🇨🇳','China'],['🇳🇬','Nigeria'],
    ['🇮🇳','India'],['🇦🇺','Australia'],['🇲🇽','Mexico'],['🇪🇸','Spain'],['🇰🇷','South Korea'],
  ],
  med:[
    ['🇪🇬','Egypt'],['🇰🇪','Kenya'],['🇿🇦','South Africa'],['🇬🇷','Greece'],['🇸🇪','Sweden'],
    ['🇦🇷','Argentina'],['🇳🇱','Netherlands'],['🇵🇹','Portugal'],['🇹🇷','Turkey'],['🇹🇭','Thailand'],
    ['🇮🇪','Ireland'],['🇳🇴','Norway'],['🇵🇱','Poland'],['🇬🇭','Ghana'],['🇸🇦','Saudi Arabia'],
  ],
  hard:[
    ['🇵🇭','Philippines'],['🇻🇳','Vietnam'],['🇨🇭','Switzerland'],['🇫🇮','Finland'],['🇩🇰','Denmark'],
    ['🇲🇦','Morocco'],['🇵🇪','Peru'],['🇨🇱','Chile'],['🇮🇩','Indonesia'],['🇲🇾','Malaysia'],
    ['🇧🇪','Belgium'],['🇦🇹','Austria'],['🇺🇦','Ukraine'],['🇰🇿','Kazakhstan'],['🇨🇴','Colombia'],
  ],
};
const FLAG_ALL = [...FLAGS.easy,...FLAGS.med,...FLAGS.hard];

/* ---------- Which Doesn't Belong (last item is the odd one) ---------- */
const WDB = {
  easy:[
    ['Dog','Cat','Rabbit','Apple'],['Red','Blue','Green','Circle'],['Car','Bus','Bike','Banana'],
    ['Sun','Moon','Star','Chair'],['Apple','Banana','Grape','Carrot'],['Nose','Ear','Eye','Shoe'],
    ['Milk','Water','Juice','Bread'],['Cow','Pig','Sheep','Truck'],['Ball','Kite','Toy','Soup'],
    ['One','Two','Three','Blue'],
  ],
  med:[
    ['Rose','Tulip','Daisy','Oak'],['Guitar','Drum','Piano','Pencil'],['Snake','Lizard','Frog','Table'],
    ['Rain','Snow','Wind','Book'],['Circle','Square','Triangle','Blue'],['Shark','Whale','Dolphin','Eagle'],
    ['Hammer','Saw','Drill','Apple'],['Monday','Tuesday','Friday','January'],['Copper','Iron','Gold','Wood'],
    ['Soccer','Tennis','Hockey','Violin'],
  ],
  hard:[
    ['Mercury','Venus','Mars','Moon'],['Square','Cube','Rectangle','Sphere'],['Trumpet','Flute','Clarinet','Drum'],
    ['Spanish','French','Italian','Toyota'],['Oxygen','Nitrogen','Helium','Copper'],['Triangle','Pentagon','Hexagon','Circle'],
    ['Lion','Tiger','Leopard','Wolf'],['Add','Subtract','Multiply','Alphabet'],['Emerald','Ruby','Sapphire','Marble'],
    ['Verb','Noun','Adjective','Triangle'],
  ],
};

/* ---------- Category Tap  [category, options[4], correctIndex] ---------- */
const CAT = {
  easy:[
    ['animal',['Table','Tiger','Spoon','Cloud'],1],['fruit',['Carrot','Potato','Mango','Onion'],2],
    ['colour',['Chair','Purple','River','Music'],1],['vehicle',['Apple','Banana','Truck','Table'],2],
    ['drink',['Bread','Rice','Juice','Cheese'],2],['body part',['Elbow','Chair','Cloud','Spoon'],0],
    ['bird',['Shark','Eagle','Frog','Snake'],1],['shape',['Yellow','Square','Loud','Fast'],1],
  ],
  med:[
    ['planet',['Mars','Cheese','Cookie','Sock'],0],['vegetable',['Grape','Cherry','Broccoli','Peach'],2],
    ['instrument',['Violin','Pillow','Bottle','Ladder'],0],['insect',['Ant','Dog','Fish','Horse'],0],
    ['metal',['Cotton','Silver','Paper','Glass'],1],['country',['Paris','Brazil','Nile','Everest'],1],
    ['sport',['Guitar','Tennis','Salad','Cloud'],1],['reptile',['Eagle','Lizard','Whale','Ant'],1],
  ],
  hard:[
    ['mammal',['Shark','Dolphin','Eagle','Frog'],1],['prime number',['9','15','17','21'],2],
    ['gas',['Iron','Helium','Copper','Gold'],1],['ocean',['Nile','Pacific','Everest','Sahara'],1],
    ['continent',['Brazil','Africa','Egypt','Paris'],1],['herbivore',['Lion','Deer','Tiger','Shark'],1],
    ['even number',['7','13','24','19'],2],['citrus fruit',['Banana','Lime','Apple','Grape'],1],
  ],
};

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

/* difficulty knob per generated game — d ∈ {easy, med, hard} */
export function makeQuestion(game, round, opts={}){
  const diff = opts.difficulty || 'med';
  const used = opts.used || usedSet(game);
  const hard = diff==='hard', easy = diff==='easy';

  if(/number-ninjas/.test(game)){
    const type=['add','sub','mul','seq'][Math.floor(Math.random()*(easy?2:4))];
    let text='', ans=0, hint='';
    if(type==='add'){ const a=ri(easy?2:hard?20:10, easy?20:hard?90:50), b=ri(easy?2:hard?15:8, easy?15:hard?60:35); text=`${a} + ${b}`; ans=a+b; }
    else if(type==='sub'){ let a=ri(easy?8:20, easy?30:hard?99:60), b=ri(1,a); text=`${a} − ${b}`; ans=a-b; }
    else if(type==='mul'){ const a=ri(2, easy?6:hard?12:9), b=ri(2, easy?6:hard?12:9); text=`${a} × ${b}`; ans=a*b; }
    else { const s=ri(1,easy?4:8), st=ri(2, easy?3:hard?9:5); text=`${s}, ${s+st}, ${s+2*st}, ?`; ans=s+3*st; hint='What comes next?'; }
    const o=new Set([ans]); const spread=hard?3:easy?1:2;
    while(o.size<4){ const d=ans+ri(-6,6)*spread; if(d!==ans&&d>=0) o.add(d); }
    const arr=[...o].sort(()=>Math.random()-.5);
    return { type:'mcq', prompt:text, hint, options:arr.map(String), correct:arr.indexOf(ans) };
  }
  if(/this-or-that/.test(game)){
    const p=pickTiered({med:TOT}, 'tot', 'med', used);
    return { type:'vote', prompt:`${p[0]} or ${p[2]}?`, options:[p[0],p[2]], colors:[p[1],p[3]] };
  }
  if(/odd-one-out/.test(game)){
    const n = easy?3 : hard?5 : 4, N=n*n, odd=Math.floor(Math.random()*N);
    const base=rnd(PALETTE), dir=Math.random()<.5?1:-1;
    const delta = easy ? Math.max(24, 52-round*3) : hard ? Math.max(8, 26-round*2) : Math.max(14, 40-round*3);
    const shade=a=>a.map(v=>Math.max(0,Math.min(255,v+dir*delta)));
    const rgb=a=>`rgb(${a[0]},${a[1]},${a[2]})`;
    const tiles=[]; for(let i=0;i<N;i++) tiles.push({ c: rgb(i===odd?shade(base):base) });
    return { type:'grid', variant:'color', prompt:'Find the odd tile', tiles, cols:n, correct:odd };
  }
  if(/click-rush/.test(game)){
    const target={ color:rnd(CR_COLORS), shape:rnd(SHAPES) }, N=easy?6:hard?12:9, slot=Math.floor(Math.random()*N);
    const used2=new Set([target.color.h+target.shape]); const tiles=[];
    for(let i=0;i<N;i++){ if(i===slot){ tiles.push({c:target.color.h,s:target.shape}); continue; }
      let c,s,k,tries=0; do{ c=rnd(CR_COLORS); s=rnd(SHAPES); k=c.h+s; tries++; }while(used2.has(k)&&tries<40); used2.add(k);
      // on hard, bias distractors to share the target's colour OR shape (trickier)
      if(hard && Math.random()<.5){ if(Math.random()<.5) tiles.push({c:target.color.h,s}); else tiles.push({c:c.h,s:target.shape}); }
      else tiles.push({c:c.h,s}); }
    return { type:'grid', variant:'shape', prompt:`Find the ${target.color.n} ${cap(target.shape)}`, tiles, cols:3, correct:slot };
  }
  if(/true-or-false/.test(game)){ const [s,tf]=pickTiered(TF,'tf',diff,used);
    return { type:'mcq', prompt:s, hint:'True or false?', options:['✅ True','❌ False'], correct: tf?0:1 }; }
  if(/higher-or-lower/.test(game)){ const [s,hi]=pickTiered(HL,'hl',diff,used);
    return { type:'mcq', prompt:s, hint:'Higher or lower?', options:['⬆️ Higher','⬇️ Lower'], correct: hi?0:1 }; }
  if(/flag-frenzy/.test(game)){ const [flag,name]=pickTiered(FLAGS,'fl',diff,used); const opts=new Set([name]);
    while(opts.size<4) opts.add(rnd(FLAG_ALL)[1]); const arr=[...opts].sort(()=>Math.random()-.5);
    return { type:'mcq', prompt:flag, hint:'Which country?', options:arr, correct:arr.indexOf(name) }; }
  if(/which-doesnt-belong/.test(game)){ const it=pickTiered(WDB,'wdb',diff,used), oddItem=it[3];
    const arr=it.slice().sort(()=>Math.random()-.5);
    return { type:'mcq', prompt:'Which does NOT belong?', options:arr, correct:arr.indexOf(oddItem) }; }
  if(/category-tap/.test(game)){ const [catName,opts,ci]=pickTiered(CAT,'cat',diff,used), correctItem=opts[ci];
    const arr=opts.slice().sort(()=>Math.random()-.5);
    return { type:'mcq', prompt:`Tap the ${catName}`, options:arr, correct:arr.indexOf(correctItem) }; }
  const t=pickTiered(TRIVIA,'tr',diff,used);
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
