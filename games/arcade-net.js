/* ============================================================
   Summer School Arcade — networking layer (Supabase realtime)
   ES module. Wraps the Supabase client so the games/host/display
   talk to one shared room in real time.

   Publishable (anon) key is public by design — RLS + the fact that
   the only data here is first names + game points make this safe.
============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = 'https://zbnpyjllbtktmbkqxilq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G5d5Ncj4X0X2EyBjOmGxjg_KcJ_Fk7B';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 25 } },
  auth: { persistSession: false },
});

/* ---- identity: a stable per-device id (for reconnection) ---- */
export function clientId(){
  let id = localStorage.getItem('ssa_client');
  if(!id){ id = (crypto.randomUUID ? crypto.randomUUID() : 'c'+Math.random().toString(36).slice(2)); localStorage.setItem('ssa_client', id); }
  return id;
}

/* ---- room code: 5 chars, unambiguous alphabet, ZAP- prefix ---- */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // no I,O,0,1
function randomCode(){ let s=''; for(let i=0;i<4;i++) s+=ALPHABET[Math.floor(Math.random()*ALPHABET.length)]; return 'ZAP-'+s; }

/* ---- Host: create a room (retries on the rare code collision) ---- */
export async function createRoom(settings={}){
  const hostToken = clientId()+'-'+Date.now();
  for(let attempt=0; attempt<5; attempt++){
    const code = randomCode();
    const { data, error } = await sb.from('rooms').insert({
      code, host_token: hostToken, status:'lobby', phase:'lobby',
      settings: Object.assign({ minPlayers:4, teamNames:['Red','Blue','Green'] }, settings),
    }).select().single();
    if(!error) return { room:data, hostToken };
    if(error.code!=='23505') throw error;   // 23505 = unique violation on code -> retry
  }
  throw new Error('Could not allocate a room code');
}

/* ---- Player: join (or reconnect to) a room by code ---- */
export async function joinRoom(code, name, avatar){
  const { data, error } = await sb.rpc('join_room', {
    p_code: code.trim().toUpperCase(), p_name: name.trim(), p_avatar: avatar, p_client_id: clientId(),
  });
  if(error){ if((error.message||'').includes('ROOM_NOT_FOUND')) throw new Error('ROOM_NOT_FOUND'); throw error; }
  return data;   // the player row
}

export async function getRoomByCode(code){
  const { data } = await sb.from('rooms').select('*').eq('code', code.trim().toUpperCase()).maybeSingle();
  return data;
}
export async function listPlayers(roomId){
  const { data } = await sb.from('players').select('*').eq('room_id', roomId).order('created_at');
  return data || [];
}

/* ---- Session flow (host-controlled) ---- */
export function gameLabel(file){
  if(!file) return '';
  return file.replace(/-3d\.html$/,'').replace(/\.html$/,'').replace(/-/g,' ').replace(/\b\w/g, c=>c.toUpperCase());
}
export async function startSession(roomId, games, extra={}){
  await setRoom(roomId, { status:'in_game', current_game:games[0], phase:'playing', state:Object.assign({ games, index:0 }, extra) });
}
export async function advanceGame(roomId, room){
  const st = room.state||{}; const games = st.games||[]; const idx = (st.index||0)+1;
  if(idx >= games.length){ await setRoom(roomId, { status:'results', phase:'summary' }); return true; }
  await setRoom(roomId, { current_game:games[idx], state:Object.assign({}, st, { games, index:idx }) });  // preserve mode etc.
  return false;
}
export async function endSession(roomId){ await setRoom(roomId, { status:'ended', phase:'ended' }); }

/* ---- Host controls ---- */
export async function setRoom(roomId, patch){
  patch.updated_at = new Date().toISOString();
  const { error } = await sb.from('rooms').update(patch).eq('id', roomId);
  if(error) throw error;
}
export async function setRoomState(roomId, state){ return setRoom(roomId, { state }); }
export async function reassignTeam(playerId, team){ await sb.from('players').update({ team }).eq('id', playerId); }
export async function setConnected(playerId, connected){ await sb.from('players').update({ connected, last_seen:new Date().toISOString() }).eq('id', playerId); }

/* ---- Scoring ---- */
export async function addPoints(playerId, pts){ await sb.rpc('add_player_points', { p_player:playerId, p_points:pts }); }
export async function recordScore(roomId, playerId, game, points, placement){
  await sb.from('game_scores').insert({ room_id:roomId, player_id:playerId, game, points, placement });
  await sb.rpc('add_player_points', { p_player: playerId, p_points: points });   // atomic cumulative bump
}

/* ---- Events (authoritative server timestamp lives in events.server_ts) ---- */
export async function sendEvent(roomId, playerId, game, kind, payload={}){
  await sb.from('events').insert({ room_id:roomId, player_id:playerId, game, kind, payload });
}

/* ---- Live rounds (Kahoot-style): display drives, players answer ---- */
// display marks the authoritative round start; returns its server timestamp
export async function markRoundStart(roomId, game, round){
  const { data } = await sb.from('events').insert({ room_id:roomId, kind:'round_start', game, payload:{ round } }).select('server_ts').single();
  return data ? data.server_ts : null;
}
// player submits an answer for a round (one per round)
export async function submitAnswer(roomId, playerId, game, round, choice){
  await sb.from('events').insert({ room_id:roomId, player_id:playerId, game, kind:'answer', payload:{ round, choice } });
}
// display reads all answers for a round, ordered by authoritative server time (= speed order)
export async function readAnswers(roomId, round){
  const { data } = await sb.from('events').select('player_id,payload,server_ts').eq('room_id',roomId).eq('kind','answer').order('server_ts',{ascending:true});
  const seen=new Set(); const out=[];
  (data||[]).forEach(e=>{ if(!e.payload || e.payload.round!==round) return; if(seen.has(e.player_id)) return; seen.add(e.player_id); out.push(e); });
  return out;   // first (earliest) answer per player, in speed order
}

/* ---- Studio games (Doodle Duel / Build-a-Monster): submit + vote via events ---- */
export async function submitWork(roomId, playerId, game, round, data){
  await sb.from('events').insert({ room_id:roomId, player_id:playerId, game, kind:'work', payload:{ round, data } });
}
export async function readWorks(roomId, round){
  const { data } = await sb.from('events').select('player_id,payload,server_ts').eq('room_id',roomId).eq('kind','work').order('server_ts',{ascending:true});
  const latest={}; (data||[]).forEach(e=>{ if(!e.payload||e.payload.round!==round) return; latest[e.player_id]=e.payload.data; });
  return latest;   // { playerId: data }
}
export async function castVote(roomId, playerId, game, round, target){
  await sb.from('events').insert({ room_id:roomId, player_id:playerId, game, kind:'studiovote', payload:{ round, target } });
}
export async function readVotes(roomId, round){
  const { data } = await sb.from('events').select('player_id,payload,server_ts').eq('room_id',roomId).eq('kind','studiovote').order('server_ts',{ascending:true});
  const byVoter={}; (data||[]).forEach(e=>{ if(!e.payload||e.payload.round!==round) return; byVoter[e.player_id]=e.payload.target; }); // last vote per voter
  const tally={}; Object.values(byVoter).forEach(t=>{ if(t) tally[t]=(tally[t]||0)+1; });
  return tally;   // { targetPlayerId: voteCount }
}
export async function readVoteChoices(roomId, round){
  const { data } = await sb.from('events').select('player_id,payload,server_ts').eq('room_id',roomId).eq('kind','studiovote').order('server_ts',{ascending:true});
  const byVoter={}; (data||[]).forEach(e=>{ if(!e.payload||e.payload.round!==round) return; byVoter[e.player_id]=e.payload.target; });
  return byVoter;   // { voterId: targetId } (last vote per voter)
}
export async function readGuesses(roomId, round){
  const { data } = await sb.from('events').select('player_id,payload,server_ts').eq('room_id',roomId).eq('kind','guess').order('server_ts',{ascending:true});
  return (data||[]).filter(e=>e.payload&&e.payload.round===round);
}
export async function sendGuess(roomId, playerId, game, round, text){
  await sb.from('events').insert({ room_id:roomId, player_id:playerId, game, kind:'guess', payload:{ round, text } });
}

/* ---- Realtime subscriptions ---- */
export function onPlayers(roomId, cb){
  return sb.channel('players-'+roomId)
    .on('postgres_changes', { event:'*', schema:'public', table:'players', filter:'room_id=eq.'+roomId }, cb)
    .subscribe();
}
export function onRoom(roomId, cb){
  return sb.channel('room-'+roomId)
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'rooms', filter:'id=eq.'+roomId }, cb)
    .subscribe();
}
export function onEvents(roomId, cb){
  return sb.channel('events-'+roomId)
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'events', filter:'room_id=eq.'+roomId }, cb)
    .subscribe();
}
export function leave(channel){ try{ sb.removeChannel(channel); }catch(e){} }

/* ---- Real-time arena (Broadcast: ephemeral, low-latency, no DB writes) ----
   Used by the motion games. Display is authority: it receives inputs and
   broadcasts the full game snapshot every tick; players send inputs + render. */
export function openArena(roomId, { onInput, onState, onMeta }={}){
  const ch = sb.channel('arena-'+roomId, { config:{ broadcast:{ self:false, ack:false } } });
  if(onInput) ch.on('broadcast', { event:'input' }, m=>onInput(m.payload));
  if(onState) ch.on('broadcast', { event:'state' }, m=>onState(m.payload));
  if(onMeta)  ch.on('broadcast', { event:'meta'  }, m=>onMeta(m.payload));
  ch.subscribe();
  return {
    ch,
    sendInput:(payload)=>ch.send({ type:'broadcast', event:'input', payload }),
    sendState:(payload)=>ch.send({ type:'broadcast', event:'state', payload }),
    sendMeta:(payload)=>ch.send({ type:'broadcast', event:'meta',  payload }),
    close:()=>{ try{ sb.removeChannel(ch); }catch(e){} },
  };
}

/* ---- Presence heartbeat: mark disconnect when a player's tab closes ---- */
export function heartbeat(playerId){
  const bye = ()=>{ try{ navigator.sendBeacon && setConnected(playerId,false); }catch(e){} };
  window.addEventListener('beforeunload', ()=>setConnected(playerId,false));
  const iv=setInterval(()=>setConnected(playerId,true), 25000);
  return ()=>{ clearInterval(iv); };
}

export const TEAM_COLORS = ['#E5484D','#4F9CF9','#3FBF7F'];
export const TEAM_NAMES  = ['Red','Blue','Green'];

/* selectable clay characters for the join screen (avatar = character id) */
export const CHARACTERS = [
  { id:'blob',    name:'Blip',   img:'assets/landing/hero-a.png' },
  { id:'star',    name:'Twinkle',img:'assets/landing/hero-b.png' },
  { id:'party',   name:'Confetti',img:'assets/landing/hero-c.png' },
  { id:'ninja',   name:'Ninja',  img:'assets/games/number-ninjas.png' },
  { id:'spy',     name:'Sleuth', img:'assets/games/secret-spy.png' },
  { id:'monster', name:'Gizmo',  img:'assets/games/build-a-monster.png' },
];
export function charImg(id){ const c=CHARACTERS.find(x=>x.id===id); return c ? c.img : null; }
