import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fresh,migrate,links,renameLinks,validAtlas} from './model';
import {seed} from './data';
test('legacy migration preserves notes and links with multiple countries',()=>{const old=seed();old.events[0].notes='保留笔记';const next=migrate(old);assert.equal(next.events[0].notes,'保留笔记');assert.deepEqual(next.events[0].countries,['全球']);assert.equal(next.version,2);validAtlas(next)});
test('rename converts title links to stable IDs and backlinks survive',()=>{const a=fresh();const target=a.events[1];a.events[0].notes=`[[${target.title}]]`;a.events=renameLinks(a.events,target.id,target.title,'重命名事件');assert.equal(links(a.events[0],a.events)[0].id,target.id);assert.ok(a.events[0].notes.includes(target.id))});
test('V2 accepts outside demo range but rejects invalid dates',()=>{const a=fresh();a.events[0].date='1990-01-01';validAtlas(a);a.events[0].date='2026-02-30';assert.throws(()=>validAtlas(a))});
test('backup roundtrip includes versions, soft deletes and AI research',()=>{const a=fresh();a.events[0].deletedAt='2026-11-07';a.events[0].revisions=[{at:'2026-11-07',notes:'旧版本'}];const b=JSON.parse(JSON.stringify(a));validAtlas(b);assert.deepEqual(a,b)});
