/* Shared bits for the creative "studio" games (make → vote → result)
   and Quick Draw Guess (live pictionary). */
import { renderMonster } from './monster.js';

const STUDIO = { 'doodle-duel':'doodle', 'build-a-monster':'monster' };
function slug(file){ return (file||'').replace(/-3d\.html$/,'').replace(/\.html$/,''); }
export function studioKind(file){ return STUDIO[slug(file)] || null; }
export function isStudio(file){ return !!studioKind(file); }
export function isQuickDraw(file){ return slug(file)==='quick-draw-guess'; }
export function studioTitle(file){
  if(isQuickDraw(file)) return 'Quick Draw Guess';
  return { doodle:'Doodle Duel', monster:'Build-a-Monster' }[studioKind(file)] || '';
}

export const DOODLE_PROMPTS = ['a happy robot','a dog on a skateboard','a spooky castle','an alien snack',
  'a dancing cactus','your dream treehouse','a superhero potato','a sea monster','a rocket cat','a pizza planet',
  'a grumpy cloud','a dragon\'s birthday'];
export const QUICKDRAW_WORDS = ['cat','house','tree','sun','car','boat','fish','star','flower','robot','pizza',
  'rocket','snake','crown','ghost','apple','rainbow','snowman','butterfly','dinosaur','guitar','umbrella','castle','cookie'];

export function makePrompt(kind, round){
  if(kind==='doodle') return DOODLE_PROMPTS[(round-1)%DOODLE_PROMPTS.length];
  return 'your wildest monster';
}
export function studioHowto(file, phase){
  const k=studioKind(file);
  if(phase==='vote') return 'Tap your favourite creation — you can\'t vote for your own!';
  if(k==='monster') return 'Pick parts to build your monster, then hit Submit before time runs out!';
  if(k==='doodle')  return 'Draw the prompt on your canvas, then hit Submit before time runs out!';
  return '';
}

/* draw one gallery entry (monster from parts, or a doodle image) into a box */
export function drawEntry(ctx, x, y, w, h, entry, imgCache){
  ctx.save();
  if(entry.mon){ renderMonster(ctx, x+w/2, y+h/2, Math.min(w,h)*0.8, entry.mon); }
  else if(entry.data && imgCache){ const im=imgCache[entry.playerId];
    if(im && im.complete){ const s=Math.min(w/im.width,h/im.height); const dw=im.width*s, dh=im.height*s;
      ctx.drawImage(im, x+(w-dw)/2, y+(h-dh)/2, dw, dh); } }
  ctx.restore();
}
