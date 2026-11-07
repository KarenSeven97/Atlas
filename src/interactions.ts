import type {Atlas,EventV2} from './model';
export const DAY=86400000;
export function today(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now)}
export function eventOrder(a:EventV2,b:EventV2){return Number(!!b.pinned)-Number(!!a.pinned)||a.date.localeCompare(b.date)||a.id.localeCompare(b.id)}
export function removeEvent(a:Atlas,id:string):Atlas{return {...a,events:a.events.filter(e=>e.id!==id).map(e=>e.parentId===id?{...e,parentId:''}:e),relations:a.relations.filter(r=>r.from!==id&&r.to!==id),analyses:a.analyses.filter(r=>r.eventId!==id)}}
export function panRange(range:{from:string;to:string},position:number,end=today()){const span=Date.parse(range.to)-Date.parse(range.from),min=Date.parse('1995-01-01'),travel=Math.max(0,Date.parse(end)-min-span),start=min+travel*Math.max(0,Math.min(1000,position))/1000;return {from:new Date(start).toISOString().slice(0,10),to:new Date(start+span).toISOString().slice(0,10)}}
export function axisPercent(value:string,range:{from:string;to:string}){return (Date.parse(value)-Date.parse(range.from))/Math.max(DAY,Date.parse(range.to)-Date.parse(range.from))*100}
export const MIN_DATE='1995-01-01';
export function clampRange(range:{from:string;to:string},end=today()){
 const min=Date.parse(MIN_DATE),max=Date.parse(end);let from=Date.parse(range.from),to=Date.parse(range.to);
 if(!Number.isFinite(from)||!Number.isFinite(to))return {from:MIN_DATE,to:end};
 from=Math.round(from/DAY)*DAY;to=Math.round(to/DAY)*DAY;
 const span=Math.min(max-min,Math.max(DAY,to-from));
 from=Math.max(min,Math.min(max-span,from));
 return {from:new Date(from).toISOString().slice(0,10),to:new Date(from+span).toISOString().slice(0,10)};
}
export function monthLabel(value:string){return value.slice(0,7).replace('-','年')+'月'}
