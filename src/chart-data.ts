import type {PriceBar} from './data';
export function normalizedWindow(data:Record<string,PriceBar[]>,assets:string[],range:{from:string;to:string}){
 const lists=assets.map(id=>(data[id]||[]).filter(p=>p.date>=range.from&&p.date<=range.to&&Number.isFinite(p.close)&&p.close>0));
 const sets=lists.slice(1).map(list=>new Set(list.map(p=>p.date)));
 const baseDate=lists[0]?.find(p=>sets.every(s=>s.has(p.date)))?.date||'';
 return {baseDate,series:lists.map(list=>{const base=list.find(p=>p.date===baseDate);return base?list.filter(p=>p.date>=baseDate).map(p=>({time:p.date,value:p.close/base.close*100})):[]})};
}
export function timelineCountries(events:{countries:string[]}[]){return ['中国','全球','美国',...[...new Set(events.flatMap(e=>e.countries))].filter(c=>!['中国','全球','美国'].includes(c)).sort()]}
