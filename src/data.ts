import {eventDescriptions} from './descriptions';
export type EventRecord={id:string;title:string;date:string;published:string;effective:string;region:string;category:string;importance:number;impact:string;summary:string;hypothesis:string;uncertainty:string;assets:string[];tags:string[];newsIds:string[];notes:string};
export type NewsArticle={id:string;title:string;url:string;source:string;published:string;verified:boolean};
export type Instrument={currency?:string;exchange?:string;id:string;name:string;market:string;sector:string;timezone:string;start:string};
export type PriceBar={instrumentId:string;date:string;close:number;source:string;datasetId:string};
export type EventRelation={id:string;from:string;to:string;type:string};
export type State={version:1;events:EventRecord[];news:NewsArticle[];relations:EventRelation[];instruments:Instrument[];prices:PriceBar[];watchlist:string[];eventImpacts:EventImpact[];macroIndicators:MacroIndicator[];userNotes:UserNote[];customDatasets:CustomDataset[]};
export const instruments:Instrument[]=[['SPX','标普500','美股','综合','1995'],['NDX','纳斯达克100','美股','科技','1995'],['QQQ','纳指100 ETF','美股','科技','1999'],['SOX','费城半导体','美股','半导体','1995'],['SOXX','半导体 ETF','美股','半导体','2001'],['SSE','上证指数','A股','综合','1995'],['CSI300','沪深300','A股','综合','2005'],['CHINEXT','创业板指','A股','科技','2010'],['NVDA','英伟达','美股','半导体','1999'],['AMD','超威半导体','美股','半导体','1995'],['AAPL','苹果','美股','科技','1995'],['GOOGL','谷歌','美股','科技','2004'],['0700.HK','腾讯','港股','科技','2004'],['300750','宁德时代','A股','新能源','2018']].map(([id,name,market,sector,y])=>({id,name,market,sector,timezone:market==='美股'?'America/New_York':market==='港股'?'Asia/Hong_Kong':'Asia/Shanghai',start:y+'-01-01'}));
const seeds=[['1997-07-02','亚洲金融危机：泰铢浮动','全球','金融危机'],['2000-03-10','互联网泡沫 · 01 纳指阶段高点','科技与产业','科技周期'],['2000-04-14','互联网泡沫 · 02 科技股快速调整','科技与产业','科技周期'],['2001-03-09','互联网泡沫 · 03 盈利预期重估','科技与产业','科技周期'],['2001-09-11','9·11 恐怖袭击','美国','地缘政治'],['2002-10-09','互联网泡沫 · 04 纳指阶段低点','科技与产业','科技周期'],['2003-03-12','互联网泡沫 · 05 复苏观察窗口','科技与产业','科技周期'],['2008-09-15','雷曼破产与全球金融危机','全球','金融危机'],['2015-06-12','中国 A 股大幅调整','中国','金融危机'],['2018-03-22','中美贸易摩擦升级','中美关系','贸易政策'],['2020-03-11','新冠疫情全球大流行','全球','公共卫生'],['2022-03-16','美联储加息周期启动','美国','货币政策'],['2023-05-24','生成式 AI · 算力需求重估','科技与产业','科技周期']];
export function seed():State{return {version:1,events:seeds.map(([date,title,region,category],i)=>({id:'event-'+i,title,date,published:'',effective:'',region,category,importance:5,impact:i===12?'正向':'负向',summary:eventDescriptions[i],hypothesis:i===12?'算力投资预期可能改变半导体行业盈利估值。':'流动性、风险偏好与盈利预期可能共同影响相关市场。',uncertainty:'待补来源；首次公开时间与生效时间尚未核实。存在同期事件、政策与估值等混杂因素。',assets:region==='中国'?['SSE','CSI300']:i===12?['NVDA','SOX','NDX']:['SPX','NDX'],tags:[category],newsIds:[],notes:''})),news:[],relations:[{id:'r1',from:'event-1',to:'event-2',type:'同一主题'},{id:'r2',from:'event-2',to:'event-5',type:'阶段演变'}],instruments,prices:[],watchlist:['SPX','NDX','SSE'],eventImpacts:[],macroIndicators:[],userNotes:[],customDatasets:[]};}
export function demoPrices(asset:Instrument):PriceBar[]{let price=100;const out:PriceBar[]=[];let n=0;for(let t=Date.parse(asset.start);t<=Date.parse('2026-11-06');t+=86400000){const d=new Date(t);if([0,6].includes(d.getUTCDay()))continue;n++;const a=asset.id.split('').reduce((s,c)=>s+c.charCodeAt(0),0);price*=1+0.00013+0.008*Math.sin(n*1.79+a)+0.003*Math.cos(n*.033+a);out.push({instrumentId:asset.id,date:d.toISOString().slice(0,10),close:price,source:'合成 Demo：仅工作日，未剔除交易所节假日',datasetId:'demo'});}return out;}
export const KEY='market-atlas:v1';
export function load():State{const raw=localStorage.getItem(KEY);if(!raw)return seed();try{const s=JSON.parse(raw);validate(s);return s;}catch(error){localStorage.setItem(KEY+':recovery',raw);throw error;}}
export function validDate(d:unknown):d is string{return typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;}
export function validate(s:State){
if(!s||s.version!==1)throw Error('不支持的备份版本');
for(const k of ['events','news','relations','instruments','prices','watchlist','eventImpacts','macroIndicators','userNotes','customDatasets'] as const)if(!Array.isArray(s[k]))throw Error('缺少数据集合 '+k);
const unique=(ids:string[])=>new Set(ids).size===ids.length;
for(const key of ['events','news','relations','instruments','customDatasets'] as const)if(!unique(s[key].map(x=>x.id)))throw Error('重复 ID：'+key);
for(const i of s.instruments){if(!i.id||!i.name||!validDate(i.start))throw Error('资产结构无效');try{new Intl.DateTimeFormat('en',{timeZone:i.timezone})}catch{throw Error('市场时区无效')}}
for(const e of s.events){if(!e.id||typeof e.title!=='string'||!e.title.trim()||!validDate(e.date)||e.date<'1995-01-01'||e.date>'2026-12-31'||!Array.isArray(e.assets)||!Array.isArray(e.newsIds)||!Array.isArray(e.tags)||!Number.isInteger(e.importance)||e.importance<1||e.importance>5)throw Error('事件结构或日期无效');for(const key of ['published','effective','region','category','impact','summary','hypothesis','uncertainty','notes'] as const)if(typeof e[key]!=='string')throw Error('缺少事件字段 '+key);for(const t of [e.published,e.effective])if(t&&!validDate(t)&&(!/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(t)||Number.isNaN(Date.parse(t))))throw Error('时间戳必须有效且带时区');if(e.assets.some(id=>!s.instruments.some(i=>i.id===id))||e.newsIds.some(id=>!s.news.some(n=>n.id===id)))throw Error('事件引用了不存在的资产或新闻');}
for(const n of s.news)if(!n.id||typeof n.title!=='string'||typeof n.source!=='string'||typeof n.url!=='string'||!/^https?:\/\//.test(n.url))throw Error('新闻结构无效');
for(const r of s.relations)if(!r.id||r.from===r.to||!s.events.some(e=>e.id===r.from)||!s.events.some(e=>e.id===r.to)||typeof r.type!=='string')throw Error('事件关系无效');
for(const p of s.prices)if(!s.instruments.some(i=>i.id===p.instrumentId)||!validDate(p.date)||!Number.isFinite(p.close)||p.close<=0)throw Error('行情结构无效');
if(!unique(s.prices.map(p=>p.instrumentId+p.date))||!unique(s.watchlist)||s.watchlist.some(id=>!s.instruments.some(i=>i.id===id)))throw Error('重复行情或无效自选');
}
export function bars(s:State,id:string){const custom=s.prices.filter(p=>p.instrumentId===id);return custom.length?custom.sort((a,b)=>a.date.localeCompare(b.date)):demoPrices(s.instruments.find(i=>i.id===id)!);}
export interface MarketDataAdapter{getBars(instrumentId:string):Promise<PriceBar[]>}
export class LocalDataAdapter implements MarketDataAdapter{constructor(private state:State){}async getBars(id:string){return bars(this.state,id);}}
// Optional server adapter: the server owns credentials, source licensing and authentication.
export class ServerDataAdapter implements MarketDataAdapter{constructor(private endpoint:string){}async getBars(id:string){const r=await fetch(`${this.endpoint}/prices?instrument=${encodeURIComponent(id)}`);if(!r.ok)throw Error('行情服务不可用');return r.json();}}

export type EventImpact={eventId:string;instrumentId:string;benchmarkId:string;window:number;alignedDate:string|null;assetReturn:number|null;abnormalReturn:number|null;methodVersion:string};
export type MacroIndicator={id:string;name:string;date:string;value:number;unit:string;source:string};
export type UserNote={id:string;eventId:string;body:string;updatedAt:string};
export type CustomDataset={id:string;name:string;source:string};


