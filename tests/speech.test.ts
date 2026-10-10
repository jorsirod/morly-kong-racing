import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import { armSpeechUnlock,forgetVoice,speakText,speechAvailable,speechStatus } from '../src/game/speech';

// A stand-in for the browser's speech engine, shaped like iPhone Safari: no voices listed until you ask, and speech only
// starts when asked from a tap.
class FakeUtterance{voice:unknown=null;lang='';pitch=1;rate=1;volume=1;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;onstart:(()=>void)|null=null;constructor(public text:string){}}
const g=globalThis as unknown as Record<string,unknown>;
let spoken:FakeUtterance[],cancels:number,voices:{name:string;lang:string}[],speaking:boolean;
const install=()=>{
 spoken=[];cancels=0;voices=[];speaking=false;forgetVoice();
 g.SpeechSynthesisUtterance=FakeUtterance;
 g.speechSynthesis={paused:false,get speaking(){return speaking;},pending:false,getVoices:()=>voices,addEventListener(){},resume(){},cancel(){cancels++;speaking=false;},
  speak(u:FakeUtterance){spoken.push(u);speaking=true;setTimeout(()=>{speaking=false;u.onstart?.();u.onend?.();},0);}};
};
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
beforeEach(install);
afterEach(()=>{delete g.speechSynthesis;delete g.SpeechSynthesisUtterance;delete g.window;});

describe('voz del navegador en celulares',()=>{
 it('sin lista de voces (iPhone) igual habla, en es-MX, y no se da por vencida',async()=>{
  expect(speechAvailable()).toBe(true);expect(speechStatus().voices).toBe(0);
  await speakText('¡Ármate uno!');
  expect(spoken).toHaveLength(1);expect(spoken[0].lang).toBe('es-MX');expect(spoken[0].voice).toBeNull();
 });
 it('prefiere el español latinoamericano sobre el de España',async()=>{
  voices=[{name:'Mónica',lang:'es-ES'},{name:'Paulina',lang:'es_MX'},{name:'Daniel',lang:'en-GB'}];
  await speakText('Hola');expect((spoken[0].voice as {name:string}).name).toBe('Paulina');expect(speechStatus().voice).toContain('Paulina');
 });
 it('no cancela cuando no hay nada hablando, y espera un poco antes de hablar si lo hay (iOS pierde la línea si no)',async()=>{
  await speakText('Uno');expect(cancels).toBe(0);
  speaking=true;const second=speakText('Dos');expect(cancels).toBe(1);expect(spoken).toHaveLength(1); // aún no: iOS necesita una pausa
  await second;expect(spoken).toHaveLength(2);expect(spoken[1].text).toBe('Dos');
 });
 it('el volumen y el tono llegan a la voz, y «!!» no se deletrea',async()=>{
  await speakText('¡Chinelazo Voltio Impact!!',{pitch:.7,rate:1.05,volume:2});
  expect(spoken[0].pitch).toBe(.7);expect(spoken[0].rate).toBe(1.05);expect(spoken[0].volume).toBe(1);expect(spoken[0].text).toBe('¡Chinelazo Voltio Impact!');
 });
 it('sin API de voz no hay error: devuelve 0 y solo quedan los subtítulos',async()=>{
  delete g.speechSynthesis;delete g.SpeechSynthesisUtterance;
  expect(speechAvailable()).toBe(false);expect(await speakText('Hola')).toBe(0);expect(speechStatus().supported).toBe(false);
 });
 it('el primer toque habla una línea en silencio para desbloquear la voz del celular',async()=>{
  const handlers=new Map<string,Set<()=>void>>();
  g.window={addEventListener:(e:string,h:()=>void)=>{(handlers.get(e)??handlers.set(e,new Set()).get(e)!).add(h);},removeEventListener:(e:string,h:()=>void)=>{handlers.get(e)?.delete(h);}};
  armSpeechUnlock();
  expect(spoken).toHaveLength(0);                       // nothing is said until the player taps
  for(const h of handlers.get('touchend')??[])h();await wait(5);
  expect(spoken).toHaveLength(1);expect(spoken[0].volume).toBe(0);expect(speechStatus().unlocked).toBe(true);
  expect([...handlers.values()].every(set=>set.size===0)).toBe(true); // and it stops listening once unlocked
 });
});
