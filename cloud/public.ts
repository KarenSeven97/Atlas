// Public collaborative workspace, explicitly enabled by the project owner.
// No routes to credentials, sessions, Trading data, or paid AI providers.
const origin='https://karenseven97.github.io';
const url=Deno.env.get('SUPABASE_URL');
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
Deno.serve(async request=>{
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, PUT, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};
 const send=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
 if(request.headers.get('origin')&&request.headers.get('origin')!==origin)return send(403,{error:'不允许的网页来源'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!new URL(request.url).pathname.endsWith('/workspace'))return send(404,{error:'公开版不提供此接口'});
 try{
  const h={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'};
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
 }catch{return send(500,{error:'云端资料暂不可用，请稍后重试'})}
});
