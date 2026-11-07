export const PUBLIC_MODE=(import.meta as ImportMeta & {env?:Record<string,string>}).env?.VITE_ATLAS_PUBLIC==='true';
const API_BASE=(import.meta as ImportMeta & {env?:Record<string,string>}).env?.VITE_ATLAS_API_BASE||'/api';
export const CLOUD=(import.meta as ImportMeta & {env?:Record<string,string>}).env?.VITE_ATLAS_CLOUD==='true';
export const SESSION_EXPIRED='atlas:session-expired';
let sessionToken='';
export function clearCloudSession(){sessionToken=''}
export async function cloudRequest(path:string,options:RequestInit={}) {
 const r=await fetch(API_BASE+'/'+path,{credentials:PUBLIC_MODE?'omit':'same-origin',signal:AbortSignal.timeout(30000),...options,headers:{'Content-Type':'application/json',...(sessionToken&&path!=='login'?{Authorization:'Bearer '+sessionToken}:{}),...options.headers}});
 const data=await r.json().catch(()=>({error:'云端服务暂不可用'}));
 if(r.status===401&&!['login','session'].includes(path)){clearCloudSession();window.dispatchEvent(new Event(SESSION_EXPIRED))}
 if(!r.ok)throw Error(data.error||'云端请求失败');if(['logout','password'].includes(path))clearCloudSession();
 return data;
}
export const cloudPost=(path:string,body:unknown)=>cloudRequest(path,{method:'POST',body:JSON.stringify(body)});
export const COOKIE_STORAGE_ERROR='登录状态验证失败，请重试。';
export async function openCloudSession(password:string,request:typeof cloudRequest=cloudRequest){
 clearCloudSession();const login=await request('login',{method:'POST',body:JSON.stringify({password})});if(typeof login.sessionToken==='string'&&/^[a-f0-9]{64}$/.test(login.sessionToken))sessionToken=login.sessionToken;
 // Validate the browser's cookie round trip before mounting data or AI requests.
 const session=await request('session',{cache:'no-store'});
 if(session.authenticated!==true)throw Error(COOKIE_STORAGE_ERROR);
}
