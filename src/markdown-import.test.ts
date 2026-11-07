import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEventMarkdown} from './markdown-import';
import {fresh,links,renameLinks} from './model';
import {graphEdges} from './features/Graph';
test('Obsidian template maps properties, abstract and body without inventing citations',()=>{const d=parseEventMarkdown(`---
Time: 1997/6/9
Country: [中国, 美国]
tags:
 - 研究中
 - 科技
category: [产业, 政策]
related:
 - "[[关联事件]]"
aliases: [别名A]
custom_field: 保留的属性
---
# 406 事件与市场分析模板

> [!abstract] Abstract
> **事件摘要：** 这是摘要。

研究正文。`,'example.md');assert.equal(d.patch.title,'406 事件与市场分析模板');assert.equal(d.patch.date,'1997-06-09');assert.deepEqual(d.patch.countries,['中国','美国']);assert.deepEqual(d.patch.tags,['研究中','科技']);assert.equal(d.patch.status,'研究中');assert.deepEqual(d.patch.categories,['产业','政策']);assert.deepEqual(d.related,['关联事件']);assert.equal(d.patch.summary,'这是摘要。');assert.equal(d.patch.notes,'研究正文。');assert.equal(d.metadata.custom_field,'保留的属性');assert.deepEqual(d.patch.aliases,['别名A'])});
test('invalid dates generate warnings and do not overwrite event date',()=>{const d=parseEventMarkdown('---\nTime: 2026/2/30\n---\n正文','invalid.md');assert.equal(d.patch.date,undefined);assert.equal(d.warnings.length,1)});
test('plain Markdown preserves missing event fields and removes duplicate H1 only',()=>{const d=parseEventMarkdown('# 标题\n\n## 正文\n内容');assert.equal(d.patch.title,'标题');assert.equal(d.patch.date,undefined);assert.equal(d.patch.countries,undefined);assert.equal(d.patch.notes,'## 正文\n内容')});
test('inline fields are mapped and imported links resolve through aliases',()=>{const d=parseEventMarkdown('Time:: 2000-03-10\nCountry:: 美国\nrelated:: [[别名A]]\n\n正文');const a=fresh();a.events[1].aliases=['别名A'];a.events[0]={...a.events[0],...d.patch};assert.equal(links(a.events[0],a.events)[0].id,a.events[1].id)});
test('graph deduplicates explicit, reverse and Markdown relations and omits missing nodes',()=>{const a=fresh();a.events[0].notes=`[[${a.events[1].id}]]`;const edges=graphEdges(a.events,[{id:'1',from:a.events[0].id,to:a.events[1].id,type:'同一主题'},{id:'2',from:a.events[1].id,to:a.events[0].id,type:'逆向'},{id:'3',from:'missing',to:a.events[0].id,type:'缺失'}]);assert.equal(edges.length,1)});
test('malformed metadata never executes code and unmatched frontmatter is rejected',()=>{assert.throws(()=>parseEventMarkdown('---\nTime: 2000/1/1'));const d=parseEventMarkdown('---\n__proto__: retained\n---\n<script>text</script>');assert.equal(d.patch.notes,'<script>text</script>');assert.equal(({} as Record<string,unknown>).retained,undefined)});

test('imported related titles survive event renaming via stable IDs',()=>{const a=fresh();a.events[0].relatedTitles=[a.events[1].title];a.events=renameLinks(a.events,a.events[1].id,a.events[1].title,'新标题');assert.equal(a.events[0].relatedTitles?.[0],a.events[1].id);assert.equal(links(a.events[0],a.events)[0].id,a.events[1].id)});

