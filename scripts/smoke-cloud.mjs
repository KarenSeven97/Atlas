// Opt-in integration check for this Atlas deployment. Never prints credentials.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fresh} from '../src/model.ts';
const {url:origin,password}=JSON.parse(await fs.readFile(new URL('../../atlas-access.txt',import.meta.url),'utf8'));
const base='https://kcwyrkewzjkydnyctnkc.supabase.co/functions/v1/atlas-gateway';
async function call(path,method='GET',data,cookie=''){
 const r=await fetch(base+'/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(45000)});
 return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
for(const path of ['workspace','connections','analyze'])assert.equal((await call(path)).status,401,'protected '+path);
const session=await call('session');assert.equal(session.status,200,JSON.stringify(session.body));assert.equal(session.body.authenticated,false);
assert.equal((await call('login','POST',{password:'invalid-test-password'})).status,401);
const login=await call('login','POST',{password});assert.equal(login.status,200,login.body.error);let cookie=login.cookie;
const workspace=await call('workspace','GET',undefined,cookie);assert.equal(workspace.status,200);
const data=workspace.body.data||fresh();
let saved=await call('workspace','PUT',{revision:workspace.body.revision,data},cookie);assert.equal(saved.status,200,saved.body.error);
assert.equal((await call('workspace','PUT',{revision:workspace.body.revision,data},cookie)).status,409);
const read=await call('workspace','GET',undefined,cookie);assert.equal(read.body.revision,saved.body.revision);assert.deepEqual(read.body.data,data);
let connectionId;
try{
 const c=await call('connections','POST',{name:'Atlas integration check',provider:'deepseek',model:'deepseek-chat',key:'synthetic-integration-test-not-an-api-key'},cookie);assert.equal(c.status,200,c.body.error);connectionId=c.body.id;
 assert.equal(c.body.configured,true);assert.equal('key' in c.body,false);assert.equal('encrypted_key' in c.body,false);
 const list=await call('connections','GET',undefined,cookie);assert.equal(list.status,200);assert.ok(list.body.some(x=>x.id===connectionId));assert.ok(!JSON.stringify(list.body).includes('synthetic-integration'));
}finally{if(connectionId)assert.equal((await call('connections/'+connectionId,'DELETE',undefined,cookie)).status,200)}
// Rotate to the same password to test revocation without changing the delivered credential.
const changed=await call('password','POST',{oldPassword:password,newPassword:password},cookie);assert.equal(changed.status,200,changed.body.error);
assert.equal((await call('workspace','GET',undefined,cookie)).status,401);
const again=await call('login','POST',{password});assert.equal(again.status,200);cookie=again.cookie;
assert.equal((await call('logout','POST',{},cookie)).status,200);
assert.equal((await call('workspace','GET',undefined,cookie)).status,401);
console.log('Cloud integration passed: auth, save/read, conflict, encrypted connection CRUD, password rotation, session revocation. No real AI request sent.');
