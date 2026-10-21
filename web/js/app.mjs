import {loadLessons} from './content.mjs';
import {readAll,putRecord,putRecords} from './storage.mjs';
import {escapeHtml as e, checkAnswer, dateISO, isDue, scheduleInitial, scheduleNext, completion, parseBackup, mergeRecords, backupPayload} from './engine.mjs';

const app=document.querySelector('#app');
let lessons=[];
let saved=new Map();
let currentReview=null;
let reviewRevealed=false;
let notice='';
let drafts=new Map();
const text=(x)=>e(x??'');
const now=()=>new Date().toISOString();
const page=()=>decodeURIComponent((location.hash||'#home').slice(1));
const get=(key)=>saved.get(key);
const wordIndex=()=>new Map(lessons.flatMap(l=>[...l.vocabulary,...l.phrases].map(w=>[w.id,{...w,lessonId:l.id}])));
const dueItems=()=>[...saved.values()].filter(r=>r.type==='review'&&isDue(r)).sort((a,b)=>a.due.localeCompare(b.due)||a.itemId.localeCompare(b.itemId));
const completed=()=>lessons.filter(l=>get(`progress:${l.id}`)?.done).length;
const changedLesson=(l)=>get(`progress:${l.id}`)?.done?'Completed':get(`progress:${l.id}`)?'In progress':'Not started';
const dateText=(iso)=>iso||'Not scheduled';

async function upsert(record,{rerender=true}={}) {
  try {await putRecord(record);saved.set(record.key,record);if(rerender)render();return true;}
  catch(err){alert('Не удалось сохранить данные. Проверь настройки браузера или свободное место.\n'+err.message);return false;}
}
function heading(eyebrow,title,desc){return `<header class="page-heading"><div class="eyebrow">${text(eyebrow)}</div><h1>${text(title)}</h1><p>${text(desc)}</p></header>`;}
function layout(body,active='home'){
  const tabs=[['home','⌂','Home'],['learn','▤','Learn'],['review','◉','Review'],['library','▦','Library'],['progress','▥','Progress']];
  return `<div class="shell"><aside class="sidebar"><a class="brand" href="#home"><span class="logo">E</span><span><strong>English Path</strong><small>B1 → B2 · Your daily practice</small></span></a><nav class="sidebar-nav" aria-label="Main navigation">${tabs.map(t=>`<a href="#${t[0]}" class="navlink ${active===t[0]?'active':''}"><span aria-hidden="true">${t[1]}</span> ${t[2]} ${t[0]==='review'&&dueItems().length?`<i class="count">${dueItems().length}</i>`:''}</a>`).join('')}</nav><div class="sidebar-note"><strong>Built for real conversations</strong><p>Learn useful English for everyday life and work in New Zealand.</p></div></aside><div class="main-wrap"><div class="topbar"><a class="brand mobile-brand" href="#home"><span class="logo">E</span><strong>English Path</strong></a><span class="topline">MODULE 01 <span class="top-dot">·</span> 7 LESSONS</span><span class="topright">Local progress <span aria-hidden="true">●</span></span></div><main class="main" id="maincontent">${notice?`<div class="notice" role="status">${text(notice)}<button type="button" data-action="dismiss-notice" aria-label="Close">×</button></div>`:''}${body}</main></div><nav class="bottom-nav" aria-label="Mobile navigation">${tabs.map(t=>`<a href="#${t[0]}" class="${active===t[0]?'active':''}"><span aria-hidden="true">${t[1]}</span><small>${t[2]}</small></a>`).join('')}</nav></div>`;
}
function home(){
  const next=lessons.find(l=>!get(`progress:${l.id}`)?.done)??lessons[lessons.length-1];
  const count=completed(),due=dueItems().length, pct=Math.round(count/lessons.length*100);
  return layout(`${heading('YOUR LEARNING DASHBOARD','A little progress, every day.','Practical English for your work, your conversations, and your life in New Zealand.')}
  <div class="hero"><div><div class="eyebrow mint">YOUR LEARNING PATH</div><h2>Build confidence,<br>one lesson at a time.</h2><p>Seven practical lessons to get started. Your answers and reviews stay in this browser.</p><a class="btn primary" href="#learn/${next.id}">${get(`progress:${next.id}`)?.done?'Open lesson':'Continue learning'} <span aria-hidden="true">→</span></a></div><div class="hero-decor" aria-hidden="true"><span class="circle-a">EN</span><span class="circle-b">B2</span></div></div>
  <div class="stat-grid"><div class="stat"><small>LESSONS COMPLETED</small><strong>${count}<span> / 7</span></strong><div class="progress-track"><div style="width:${pct}%"></div></div></div><div class="stat"><small>READY TO REVIEW</small><strong>${due}</strong><a class="inline-link" href="#review">${due?'Start reviewing →':'Nothing due today'}</a></div><div class="stat"><small>COURSE GOAL</small><strong>B2<span> target</span></strong><span class="muted">This first module is not a CEFR assessment.</span></div></div>
  <section class="section-head"><div><div class="eyebrow">MODULE 01</div><h2>Real English for work & life</h2></div><a href="#learn" class="inline-link">View all lessons →</a></section>
  <div class="lesson-grid">${lessons.map(l=>lessonCard(l)).join('')}</div>
  <div class="info-box"><strong>About listening practice</strong><p>These first seven lessons include written dialogues but no recorded audio yet. Listening assessment is not available until we add verified audio.</p></div>`, 'home');
}
function lessonCard(l){const progress=get(`progress:${l.id}`),status=progress?.done?'Completed':progress?'In progress':'Start lesson';return `<a class="lesson-card" href="#learn/${l.id}"><div class="lesson-meta"><span class="lesson-number">${text(l.id.replace('L','DAY '))}</span><span class="lesson-status ${progress?.done?'done':''}">${progress?.done?'✓ ':''}${status}</span></div><h3>${text(l.title)}</h3><p>${text(l.grammar.topic)}</p><div class="lesson-bottom"><span>${l.durationMinutes} min · B1–B2</span><span aria-hidden="true">↗</span></div></a>`;}
function learnList(){return layout(`${heading('COURSE CONTENT','Your lessons','Work through the module at your own pace. You can open any lesson and return later.')}<div class="lesson-grid">${lessons.map(l=>lessonCard(l)).join('')}</div><div class="info-box"><strong>Six skills, one pathway</strong><p>Every lesson includes grammar, vocabulary, dialogue reading, speaking, writing and a realistic work scenario. Recorded listening practice will follow in a later update.</p></div>`,'learn');}
function lessonView(l){
  const prog=completion(l,saved),done=get(`progress:${l.id}`)?.done;
  const auto=l.exercises.filter(x=>x.type==='single_choice'||x.type==='fill_blank');
  const self=l.exercises.filter(x=>x.type.startsWith('self_assessed_'));
  const ready=prog.autoCorrect===prog.autoTotal&&prog.selfDone===prog.selfTotal;
  const cards=(items)=>items.map((x,i)=>`<div class="word"><div class="word-count">${String(i+1).padStart(2,'0')}</div><div><strong>${text(x.en)}</strong><small>${text(x.ru)}</small>${x.example?`<em>${text(x.example)}</em>`:''}</div></div>`).join('');
  const exercise=(x,i)=>{
    const prior=get(`answer:${x.id}`);
    return `<div class="activity" data-exercise="${text(x.id)}"><div class="activity-header"><strong>Exercise ${i+1}</strong><span class="tag ${prior?.correct?'positive':''}">${prior?.correct?'Correct ✓':x.type==='fill_blank'?'Complete the sentence':'Choose the answer'}</span></div><p class="activity-question">${text(x.prompt)}</p>${x.type==='single_choice'?`<div class="choices">${x.options.map((option,n)=>`<label class="choice"><input name="${text(x.id)}" type="radio" value="${text(option)}" ${prior?.input===option?'checked':''}><span>${text(option)}</span></label>`).join('')}</div>`:`<input class="field" autocomplete="off" aria-label="Your answer" name="${text(x.id)}" value="${text(prior?.input??'')}" placeholder="Type your answer…" maxlength="1000"/>`}<div class="activity-actions"><button class="btn small ${prior?.correct?'secondary':'primary'}" data-action="check" data-id="${text(x.id)}" ${prior?.correct?'disabled':''}>${prior?.correct?'Correct ✓':'Check answer'}</button>${prior?`<span class="response ${prior.correct?'correct':'incorrect'}">${prior.correct?'✓ Correct':'Not quite. Try again.'}</span>`:''}</div>${prior?`<p class="explanation">${text(x.explanationRu)}</p>`:''}</div>`;
  };
  const selfCheck=x=>{
    const record=get(`self:${x.id}`);
    const isWriting=x.type==='self_assessed_writing';
    const visible=drafts.get(`model:${x.id}`)===true;
    const answer=drafts.get(x.id)??record?.answer??'';
    return `<div class="activity"><div class="activity-header"><strong>${isWriting?'Writing practice':'Speaking practice'}</strong><span class="tag ${record?.confirmed?'positive':''}">${record?.confirmed?'Self-checked ✓':'Self-assessment'}</span></div><p class="activity-question">${text(x.prompt)}</p>${isWriting?`<label class="field-label" for="draft-${text(x.id)}">Your draft</label><textarea class="field textarea" id="draft-${text(x.id)}" data-draft="${text(x.id)}" rows="5" maxlength="20000" placeholder="Write your own answer…">${text(answer)}</textarea><div class="muted micro">Draft is stored locally when you leave the field or complete the check.</div><button class="btn ghost small" data-action="model" data-id="${text(x.id)}">${visible?'Hide':'Show'} model answer</button>${visible?`<div class="model-answer">${text(x.modelAnswer)}</div>`:''}`:`<div class="info-box compact">Speak out loud before marking this task as complete. This app cannot verify pronunciation or fluency.</div>`}<div class="checklist">${x.selfCheckRu.map((label,i)=>`<label><input type="checkbox" data-self-check="${text(x.id)}" ${record?.confirmed?'checked':''}/> <span>${text(label)}</span></label>`).join('')}</div><button class="btn secondary small" data-action="self" data-id="${text(x.id)}">${record?.confirmed?'Update self-check':'I did this task'}</button></div>`;
  };
  return layout(`<div class="breadcrumbs"><a href="#learn">All lessons</a><span>›</span> ${text(l.id)}</div><div class="lesson-hero"><div class="eyebrow mint">LESSON ${l.order} OF 7 · ${l.durationMinutes} MIN</div><h1>${text(l.title)}</h1><p>${text(l.goalRu)}</p><div class="lesson-chip-row"><span>B1 → B2</span><span>${text(l.grammar.topic)}</span></div></div>
  <div class="lesson-layout"><div class="content-stack">
  <section class="panel"><span class="eyebrow">01 · GRAMMAR</span><h2>${text(l.grammar.topic)}</h2><p>${text(l.grammar.explanationRu)}</p><div class="example-group">${l.grammar.examples.map(x=>`<div class="example"><span>Example</span><strong>${text(x)}</strong></div>`).join('')}</div></section>
  <section class="panel"><span class="eyebrow">02 · VOCABULARY</span><h2>Useful words <span class="counter">${l.vocabulary.length}</span></h2><div class="words">${cards(l.vocabulary)}</div></section>
  <section class="panel"><span class="eyebrow">03 · PHRASES</span><h2>Say it naturally</h2><div class="words">${cards(l.phrases)}</div></section>
  <section class="panel"><span class="eyebrow">04 · CONVERSATION</span><h2>Read the dialogue</h2><div class="dialogue">${l.dialogue.map(x=>`<div class="line"><span>${text(x.speaker)}</span><p>${text(x.text)}</p></div>`).join('')}</div><div class="info-box compact"><strong>Listening audio is not available yet.</strong><p>Read the dialogue and answer this comprehension question: ${text(l.listening.question)}</p><p class="muted micro">Suggested answer: ${text(l.listening.expectedAnswer)}</p></div></section>
  <section class="panel"><span class="eyebrow">05 · PRACTISE</span><h2>Check your understanding</h2>${auto.map(exercise).join('')}</section>
  <section class="panel"><span class="eyebrow">06 · USE ENGLISH</span><h2>Make it yours</h2>${self.map(selfCheck).join('')}</section>
  <section class="panel completion-panel"><span class="eyebrow">FINISH THE LESSON</span><h2>${done?'Lesson completed ✓':'Ready to complete?'}</h2><p>Automatic tasks: <strong>${prog.autoCorrect}/${prog.autoTotal}</strong> correct. Self-checked tasks: <strong>${prog.selfDone}/${prog.selfTotal}</strong>.</p><div class="progress-track"><div style="width:${Math.round((prog.autoCorrect+prog.selfDone)/(prog.autoTotal+prog.selfTotal)*100)}%"></div></div><button class="btn primary" data-action="complete" data-id="${text(l.id)}" ${(!ready||done)?'disabled':''}>${done?'Already completed':'Complete lesson →'}</button>${!ready?'<p class="muted micro">Complete all four automatically checked tasks and both self-check activities first.</p>':''}</section>
  </div><aside class="lesson-aside"><div class="aside-card"><span class="eyebrow">TODAY'S PROGRESS</span><h3>${prog.autoCorrect+prog.selfDone}<span> / ${prog.autoTotal+prog.selfTotal}</span></h3><div class="progress-track"><div style="width:${Math.round((prog.autoCorrect+prog.selfDone)/(prog.autoTotal+prog.selfTotal)*100)}%"></div></div><p>Four short checks, one speaking task and one writing task.</p><a href="#learn" class="inline-link">All lessons →</a></div><div class="aside-card outline"><strong>Learning tip</strong><p>Say your answers out loud before you look at the examples. Retrieval practice is more useful than just re-reading.</p></div></aside></div>`, 'learn');
}
function review(){
  const due=dueItems(),index=wordIndex();
  if(!due.length){currentReview=null;return layout(`${heading('SPACED REPETITION','All caught up!','No vocabulary or phrases are due today. Keep learning and come back tomorrow.')}<div class="empty-state"><div class="empty-icon">✓</div><h2>Your review queue is clear</h2><p>New cards appear after you complete lessons. Cards return based on your answers.</p><a class="btn primary" href="#learn">Explore lessons →</a></div>`,'review');}
  if(!currentReview||!due.some(r=>r.itemId===currentReview))currentReview=due[0].itemId;
  const r=due.find(x=>x.itemId===currentReview),w=index.get(r.itemId);
  return layout(`${heading('SPACED REPETITION','Time to remember.','Try saying the English phrase before revealing the answer. Your own rating controls the next review date.')}<div class="review-summary"><span>${due.length} card${due.length===1?'':'s'} due</span><span>Next review: ${dateText(r.due)}</span></div><div class="flashcard"><span class="eyebrow">RECALL IN ENGLISH</span><p class="flashcard-term">${text(w.ru)}</p><p class="muted">Think of the English phrase. Say it aloud if possible.</p>${reviewRevealed?`<div class="flash-answer"><span>ENGLISH</span><strong>${text(w.en)}</strong>${w.example?`<p>${text(w.example)}</p>`:''}</div><div class="rate-actions"><button class="btn danger" data-action="rate" data-remember="no">Again · 1 day</button><button class="btn primary" data-action="rate" data-remember="yes">I remembered ✓</button></div>`:`<button class="btn primary" data-action="reveal">Reveal answer</button>`}</div><div class="info-box"><strong>Honest self-rating</strong><p>This isn't an automatic speaking test. Mark “I remembered” only if you recalled the phrase before seeing the answer.</p></div>`,'review');
}
function library(){
  const q=drafts.get('library-query')??'';
  const items=lessons.flatMap(l=>[...l.vocabulary.map(x=>({...x,kind:'Word',lesson:l.id})),...l.phrases.map(x=>({...x,kind:'Phrase',lesson:l.id}))]);
  const show=items.filter(x=>(`${x.en} ${x.ru} ${x.lesson}`).toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  return layout(`${heading('YOUR LANGUAGE LIBRARY','Every word has a purpose.','Browse 56 useful words and 35 phrases from the first seven lessons.')}<label class="search-wrap"><span>⌕</span><input id="library-search" class="field" placeholder="Search English or Russian…" value="${text(q)}" autocomplete="off"/></label><div class="library-meta" id="library-count">${show.length} results</div><div class="library-list" id="library-results">${show.map(x=>`<div class="library-row"><div><strong>${text(x.en)}</strong><small>${text(x.ru)}</small>${x.example?`<em>${text(x.example)}</em>`:''}</div><div class="library-tags"><span>${x.kind}</span><a href="#learn/${x.lesson}">${x.lesson}</a></div></div>`).join('')||'<div class="empty-state small">No matching phrases found.</div>'}</div>`,'library');
}
function progress(){
  const count=completed(), pct=Math.round(count/lessons.length*100);
  const reviewCount=[...saved.values()].filter(x=>x.type==='review').length;
  return layout(`${heading('YOUR PROGRESS','What you have practised.','Track completed lessons, daily reviews and stored answers. These are activity indicators, not an official language-level assessment.')}<div class="stat-grid"><div class="stat"><small>COMPLETED LESSONS</small><strong>${count}<span> / 7</span></strong><div class="progress-track"><div style="width:${pct}%"></div></div></div><div class="stat"><small>CARDS SCHEDULED</small><strong>${reviewCount}</strong><span class="muted">From completed lessons</span></div><div class="stat"><small>CARDS DUE</small><strong>${dueItems().length}</strong><a class="inline-link" href="#review">Review now →</a></div></div><section class="panel"><span class="eyebrow">LESSON HISTORY</span><h2>Module 01</h2><div class="history">${lessons.map(l=>`<a href="#learn/${l.id}" class="history-item"><span class="history-number">${String(l.order).padStart(2,'0')}</span><span><strong>${text(l.title)}</strong><small>${changedLesson(l)}</small></span><span aria-hidden="true">↗</span></a>`).join('')}</div></section>
  <section class="panel"><span class="eyebrow">BACKUPS & PRIVACY</span><h2>Keep your progress safe</h2><p>Your learning data is stored only in this browser, not in a cloud account. Export a backup before clearing browser data or switching devices.</p><div class="backup-actions"><button class="btn primary" data-action="export">Download backup (.json)</button><label class="btn secondary upload" for="backup-file">Import backup (.json)</label><input id="backup-file" type="file" accept=".json,application/json" hidden /></div><div class="info-box compact"><strong>Safe restore:</strong> imports validate known record IDs and merge by the most recent update. No existing record is deleted. Before importing, download a current backup; any replacement of a newer record from the imported file requires your confirmation.</div></section>`,'progress');
}
function render(){
  try{
    let route=page(),body;
    if(route==='home')body=home();
    else if(route==='learn')body=learnList();
    else if(route.startsWith('learn/')){
      const lesson=lessons.find(l=>l.id===route.split('/')[1]);body=lesson?lessonView(lesson):learnList();
      if(lesson&&!get(`progress:${lesson.id}`)){
        // A lesson is marked "started" only after a recorded action, avoiding a loop here.
      }
    }else if(route==='review')body=review();
    else if(route==='library')body=library();
    else if(route==='progress')body=progress();
    else body=home();
    app.innerHTML=body;
  }catch(err){app.innerHTML=`<div class="fatal"><h1>Something went wrong</h1><p>${text(err.message)}</p><a href="#home">Back to home</a></div>`;}
}
async function ensureStarted(l){
  const key=`progress:${l.id}`;
  if(get(key))return;
  await upsert({key,type:'progress',lessonId:l.id,done:false,startedAt:now(),completedAt:null,revisionSeen:l.revision,updatedAt:now()},{rerender:false});
}
async function handleCheck(btn){
  const id=btn.dataset.id,l=lessons.find(x=>x.exercises.some(y=>y.id===id));
  if(!l)return;
  const ex=l.exercises.find(x=>x.id===id),section=btn.closest('[data-exercise]');
  const input=ex.type==='single_choice'?section.querySelector(`input[name="${id}"]:checked`)?.value:section.querySelector(`input[name="${id}"]`)?.value;
  if(input===undefined||!String(input).trim()){alert('Выбери ответ или введи слово.');return;}
  const prev=get(`answer:${id}`);
  const record={key:`answer:${id}`,type:'answer',lessonId:l.id,exerciseId:id,input,correct:checkAnswer(ex,input),attempts:(prev?.attempts??0)+1,updatedAt:now()};
  await ensureStarted(l);
  await upsert(record);
}
async function handleSelf(btn){
  const id=btn.dataset.id,l=lessons.find(x=>x.exercises.some(y=>y.id===id));if(!l)return;
  const ex=l.exercises.find(x=>x.id===id);
  const section=btn.closest('.activity'),checks=[...section.querySelectorAll('input[data-self-check]')];
  const answer=ex.type==='self_assessed_writing'?section.querySelector('textarea')?.value??'':'';
  drafts.set(id,answer);
  if(checks.some(c=>!c.checked)){alert('Сначала выполни задание и отметь все пункты самопроверки.');return;}
  if(ex.type==='self_assessed_writing'&&answer.trim().length<15){alert('Сначала напиши короткий ответ на английском.');return;}
  await ensureStarted(l);
  await upsert({key:`self:${id}`,type:'self',lessonId:l.id,exerciseId:id,confirmed:true,answer,updatedAt:now()});
}
async function completeLesson(l){
  const done=completion(l,saved);
  if(done.autoCorrect!==done.autoTotal||done.selfDone!==done.selfTotal)return;
  const prior=get(`progress:${l.id}`);
  if(prior?.done)return;
  const timestamp=now(),today=dateISO();
  const records=[{key:`progress:${l.id}`,type:'progress',lessonId:l.id,done:true,startedAt:prior?.startedAt??timestamp,completedAt:timestamp,revisionSeen:l.revision,updatedAt:timestamp}];
  for(const id of l.reviewItemIds){if(!get(`review:${id}`))records.push(scheduleInitial(id,l.id,today));}
  try{await putRecords(records);for(const r of records)saved.set(r.key,r);notice=`Lesson ${l.order} completed. ${records.length-1} cards were scheduled for review.`;location.hash='#home';render();}
  catch(err){alert('Could not complete lesson: '+err.message);}
}
async function exportData(){
  const payload=backupPayload([...saved.values()]);
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`english-path-backup-${dateISO()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importData(file){
  if(!file)return;
  try{
    if(file.size>4_000_000)throw new Error('Backup file is too large');
    const incoming=parseBackup(await file.text(),lessons);
    const merged=mergeRecords([...saved.values()],incoming);
    if(!confirm(`English Path backup\n\nNew records: ${merged.inserted}\nNewer records replacing existing versions: ${merged.replaced}\nOlder/equal records skipped: ${merged.skipped}\n\nPlease export your current backup first.\n\nImport and merge now?`))return;
    await putRecords(merged.records);
    saved=new Map(merged.records.map(r=>[r.key,r]));
    notice=`Backup imported: ${merged.inserted} added, ${merged.replaced} updated, ${merged.skipped} kept unchanged.`;
    render();
  }catch(err){alert('Import stopped. No data was changed.\n'+err.message);}
}
function updateLibrary(q){
  drafts.set('library-query',q);
  const items=lessons.flatMap(l=>[...l.vocabulary.map(x=>({...x,kind:'Word',lesson:l.id})),...l.phrases.map(x=>({...x,kind:'Phrase',lesson:l.id}))]);
  const show=items.filter(x=>(`${x.en} ${x.ru} ${x.lesson}`).toLocaleLowerCase().includes(q.toLocaleLowerCase()));
  document.querySelector('#library-count').textContent=`${show.length} results`;
  document.querySelector('#library-results').innerHTML=show.map(x=>`<div class="library-row"><div><strong>${text(x.en)}</strong><small>${text(x.ru)}</small>${x.example?`<em>${text(x.example)}</em>`:''}</div><div class="library-tags"><span>${x.kind}</span><a href="#learn/${x.lesson}">${x.lesson}</a></div></div>`).join('')||'<div class="empty-state small">No matching phrases found.</div>';
}
app.addEventListener('input',(event)=>{
  if(event.target.id==='library-search')updateLibrary(event.target.value);
  if(event.target.dataset?.draft)drafts.set(event.target.dataset.draft,event.target.value);
});
app.addEventListener('change',async(event)=>{
  if(event.target.id==='backup-file'){await importData(event.target.files?.[0]);event.target.value='';}
});
app.addEventListener('focusout',async(event)=>{
  const id=event.target.dataset?.draft;if(!id)return;
  const l=lessons.find(x=>x.exercises.some(y=>y.id===id));
  if(!l)return;
  const prev=get(`self:${id}`),answer=event.target.value;
  if(answer===prev?.answer)return;
  await ensureStarted(l);
  await upsert({key:`self:${id}`,type:'self',lessonId:l.id,exerciseId:id,confirmed:false,answer,updatedAt:now()},{rerender:false});
});
app.addEventListener('click',async(event)=>{
  const btn=event.target.closest('[data-action]');if(!btn)return;
  const action=btn.dataset.action;
  if(action==='check')await handleCheck(btn);
  if(action==='self')await handleSelf(btn);
  if(action==='complete'){const l=lessons.find(x=>x.id===btn.dataset.id);if(l)await completeLesson(l);}
  if(action==='dismiss-notice'){notice='';render();}
  if(action==='reveal'){reviewRevealed=true;render();}
  if(action==='rate'){
    const record=get(`review:${currentReview}`);if(!record||!reviewRevealed)return;
    const ok=await upsert(scheduleNext(record,btn.dataset.remember==='yes'),{rerender:false});
    if(ok){currentReview=null;reviewRevealed=false;render();}
  }
  if(action==='model'){
    const id=`model:${btn.dataset.id}`;drafts.set(id,!drafts.get(id));render();
  }
  if(action==='export')await exportData();
});
window.addEventListener('hashchange',()=>{notice='';render();window.scrollTo(0,0);});
async function start(){
  try{
    lessons=await loadLessons();
    saved=new Map((await readAll()).map(x=>[x.key,x]));
    render();
  }catch(err){
    console.error(err);
    app.innerHTML=`<div class="fatal"><h1>English Path couldn't start</h1><p>${text(err.message)}</p><p>Open the app from an HTTP/HTTPS site (not as a local file). Make sure browser storage is enabled.</p></div>`;
  }
}
start();
