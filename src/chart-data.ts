import type {PriceBar} from './data';
export const chartColors=['#55d5b6','#779dff','#ebbc72','#d390ed','#ff8b98','#64c8ee','#b3c768','#dc91b9'];
export const chartColor=(index:number)=>chartColors[index%chartColors.length];
function cleanBars(bars:PriceBar[]){return [...new Map(bars.filter(p=>Number.isFinite(p.close)&&p.close>0).map(p=>[p.date,p])).values()].sort((a,b)=>a.date.localeCompare(b.date))}
export function timelineCountries(events:{countries:string[]}[]){return ['中国','全球','美国',...[...new Set(events.flatMap(e=>e.countries))].filter(c=>!['中国','全球','美国'].includes(c)).sort()]}

export function calendarAnchor(range:{from:string;to:string}){const days=[];for(let t=Date.parse(range.from);t<=Date.parse(range.to);t+=86400000)days.push({time:new Date(t).toISOString().slice(0,10),value:0});return days}

export function stockSelection(ids:string[],instruments:{id:string;name:string}[]){return [...new Set(ids)].filter(id=>{const i=instruments.find(i=>i.id===id);return i&&!['0700.HK','SPX','NDX','SOX','SSE','CSI300','CHINEXT','SPY','QQQ','SOXX'].includes(id)&&!/指数|ETF/i.test(i.name)}).slice(0,4)}
export function priceWindow(data:Record<string,PriceBar[]>,assets:string[],range:{from:string;to:string}){return assets.slice(0,4).map(id=>cleanBars(data[id]||[]).filter(p=>p.date>=range.from&&p.date<=range.to).map(p=>({time:p.date,value:p.close})))}
