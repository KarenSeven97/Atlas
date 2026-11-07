import {accessControl} from './access.mjs';
import {autoComplete,alpacaBars} from './services.mjs';
// Public collaborative workspace, explicitly enabled by the project owner.
// Public AI and market routes use server secrets only; no credential read/write routes.
const origin='https://karenseven97.github.io';
const url=Deno.env.get('SUPABASE_URL');
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
Deno.serve(async request=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, PUT, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Vary':'Origin'};
 const send=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(request.headers.get('origin')&&request.headers.get('origin')!==origin)return send(403,{error:'不允许的网页来源'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const endpoint=new URL(request.url).pathname.split('/').pop();
 try{
  const h={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'};
  const db=async(path:string,method='GET',body?:unknown)=>{const r=await fetch(url+'/rest/v1/'+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});if(!r.ok)throw Error('认证服务暂不可用');return r.status===204?null:r.json()};
  const auth=await accessControl(request,endpoint,db);if(auth.response)return send(auth.response.status,auth.response.body);
  const env=(name:string)=>Deno.env.get(name);
  const rpc=async(bucket:string,max:number)=>{const r=await fetch(url+'/rest/v1/rpc/atlas_rate_limit',{method:'POST',headers:h,body:JSON.stringify({p_bucket:bucket})});if(!r.ok)throw Error('限流服务不可用');if(await r.json()>max)throw Error('调用次数已达限制，请稍后重试')};
  if(request.method==='GET'&&endpoint==='connections')return send(200,env('DEEPSEEK_API_KEY')?[{id:'auto',name:'DeepSeek',provider:'deepseek',model:'云端自动选择',enabled:true,configured:true}]:[]);
  if(request.method==='GET'&&endpoint==='status')return send(200,{deepseek:!!env('DEEPSEEK_API_KEY'),alpaca:!!env('ALPACA_API_KEY')&&!!env('ALPACA_SECRET_KEY')});
  if(request.method==='GET'&&endpoint==='market'){await rpc('market:'+Math.floor(Date.now()/60000),60);const q=new URL(request.url).searchParams;return send(200,await alpacaBars(env,q.get('symbol')||'',q.get('from')||'',q.get('to')||''))}
  if(request.method==='POST'&&['analyze','test'].includes(endpoint||'')){
   if(request.headers.get('origin')!==origin)return send(403,{error:'请通过 Atlas 网页调用'});
   await rpc('ai:day:'+Math.floor(Date.now()/86400000),200);
   const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'shared';const ipHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))).map(n=>n.toString(16).padStart(2,'0')).join('');await rpc('ai:'+ipHash+':'+Math.floor(Date.now()/900000),15);
   const raw=await request.text();if(raw.length>180000)return send(413,{error:'分析材料过长'});const b=JSON.parse(raw);if(String(b.prompt||'').length>12000)return send(400,{error:'问题过长'});
   return send(200,await autoComplete(env,endpoint==='test'?'连接测试':String(b.context||''),endpoint==='test'?'只回复：连接成功':String(b.prompt||'分析事件'),{}));
  }
  if(endpoint!=='workspace')return send(404,{error:'公开版不提供此接口'});
  if(request.method==='GET'){
   const r=await fetch(url+'/rest/v1/atlas_workspace?id=eq.default&select=data,revision',{headers:h});
   if(!r.ok)throw Error();return send(200,(await r.json())[0]);
  }
  if(request.method!=='PUT')return send(405,{error:'请求方式无效'});
  if(request.headers.get('origin')!==origin)return send(403,{error:'请通过 Atlas 网页保存'});
  if(!request.headers.get('content-type')?.startsWith('application/json'))return send(415,{error:'需要 JSON'});
  let size=0;const parts:Uint8Array[]=[];const reader=request.body?.getReader();
  if(reader)for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>16000000){await reader.cancel();return send(413,{error:'资料超过 16 MB 上限'})}parts.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length}
  const b=JSON.parse(new TextDecoder().decode(bytes));
  if(!Number.isSafeInteger(b.revision)||b.revision<0||b.data?.version!==2||!['events','news','relations','instruments','prices','watchlist','analyses','views'].every(k=>Array.isArray(b.data[k])))return send(400,{error:'资料格式无效'});
  const r=await fetch(url+'/rest/v1/atlas_workspace?id=eq.default&revision=eq.'+b.revision,{method:'PATCH',headers:h,body:JSON.stringify({data:b.data,revision:b.revision+1,updated_at:new Date().toISOString()})});
  if(!r.ok)throw Error();const rows=await r.json();
  return rows.length?send(200,{revision:rows[0].revision}):send(409,{error:'云端已有更新，请导出备份后重新载入合并'});
 }catch(e){const message=String((e as Error).message);return send(502,{error:/^(Gemini|gemini|deepseek|Alpaca|缺少|行情|调用次数|限流)/.test(message)?message:'云端服务暂不可用，请稍后重试'})}
});
