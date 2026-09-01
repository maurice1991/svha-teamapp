(() => {
'use strict';

const TEAM_NAME = window.SVHA_CONFIG?.teamName || 'SVHA MO13-1';
const SUPABASE_URL = (window.SVHA_CONFIG?.supabaseUrl || '').trim();
const SUPABASE_KEY = (window.SVHA_CONFIG?.supabasePublishableKey || window.SVHA_CONFIG?.supabaseAnonKey || '').trim();
const DB_ENABLED = /^https:\/\/.+\.supabase\.co$/i.test(SUPABASE_URL) && SUPABASE_KEY.length > 20 && window.supabase;
const sb = DB_ENABLED ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const STORAGE = { absences:'svha-v8-absences', driving:'svha-v8-driving', laundry:'svha-v8-laundry', cache:'svha-v8-cache' };

const SEED_PLAYERS = [
  'Willemijn Doelman','Julé Arwen van de Wal','Soof de Ruijter','Anna Gidding','Lexi van de Ven','Nola Roelofsen','Aaliyah Ansari','Norjan Daoud','Evi Rothoff','Fayenn Hanhart','Milou Riedijk','Vajèn Velthuizen','Noelle van Drunen'
].map((name,i)=>({id:`p${i+1}`,name,shirt_number:i+1,active:true}));

const SEED_MATCHES = [
  {id:'m1',event_type:'match',starts_at:'2026-09-05T08:30:00+02:00',ends_at:'2026-09-05T10:00:00+02:00',round:1,home_team:"DTS '35 Ede MO13-1",away_team:TEAM_NAME,location_name:'Sportpark Inschoten',address:'Inschoterweg 2, 6715 CS Ede'},
  {id:'m2',event_type:'match',starts_at:'2026-09-12T08:30:00+02:00',ends_at:'2026-09-12T10:00:00+02:00',round:2,home_team:TEAM_NAME,away_team:'sv DFS MO13-1',location_name:'Sportpark SVHA',address:''},
  {id:'m3',event_type:'match',starts_at:'2026-09-19T10:00:00+02:00',ends_at:'2026-09-19T11:30:00+02:00',round:3,home_team:'Leones MO13-1 (9-tal)',away_team:TEAM_NAME,location_name:"Sportpark 'Het Zijvond'",address:'De Peel 6, 6658 DJ Beneden-Leeuwen'},
  {id:'m4',event_type:'match',starts_at:'2026-09-26T08:30:00+02:00',ends_at:'2026-09-26T10:00:00+02:00',round:4,home_team:'Bennekom MO13-1',away_team:TEAM_NAME,location_name:"Sportpark 'De Eikelhof'",address:'Achterstraat 7, 6721 VM Bennekom'},
  {id:'m5',event_type:'match',starts_at:'2026-10-03T10:30:00+02:00',ends_at:'2026-10-03T12:00:00+02:00',round:5,home_team:TEAM_NAME,away_team:"Blauw Geel '55 MO13-1",location_name:'Sportpark SVHA',address:''}
];

function generateSeedTrainings(){
  const out=[]; const start=new Date('2026-09-02T12:00:00+02:00'); const end=new Date('2026-10-07T12:00:00+02:00'); let i=1;
  for(let cur=new Date(start); cur<=end; cur=new Date(cur.getTime()+86400000)){
    const day=cur.getDay(); if(day!==1 && day!==3) continue;
    const y=cur.getFullYear(),m=String(cur.getMonth()+1).padStart(2,'0'),d=String(cur.getDate()).padStart(2,'0'),ds=`${y}-${m}-${d}`;
    out.push({id:`t${i++}`,event_type:'training',title:'Training',starts_at:`${ds}T18:00:00+02:00`,ends_at:`${ds}T19:00:00+02:00`,location_name:'Sportpark SVHA',address:''});
  }
  return out;
}
const SEED_EVENTS=[...SEED_MATCHES,...generateSeedTrainings()];
const playerIdByName=name=>SEED_PLAYERS.find(p=>p.name===name)?.id;
const SEED_DRIVING=[
  ['m1','Willemijn Doelman'],['m1','Julé Arwen van de Wal'],['m1','Soof de Ruijter'],
  ['m3','Anna Gidding'],['m3','Lexi van de Ven'],['m3','Nola Roelofsen'],
  ['m4','Aaliyah Ansari'],['m4','Evi Rothoff'],['m4','Fayenn Hanhart']
].map((x,i)=>({id:`d${i+1}`,event_id:x[0],player_id:playerIdByName(x[1]),status:'scheduled'}));
const SEED_LAUNDRY=[
  ['m1','Norjan Daoud'],['m2','Lexi van de Ven'],['m3','Vajèn Velthuizen'],['m4','Milou Riedijk'],['m5','Willemijn Doelman']
].map((x,i)=>({id:`w${i+1}`,event_id:x[0],player_id:playerIdByName(x[1]),status:'scheduled'}));

const state={players:[],events:[],driving:[],laundry:[],absences:[],user:null,profile:null,parentPlayerIds:[],adminUsers:[],availabilityFilter:'all',online:false,mode:DB_ENABLED?'database':'demo'};
let installPrompt=null;

const fmtDate=new Intl.DateTimeFormat('nl-NL',{weekday:'long',day:'numeric',month:'long'});
const fmtShort=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'});
const fmtDay=new Intl.DateTimeFormat('nl-NL',{weekday:'short'});
const fmtTime=new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'});
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function dt(v){return new Date(v)}
function dateLabel(v){const s=fmtDate.format(dt(v));return s.charAt(0).toUpperCase()+s.slice(1)}
function initials(name){const p=name.trim().split(/\s+/); return ((p[0]?.[0]||'')+(p.length>1?p[p.length-1][0]:'')).toUpperCase()}
function eventTime(e){return fmtTime.format(dt(e.starts_at))}
function eventEnd(e){return e.ends_at?fmtTime.format(dt(e.ends_at)):''}
function isHome(e){return e.home_team===TEAM_NAME}
function opponent(e){return isHome(e)?e.away_team:e.home_team}
function player(id){return state.players.find(p=>p.id===id)}
function event(id){return state.events.find(e=>e.id===id)}
function isCoach(){return state.profile?.role==='coach'}
function canManagePlayer(id){return state.mode==='demo'||isCoach()||state.parentPlayerIds.includes(id)}
function upcomingEvents(){const n=Date.now();const future=state.events.filter(e=>dt(e.starts_at).getTime()>=n).sort((a,b)=>dt(a.starts_at)-dt(b.starts_at));return future.length?future:[...state.events].sort((a,b)=>dt(a.starts_at)-dt(b.starts_at))}
function matches(){return state.events.filter(e=>e.event_type==='match').sort((a,b)=>dt(a.starts_at)-dt(b.starts_at))}
function trainings(){return state.events.filter(e=>e.event_type==='training').sort((a,b)=>dt(a.starts_at)-dt(b.starts_at))}
function absenceFor(playerId,eventId){return state.absences.some(a=>a.player_id===playerId&&a.event_id===eventId)}
function toast(text){const el=$('#toast');el.textContent=text;el.classList.add('show');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2100)}
function getLocal(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch{return fallback}}
function setLocal(key,value){localStorage.setItem(key,JSON.stringify(value))}
function saveRemoteCache(){setLocal(STORAGE.cache,{players:state.players,events:state.events,driving:state.driving,laundry:state.laundry,absences:state.absences,at:Date.now()})}

function loadDemo(){
  state.players=structuredClone(SEED_PLAYERS);state.events=structuredClone(SEED_EVENTS);
  state.driving=structuredClone(SEED_DRIVING);state.laundry=structuredClone(SEED_LAUNDRY);state.absences=getLocal(STORAGE.absences,[]);
  const ds=getLocal(STORAGE.driving,{}),ws=getLocal(STORAGE.laundry,{});
  state.driving.forEach(a=>{if(ds[a.id])a.status=ds[a.id]}); state.laundry.forEach(a=>{if(ws[a.id])a.status=ws[a.id]});
  state.parentPlayerIds=state.players.map(p=>p.id);state.online=false;renderAll();
}

async function initDatabase(){
  // Register the auth listener first. In v9.0 this listener was only
  // registered when a session already existed, so a fresh login could
  // succeed while the login screen stayed visible.
  sb.auth.onAuthStateChange(async (_event,sessionNow)=>{
    if(!sessionNow){
      state.user=null;
      state.profile=null;
      state.parentPlayerIds=[];
      showAuth();
      return;
    }
    state.user=sessionNow.user;
    hideAuth();
    await loadRemote();
  });

  const {data:{session}}=await sb.auth.getSession();
  if(!session){showAuth();return;}
  state.user=session.user;
  hideAuth();
  await loadRemote();
}
async function loadRemote(){
  try{
    const [playersRes,eventsRes,driveRes,washRes,absenceRes,profileRes,linksRes]=await Promise.all([
      sb.from('players').select('*').eq('active',true).order('shirt_number'),
      sb.from('events').select('*').order('starts_at'),
      sb.from('transport_assignments').select('*'),
      sb.from('laundry_assignments').select('*'),
      sb.from('absences').select('*').order('created_at',{ascending:false}),
      sb.from('profiles').select('*').eq('id',state.user.id).maybeSingle(),
      sb.from('parent_players').select('player_id').eq('user_id',state.user.id)
    ]);
    const firstError=[playersRes,eventsRes,driveRes,washRes,absenceRes,profileRes,linksRes].find(r=>r.error)?.error;if(firstError)throw firstError;
    state.players=playersRes.data||[];state.events=eventsRes.data||[];state.driving=driveRes.data||[];state.laundry=washRes.data||[];state.absences=absenceRes.data||[];state.profile=profileRes.data||null;state.parentPlayerIds=(linksRes.data||[]).map(x=>x.player_id);state.online=true;saveRemoteCache();renderAll();
  }catch(err){
    console.error(err); const cache=getLocal(STORAGE.cache,null);if(cache){Object.assign(state,{players:cache.players||[],events:cache.events||[],driving:cache.driving||[],laundry:cache.laundry||[],absences:cache.absences||[]});state.online=false;renderAll();toast('Offline: laatst opgeslagen gegevens getoond');}else{const msg=String(err?.message||'');toast(/relation|schema cache|does not exist/i.test(msg)?'Database-tabellen ontbreken nog: voer schema.sql uit':'Database kon niet worden geladen');}
  }
}

function renderAll(){renderSync();renderDashboard();renderMatches();renderTraining();renderDriving();renderLaundry();renderAbsenceForm();renderAbsences();renderTeam();renderAccount();renderCoachVisibility();if(isCoach())renderAdminData()}
function renderSync(){const b=$('#sync-badge'),t=$('#sync-text');b.classList.remove('online','offline','demo');if(state.mode==='demo'){b.classList.add('demo');t.textContent='Demo'}else if(state.online){b.classList.add('online');t.textContent='Online'}else{b.classList.add('offline');t.textContent='Offline'}}
function renderDashboard(){
  const next=upcomingEvents()[0];if(next){$('#next-icon').textContent=next.event_type==='match'?'⚽':'🏃';$('#next-title').textContent=next.event_type==='match'?`${isHome(next)?'Thuis':'Uit'} tegen ${opponent(next)}`:'Training';$('#next-date').textContent=`${dateLabel(next.starts_at)} · ${eventTime(next)}`;$('#next-meta').textContent=next.event_type==='match'?(next.location_name||'Wedstrijd'): `${next.location_name||'Sportpark SVHA'} · tot ${eventEnd(next)}`;$('#next-action').dataset.jump=next.event_type==='match'?'matches':'schedule';}
  $('#my-drive-count').textContent=state.driving.filter(a=>canManagePlayer(a.player_id)).length;$('#my-wash-count').textContent=state.laundry.filter(a=>canManagePlayer(a.player_id)).length;
  $('#upcoming-list').innerHTML=upcomingEvents().slice(0,6).map(e=>`<div class="activity-row"><div class="date-box"><div><strong>${dt(e.starts_at).getDate()}</strong><small>${fmtDay.format(dt(e.starts_at))}</small></div></div><div class="activity-copy"><strong>${e.event_type==='match'?`${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}`:'Training'}</strong><small>${dateLabel(e.starts_at)} · ${eventTime(e)}${e.event_type==='training'?`–${eventEnd(e)}`:''}</small></div><span class="pill ${e.event_type==='match'?'match':''}">${e.event_type==='match'?'Wedstrijd':'Training'}</span></div>`).join('')||'<div class="empty-state">Geen activiteiten gevonden.</div>';
}
function renderMatches(){
  $('#matches-grid').innerHTML=matches().map(e=>`<article class="card match-card ${isHome(e)?'home':''}"><div class="match-top"><span class="match-date">${dateLabel(e.starts_at)}</span><span class="round">${e.round?`${e.round}e ronde`:'Wedstrijd'}</span></div><div class="fixture"><div class="club">${esc(e.home_team)}<small>${isHome(e)?'SVHA':'Tegenstander'}</small></div><div class="time">${eventTime(e)}</div><div class="club right">${esc(e.away_team)}<small>${!isHome(e)?'SVHA':'Tegenstander'}</small></div></div><div class="match-bottom"><span class="pill ${isHome(e)?'':'match'}">${isHome(e)?'Thuis':'Uit'}</span><span class="location-line">${e.location_name?`📍 ${esc(e.location_name)}${e.address?` · ${esc(e.address)}`:''}`:(isHome(e)?'Sportpark SVHA':'Locatie volgt')}</span></div></article>`).join('')||'<div class="empty-state">Nog geen wedstrijden ingevoerd.</div>';
}
function renderTraining(){
  $('#training-grid').innerHTML=trainings().filter(e=>dt(e.starts_at)>=new Date('2026-09-01T00:00:00+02:00')).slice(0,28).map(e=>`<article class="card training-card"><div class="training-icon">🏃</div><div><strong>${dateLabel(e.starts_at)} · ${eventTime(e)}</strong><small>${esc(e.location_name||'Sportpark SVHA')} · tot ${eventEnd(e)}</small></div></article>`).join('')||'<div class="empty-state">Nog geen trainingen ingevoerd.</div>';
}
function assignmentStatus(a){return absenceFor(a.player_id,a.event_id)?'replacement_needed':a.status}
function renderDriving(){
  const groups=new Map();state.driving.forEach(a=>{if(!groups.has(a.event_id))groups.set(a.event_id,[]);groups.get(a.event_id).push(a)});
  $('#drive-list').innerHTML=[...groups.entries()].sort((a,b)=>dt(event(a[0])?.starts_at||0)-dt(event(b[0])?.starts_at||0)).map(([eventId,list])=>{const e=event(eventId);if(!e)return'';const needs=list.filter(a=>assignmentStatus(a)==='replacement_needed').length;return `<article class="card task-card ${needs?'needs-replacement':''}"><div class="task-date"><strong>${fmtShort.format(dt(e.starts_at))} · ${eventTime(e)}</strong><small>Uit tegen ${esc(opponent(e))}</small>${e.location_name?`<small class="task-address">📍 ${esc(e.location_name)}${e.address?`<br>${esc(e.address)}`:''}</small>`:''}${needs?`<span class="replacement">⚠ ${needs} vervanging${needs>1?'en':''} nodig</span>`:''}</div><div class="drivers">${list.map(a=>driverChip(a)).join('')}</div><span class="pill ${needs?'alert':'drive'}">${needs?`${needs} open`:`${list.length} auto's`}</span></article>`}).join('')||'<div class="empty-state">Nog geen ritten ingepland.</div>';
  $$('[data-drive-action]').forEach(b=>b.addEventListener('click',()=>updateAssignment('driving',b.dataset.id,b.dataset.driveAction)));
}
function driverChip(a){const p=player(a.player_id),st=assignmentStatus(a),manage=canManagePlayer(a.player_id);return `<div class="driver-chip ${st==='replacement_needed'?'needs-replacement':''}"><div class="assignee"><span class="initial">${initials(p?.name||'?')}</span><span class="driver-copy"><strong>Ouder ${esc((p?.name||'').split(' ')[0])}</strong><small>${st==='confirmed'?'Bevestigd':st==='replacement_needed'?'Vervanging nodig':'Ingepland'}</small></span></div><div class="driver-actions">${manage?`<button class="small-action ${st==='confirmed'?'done':''}" data-drive-action="${st==='confirmed'?'scheduled':'confirmed'}" data-id="${a.id}">${st==='confirmed'?'✓':'Bevestig'}</button><button class="small-action danger" data-drive-action="${st==='replacement_needed'?'scheduled':'replacement_needed'}" data-id="${a.id}">${st==='replacement_needed'?'Herstel':'Kan niet'}</button>`:''}</div></div>`}
function renderLaundry(){
  $('#wash-list').innerHTML=[...state.laundry].sort((a,b)=>dt(event(a.event_id)?.starts_at||0)-dt(event(b.event_id)?.starts_at||0)).map(a=>{const e=event(a.event_id),p=player(a.player_id);if(!e||!p)return'';const st=assignmentStatus(a),manage=canManagePlayer(a.player_id);return `<article class="card task-card ${st==='replacement_needed'?'needs-replacement':''}"><div class="task-date"><strong>${fmtShort.format(dt(e.starts_at))} · ${eventTime(e)}</strong><small>${isHome(e)?'Thuis tegen':'Uit tegen'} ${esc(opponent(e))}</small>${e.location_name?`<small class="task-address">📍 ${esc(e.location_name)}${e.address?`<br>${esc(e.address)}`:''}</small>`:''}${st==='replacement_needed'?'<span class="replacement">⚠ Vervanging nodig</span>':''}</div><div class="assignee"><span class="initial">${initials(p.name)}</span><div><strong>Ouder van ${esc(p.name)}</strong><small>Wastas na de wedstrijd · ${st==='confirmed'?'bevestigd':st==='replacement_needed'?'vervanging nodig':'ingepland'}</small></div></div><div class="task-actions">${manage?`<button class="small-action ${st==='confirmed'?'done':''}" data-wash-action="${st==='confirmed'?'scheduled':'confirmed'}" data-id="${a.id}">${st==='confirmed'?'✓ Bevestigd':'Bevestigen'}</button><button class="small-action danger" data-wash-action="${st==='replacement_needed'?'scheduled':'replacement_needed'}" data-id="${a.id}">${st==='replacement_needed'?'Herstel':'Kan niet'}</button>`:''}</div></article>`}).join('')||'<div class="empty-state">Nog geen wastaken ingepland.</div>';
  $$('[data-wash-action]').forEach(b=>b.addEventListener('click',()=>updateAssignment('laundry',b.dataset.id,b.dataset.washAction)));
}
async function updateAssignment(type,id,status){
  const list=type==='driving'?state.driving:state.laundry, row=list.find(x=>x.id===id);if(!row||!canManagePlayer(row.player_id))return toast('Je kunt alleen je eigen taak aanpassen');
  const previous=row.status;row.status=status;renderDriving();renderLaundry();
  if(state.mode==='demo'){const key=type==='driving'?STORAGE.driving:STORAGE.laundry;const obj=getLocal(key,{});obj[id]=status;setLocal(key,obj);toast(status==='confirmed'?'Bevestigd ✓':status==='replacement_needed'?'Vervanging nodig aangegeven':'Status aangepast');return}
  const table=type==='driving'?'transport_assignments':'laundry_assignments';const {error}=await sb.from(table).update({status}).eq('id',id);if(error){row.status=previous;renderDriving();renderLaundry();toast('Opslaan mislukt');console.error(error)}else{toast('Opgeslagen ✓');saveRemoteCache()}
}
function absenceAllowedPlayers(){return state.mode==='demo'||isCoach()?state.players:state.players.filter(p=>state.parentPlayerIds.includes(p.id))}
function syncAbsencePlayerId(){
  const input=$('#player-input'), hidden=$('#player-id');if(!input||!hidden)return null;
  const allowed=absenceAllowedPlayers();const name=input.value.trim().toLocaleLowerCase('nl-NL');
  const match=allowed.find(p=>p.name.trim().toLocaleLowerCase('nl-NL')===name);hidden.value=match?.id||'';return match||null;
}
function renderAbsenceForm(){
  const allowed=absenceAllowedPlayers(), input=$('#player-input'), hidden=$('#player-id'), datalist=$('#player-datalist');
  if(datalist)datalist.innerHTML=allowed.map(p=>`<option value="${esc(p.name)}"></option>`).join('');
  if(input&&hidden){
    if(!isCoach()&&state.mode!=='demo'&&allowed.length===1){input.value=allowed[0].name;input.readOnly=true;input.classList.add('locked-player');hidden.value=allowed[0].id;}
    else{input.readOnly=false;input.classList.remove('locked-player');const current=allowed.find(p=>p.id===hidden.value);if(current)input.value=current.name;else if(!input.matches(':focus')){input.value='';hidden.value='';}}
  }
  $('#event-select').innerHTML='<option value="">Kies een activiteit…</option>'+upcomingEvents().slice(0,35).map(e=>`<option value="${e.id}">${dateLabel(e.starts_at)} · ${eventTime(e)} — ${e.event_type==='match'?`${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}`:'Training'}</option>`).join('');
  $('#absence-help').textContent=!isCoach()&&state.mode!=='demo'&&allowed.length===1?`${allowed[0].name} is automatisch ingevuld voor dit ouderaccount.`:(state.mode==='demo'?'Demo-modus: deze afmelding wordt alleen op dit apparaat opgeslagen.':'Typ de naam van de speelster en kies de activiteit. De afmelding wordt direct gesynchroniseerd.');
}
function renderAbsences(){
  $('#absence-count').textContent=state.absences.length;const el=$('#absence-list');if(!state.absences.length){el.innerHTML='<div class="empty-state">Nog geen afmeldingen.</div>';return}
  el.innerHTML=state.absences.map(a=>{const p=player(a.player_id),e=event(a.event_id),can=canManagePlayer(a.player_id);return `<div class="absence-item"><span class="initial">${initials(p?.name||'?')}</span><div><strong>${esc(p?.name||'Onbekend')}</strong><p>${e?`${dateLabel(e.starts_at)} · ${eventTime(e)} — ${e.event_type==='match'?`${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}`:'Training'}`:'Activiteit'}${a.reason?` · ${esc(a.reason)}`:''}</p></div>${can?`<button class="delete-button" data-delete-absence="${a.id}">Wissen</button>`:''}</div>`}).join('');
  $$('[data-delete-absence]').forEach(b=>b.addEventListener('click',()=>deleteAbsence(b.dataset.deleteAbsence)));
}
async function submitAbsence(ev){
  ev.preventDefault();const matched=syncAbsencePlayerId(),playerId=matched?.id||'',eventId=$('#event-select').value,reason=$('#reason-input').value.trim();if(!playerId)return toast('Kies een geldige speelster uit de lijst');if(!eventId)return toast('Kies een activiteit');if(!canManagePlayer(playerId))return toast('Deze speelster is niet aan je account gekoppeld');
  if(state.mode==='demo'){state.absences.unshift({id:`local-${Date.now()}`,player_id:playerId,event_id:eventId,reason,created_at:new Date().toISOString()});setLocal(STORAGE.absences,state.absences);ev.target.reset();renderAbsenceForm();renderAbsences();renderDriving();renderLaundry();toast('Afmelding opgeslagen ✓');return}
  const {data,error}=await sb.from('absences').insert({player_id:playerId,event_id:eventId,reason:reason||null,created_by:state.user.id}).select().single();if(error){console.error(error);toast('Afmelding opslaan mislukt');return}state.absences.unshift(data);saveRemoteCache();ev.target.reset();renderAbsenceForm();renderAbsences();renderDriving();renderLaundry();toast('Afmelding doorgegeven ✓');
}
async function deleteAbsence(id){const row=state.absences.find(a=>a.id===id);if(!row||!canManagePlayer(row.player_id))return;if(state.mode==='demo'){state.absences=state.absences.filter(a=>a.id!==id);setLocal(STORAGE.absences,state.absences);renderAbsences();renderDriving();renderLaundry();toast('Afmelding verwijderd');return}const {error}=await sb.from('absences').delete().eq('id',id);if(error){toast('Verwijderen mislukt');return}state.absences=state.absences.filter(a=>a.id!==id);saveRemoteCache();renderAbsences();renderDriving();renderLaundry();toast('Afmelding verwijderd')}
function renderTeam(){const count=state.players.length;$('#team-grid').innerHTML=state.players.map((p,i)=>`<article class="card player-card"><span class="player-avatar">${initials(p.name)}</span><div><strong>${esc(p.name)}</strong><small>Speelster · #${String(p.shirt_number||i+1).padStart(2,'0')}</small></div></article>`).join('');const t=$('#team-count-text');if(t)t.textContent=`SVHA MO13-1 · ${count} speelster${count===1?'':'s'}.`}


function renderCoachVisibility(){
  const btn=$('#admin-top');if(!btn)return;btn.classList.toggle('hidden',!isCoach());
  if(isCoach()){$('#parent-player').innerHTML=playerOptions();$('#task-player').innerHTML=playerOptions();renderAdminMatchOptions();renderAdminPlayers();setDefaultPlayerNumber();}
}
function playerOptions(selected=''){return '<option value="">Kies een speelster…</option>'+state.players.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('')}
function matchOptions(selected=''){return '<option value="">Kies een wedstrijd…</option>'+matches().map(e=>`<option value="${e.id}" ${e.id===selected?'selected':''}>${fmtShort.format(dt(e.starts_at))} · ${eventTime(e)} — ${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}</option>`).join('')}
function renderAdminMatchOptions(){if($('#task-event'))$('#task-event').innerHTML=matchOptions()}
function setAdminTab(tab){$$('.admin-segment').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===tab));$$('.admin-pane').forEach(p=>p.classList.toggle('active',p.id===`admin-${tab}`))}
async function adminInvoke(body){
  const {data,error}=await sb.functions.invoke('team-admin-users',{body});
  if(error){console.error(error);throw new Error(error.message||'Beheeractie mislukt')}
  if(data?.error)throw new Error(data.error);return data;
}
async function loadAdminUsers(){
  if(!isCoach())return;const list=$('#admin-parent-list');if(list)list.innerHTML='<div class="empty-state">Accounts laden…</div>';
  try{const data=await adminInvoke({action:'list_users'});state.adminUsers=data.users||[];renderAdminParents()}catch(err){console.error(err);if(list)list.innerHTML=`<div class="empty-state">${esc(err.message||'Accounts konden niet worden geladen')}</div>`}
}
function renderAdminData(){if(!isCoach())return;renderAdminAvailability();renderAdminPlayers();renderAdminParents();renderAdminMatches();renderAdminTasks();renderAdminMatchOptions()}

function eventAbsences(eventId){return state.absences.filter(a=>a.event_id===eventId)}
function eventExpectedPlayers(eventId){const absentIds=new Set(eventAbsences(eventId).map(a=>a.player_id));return state.players.filter(p=>!absentIds.has(p.id))}
function taskStatusLabel(a){const st=assignmentStatus(a);if(st==='confirmed')return {label:'Bevestigd',cls:'ok'};if(st==='replacement_needed')return {label:'Kan niet / vervanging nodig',cls:'bad'};return {label:'Nog niet bevestigd',cls:'pending'}}
function eventTaskRows(eventId,type){const source=type==='driving'?state.driving:state.laundry;return source.filter(a=>a.event_id===eventId)}
function availabilityEventCard(e){
  const absent=eventAbsences(e.id);
  const expected=eventExpectedPlayers(e.id);
  const isMatch=e.event_type==='match';
  const driveRows=isMatch?eventTaskRows(e.id,'driving'):[];
  const washRows=isMatch?eventTaskRows(e.id,'laundry'):[];
  const problemTasks=[...driveRows,...washRows].filter(a=>assignmentStatus(a)==='replacement_needed').length;
  const pendingTasks=[...driveRows,...washRows].filter(a=>assignmentStatus(a)==='scheduled').length;
  const title=isMatch?`${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}`:'Training';
  const absentHtml=absent.length?absent.map(a=>{const p=player(a.player_id);return `<div class="availability-person absent"><span class="availability-dot"></span><div><strong>${esc(p?.name||'Onbekend')}</strong><small>${a.reason?esc(a.reason):'Afgemeld'}</small></div></div>`}).join(''):'<div class="availability-empty ok">Niemand afgemeld ✓</div>';
  const expectedHtml=expected.map(p=>`<span class="presence-chip">${esc(p.name)}</span>`).join('');
  const taskSection=isMatch?`<div class="availability-tasks">
    <div class="availability-task-group"><div class="availability-task-head"><strong>🚗 Rijden</strong><span>${driveRows.length} ingepland</span></div>${driveRows.length?driveRows.map(a=>{const p=player(a.player_id),st=taskStatusLabel(a);return `<div class="availability-task-row"><span>${esc(p?.name||'Onbekend')}</span><span class="task-state ${st.cls}">${st.label}</span></div>`}).join(''):'<div class="availability-empty">Geen rijders ingepland</div>'}</div>
    <div class="availability-task-group"><div class="availability-task-head"><strong>🧺 Wastas</strong><span>${washRows.length} ingepland</span></div>${washRows.length?washRows.map(a=>{const p=player(a.player_id),st=taskStatusLabel(a);return `<div class="availability-task-row"><span>${esc(p?.name||'Onbekend')}</span><span class="task-state ${st.cls}">${st.label}</span></div>`}).join(''):'<div class="availability-empty">Geen wastas ingepland</div>'}</div>
  </div>`:'';
  return `<article class="card availability-card ${absent.length?'has-absence':''} ${problemTasks?'has-problem':''}">
    <div class="availability-card-head"><div><div class="availability-kicker">${isMatch?'⚽ Wedstrijd':'🏃 Training'} · ${dateLabel(e.starts_at)} · ${eventTime(e)}</div><h3>${title}</h3><small>${esc(e.location_name||'Sportpark SVHA')}${e.address?` · ${esc(e.address)}`:''}</small></div><div class="availability-counts"><span class="availability-count ok"><strong>${expected.length}</strong> verwacht</span><span class="availability-count bad"><strong>${absent.length}</strong> afgemeld</span>${isMatch&&problemTasks?`<span class="availability-count bad"><strong>${problemTasks}</strong> taakprobleem</span>`:''}${isMatch&&pendingTasks?`<span class="availability-count pending"><strong>${pendingTasks}</strong> onbevestigd</span>`:''}</div></div>
    <div class="availability-body"><div class="availability-block"><div class="availability-block-title"><strong>Niet aanwezig</strong><span>${absent.length}</span></div>${absentHtml}</div><details class="availability-details"><summary>Verwacht aanwezig (${expected.length})</summary><div class="presence-chips">${expectedHtml||'<span class="muted">Niemand</span>'}</div></details>${taskSection}</div>
  </article>`;
}
function renderAdminAvailability(){
  const el=$('#admin-availability-list');if(!el||!isCoach())return;
  const now=new Date();
  let rows=state.events.filter(e=>dt(e.starts_at)>=new Date(now.getTime()-6*60*60*1000)).sort((a,b)=>dt(a.starts_at)-dt(b.starts_at));
  if(state.availabilityFilter!=='all')rows=rows.filter(e=>e.event_type===state.availabilityFilter);
  rows=rows.slice(0,20);
  const allUpcoming=state.events.filter(e=>dt(e.starts_at)>=new Date(now.getTime()-6*60*60*1000));
  const nextEvents=allUpcoming.slice().sort((a,b)=>dt(a.starts_at)-dt(b.starts_at)).slice(0,20);
  const absentCount=nextEvents.reduce((n,e)=>n+eventAbsences(e.id).length,0);
  const taskRows=[...state.driving,...state.laundry].filter(a=>nextEvents.some(e=>e.id===a.event_id));
  const cannotCount=taskRows.filter(a=>assignmentStatus(a)==='replacement_needed').length;
  const unconfirmedCount=taskRows.filter(a=>assignmentStatus(a)==='scheduled').length;
  const summary=$('#availability-summary');if(summary)summary.innerHTML=`<div class="availability-stat"><span>❌</span><div><strong>${absentCount}</strong><small>afmeldingen komende activiteiten</small></div></div><div class="availability-stat"><span>⚠️</span><div><strong>${cannotCount}</strong><small>rij-/wastaken kunnen niet</small></div></div><div class="availability-stat"><span>⏳</span><div><strong>${unconfirmedCount}</strong><small>taken nog niet bevestigd</small></div></div>`;
  const updated=$('#availability-updated');if(updated)updated.textContent=`Bijgewerkt ${new Intl.DateTimeFormat('nl-NL',{hour:'2-digit',minute:'2-digit'}).format(new Date())}`;
  el.innerHTML=rows.map(availabilityEventCard).join('')||'<div class="empty-state">Geen komende activiteiten gevonden.</div>';
}
function setAvailabilityFilter(filter){state.availabilityFilter=filter;$$('[data-availability-filter]').forEach(b=>b.classList.toggle('active',b.dataset.availabilityFilter===filter));renderAdminAvailability()}

function nextPlayerNumber(){const nums=state.players.map(p=>Number(p.shirt_number)||0);return Math.max(0,...nums)+1}
function setDefaultPlayerNumber(){const input=$('#player-number');if(input&&!input.value)input.value=nextPlayerNumber()}
function resetPlayerForm(){const f=$('#player-form');if(!f)return;f.reset();$('#player-id').value='';$('#player-save').textContent='Speelster opslaan';$('#player-cancel').classList.add('hidden');setDefaultPlayerNumber()}
function renderAdminPlayers(){
  const el=$('#admin-player-list');if(!el||!isCoach())return;const count=$('#player-count');if(count)count.textContent=state.players.length;
  el.innerHTML=state.players.map((p,i)=>`<div class="admin-row"><div class="admin-row-main"><strong>${esc(p.name)}</strong><small>Nummer / volgnummer: ${esc(p.shirt_number||i+1)}</small></div><div class="admin-row-actions"><button class="small-action" data-edit-player="${p.id}">Wijzig</button></div></div>`).join('')||'<div class="empty-state">Nog geen speelsters.</div>';
  $$('[data-edit-player]').forEach(b=>b.addEventListener('click',()=>editPlayer(b.dataset.editPlayer)));
}
function editPlayer(id){const p=player(id);if(!p)return;$('#player-id').value=p.id;$('#player-name').value=p.name||'';$('#player-number').value=p.shirt_number||'';$('#player-save').textContent='Wijzigingen opslaan';$('#player-cancel').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
async function savePlayer(ev){
  ev.preventDefault();if(!isCoach())return;const id=$('#player-id').value,name=$('#player-name').value.trim(),shirt=Number($('#player-number').value);if(!name||!shirt)return;
  const btn=$('#player-save');btn.disabled=true;
  try{
    const row={name,shirt_number:shirt,active:true};let res;
    if(id)res=await sb.from('players').update(row).eq('id',id).select().single();else res=await sb.from('players').insert(row).select().single();
    if(res.error)throw res.error;
    toast(id?'Speelster bijgewerkt ✓':'Speelster toegevoegd ✓');resetPlayerForm();await loadRemote();renderAdminPlayers();$('#parent-player').innerHTML=playerOptions();$('#task-player').innerHTML=playerOptions();setAdminTab('players');
  }catch(err){console.error(err);toast('Speelster opslaan mislukt')}
  finally{btn.disabled=false}
}

function renderAdminParents(){
  const el=$('#admin-parent-list');if(!el||!isCoach())return;const parents=state.adminUsers.filter(u=>u.role!=='coach');$('#parent-count').textContent=parents.length;
  if(!state.adminUsers.length){el.innerHTML='<div class="empty-state">Klik op Vernieuwen om accounts te laden.</div>';return}
  el.innerHTML=state.adminUsers.map(u=>{const names=(u.player_ids||[]).map(id=>player(id)?.name).filter(Boolean);return `<div class="admin-row"><div class="admin-row-main"><strong>${esc(u.display_name||u.email||'Account')}</strong><small>${esc(u.email||'')}</small><span class="admin-chip ${u.role==='coach'?'coach':''}">${u.role==='coach'?'Trainer / beheerder':names.length?esc(names.join(', ')):'Nog niet gekoppeld'}</span></div><div class="admin-row-actions">${u.role!=='coach'?`<button class="small-action" data-admin-link="${u.id}">Koppelen</button><button class="small-action" data-admin-password="${u.id}">Wachtwoord</button><button class="danger-button" data-admin-delete="${u.id}">Verwijder</button>`:''}</div></div>`}).join('');
  $$('[data-admin-link]').forEach(b=>b.addEventListener('click',()=>editParentLink(b.dataset.adminLink)));$$('[data-admin-password]').forEach(b=>b.addEventListener('click',()=>resetParentPassword(b.dataset.adminPassword)));$$('[data-admin-delete]').forEach(b=>b.addEventListener('click',()=>deleteParentAccount(b.dataset.adminDelete)));
}
async function createParentAccount(ev){
  ev.preventDefault();const btn=ev.currentTarget.querySelector('button[type="submit"]');const payload={action:'create_parent',email:$('#parent-email').value.trim(),password:$('#parent-password').value,display_name:$('#parent-name').value.trim(),player_ids:[$('#parent-player').value].filter(Boolean)};
  btn.disabled=true;btn.textContent='Aanmaken…';try{await adminInvoke(payload);toast('Ouderaccount aangemaakt ✓');ev.currentTarget.reset();$('#parent-player').innerHTML=playerOptions();await loadAdminUsers()}catch(err){toast(err.message||'Aanmaken mislukt')}finally{btn.disabled=false;btn.textContent='Account aanmaken'}
}
function generatePassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';let out='';crypto.getRandomValues(new Uint32Array(14)).forEach(n=>out+=chars[n%chars.length]);$('#parent-password').value=out}
const STANDARD_PARENT_LOGINS=[
  ['Willemijn Doelman','ouder.willemijn@mo13.nl'],['Julé Arwen van de Wal','ouder.jule@mo13.nl'],['Soof de Ruijter','ouder.soof@mo13.nl'],['Anna Gidding','ouder.anna@mo13.nl'],['Lexi van de Ven','ouder.lexi@mo13.nl'],['Nola Roelofsen','ouder.nola@mo13.nl'],['Aaliyah Ansari','ouder.aaliyah@mo13.nl'],['Norjan Daoud','ouder.norjan@mo13.nl'],['Evi Rothoff','ouder.evi@mo13.nl'],['Fayenn Hanhart','ouder.fayenn@mo13.nl'],['Milou Riedijk','ouder.milou@mo13.nl'],['Vajèn Velthuizen','ouder.vajen@mo13.nl'],['Noelle van Drunen','ouder.noelle@mo13.nl']
];
async function seedStandardParents(){
  if(!isCoach())return;const btn=$('#seed-parent-accounts'),status=$('#seed-parent-status');
  if(!confirm('De 13 standaard ouderaccounts aanmaken en automatisch koppelen? Bestaande accounts met hetzelfde adres worden niet opnieuw aangemaakt.'))return;
  btn.disabled=true;btn.textContent='Accounts aanmaken…';if(status)status.textContent='Bezig met aanmaken en koppelen…';
  try{const data=await adminInvoke({action:'seed_standard_parents'});const created=data.created||0,linked=data.linked||0,existing=data.existing||0;if(status)status.textContent=`Klaar: ${created} nieuw, ${existing} bestonden al, ${linked} koppelingen gecontroleerd.`;toast('Ouderaccounts bijgewerkt ✓');await loadAdminUsers()}catch(err){console.error(err);if(status)status.textContent=err.message||'Aanmaken mislukt';toast(err.message||'Aanmaken mislukt')}finally{btn.disabled=false;btn.textContent='13 ouderaccounts aanmaken'}
}
async function copyParentLogins(){
  const lines=['SVHA MO13-1 – ouderaccounts','Tijdelijk wachtwoord voor alle accounts: MO13team!','',...STANDARD_PARENT_LOGINS.map(([name,email])=>`${name}: ${email}`)];
  try{await navigator.clipboard.writeText(lines.join('\n'));toast('Inloglijst gekopieerd ✓')}catch{toast('Kopiëren lukt niet op dit apparaat')}
}
async function editParentLink(userId){const u=state.adminUsers.find(x=>x.id===userId);if(!u)return;const current=u.player_ids?.[0]||'';const choices=state.players.map((p,i)=>`${i+1}. ${p.name}`).join('\n');const answer=prompt(`Kies speelster voor ${u.email}:\n\n${choices}\n\nTyp het nummer:`,String(Math.max(1,state.players.findIndex(p=>p.id===current)+1)));if(answer===null)return;const idx=Number(answer)-1;if(!state.players[idx])return toast('Ongeldige keuze');try{await adminInvoke({action:'set_parent_links',user_id:userId,player_ids:[state.players[idx].id]});toast('Koppeling opgeslagen ✓');await loadAdminUsers()}catch(err){toast(err.message||'Koppelen mislukt')}}
async function resetParentPassword(userId){const u=state.adminUsers.find(x=>x.id===userId);const pw=prompt(`Nieuw tijdelijk wachtwoord voor ${u?.email||'ouder'} (minimaal 8 tekens):`);if(pw===null)return;if(pw.length<8)return toast('Minimaal 8 tekens');try{await adminInvoke({action:'reset_password',user_id:userId,password:pw});toast('Wachtwoord aangepast ✓')}catch(err){toast(err.message||'Aanpassen mislukt')}}
async function deleteParentAccount(userId){const u=state.adminUsers.find(x=>x.id===userId);if(!confirm(`Account ${u?.email||''} echt verwijderen?`))return;try{await adminInvoke({action:'delete_parent',user_id:userId});toast('Account verwijderd');await loadAdminUsers()}catch(err){toast(err.message||'Verwijderen mislukt')}}
function renderAdminMatches(){
  const el=$('#admin-match-list');if(!el||!isCoach())return;el.innerHTML=matches().map(e=>`<div class="admin-row"><div class="admin-row-main"><strong>${fmtShort.format(dt(e.starts_at))} · ${eventTime(e)} — ${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}</strong><small>${esc(e.location_name||'Locatie nog niet ingevuld')}${e.address?` · ${esc(e.address)}`:''}</small></div><div class="admin-row-actions"><button class="small-action" data-edit-match="${e.id}">Wijzig</button><button class="danger-button" data-delete-match="${e.id}">Verwijder</button></div></div>`).join('')||'<div class="empty-state">Nog geen wedstrijden.</div>';
  $$('[data-edit-match]').forEach(b=>b.addEventListener('click',()=>editMatch(b.dataset.editMatch)));$$('[data-delete-match]').forEach(b=>b.addEventListener('click',()=>deleteMatch(b.dataset.deleteMatch)))
}

function localDateParts(value){const d=dt(value);return {date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,time:`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}}
function resetMatchForm(){const f=$('#match-form');if(!f)return;f.reset();$('#match-id').value='';$('#match-save').textContent='Wedstrijd opslaan';$('#match-cancel').classList.add('hidden')}
function editMatch(id){const e=event(id);if(!e)return;const parts=localDateParts(e.starts_at);$('#match-id').value=e.id;$('#match-date').value=parts.date;$('#match-time').value=parts.time;$('#match-home-away').value=isHome(e)?'home':'away';$('#match-opponent').value=opponent(e)||'';$('#match-round').value=e.round||'';$('#match-location').value=e.location_name||'';$('#match-address').value=e.address||'';$('#match-save').textContent='Wijzigingen opslaan';$('#match-cancel').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
async function saveMatch(ev){
  ev.preventDefault();const id=$('#match-id').value,date=$('#match-date').value,time=$('#match-time').value,home=$('#match-home-away').value==='home',opp=$('#match-opponent').value.trim();if(!date||!time||!opp)return;
  const start=new Date(`${date}T${time}:00`),end=new Date(start.getTime()+90*60000);const row={event_type:'match',starts_at:start.toISOString(),ends_at:end.toISOString(),round:Number($('#match-round').value)||null,home_team:home?TEAM_NAME:opp,away_team:home?opp:TEAM_NAME,location_name:$('#match-location').value.trim()||null,address:$('#match-address').value.trim()||null};
  const btn=$('#match-save');btn.disabled=true;try{let res;if(id)res=await sb.from('events').update(row).eq('id',id).select().single();else res=await sb.from('events').insert(row).select().single();if(res.error)throw res.error;toast(id?'Wedstrijd bijgewerkt ✓':'Wedstrijd toegevoegd ✓');resetMatchForm();await loadRemote();setAdminTab('matches')}catch(err){console.error(err);toast('Wedstrijd opslaan mislukt')}finally{btn.disabled=false}
}
async function deleteMatch(id){const e=event(id);if(!e||!confirm(`${dateLabel(e.starts_at)} tegen ${opponent(e)} verwijderen?`))return;const {error}=await sb.from('events').delete().eq('id',id);if(error)return toast('Verwijderen mislukt');toast('Wedstrijd verwijderd');await loadRemote();setAdminTab('matches')}
function renderAdminTasks(){
  const el=$('#admin-task-list');if(!el||!isCoach())return;const rows=[...state.driving.map(a=>({...a,type:'driving'})),...state.laundry.map(a=>({...a,type:'laundry'}))].sort((a,b)=>dt(event(a.event_id)?.starts_at||0)-dt(event(b.event_id)?.starts_at||0));el.innerHTML=rows.map(a=>{const e=event(a.event_id),p=player(a.player_id);if(!e||!p)return'';return `<div class="admin-row"><div class="admin-row-main"><strong>${a.type==='driving'?'🚗 Rijden':'🧺 Wastas'} · ${esc(p.name)}</strong><small>${fmtShort.format(dt(e.starts_at))} · ${eventTime(e)} — ${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}</small></div><div class="admin-row-actions"><button class="danger-button" data-delete-task="${a.type}:${a.id}">Verwijder</button></div></div>`}).join('')||'<div class="empty-state">Nog geen taken.</div>';$$('[data-delete-task]').forEach(b=>b.addEventListener('click',()=>deleteTask(b.dataset.deleteTask)))
}
async function addTask(ev){ev.preventDefault();const eventId=$('#task-event').value,playerId=$('#task-player').value,type=$('#task-type').value;if(!eventId||!playerId)return;const table=type==='driving'?'transport_assignments':'laundry_assignments';const {error}=await sb.from(table).insert({event_id:eventId,player_id:playerId,status:'scheduled'});if(error){console.error(error);return toast(error.code==='23505'?'Deze taak bestaat al':'Taak toevoegen mislukt')}toast('Taak toegevoegd ✓');ev.currentTarget.reset();await loadRemote();setAdminTab('tasks')}
async function deleteTask(key){const [type,id]=key.split(':');if(!confirm('Deze taak verwijderen?'))return;const table=type==='driving'?'transport_assignments':'laundry_assignments';const {error}=await sb.from(table).delete().eq('id',id);if(error)return toast('Taak verwijderen mislukt');toast('Taak verwijderd');await loadRemote();setAdminTab('tasks')}
async function openAdmin(){if(!isCoach())return;navigate('admin');setAdminTab('availability');renderAdminData();await loadAdminUsers()}

function navigate(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));$$('[data-page]').forEach(b=>{const selected=b.dataset.page===page;b.classList.toggle('active',selected);b.classList.toggle('selected',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});window.scrollTo({top:0,behavior:'smooth'})}
function setSchedule(tab){$$('.segment').forEach(b=>b.classList.toggle('active',b.dataset.scheduleTab===tab));$$('.schedule-pane').forEach(p=>p.classList.toggle('active',p.id===`schedule-${tab}`))}
function openModal(id){$('#modal-backdrop').classList.remove('hidden');$(id).classList.remove('hidden')}
function closeModals(){$('#modal-backdrop').classList.add('hidden');$$('.modal').forEach(m=>m.classList.add('hidden'))}
function renderAccount(){
  const el=$('#account-content');if(state.mode==='demo'){el.innerHTML=`<div class="account-box"><div class="account-line"><small>Status</small><strong>Demo-modus</strong></div><p class="modal-copy">De app werkt nu lokaal. De Supabase-koppeling is geconfigureerd. Publiceer de app via HTTPS en voer het databaseschema uit om live te gaan.</p></div>`;return}
  const linked=state.parentPlayerIds.map(id=>player(id)?.name).filter(Boolean).join(', ')||'Nog niet gekoppeld';
  el.innerHTML=`<div class="account-box">
    <div class="account-line"><small>Ingelogd als</small><strong>${esc(state.user?.email||'')}</strong></div>
    <div class="account-line"><small>Rol</small><strong>${state.profile?.role==='coach'?'Trainer / beheerder':'Ouder'}</strong></div>
    <div class="account-line"><small>Gekoppelde speelster(s)</small><strong>${esc(linked)}</strong></div>
    <form id="own-password-form" class="account-password-form">
      <div><small class="account-section-label">Wachtwoord instellen / wijzigen</small><p>Gebruik dit ook als je account eerder met een inloglink is aangemaakt.</p></div>
      <div class="field"><label for="own-password">Nieuw wachtwoord</label><input id="own-password" type="password" minlength="8" autocomplete="new-password" placeholder="Minimaal 8 tekens" required></div>
      <div class="field"><label for="own-password-confirm">Herhaal wachtwoord</label><input id="own-password-confirm" type="password" minlength="8" autocomplete="new-password" placeholder="Nogmaals hetzelfde wachtwoord" required></div>
      <button class="secondary-button" type="submit">Wachtwoord opslaan</button>
      <p class="account-password-status" id="own-password-status"></p>
    </form>
    <button class="secondary-button" id="logout-button">Uitloggen</button>
  </div>`;
  $('#own-password-form')?.addEventListener('submit',changeOwnPassword);
  $('#logout-button')?.addEventListener('click',async()=>{await sb.auth.signOut();closeModals()});
}
async function changeOwnPassword(ev){
  ev.preventDefault();
  const password=$('#own-password')?.value||'';
  const confirmPassword=$('#own-password-confirm')?.value||'';
  const status=$('#own-password-status');
  const button=ev.currentTarget.querySelector('button[type="submit"]');
  if(password.length<8){if(status)status.textContent='Gebruik minimaal 8 tekens.';return}
  if(password!==confirmPassword){if(status)status.textContent='De twee wachtwoorden zijn niet hetzelfde.';return}
  if(button){button.disabled=true;button.textContent='Opslaan…'}
  if(status)status.textContent='Wachtwoord wordt opgeslagen…';
  const {error}=await sb.auth.updateUser({password});
  if(error){
    console.error('Password update error:',error);
    if(status)status.textContent='Opslaan mislukt: '+String(error.message||'onbekende fout');
    if(button){button.disabled=false;button.textContent='Wachtwoord opslaan'}
    return;
  }
  ev.currentTarget.reset();
  if(status)status.textContent='Wachtwoord opgeslagen ✓ Je kunt dit voortaan gebruiken om in te loggen.';
  if(button){button.disabled=false;button.textContent='Wachtwoord opslaan'}
}
function showAuth(){$('#auth-screen').classList.remove('hidden')}function hideAuth(){$('#auth-screen').classList.add('hidden')}
async function login(ev){
  ev.preventDefault();
  const email=$('#login-email').value.trim();
  const password=$('#login-password').value;
  const status=$('#auth-status');
  const button=ev.currentTarget.querySelector('button[type="submit"]');
  status.textContent='Bezig met inloggen…';
  if(button){button.disabled=true;button.textContent='Even wachten…'}

  const {error}=await sb.auth.signInWithPassword({email,password});

  if(error){
    console.error('Supabase login error:',error);
    const message=String(error.message||'');
    if(/invalid login credentials/i.test(message)){
      status.textContent='E-mailadres of wachtwoord klopt niet.';
    }else if(/email not confirmed/i.test(message)){
      status.textContent='Dit account is nog niet bevestigd. Vraag de trainer om het account in Supabase op Auto Confirm te zetten.';
    }else if(/rate.?limit|too many/i.test(message)){
      status.textContent='Te veel inlogpogingen. Wacht even en probeer daarna opnieuw.';
    }else{
      status.textContent='Inloggen mislukt: '+(message||'onbekende fout');
    }
    if(button){button.disabled=false;button.textContent='Inloggen'}
    return;
  }

  // signInWithPassword succeeded. Do not wait for a page refresh:
  // immediately switch to the app and load the permissions/data.
  const {data:{session}}=await sb.auth.getSession();
  if(session){
    state.user=session.user;
    status.textContent='Ingelogd ✓';
    hideAuth();
    await loadRemote();
  }else{
    status.textContent='Inloggen gelukt, sessie wordt geladen…';
  }
  if(button){button.disabled=false;button.textContent='Inloggen'}
}
function installHelp(){const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;if(standalone){toast('De app is al geïnstalleerd');return}if(installPrompt){installPrompt.prompt();installPrompt.userChoice.finally(()=>{installPrompt=null;updateInstallVisibility()});return}const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);$('#install-instructions').innerHTML=ios?'<p><strong>Op iPhone/iPad:</strong></p><p>1. Open deze pagina in Safari.<br>2. Tik onderaan op het deel-icoon <strong>□↑</strong>.<br>3. Kies <strong>Zet op beginscherm</strong>.<br>4. Tik op <strong>Voeg toe</strong>.</p>':'<p><strong>Installeren:</strong></p><p>Open het browsermenu en kies <strong>App installeren</strong> of <strong>Toevoegen aan startscherm</strong>. De app moet hiervoor via HTTPS worden geopend, bijvoorbeeld via Vercel.</p>';openModal('#install-modal')}
function updateInstallVisibility(){const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone;if(installed){$('#install-card')?.classList.add('hidden');$('#install-top')?.classList.add('hidden')}}

function bind(){
  $$('[data-page]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.page)));$$('[data-jump]').forEach(b=>b.addEventListener('click',()=>{navigate(b.dataset.jump);if(b.dataset.schedule)setSchedule(b.dataset.schedule)}));$$('[data-schedule-tab]').forEach(b=>b.addEventListener('click',()=>setSchedule(b.dataset.scheduleTab)));
  $('#absence-form').addEventListener('submit',submitAbsence);$('#player-input')?.addEventListener('input',syncAbsencePlayerId);$('#account-button').addEventListener('click',()=>{renderAccount();openModal('#account-modal')});$('#install-button').addEventListener('click',installHelp);$('#install-top').addEventListener('click',installHelp);$('#admin-top')?.addEventListener('click',openAdmin);$('#admin-refresh')?.addEventListener('click',async()=>{await loadRemote();await loadAdminUsers();renderAdminAvailability();toast('Beheer bijgewerkt ✓')});$$('[data-admin-tab]').forEach(b=>b.addEventListener('click',()=>setAdminTab(b.dataset.adminTab)));$$('[data-availability-filter]').forEach(b=>b.addEventListener('click',()=>setAvailabilityFilter(b.dataset.availabilityFilter)));$('#player-form')?.addEventListener('submit',savePlayer);$('#player-cancel')?.addEventListener('click',resetPlayerForm);$('#create-parent-form')?.addEventListener('submit',createParentAccount);$('#generate-password')?.addEventListener('click',generatePassword);$('#seed-parent-accounts')?.addEventListener('click',seedStandardParents);$('#copy-parent-logins')?.addEventListener('click',copyParentLogins);$('#match-form')?.addEventListener('submit',saveMatch);$('#match-cancel')?.addEventListener('click',resetMatchForm);$('#task-form')?.addEventListener('submit',addTask);$('#modal-backdrop').addEventListener('click',closeModals);$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModals));
  $('#login-password-toggle')?.addEventListener('click',()=>{const input=$('#login-password'),button=$('#login-password-toggle');if(!input||!button)return;const show=input.type==='password';input.type=show?'text':'password';button.setAttribute('aria-pressed',String(show));button.setAttribute('aria-label',show?'Wachtwoord verbergen':'Wachtwoord tonen');button.title=show?'Wachtwoord verbergen':'Wachtwoord tonen';});
  if(DB_ENABLED)$('#login-form').addEventListener('submit',login);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;updateInstallVisibility()});window.addEventListener('appinstalled',()=>{installPrompt=null;updateInstallVisibility();toast('Teamapp geïnstalleerd ✓')});
  window.addEventListener('online',()=>{if(DB_ENABLED&&state.user)loadRemote()});window.addEventListener('offline',()=>{state.online=false;renderSync()});
}
async function init(){bind();updateInstallVisibility();if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error))}if(DB_ENABLED){await initDatabase()}else{loadDemo()}}
init();
})();
