import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
const result=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','-b'],{stdio:'inherit'});if(result.status)process.exit(result.status);
const build=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{stdio:'inherit',env:{...process.env,VITE_ATLAS_CLOUD:'true'}});if(build.status)process.exit(build.status);
const assets={};
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())await walk(path);else assets['/'+relative(resolve('dist'),path).replaceAll('\\','/')]=(await readFile(path)).toString('base64')}}
await walk(resolve('dist'));
const source=await readFile('cloud/site-worker.mjs','utf8');
await mkdir('dist/server',{recursive:true});
await writeFile('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+source);
await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Cloud Worker built (embedded public assets; no credentials).');
