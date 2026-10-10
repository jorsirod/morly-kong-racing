import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';
async function worker(){
const data=new Map<string,Map<string,Response>>(),handlers=new Map<string,(e:any)=>void>();let connected=true;
const cacheFor=(name:string)=>{if(!data.has(name))data.set(name,new Map());const map=data.get(name)!;return{async put(k:string|Request,v:Response){map.set(typeof k==='string'?k:k.url,v.clone());},async match(k:string|Request){return map.get(typeof k==='string'?k:k.url)?.clone();},async add(k:string){if(!connected)throw Error('offline');map.set(k,new Response(k));},async addAll(keys:string[]){for(const k of keys)await this.add(k);},async keys(){return [...map.keys()].map(k=>new Request('https://morly.test'+k));},async delete(k:Request){return map.delete(new URL(k.url).pathname);}};};
const caches={async open(name:string){return cacheFor(name);},async keys(){return [...data.keys()];},async delete(name:string){return data.delete(name);},async match(key:string){for(const c of data.values())if(c.has(key))return c.get(key)!.clone();}};
const fetch=async(k:string|Request)=>{if(!connected)throw Error('offline');return new Response(typeof k==='string'&&k==='/precache.json'?JSON.stringify({version:'v1',paths:['/index.html','/assets/index-shell.js','/assets/game.js','/models/hola-willy.glb']}):'network');};
const context=vm.createContext({self:{location:{origin:'https://morly.test'},clients:{async claim(){}},addEventListener:(type:string,h:any)=>handlers.set(type,h)},caches,fetch,URL,Promise,Error,Request});vm.runInContext(readFileSync('public/sw.js','utf8'),context);
const call=async(type:string,payload:any={})=>{let task:Promise<any>|undefined;handlers.get(type)!({...payload,waitUntil:(p:Promise<any>)=>task=p,respondWith:(p:Promise<any>)=>task=p});return await task;};
return{call,data,disconnect(){connected=false;},restartOffline(){// Service workers can restart without retaining their in-memory manifest.
vm.runInContext('manifest=undefined',context);connected=false;}};
}
describe('descarga offline',()=>{
it('guarda el juego completo y reinicia sin red conservando el manifiesto',async()=>{const w=await worker();await w.call('install');let ok=false;await w.call('message',{data:{type:'CACHE_OFFLINE'},ports:[{postMessage(v:any){ok=v.ok;}}]});expect(ok).toBe(true);expect(w.data.get('morly-v1')!.has('/models/hola-willy.glb')).toBe(true);w.restartOffline();await w.call('activate');const response=await w.call('fetch',{request:{url:'https://morly.test/otra-ruta',method:'GET',mode:'navigate'}});expect(await response.text()).toBe('/index.html');});
it('borra pistas y motor descargados conservando el menú básico',async()=>{const w=await worker();await w.call('install');await w.call('message',{data:{type:'CACHE_OFFLINE'},ports:[]});await w.call('message',{data:{type:'CLEAR_OFFLINE'},ports:[]});const c=w.data.get('morly-v1')!;expect(c.has('/models/hola-willy.glb')).toBe(false);expect(c.has('/assets/game.js')).toBe(false);expect(c.has('/assets/index-shell.js')).toBe(true);expect(c.has('/index.html')).toBe(true);});
});
