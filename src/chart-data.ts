import type {PriceBar} from './data';
export const chartColors=['#55d5b6','#779dff','#ebbc72','#d390ed','#ff8b98','#64c8ee','#b3c768','#dc91b9'];
export const chartColor=(index:number)=>chartColors[index%chartColors.length];
function cleanBars(bars:PriceBar[]){return [...new Map(bars.filter(p=>Number.isFinite(p.close)&&p.close>0).map(p=>[p.date,p])).values()].sort((a,b)=>a.date.localeCompare(b.date))}
export function normalizedWindow(data:Record<string,PriceBar[]>,assets:string[],range:{from:string;to:string},fixedBaseDate?:string){
 const all=assets.map(id=>cleanBars(data[id]||[]));
 const lists=all.map(list=>list.filter(p=>p.date>=range.from&&p.date<=range.to));
 const available=lists.filter(list=>list.length);
 const sets=available.slice(1).map(list=>new Set(list.map(p=>p.date)));
 const baseDate=fixedBaseDate||available[0]?.find(p=>sets.every(s=>s.has(p.date)))?.date||'';
 const bases=all.map(list=>list.find(p=>p.date===baseDate));
 return {baseDate,missingBase:assets.filter((_,i)=>lists[i].length&&!bases[i]),series:lists.map((list,i)=>{const base=bases[i];return base?list.filter(p=>!!fixedBaseDate||p.date>=baseDate).map(p=>({time:p.date,value:p.close/base.close*100})):[]})};
}
export function quoteAt(data:Record<string,PriceBar[]>,id:string,day:string,baseDate:string){
 const bars=data[id]||[],bar=bars.find(p=>p.date===day&&Number.isFinite(p.close)&&p.close>0),base=bars.find(p=>p.date===baseDate&&Number.isFinite(p.close)&&p.close>0);
 return {close:bar?.close??null,index:bar&&base?bar.close/base.close*100:null};
}
export function timelineCountries(events:{countries:string[]}[]){return ['中国','全球','美国',...[...new Set(events.flatMap(e=>e.countries))].filter(c=>!['中国','全球','美国'].includes(c)).sort()]}

export function calendarAnchor(range:{from:string;to:string}){const days=[];for(let t=Date.parse(range.from);t<=Date.parse(range.to);t+=86400000)days.push({time:new Date(t).toISOString().slice(0,10),value:0});return days}
