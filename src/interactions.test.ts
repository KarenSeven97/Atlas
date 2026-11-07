import {test} from 'node:test';
import assert from 'node:assert/strict';
import {today,eventOrder,removeEvent,panRange,axisPercent,clampRange,monthLabel} from './interactions';
import {fresh} from './model';
test('panorama date uses Shanghai calendar at UTC boundary',()=>{assert.equal(today(new Date('2026-11-06T17:00:00Z')),'2026-11-07')});
test('pinned events sort first without changing chronological order within group',()=>{const a=fresh();const first=a.events[0],late={...a.events[5],pinned:true};assert.equal([first,late].sort(eventOrder)[0].id,late.id)});
test('delete removes event links and analyses and clears child parent without deleting child',()=>{const a=fresh(),id=a.events[1].id;a.events[2].parentId=id;a.analyses.push({id:'a',eventId:id,at:'now',provider:'x',model:'x',prompt:'',context:'',text:''});const b=removeEvent(a,id);assert.ok(!b.events.some(e=>e.id===id));assert.ok(!b.relations.some(r=>r.from===id||r.to===id));assert.equal(b.events.find(e=>e.id===a.events[2].id)?.parentId,'');assert.equal(b.analyses.length,0);assert.equal(a.events.length,b.events.length+1)});
test('time slider translates range and preserves duration',()=>{const r={from:'2000-01-01',to:'2001-01-01'},left=panRange(r,0,'2026-11-07'),right=panRange(r,1000,'2026-11-07');assert.equal(left.from,'1995-01-01');assert.equal(right.to,'2026-11-07');assert.equal(Date.parse(right.to)-Date.parse(right.from),Date.parse(r.to)-Date.parse(r.from))});
test('event and tick use the same calendar fraction',()=>{const r={from:'2026-10-01',to:'2026-12-01'};assert.ok(axisPercent('2026-11-06',r)>axisPercent('2026-10-14',r));assert.equal(axisPercent(r.from,r),0);assert.equal(axisPercent(r.to,r),100)});

test('all range updates clamp to 1995 through today while retaining pan duration',()=>{const end='2026-11-07';for(const candidate of [{from:'1970-08-18',to:'2066-07-25'},{from:'1980-01-01',to:'1981-01-01'},{from:'2040-01-01',to:'2041-01-01'},{from:'2026-11-07',to:'2026-11-07'}]){const result=clampRange(candidate,end);assert.ok(result.from>='1995-01-01');assert.ok(result.to<=end);assert.ok(result.from<result.to)}assert.deepEqual(clampRange({from:'1970-01-01',to:'2060-01-01'},end),{from:'1995-01-01',to:end});const future=clampRange({from:'2040-01-01',to:'2041-01-01'},end);assert.equal(Date.parse(future.to)-Date.parse(future.from),366*86400000)});
test('month labels never display a day',()=>{assert.equal(monthLabel('2000-04-16'),'2000年04月');assert.equal(monthLabel('2026-11-07'),'2026年11月')});

