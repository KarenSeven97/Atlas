import {passwordHash,random,digest,equal} from './security.mjs';
// Passwords and raw session tokens are never persisted client-side by this app.
export async function accessControl(request,endpoint,db){
 const response=(status,body)=>({response:{status,body}});
 const access=(await db('atlas_access?id=eq.atlas&select=*'))[0];
 if(!access)return response(503,{error:'访问密码尚未初始化'});
 const raw=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
 const hash=raw?await digest(raw):'';
 const session=hash?(await db('atlas_sessions?token_hash=eq.'+hash+'&select=*'))[0]:null;
 const authenticated=!!session&&session.auth_version===access.auth_version&&Date.parse(session.expires_at)>Date.now();
 if(endpoint==='session'&&request.method==='GET')return response(200,{authenticated});
 if(endpoint==='login'&&request.method==='POST'){
  const bucket='login:atlas:'+Math.floor(Date.now()/900000);
  const n=await db('rpc/atlas_rate_limit','POST',{p_bucket:bucket});if(n>60)return response(429,{error:'登录尝试过多，请稍后再试'});
  const reader=request.body?.getReader();let text='';if(reader){const decode=new TextDecoder();for(;;){const {value,done}=await reader.read();if(done)break;text+=decode.decode(value,{stream:true});if(text.length>4096){await reader.cancel();return response(413,{error:'请求过大'})}}}
  let b;try{b=JSON.parse(text)}catch{return response(400,{error:'请求格式错误'})}
  if(typeof b.password!=='string'||b.password.length>512)return response(400,{error:'密码格式错误'});
  if(!equal(await passwordHash(b.password,access.salt,access.iterations),access.password_hash))return response(401,{error:'密码不正确'});
  const token=random();await db('atlas_sessions','POST',{token_hash:await digest(token),auth_version:access.auth_version,expires_at:new Date(Date.now()+7200000).toISOString()});
  return response(200,{sessionToken:token});
 }
 if(!authenticated)return response(401,{error:'请输入访问密码'});
 if(endpoint==='logout'&&request.method==='POST'){await db('atlas_sessions?token_hash=eq.'+hash,'DELETE');return response(200,{ok:true})}
 if(endpoint==='password'&&request.method==='POST'){
  const b=await request.json();if(typeof b.oldPassword!=='string'||b.oldPassword.length>512||typeof b.newPassword!=='string'||b.newPassword.length<12||b.newPassword.length>128)return response(400,{error:'新密码需要 12–128 个字符'});
  if(!equal(await passwordHash(b.oldPassword,access.salt,access.iterations),access.password_hash))return response(400,{error:'当前密码不正确'});
  const salt=random(16),version=access.auth_version+1;
  const changed=await db('atlas_access?id=eq.atlas&auth_version=eq.'+access.auth_version,'PATCH',{password_hash:await passwordHash(b.newPassword,salt),salt,iterations:210000,auth_version:version,updated_at:new Date().toISOString()});
  if(!changed.length)return response(409,{error:'密码已更新，请重新登录'});
  return response(200,{ok:true});
 }
 return {authenticated:true};
}
