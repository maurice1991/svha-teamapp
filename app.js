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

const state={players:[],events:[],driving:[],laundry:[],absences:[],user:null,profile:null,parentPlayerIds:[],online:false,mode:DB_ENABLED?'database':'demo'};
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

function renderAll(){renderSync();renderDashboard();renderMatches();renderTraining();renderDriving();renderLaundry();renderAbsenceForm();renderAbsences();renderTeam();renderAccount()}
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
function renderAbsenceForm(){
  const allowed=state.mode==='demo'||isCoach()?state.players:state.players.filter(p=>state.parentPlayerIds.includes(p.id));
  $('#player-select').innerHTML='<option value="">Kies een speelster…</option>'+allowed.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  $('#event-select').innerHTML='<option value="">Kies een activiteit…</option>'+upcomingEvents().slice(0,35).map(e=>`<option value="${e.id}">${dateLabel(e.starts_at)} · ${eventTime(e)} — ${e.event_type==='match'?`${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}`:'Training'}</option>`).join('');
  $('#absence-help').textContent=state.mode==='demo'?'Demo-modus: deze afmelding wordt alleen op dit apparaat opgeslagen.':'De afmelding wordt direct gesynchroniseerd met de teamdatabase.';
}
function renderAbsences(){
  $('#absence-count').textContent=state.absences.length;const el=$('#absence-list');if(!state.absences.length){el.innerHTML='<div class="empty-state">Nog geen afmeldingen.</div>';return}
  el.innerHTML=state.absences.map(a=>{const p=player(a.player_id),e=event(a.event_id),can=canManagePlayer(a.player_id);return `<div class="absence-item"><span class="initial">${initials(p?.name||'?')}</span><div><strong>${esc(p?.name||'Onbekend')}</strong><p>${e?`${dateLabel(e.starts_at)} · ${eventTime(e)} — ${e.event_type==='match'?`${isHome(e)?'Thuis':'Uit'} tegen ${esc(opponent(e))}`:'Training'}`:'Activiteit'}${a.reason?` · ${esc(a.reason)}`:''}</p></div>${can?`<button class="delete-button" data-delete-absence="${a.id}">Wissen</button>`:''}</div>`}).join('');
  $$('[data-delete-absence]').forEach(b=>b.addEventListener('click',()=>deleteAbsence(b.dataset.deleteAbsence)));
}
async function submitAbsence(ev){
  ev.preventDefault();const playerId=$('#player-select').value,eventId=$('#event-select').value,reason=$('#reason-input').value.trim();if(!playerId||!eventId)return;if(!canManagePlayer(playerId))return toast('Deze speelster is niet aan je account gekoppeld');
  if(state.mode==='demo'){state.absences.unshift({id:`local-${Date.now()}`,player_id:playerId,event_id:eventId,reason,created_at:new Date().toISOString()});setLocal(STORAGE.absences,state.absences);ev.target.reset();renderAbsences();renderDriving();renderLaundry();toast('Afmelding opgeslagen ✓');return}
  const {data,error}=await sb.from('absences').insert({player_id:playerId,event_id:eventId,reason:reason||null,created_by:state.user.id}).select().single();if(error){console.error(error);toast('Afmelding opslaan mislukt');return}state.absences.unshift(data);saveRemoteCache();ev.target.reset();renderAbsences();renderDriving();renderLaundry();toast('Afmelding doorgegeven ✓');
}
async function deleteAbsence(id){const row=state.absences.find(a=>a.id===id);if(!row||!canManagePlayer(row.player_id))return;if(state.mode==='demo'){state.absences=state.absences.filter(a=>a.id!==id);setLocal(STORAGE.absences,state.absences);renderAbsences();renderDriving();renderLaundry();toast('Afmelding verwijderd');return}const {error}=await sb.from('absences').delete().eq('id',id);if(error){toast('Verwijderen mislukt');return}state.absences=state.absences.filter(a=>a.id!==id);saveRemoteCache();renderAbsences();renderDriving();renderLaundry();toast('Afmelding verwijderd')}
function renderTeam(){$('#team-grid').innerHTML=state.players.map((p,i)=>`<article class="card player-card"><span class="player-avatar">${initials(p.name)}</span><div><strong>${esc(p.name)}</strong><small>Speelster · #${String(p.shirt_number||i+1).padStart(2,'0')}</small></div></article>`).join('')}

function navigate(page){$$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));$$('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));window.scrollTo({top:0,behavior:'smooth'})}
function setSchedule(tab){$$('.segment').forEach(b=>b.classList.toggle('active',b.dataset.scheduleTab===tab));$$('.schedule-pane').forEach(p=>p.classList.toggle('active',p.id===`schedule-${tab}`))}
function openModal(id){$('#modal-backdrop').classList.remove('hidden');$(id).classList.remove('hidden')}
function closeModals(){$('#modal-backdrop').classList.add('hidden');$$('.modal').forEach(m=>m.classList.add('hidden'))}
function renderAccount(){
  const el=$('#account-content');if(state.mode==='demo'){el.innerHTML=`<div class="account-box"><div class="account-line"><small>Status</small><strong>Demo-modus</strong></div><p class="modal-copy">De app werkt nu lokaal. De Supabase-koppeling is geconfigureerd. Publiceer de app via HTTPS en voer het databaseschema uit om live te gaan.</p></div>`;return}
  const linked=state.parentPlayerIds.map(id=>player(id)?.name).filter(Boolean).join(', ')||'Nog niet gekoppeld';el.innerHTML=`<div class="account-box"><div class="account-line"><small>Ingelogd als</small><strong>${esc(state.user?.email||'')}</strong></div><div class="account-line"><small>Rol</small><strong>${state.profile?.role==='coach'?'Trainer / beheerder':'Ouder'}</strong></div><div class="account-line"><small>Gekoppelde speelster(s)</small><strong>${esc(linked)}</strong></div><button class="secondary-button" id="logout-button">Uitloggen</button></div>`;$('#logout-button')?.addEventListener('click',async()=>{await sb.auth.signOut();closeModals()});
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
  $('#absence-form').addEventListener('submit',submitAbsence);$('#account-button').addEventListener('click',()=>{renderAccount();openModal('#account-modal')});$('#install-button').addEventListener('click',installHelp);$('#install-top').addEventListener('click',installHelp);$('#modal-backdrop').addEventListener('click',closeModals);$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModals));
  if(DB_ENABLED)$('#login-form').addEventListener('submit',login);
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;updateInstallVisibility()});window.addEventListener('appinstalled',()=>{installPrompt=null;updateInstallVisibility();toast('Teamapp geïnstalleerd ✓')});
  window.addEventListener('online',()=>{if(DB_ENABLED&&state.user)loadRemote()});window.addEventListener('offline',()=>{state.online=false;renderSync()});
}
async function init(){bind();updateInstallVisibility();if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error))}if(DB_ENABLED){await initDatabase()}else{loadDemo()}}
init();
})();
