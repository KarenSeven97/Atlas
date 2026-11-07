import {today} from './interactions';
import {CLOUD,cloudRequest} from './cloud';
import {seed,KEY,validate as validateV1,type EventRecord,type State,type Instrument,type PriceBar} from './data';
export type EventV2=EventRecord & {aliases?:string[];categories?:string[];relatedTitles?:string[];metadata?:Record<string,string|string[]>;importSource?:string;pinned?:boolean;impacts?:{assetId:string;direction:string;strength:number;confidence:string;reason:string}[];countries:string[];endDate:string;parentId:string;status:string;deletedAt?:string;revisions:{at:string;notes:string}[]};
export type Analysis={id:string;eventId:string;at:string;provider:string;model:string;prompt:string;context:string;text:string};
export type View={id:string;name:string;from:string;to:string;assets:string[];country:string;tag:string};
export type Atlas={version:2;events:EventV2[];instruments:Instrument[];prices:PriceBar[];news:State['news'];relations:State['relations'];watchlist:string[];analyses:Analysis[];views:View[]};
export function migrate(old:State):Atlas{validateV1(old);return {version:2,events:old.events.map(e=>({...e,countries:e.region==='中美关系'?['中国','美国']:['中国','美国'].includes(e.region)?[e.region]:e.region==='科技与产业'?['美国']:['全球'],endDate:'',parentId:'',status:'待研究',revisions:[]})),instruments:old.instruments,prices:old.prices,news:old.news,relations:old.relations,watchlist:old.watchlist,analyses:[],views:[]};}
export function fresh(){return migrate(seed())}
export function resolveEvent(value:string,events:EventV2[]){const name=value.replace(/^\[\[|\]\]$/g,'').split('|')[0].split('/').pop()!.replace(/\.md$/i,'').trim();return events.find(e=>e.id===name||e.title===name||e.aliases?.includes(name))}
export function links(e:EventV2,events:EventV2[]){const names=[...e.notes.matchAll(/\[\[([^\]]+)\]\]/g)].map(m=>m[1]).concat(e.relatedTitles||[]);return [...new Map(names.map(n=>resolveEvent(n,events)).filter((x):x is EventV2=>!!x).map(e=>[e.id,e])).values()]}
export function renameLinks(events:EventV2[],id:string,oldTitle:string,newTitle:string){return events.map(e=>({...e,notes:e.notes.replaceAll(`[[${oldTitle}]]`,`[[${id}]]`),relatedTitles:e.relatedTitles?.map(n=>resolveEvent(n,events)?.id===id?id:n),...(e.id===id?{title:newTitle}:{})}))}
export function validAtlas(a:Atlas){if(a?.version!==2||!['events','instruments','prices','news','relations','watchlist','analyses','views'].every(k=>Array.isArray(a[k as keyof Atlas])))throw Error('备份格式无效');const v1={...seed(),...a,version:1,events:a.events.filter(e=>!e.deletedAt)} as unknown as State;
// V2 intentionally supports dates beyond the old demo range.
const check={...v1,events:v1.events.map(e=>({...e,date:'2020-01-01',assets:e.assets,newsIds:e.newsIds})),relations:v1.relations.filter(r=>v1.events.some(e=>e.id===r.from)&&v1.events.some(e=>e.id===r.to))};validateV1(check);
for(const e of a.events){if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||new Date(e.date).toISOString().slice(0,10)!==e.date||!Array.isArray(e.countries)||!Array.isArray(e.revisions)||typeof e.notes!=='string')throw Error('事件字段无效');if(e.endDate&&e.endDate<e.date)throw Error('结束日期早于开始日期')}
}
let database:Promise<IDBDatabase>|undefined;
function db(){return database??=new Promise((resolve,reject)=>{const r=indexedDB.open('market-atlas',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('workspace'))r.result.createObjectStore('workspace')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
let cloudRevision=0,lastCloud='',cloudConflict=false;
async function localGet(key:string){const d=await db();return new Promise<unknown>((resolve,reject)=>{const r=d.transaction('workspace').objectStore('workspace').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function localPut(key:string,value:unknown){const d=await db();await new Promise<void>((resolve,reject)=>{const t=d.transaction('workspace','readwrite');t.objectStore('workspace').put(value,key);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})}
export async function readAtlas(){
 if(CLOUD){const row=await cloudRequest('workspace');cloudRevision=row.revision;cloudConflict=false;if(row.data)validAtlas(row.data);lastCloud=row.data?JSON.stringify(row.data):'';const draft=await localGet('cloud:draft') as {revision:number;data:Atlas}|undefined;if(draft&&draft.revision===cloudRevision){validAtlas(draft.data);return ensureTSM(draft.data)}return ensureTSM(row.data||fresh())}
 const value=await localGet('current') as Atlas|undefined;if(value){validAtlas(value);return ensureTSM(value)}const old=localStorage.getItem(KEY);const next=old?migrate(JSON.parse(old)):fresh();const extended=ensureTSM(next);await writeAtlas(extended);return extended;
}
export async function writeAtlas(a:Atlas){
 if(CLOUD){const json=JSON.stringify(a);if(json===lastCloud)return;await localPut('cloud:draft',{revision:cloudRevision,data:a});if(cloudConflict)throw Error('云端已有更新，请导出备份后重新载入合并');try{const row=await cloudRequest('workspace',{method:'PUT',body:JSON.stringify({revision:cloudRevision,data:a})});cloudRevision=row.revision;lastCloud=json;await localPut('cloud:draft',null)}catch(e){if((e as Error).message.includes('云端已有更新'))cloudConflict=true;throw e}return}
 await localPut('current',a);
}
export async function exportCloudDraft(){const draft=await localGet('cloud:draft') as {data:Atlas}|undefined;if(!draft)throw Error('没有未同步草稿');download('atlas-unsynced.json',JSON.stringify(draft.data,null,2))}
export function newEvent():EventV2{return {...seed().events[0],id:crypto.randomUUID(),title:'新事件',date:today(),published:'',effective:'',summary:'',hypothesis:'',notes:'',assets:[],tags:[],newsIds:[],countries:['全球'],endDate:'',parentId:'',status:'待研究',impact:'未知',importance:3,revisions:[]}}
export const date=(t:number)=>new Date(t).toISOString().slice(0,10);
export const download=(name:string,text:string)=>{const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
export const pricesFor=(a:Atlas,id:string,demo:(i:Instrument)=>PriceBar[])=>{const p=a.prices.filter(x=>x.instrumentId===id);return p.length?p.sort((x,y)=>x.date.localeCompare(y.date)):demo(a.instruments.find(i=>i.id===id)!)};

function ensureTSM(a:Atlas):Atlas{const additions:Instrument[]=[{id:'TSM',name:'台积电 ADR',market:'美股',sector:'半导体',timezone:'America/New_York',currency:'USD',start:'1997-01-01'},{id:'SPY',name:'标普500 ETF（非SPX指数）',market:'美股',sector:'综合',timezone:'America/New_York',currency:'USD',start:'1995-01-01'}];const missing=additions.filter(i=>!a.instruments.some(x=>x.id===i.id));return missing.length?{...a,instruments:[...a.instruments,...missing]}:a}
