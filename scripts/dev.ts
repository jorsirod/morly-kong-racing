import { spawn } from 'node:child_process';
const commands=[['node_modules/tsx/dist/cli.mjs','watch','server/index.ts'],['node_modules/vite/bin/vite.js','--host','0.0.0.0']];
const children=commands.map(args=>spawn(process.execPath,args,{stdio:'inherit'}));let ending=false;
function stop(){if(ending)return;ending=true;children.forEach(c=>c.kill('SIGTERM'));}
children.forEach(c=>c.on('exit',()=>stop()));process.on('SIGINT',stop);process.on('SIGTERM',stop);
