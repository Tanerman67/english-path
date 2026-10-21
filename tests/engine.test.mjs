import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {normalizeAnswer,checkAnswer,dateISO,addLocalDays,scheduleInitial,scheduleNext,isDue,validateContent,completion,backupPayload,parseBackup,mergeRecords,escapeHtml} from '../web/js/engine.mjs';
const folder = new URL('../web/content/lessons/', import.meta.url);
const lessons=readdirSync(folder).filter(x=>x.endsWith('.json')).map(x=>JSON.parse(readFileSync(new URL(x,folder),'utf-8'))).sort((a,b)=>a.order-b.order);
test('seven lessons are schema-valid with stable exercise / review IDs',()=>{
  assert.equal(lessons.length,7);
  assert.equal(validateContent(lessons),true);
  assert.equal(lessons.every(l=>l.exercises.length===6&&l.reviewItemIds.length===13),true);
});
test('every exercise has an answer and examples and can be checked deterministically',()=>{
  let tested=0;
  for(const l of lessons){
    assert.ok(l.grammar.examples.length>=2);
    assert.ok(l.dialogue.length>=3);
    for(const x of l.exercises){
      if(x.type==='single_choice'){
        assert.ok(checkAnswer(x,x.correct));
        assert.ok(x.options.some(y=>!checkAnswer(x,y)));
        tested++;
      } else if(x.type==='fill_blank'){
        assert.ok(checkAnswer(x,x.acceptedAnswers[0]));
        assert.ok(checkAnswer(x,` ${x.acceptedAnswers[0].toUpperCase()}!  `));
        assert.ok(!checkAnswer(x,'a completely wrong answer'));
        tested++;
      }
    }
  }
  assert.equal(tested,28);
});
test('answer normalization is forgiving only for spacing/case/terminal punctuation',()=>{
  assert.equal(normalizeAnswer('  I  HAVE   DONE IT.  '),'i have done it');
  assert.equal(normalizeAnswer('haven\'t'),"haven't");
  assert.equal(escapeHtml('<script>" &'), '&lt;script&gt;&quot; &amp;');
});
test('local date calculations handle DST/month boundaries',()=>{
  assert.equal(addLocalDays('2026-10-31',1),'2026-11-01');
  assert.equal(addLocalDays('2028-02-28',1),'2028-02-29');
  assert.equal(addLocalDays('2026-12-31',1),'2027-01-01');
  assert.throws(()=>addLocalDays('2026-02-29',1));
  assert.match(dateISO(new Date(2026,9,21)),/^2026-10-21$/);
});
test('review does not duplicate cards and does not hide overdue items',()=>{
  const r=scheduleInitial('L001-P01','L001','2026-10-21');
  assert.equal(r.due,'2026-10-22');
  assert.equal(isDue(r,'2026-10-21'),false);
  assert.equal(isDue(r,'2026-10-22'),true);
  assert.equal(isDue(r,'2026-10-25'),true);
  const yes=scheduleNext(r,true,'2026-10-22');
  assert.equal(yes.stage,1);
  assert.equal(yes.due,'2026-10-25');
  const again=scheduleNext(yes,false,'2026-10-28');
  assert.equal(again.stage,0);
  assert.equal(again.due,'2026-10-29');
  assert.equal(again.key,r.key);
});
test('completion needs checked answers and explicit self-checks',()=>{
  const l=lessons[0];
  assert.deepEqual(completion(l,new Map()),{autoTotal:4,autoCorrect:0,selfTotal:2,selfDone:0});
  const records=new Map(l.exercises.map(x=>[`${x.type.startsWith('self_assessed_')?'self':'answer'}:${x.id}`,x.type.startsWith('self_assessed_')?{confirmed:true}:{correct:true}]));
  assert.deepEqual(completion(l,records),{autoTotal:4,autoCorrect:4,selfTotal:2,selfDone:2});
});
test('backups validate, round-trip and merge newer without deletion',()=>{
  const r=scheduleInitial('L001-P01','L001','2026-10-21');
  const payload=backupPayload([r]);
  const fromFile=parseBackup(JSON.stringify(payload),lessons);
  assert.equal(fromFile.length,1);
  assert.equal(fromFile[0].key,r.key);
  assert.throws(()=>parseBackup('{"app":"Malicious"}',lessons));
  const old={...r,updatedAt:'2025-01-01T00:00:00.000Z'};
  const merged=mergeRecords([old],fromFile);
  assert.equal(merged.replaced,1);
  assert.equal(merged.inserted,0);
  assert.equal(merged.records.length,1);
  assert.equal(merged.records[0].key,r.key);
});
test('backups reject unknown and duplicate records',()=>{
  const r=scheduleInitial('L001-P01','L001','2026-10-21');
  const bad={...r,key:'review:PERSONAL_SECRET'};
  assert.throws(()=>parseBackup(JSON.stringify(backupPayload([bad])),lessons));
  assert.throws(()=>parseBackup(JSON.stringify(backupPayload([r,r])),lessons));
});
