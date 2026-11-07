import {passwordHash,random,digest,equal,cryptKey,encrypt,decrypt,COOKIE,sessionCookie} from './security.mjs';
import {complete} from './providers.mjs';
class HttpError extends Error {constructor(status,message){super(message);this.status=status}}
const fail=(status,message)=>{throw new HttpError(status,message)};
const metadata=c=>({id:c.id,name:c.name,provider:c.provider,model:c.model,enabled:c.enabled,configured:!!c.encrypted_key});
export function restStore(url,secret) {
 return async (path,method='GET',body) => {
  const res=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
  if(!res.ok){const detail=await res.json().catch(()=>({}));throw new Error('Atlas database HTTP '+res.status+' ('+String(detail.code||'unknown')+')')}
  return res.status===204?null:res.json();
 };
}
export function createGateway({db,secret,providerComplete=complete}) {
 const encryptionKey=cryptKey(secret);
 return async request => {
  const send=(status,data,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
  try {
   const path=new URL(request.url).pathname.replace(/^\/(?:functions\/v1\/)?atlas-gateway(?=\/|$)/,'').replace(/^\/api(?=\/|$)/,'')||'/';
   const access=(await db('atlas_access?id=eq.atlas&select=*'))[0];
   if(!access)fail(503,'访问密码尚未初始化');
   const origin=request.headers.get('Origin');
   if(origin&&origin!==access.allowed_origin)fail(403,'不允许的网页来源');
   if(!['GET','HEAD'].includes(request.method)&&origin!==access.allowed_origin)fail(403,'请通过 Atlas 网页操作');
   if(request.method==='OPTIONS')return send(403,{error:'请通过 Atlas 网页访问'});
   const token=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
   const tokenHash=token&&/^[a-f0-9]{64}$/.test(token)?await digest(token):'';
   const session=tokenHash?(await db('atlas_sessions?token_hash=eq.'+tokenHash+'&select=*'))[0]:null;
   const authenticated=!!session&&session.auth_version===access.auth_version&&Date.parse(session.expires_at)>Date.now();
   if(request.method==='GET'&&path==='/session')return send(200,{cloud:true,authenticated});
   if(!authenticated&&path!=='/login')fail(401,'请先输入访问密码');
   const limit=async (bucket,max) => {const n=await db('rpc/atlas_rate_limit','POST',{p_bucket:bucket});if(n>max)fail(429,'请求过于频繁，请稍后再试')};
   let b={};
   if(!['GET','HEAD','DELETE'].includes(request.method)) {
    if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'请使用 JSON 请求');
    if(Number(request.headers.get('content-length')||0)>16000000)fail(413,'资料过大，请分批导入');
    const reader=request.body?.getReader();let length=0;const parts=[];
    if(reader){for(;;){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>16000000){await reader.cancel();fail(413,'资料过大，请分批导入')}parts.push(value)}}
    const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.byteLength}
    try{b=JSON.parse(new TextDecoder().decode(bytes)||'{}')}catch{fail(400,'JSON 格式无效')}
    if(!b||typeof b!=='object'||Array.isArray(b))fail(400,'请求格式无效');
   }
   if(path==='/login'&&request.method==='POST') {
    const window=Math.floor(Date.now()/900000);
    await limit('login:global:'+window,100);
    const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';
    await limit('login:'+await digest(ip)+':'+window,15);
    if(typeof b.password!=='string'||b.password.length>512)fail(400,'密码格式无效');
    if(!equal(await passwordHash(b.password,access.salt,access.iterations),access.password_hash))fail(401,'密码不正确');
    const next=random();
    await db('atlas_sessions?expires_at=lt.'+encodeURIComponent(new Date().toISOString()),'DELETE');
    await db('atlas_sessions','POST',{token_hash:await digest(next),auth_version:access.auth_version,expires_at:new Date(Date.now()+604800000).toISOString()});
    return send(200,{ok:true},{'Set-Cookie':sessionCookie(next)});
   }
   if(!authenticated)fail(401,'请先输入访问密码');
   if(path==='/logout'&&request.method==='POST') {
    await db('atlas_sessions?token_hash=eq.'+tokenHash,'DELETE');return send(200,{ok:true},{'Set-Cookie':sessionCookie('')});
   }
   if(path==='/password'&&request.method==='POST') {
    await limit('password:'+Math.floor(Date.now()/900000),10);
    if(typeof b.oldPassword!=='string'||b.oldPassword.length>512||typeof b.newPassword!=='string'||b.newPassword.length<12||b.newPassword.length>128)fail(400,'新密码需要 12–128 个字符');
    if(!equal(await passwordHash(b.oldPassword,access.salt,access.iterations),access.password_hash))fail(400,'当前密码不正确');
    const salt=random(16),hash=await passwordHash(b.newPassword,salt);
    const version=access.auth_version+1;
    const changed=await db('atlas_access?id=eq.atlas&auth_version=eq.'+access.auth_version,'PATCH',{password_hash:hash,salt,iterations:210000,auth_version:version,updated_at:new Date().toISOString()});
    if(!changed.length)fail(409,'密码已被其他会话修改，请重新登录');
    // The atomic version change revokes sessions immediately. Physical cleanup is optional.
    try{await db('atlas_sessions?auth_version=lt.'+version,'DELETE')}catch(e){console.error('Atlas session cleanup deferred',e.name,e.message)}
    return send(200,{ok:true},{'Set-Cookie':sessionCookie('')});
   }
   if(path==='/workspace'&&request.method==='GET') {const row=(await db('atlas_workspace?id=eq.default&select=data,revision'))[0];return send(200,row)}
   if(path==='/workspace'&&request.method==='PUT') {
    const d=b.data;
    if(!Number.isSafeInteger(b.revision)||b.revision<0||d?.version!==2||!['events','news','relations','instruments','prices','watchlist','analyses','views'].every(k=>Array.isArray(d[k])))fail(400,'研究资料格式无效');
    const rows=await db('atlas_workspace?id=eq.default&revision=eq.'+b.revision,'PATCH',{data:d,revision:b.revision+1,updated_at:new Date().toISOString()});
    if(!rows.length)fail(409,'云端已有更新。请先导出当前备份，再重新载入合并；未覆盖云端资料。');
    return send(200,{revision:rows[0].revision});
   }
   if(path==='/connections'&&request.method==='GET')return send(200,(await db('atlas_connections?select=*')).map(metadata));
   if(path==='/connections'&&request.method==='POST') {
    if(!['deepseek','gemini'].includes(b.provider)||typeof b.name!=='string'||!b.name.trim()||typeof b.model!=='string'||!b.model.trim()||b.model.length>100||!/^[a-zA-Z0-9._/-]+$/.test(b.model))fail(400,'请填写有效名称、服务和模型');
    if(b.id&&!/^[a-f0-9-]{36}$/.test(b.id))fail(400,'连接 ID 无效');
    const previous=b.id?(await db('atlas_connections?id=eq.'+b.id+'&select=*'))[0]:null;
    if(b.id&&!previous)fail(404,'连接已删除，请重新添加');
    if(b.key!==undefined&&typeof b.key!=='string')fail(400,'密钥格式无效');
    if(!b.key&&!previous)fail(400,'请输入 API Key');
    if(b.key?.length>1000)fail(400,'密钥过长');
    if(previous&&!b.key&&previous.provider!==b.provider)fail(400,'更换提供商需要重新填写密钥');
    const c={id:previous?.id||crypto.randomUUID(),name:b.name.trim().slice(0,80),provider:b.provider,model:b.model.trim(),enabled:b.enabled!==false,encrypted_key:b.key?await encrypt(b.key,await encryptionKey):previous.encrypted_key,updated_at:new Date().toISOString()};
    if(previous)await db('atlas_connections?id=eq.'+c.id,'PATCH',c);else await db('atlas_connections','POST',c);
    return send(200,metadata(c));
   }
   if(/^\/connections\/[a-f0-9-]{36}$/.test(path)&&request.method==='DELETE') {await db('atlas_connections?id=eq.'+path.split('/').pop(),'DELETE');return send(200,{ok:true})}
   if(['/analyze','/test'].includes(path)&&request.method==='POST') {
    await limit('ai:'+Math.floor(Date.now()/60000),20);
    if(!/^[a-f0-9-]{36}$/.test(b.connectionId||''))fail(400,'请选择已启用连接');
    const c=(await db('atlas_connections?id=eq.'+b.connectionId+'&enabled=eq.true&select=*'))[0];if(!c)fail(400,'请选择已启用连接');
    if(String(b.context||'').length>160000||String(b.prompt||'').length>12000)fail(400,'分析材料过长，请缩小范围');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),90000);
    try {const text=await providerComplete({...c,key:await decrypt(c.encrypted_key,await encryptionKey)},path==='/test'?'连接测试':String(b.context||''),path==='/test'?'只回复：连接成功':String(b.prompt||'分析事件'),controller.signal);return send(200,{text,provider:c.provider,model:c.model})}
    finally{clearTimeout(timer)}
   }
   fail(404,'接口不存在');
  }catch(e){if(!e.status)console.error('Atlas gateway failure',e.name,e.message);return send(e.status||500,{error:e.status?e.message:e.name==='AbortError'?'请求超时，请重试':e.message?.startsWith('提供商')?e.message:'云端服务暂不可用，请稍后重试'})}
 };
}
