import {test} from 'node:test';
import assert from 'node:assert/strict';
import {study,marketDate} from './research';
import {seed,demoPrices,validate} from './data';
const p=(date:string,close:number)=>({date,close,instrumentId:'A',source:'test',datasetId:'test'});
test('weekend aligns forward and missing windows remain null',()=>{const r=study([p('2023-05-26',100),p('2023-05-29',110),p('2023-05-30',121)],[],'2023-05-27');assert.equal(r.aligned,'2023-05-29');assert.ok(Math.abs(r.rows[2].return!-10)<1e-8);assert.equal(r.rows[2].abnormal,null);assert.equal(r.rows[5].return,null)});
test('abnormal return uses identical dates',()=>{const r=study([p('2023-05-29',100),p('2023-05-30',120)],[p('2023-05-29',100),p('2023-05-30',105)],'2023-05-29');assert.ok(Math.abs(r.rows[2].abnormal!-15)<1e-8)});
test('timezone converts to local market date',()=>{assert.equal(marketDate('2023-05-25T01:00:00Z','America/New_York'),'2023-05-24');assert.equal(marketDate('2023-05-25T01:00:00Z','Asia/Shanghai'),'2023-05-25')});
test('after data range returns missing',()=>assert.equal(study([p('2023-01-01',100)],[],'2024-01-01').aligned,null));
test('seed schema and deterministic demo',()=>{const s=seed();validate(s);assert.equal(s.events.filter(e=>e.title.includes('互联网泡沫')).length,5);assert.deepEqual(demoPrices(s.instruments[0]),demoPrices(s.instruments[0]));assert.throws(()=>validate({...s,version:2} as never))});

test('rejects malformed and duplicate imported data',()=>{const s=seed();assert.throws(()=>validate({...s,events:[{...s.events[0],date:'2023-02-30'}]}));assert.throws(()=>validate({...s,events:[s.events[0],s.events[0]]}));assert.throws(()=>validate({...s,events:[{...s.events[0],assets:['UNKNOWN']}]}));assert.throws(()=>validate({...s,news:undefined} as never));assert.throws(()=>validate({...s,prices:[p('2023-01-01',NaN)]}));});
test('full backup roundtrip preserves linked news, custom prices and notes',()=>{const s=seed();s.news.push({id:'news-1',title:'证据待核验',url:'https://example.com',source:'test',published:'',verified:false});s.events[0].newsIds=['news-1'];s.events[0].notes='个人观点';s.prices.push({...p('2023-01-02',100),instrumentId:'SPX'});const restored=JSON.parse(JSON.stringify(s));validate(restored);assert.deepEqual(restored,s)});
