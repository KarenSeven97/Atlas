import {test} from 'node:test';
import assert from 'node:assert/strict';
import {complete} from './providers.mjs';
test('DeepSeek adapter sends authorization and parses response',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async(url,opts)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');assert.equal(opts.headers.Authorization,'Bearer test-key');assert.equal(JSON.parse(opts.body).model,'test-model');return {ok:true,json:async()=>({choices:[{message:{content:'分析结果'}}]})}};assert.equal(await complete({provider:'deepseek',model:'test-model',key:'test-key'},'研究材料','问题'),'分析结果')}finally{globalThis.fetch=old}});
test('Gemini is rejected before any request',async()=>{await assert.rejects(()=>complete({provider:'gemini'},'',''),/仅支持 DeepSeek/)});
test('Provider failures do not expose response body or credentials',async()=>{const old=globalThis.fetch;try{globalThis.fetch=async()=>({ok:false,status:401});await assert.rejects(complete({provider:'deepseek',model:'test-model',key:'secret'},'',''),/HTTP 401/)}finally{globalThis.fetch=old}});
