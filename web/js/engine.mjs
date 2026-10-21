// Pure learning and backup logic. No browser-only globals are used at module import time.
export const BACKUP_VERSION = 1;
export const DB_NAME = 'english-path-mvp';
export const DB_VERSION = 1;
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function normalizeAnswer(value) {
  return String(value ?? '').toLocaleLowerCase('en').trim().replace(/[.!?]+$/g,'').replace(/\s+/g,' ');
}
export function checkAnswer(exercise, input) {
  if (exercise.type === 'single_choice') return normalizeAnswer(input) === normalizeAnswer(exercise.correct);
  if (exercise.type === 'fill_blank') return exercise.acceptedAnswers.some(x=>normalizeAnswer(x) === normalizeAnswer(input));
  throw new Error('Unsupported automatically graded exercise type');
}
export function dateISO(date = new Date()) {
  // Browser-local date, not UTC. Clock/date are under the user's device control.
  const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
export function addLocalDays(iso, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error('Invalid local date');
  const [y,m,d] = iso.split('-').map(Number);
  const date = new Date(y,m-1,d,12); // noon avoids DST boundary changes
  if (date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d) throw new Error('Invalid local date');
  date.setDate(date.getDate()+days);
  return dateISO(date);
}
export function scheduleInitial(itemId, lessonId, today=dateISO()) {
  return { key:`review:${itemId}`, type:'review', itemId, lessonId, stage:0, due:addLocalDays(today,1), updatedAt:new Date().toISOString() };
}
export function scheduleNext(previous, recalled, today=dateISO()) {
  const stage = recalled ? Math.min(previous.stage+1,REVIEW_INTERVALS.length-1) : 0;
  const interval = recalled ? REVIEW_INTERVALS[stage] : REVIEW_INTERVALS[0];
  return {...previous,stage,due:addLocalDays(today,interval),updatedAt:new Date().toISOString()};
}
export function isDue(record, today=dateISO()) { return record.due<=today; }
export function completion(lesson, records) {
  const auto=lesson.exercises.filter(x=>x.type==='single_choice'||x.type==='fill_blank');
  const self=lesson.exercises.filter(x=>x.type.startsWith('self_assessed_'));
  return {
    autoTotal:auto.length,
    autoCorrect:auto.filter(x=>records.get(`answer:${x.id}`)?.correct===true).length,
    selfTotal:self.length,
    selfDone:self.filter(x=>records.get(`self:${x.id}`)?.confirmed===true).length
  };
}
export function validateContent(lessons) {
  if(!Array.isArray(lessons)||lessons.length===0) throw new Error('No lessons');
  const ids=new Set(), units=new Set(), exerciseIds=new Set();
  for(const l of lessons){
    if(!/^L\d{3}$/.test(l.id)||ids.has(l.id)) throw new Error('Duplicate or invalid lesson ID');
    ids.add(l.id);
    for(const word of [...l.vocabulary,...l.phrases]) {
      if(!word.id||!word.en||!word.ru||units.has(word.id)) throw new Error(`Invalid or duplicate vocabulary ID in ${l.id}`);
      units.add(word.id);
    }
    for(const ex of l.exercises){
      if(!ex.id||exerciseIds.has(ex.id)) throw new Error(`Duplicate exercise ID in ${l.id}`);
      if(ex.type==='single_choice'&&(!ex.options.includes(ex.correct))) throw new Error(`Missing correct option ${ex.id}`);
      if(ex.type==='fill_blank'&&(!Array.isArray(ex.acceptedAnswers)||!ex.acceptedAnswers.length)) throw new Error(`Invalid accepted answers ${ex.id}`);
      exerciseIds.add(ex.id);
    }
    for(const id of l.reviewItemIds) if(![...l.vocabulary,...l.phrases].some(x=>x.id===id)) throw new Error(`Missing review item ${id}`);
  }
  return true;
}
export function allowedKeys(lessons){
  const keys=new Set();
  for(const l of lessons){
    keys.add(`progress:${l.id}`);
    for(const x of l.exercises) keys.add(`${x.type.startsWith('self_')?'self':'answer'}:${x.id}`);
    for(const x of [...l.vocabulary,...l.phrases]) keys.add(`review:${x.id}`);
  }
  return keys;
}
function validString(v,max=20000){return typeof v==='string'&&v.length<=max;}
function recordSafe(r, allowed){
  if(!r||typeof r!=='object'||Array.isArray(r)||!validString(r.key,80)||!allowed.has(r.key)) return false;
  if(!['progress','answer','self','review'].includes(r.type)||!r.key.startsWith(`${r.type}:`)) return false;
  if(!validString(r.updatedAt,40)||!Number.isFinite(Date.parse(r.updatedAt))) return false;
  if(r.type==='progress') return /^L\d{3}$/.test(r.lessonId)&&typeof r.done==='boolean';
  if(r.type==='answer') return validString(r.input,1000)&&typeof r.correct==='boolean'&&Number.isInteger(r.attempts)&&r.attempts>=0&&r.attempts<=100000;
  if(r.type==='self') return typeof r.confirmed==='boolean'&&(!('answer' in r)||validString(r.answer,20000));
  if(r.type==='review') return validString(r.itemId,80)&&/^L\d{3}$/.test(r.lessonId)&&Number.isInteger(r.stage)&&r.stage>=0&&r.stage<REVIEW_INTERVALS.length&&/^\d{4}-\d{2}-\d{2}$/.test(r.due);
  return false;
}
export function parseBackup(text, lessons){
  if(text.length>4_000_000) throw new Error('Backup file is too large (maximum 4 MB)');
  let payload; try{payload=JSON.parse(text);}catch{throw new Error('Invalid JSON file');}
  if(!payload||payload.app!=='English Path'||payload.formatVersion!==BACKUP_VERSION||!Array.isArray(payload.records)) throw new Error('This is not a supported English Path backup');
  if(payload.records.length>5000) throw new Error('Too many backup records');
  const allowed=allowedKeys(lessons), unique=new Set();
  const records=payload.records.map(r=>{
    if(!recordSafe(r,allowed)||unique.has(r.key)) throw new Error('Backup contains invalid, unknown or duplicate records');
    unique.add(r.key);
    // Whitelist fields, do not import arbitrary properties into data storage.
    if(r.type==='progress') return {key:r.key,type:r.type,lessonId:r.lessonId,done:r.done,startedAt:validString(r.startedAt,40)?r.startedAt:null,completedAt:validString(r.completedAt,40)?r.completedAt:null,revisionSeen:Number.isInteger(r.revisionSeen)?r.revisionSeen:1,updatedAt:r.updatedAt};
    if(r.type==='answer') return {key:r.key,type:r.type,lessonId:r.lessonId,exerciseId:r.exerciseId,input:r.input,correct:r.correct,attempts:r.attempts,updatedAt:r.updatedAt};
    if(r.type==='self') return {key:r.key,type:r.type,lessonId:r.lessonId,exerciseId:r.exerciseId,confirmed:r.confirmed,answer:r.answer??'',updatedAt:r.updatedAt};
    return {key:r.key,type:r.type,itemId:r.itemId,lessonId:r.lessonId,stage:r.stage,due:r.due,updatedAt:r.updatedAt};
  });
  return records;
}
export function mergeRecords(existing, incoming){
  const combined=new Map(existing.map(r=>[r.key,r]));
  let inserted=0,replaced=0,skipped=0;
  for(const record of incoming){
    const old=combined.get(record.key);
    if(!old){combined.set(record.key,record);inserted++;}
    else if(record.updatedAt>old.updatedAt){combined.set(record.key,record);replaced++;}
    else skipped++;
  }
  return {records:[...combined.values()],inserted,replaced,skipped};
}
export function backupPayload(records){return {app:'English Path',formatVersion:BACKUP_VERSION,exportedAt:new Date().toISOString(),records};}
