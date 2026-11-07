import test from 'node:test';
import assert from 'node:assert/strict';
import {openCloudSession,COOKIE_STORAGE_ERROR} from './cloud';
test('login opens only after the server confirms the browser cookie round trip',async()=>{const calls:string[]=[];await openCloudSession('test-password',async(path,options)=>{calls.push(path);if(path==='login'){assert.equal(options?.method,'POST');assert.equal(JSON.parse(options?.body as string).password,'test-password');return {ok:true}}assert.equal(options?.cache,'no-store');return {authenticated:true}});assert.deepEqual(calls,['login','session'])});
test('a successful password response without a saved cookie stays on the login page',async()=>{await assert.rejects(()=>openCloudSession('test-password',async path=>path==='login'?{ok:true}:{authenticated:false}),{message:COOKIE_STORAGE_ERROR})});
test('wrong password does not continue into session check or workspace requests',async()=>{const calls:string[]=[];await assert.rejects(()=>openCloudSession('wrong',async path=>{calls.push(path);throw Error('密码不正确')}),{message:'密码不正确'});assert.deepEqual(calls,['login'])});
