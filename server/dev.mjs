import {spawn} from 'node:child_process';
const npm=process.platform==='win32'?'npm.cmd':'npm';
const api=spawn(process.execPath,['server/index.mjs'],{stdio:'inherit'});
const web=spawn(npm,['run','dev:web'],{stdio:'inherit',shell:process.platform==='win32'});
function stop(){api.kill();web.kill();process.exit()}
process.on('SIGINT',stop);process.on('SIGTERM',stop);api.on('exit',stop);web.on('exit',stop);
