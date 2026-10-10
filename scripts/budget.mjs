import { readdir,readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
let raw=0,gz=0;async function walk(path){for(const e of await readdir(path,{withFileTypes:true})){const p=path+'/'+e.name;if(e.isDirectory())await walk(p);else{const data=await readFile(p);raw+=data.length;gz+=gzipSync(data).length;}}}await walk('dist');console.log(JSON.stringify({rawMB:+(raw/1e6).toFixed(3),gzipMB:+(gz/1e6).toFixed(3),budgetMB:12},null,2));if(gz>12e6)process.exitCode=1;
