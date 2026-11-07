import {complete} from './providers.mjs';
const error=(message)=>{throw Error(message)};
const modelCache=new Map();
export async function geminiModel(env,fetcher=fetch){
 if(env('GEMINI_MODEL'))return env('GEMINI_MODEL');
 if(modelCache.has('gemini'))return modelCache.get('gemini');
 const r=await fetcher('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000',{headers:{'x-goog-api-key':env('GEMINI_API_KEY')},signal:AbortSignal.timeout(12000)});
 if(!r.ok)error('Gemini 模型列表 HTTP '+r.status);
 const d=await r.json();const models=(d.models||[]).filter(m=>m.supportedGenerationMethods?.includes('generateContent')&&/gemini.*flash/i.test(m.name)&&!/(image|audio|tts|live|robotics|computer)/i.test(m.name)).sort((a,b)=>b.name.localeCompare(a.name,undefined,{numeric:true}));
 const name=models[0]?.name?.replace(/^models\//,'');if(!name)error('Gemini 没有可用文本模型');modelCache.set('gemini',name);return name;
}
export async function autoComplete(env,context,prompt,{runner=complete,discover=geminiModel,only}={}){
 const attempts=[];
 for(const provider of only?[only]:['gemini','deepseek']){
  const key=env(provider==='gemini'?'GEMINI_API_KEY':'DEEPSEEK_API_KEY');if(!key){attempts.push({provider,error:'未配置密钥'});continue}
  try{const model=provider==='gemini'?await discover(env):env('DEEPSEEK_MODEL')||'deepseek-chat';const text=await runner({provider,model,key},context,prompt,AbortSignal.timeout(40000));return {text,provider,model,fallback:provider==='deepseek'&&!only,attempts}}
  catch(e){attempts.push({provider,error:e.name==='TimeoutError'||e.name==='AbortError'?'请求超时':String(e.message).startsWith('提供商')||String(e.message).startsWith('Gemini')?e.message:'服务调用失败'})}
 }
 error(attempts.map(a=>a.provider+'：'+a.error).join('；'));
}
export async function alpacaBars(env,symbol,from,to,fetcher=fetch){
 if(!/^[A-Z][A-Z0-9.-]{0,14}$/.test(symbol)||['SPX','NDX','SOX','SSE','CSI300','CHINEXT'].includes(symbol))error('Alpaca 支持美股个股和 ETF，不提供这些指数或 A 股');
 const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
 if(!valid(from)||!valid(to)||from>to)error('行情日期无效');
 const key=env('ALPACA_API_KEY'),secret=env('ALPACA_SECRET_KEY');if(!key||!secret)error('缺少 ALPACA_API_KEY 或 ALPACA_SECRET_KEY');
 const start=from<'2016-01-01'?'2016-01-01':from;
 if(to<start)return {bars:[],source:'Alpaca IEX · 拆股复权',requestedFrom:from,requestedTo:to,warning:'Alpaca 历史行情起点按 2016 年处理；此区间无数据'};
 const rows=[];let token='',pages=0;
 do{const u=new URL('https://data.alpaca.markets/v2/stocks/'+encodeURIComponent(symbol)+'/bars');u.search=new URLSearchParams({timeframe:'1Day',start:start+'T00:00:00Z',end:new Date(Math.min(Date.parse(to)+86400000-1,Date.now()-20*60000)).toISOString(),feed:'iex',adjustment:'split',sort:'asc',limit:'10000',...(token?{page_token:token}:{})}).toString();
  const r=await fetcher(u,{headers:{'APCA-API-KEY-ID':key,'APCA-API-SECRET-KEY':secret},signal:AbortSignal.timeout(20000)});if(!r.ok)error('Alpaca HTTP '+r.status+(r.status===403?'：账户无此行情权限':r.status===401?'：密钥验证失败':''));
  const d=await r.json();rows.push(...(d.bars||[]));token=d.next_page_token||'';if(++pages>=8&&token)error('行情分页过多，请缩小日期范围');
 }while(token);
 const date=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
 const map=new Map();for(const b of rows){const day=date(b.t);if(b.c>0&&day>=from&&day<=to)map.set(day,{instrumentId:symbol,date:day,close:b.c,source:'Alpaca IEX · 单一交易所 · 拆股复权（不含分红）',datasetId:'alpaca-iex-split'})}
 const bars=[...map.values()].sort((a,b)=>a.date.localeCompare(b.date));return {bars,source:'Alpaca IEX · 单一交易所 · 拆股复权',requestedFrom:from,requestedTo:to,firstDate:bars[0]?.date,lastDate:bars.at(-1)?.date,warning:!bars.length?'所选区间无行情，未用 Demo 补齐':from<start?'2016 年之前未覆盖，缺失日期不补值':''};
}
