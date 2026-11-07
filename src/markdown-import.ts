import type {EventV2} from './model';
import {validDate} from './data';
export type ImportDraft={patch:Partial<EventV2>;related:string[];warnings:string[];structured:boolean;metadata:Record<string,string|string[]>};
const unquote=(s:string)=>s.trim().replace(/^(['"])([\s\S]*)\1$/,'$2');
function list(value:string|string[]|undefined):string[]{if(Array.isArray(value))return value.flatMap(x=>list(x));if(!value?.trim())return [];const wiki=[...value.matchAll(/\[\[([^\]]+)\]\]/g)].map(m=>m[1].split('|')[0]);if(wiki.length)return wiki;const s=value.trim().replace(/^\[(.*)\]$/,'$1');return (s.match(/"[^"]*"|'[^']*'|[^,，]+/g)||[]).map(unquote).map(x=>x.replace(/^#/,'')).filter(Boolean)}
function normalDate(value:string){const m=value.trim().match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})(?:日)?(?:\s|T|$)/);if(!m)return null;const d=`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;return validDate(d)?d:null}
const recognized=new Set(['title','标题','time','date','时间','日期','country','countries','国家','地区','tags','标签','category','categories','分类','related','关联事件','aliases','别名','summary','abstract','摘要','事件摘要','status','状态','importance','重要性','end','enddate','结束日期','published','首次公开时间','effective','生效时间','assets','关联资产','hypothesis','影响假设','uncertainty','不确定性']);
export function parseEventMarkdown(raw:string,filename='事件.md'):ImportDraft{
 let body=raw.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n'),structured=false;const metadata:Record<string,string|string[]>=Object.create(null),warnings:string[]=[];
 if(body.startsWith('---\n')){const end=body.indexOf('\n---',4);if(end<0)throw Error('Markdown 属性区缺少结束的 ---');structured=true;const rows=body.slice(4,end).split('\n');let key='';for(let i=0;i<rows.length;i++){const line=rows[i];if(!line.trim()||line.trim().startsWith('#'))continue;const pair=line.match(/^([^\s:#][^:：]*?)\s*[:：]\s*(.*)$/);if(pair){key=pair[1].trim().toLowerCase();const v=pair[2].trim();if(v==='|'||v==='>'){const chunks=[];while(i+1<rows.length&&/^\s+/.test(rows[i+1]))chunks.push(rows[++i].trim());metadata[key]=chunks.join(v==='|'?'\n':' ')}else metadata[key]=unquote(v.replace(/\s+#.*$/,''))}else if(/^\s*-\s*/.test(line)&&key){const item=unquote(line.replace(/^\s*-\s*/,''));const previous=metadata[key];metadata[key]=[...(Array.isArray(previous)?previous:previous?[previous]:[]),item]}else warnings.push('未解析的属性行已保留在原始导入记录：'+line)}body=body.slice(end+4).replace(/^\n/,'')}
 // Obsidian inline properties and Markdown property tables are accepted too.
 body=body.split('\n').filter(line=>{const inline=line.match(/^([\w\u4e00-\u9fff ]+)\s*::\s*(.*)$/),table=line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/);const m=inline||table;if(m&&recognized.has(m[1].trim().toLowerCase())){metadata[m[1].trim().toLowerCase()]=unquote(m[2]);structured=true;return false}return true}).join('\n');
 const get=(...keys:string[])=>keys.map(k=>metadata[k]).find(x=>x!==undefined),str=(...keys:string[])=>{const v=get(...keys);return Array.isArray(v)?v.join(', '):v};
 const patch:Partial<EventV2>={};const title=str('title','标题'),heading=body.match(/^#\s+(.+)$/m);if(title)patch.title=title;else if(heading){patch.title=heading[1].trim();body=body.replace(heading[0],'').trim()}else if(structured)patch.title=filename.replace(/\.md$/i,'');
 const assignDate=(field:'date'|'endDate',...keys:string[])=>{const v=str(...keys);if(v){const d=normalDate(v);if(d)patch[field]=d;else warnings.push('日期无法识别，未修改：'+v)}};assignDate('date','time','date','时间','日期');assignDate('endDate','end','enddate','结束日期');
 const countries=get('country','countries','国家','地区');if(countries!==undefined)patch.countries=list(countries);
 const tags=get('tags','标签');if(tags!==undefined)patch.tags=list(tags);const categories=get('category','categories','分类');if(categories!==undefined){patch.categories=list(categories);patch.category=patch.categories[0]||''}
 const aliases=get('aliases','别名');if(aliases!==undefined)patch.aliases=list(aliases);const related=list(get('related','关联事件'));if(get('related','关联事件')!==undefined)patch.relatedTitles=related;
 const callouts: string[]=[];body=body.replace(/^>\s*\[!(?:abstract|summary|摘要)\][^\n]*\n((?:>[^\n]*(?:\n|$))*)/gim,(_,lines:string)=>{callouts.push(lines.split('\n').map(l=>l.replace(/^>\s?/, '').replace(/\*\*/g,'').replace(/^(?:事件摘要|摘要)\s*[:：]\s*/, '')).join('\n').trim());return ''});const summary=str('summary','abstract','摘要','事件摘要')||callouts.join('\n');if(summary)patch.summary=summary;
 const status=str('status','状态')||patch.tags?.find(t=>['待研究','研究中','已复盘'].includes(t));if(status)patch.status=status;
 const imp=str('importance','重要性');if(imp){const n=Number(imp);if(Number.isFinite(n))patch.importance=Math.max(1,Math.min(5,Math.round(n)));else warnings.push('重要性未识别：'+imp)}
 for(const [field,keys] of [['hypothesis',['hypothesis','影响假设']],['uncertainty',['uncertainty','不确定性']]] as const){const v=str(...keys);if(v!==undefined)patch[field]=v}
 for(const [field,keys] of [['published',['published','首次公开时间']],['effective',['effective','生效时间']]] as const){const v=str(...keys);if(v){const d=normalDate(v);if(/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v)))patch[field]=v;else if(d)patch[field]=d;else warnings.push('时间无法识别，未修改：'+v)}}
 const assetIds=list(get('assets','关联资产'));if(get('assets','关联资产')!==undefined)patch.assets=assetIds;
 patch.notes=body.trim();patch.metadata={...metadata};patch.importSource=raw;return {patch,related,warnings,structured,metadata};
}
export const MD_TEMPLATE=`---
title: 事件与市场分析模板
Time: 1997/6/9
Country: [中国]
tags: [研究中]
category: [人生大事]
related: []
aliases: []
assets: []
---

> [!abstract] Abstract
> **事件摘要：** 在这里填写事件摘要。

## 研究笔记

在这里记录事实、证据和个人判断。可用 [[其他事件]] 建立关联。
`;
