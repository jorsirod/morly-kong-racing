import { character } from '../../shared/content';
import { audioSettings, type GameAudio } from './audio';

/*
 * Voices. The nine special phrases are said exactly as written below, the instant the special
 * animation starts. Reactions (jumps, overtakes, hits, falls, wins) have variants and are rate
 * limited so they never pile up. Music ducks while anyone speaks, and every line has a subtitle.
 *
 * Audio sources, best first:
 *  1. A recording made in the in-game voice studio (stored on this device).
 *  2. A recorded file in public/voices/<pilot>/<line>.mp3 listed in public/voices/manifest.json.
 *  3. A provisional synthetic voice (the browser's speech synthesis). It is a generic system
 *     voice, not an imitation of anyone, and the subtitle marks it as PROVISIONAL.
 * No recordings ship with the game yet: public/voices/README.md lists every missing file.
 */
export type VoiceKind='special'|'jump'|'overtake'|'hit'|'hurt'|'fall'|'win';
export const VOICE_KINDS:VoiceKind[]=['special','jump','overtake','hit','hurt','fall','win'];
export const KIND_LABEL:Record<VoiceKind,string>={special:'Especial',jump:'Salto',overtake:'Rebase',hit:'Pega',hurt:'Recibe',fall:'Caída',win:'Gana'};
/** Exactly as the gang says them. Do not edit without asking them. */
export const SPECIAL_PHRASES:Record<string,string>={
 semilla:'Acompáñame a comprar bicha',
 chete:'Si yo me voy nadie juega play',
 morly:'Chinelazo Voltio Impact!!',
 coconitas:'Kokonit Fatality',
 calin:'Ármate 1',
 'sap-heinz':'Pizza de la rotonda',
 enanonitas:'Yo te invoco, Claudia Salinas',
 jorsi:'Yo te pinto la mochila',
 raulin:'Balde de leche',
};
type Reactions=Record<Exclude<VoiceKind,'special'>,string[]>;
export const REACTIONS:Record<string,Reactions>={
 semilla:{jump:['¡Agárrenme la Victoria!','¡Allá voy, pues!'],overtake:['¡Con permiso, voy por otra!','¡Adiós, chele!'],hit:['¡Salud!','¡Esa va por la casa!'],hurt:['¡Ideay! ¿Y a mí por qué?','¡Se me riega la cerveza!'],fall:['¡Nooo, la bicha!'],win:['¡La próxima ronda la pago yo!']},
 morly:{jump:['¡Clavada de los Lakers!','¡Voltio!'],overtake:['¡Pasando por la pintura!','¡Quítate, que llevo prisa!'],hit:['¡Chinelazo!','¡Toma tu voltio!'],hurt:['¡Púchica!','¡Eso fue falta!'],fall:['¡Me fui al agua!'],win:['¡Campeón, como los Lakers!']},
 chete:{jump:['¡Este salto lo pago yo!','¡Volando en primera clase!'],overtake:['¡Te pasé, quedate con el vuelto!','¡Así se maneja con plata!'],hit:['¡Ahí está tu vuelto!','¡Cobrado!'],hurt:['¡Me desfalcaron!','¡Eso me lo pagás!'],fall:['¡Se me cayó la billetera!'],win:['¡Gané! La plata siempre gana.']},
 coconitas:{jump:['¡Alley-oop!','¡Volando al aro!'],overtake:['¡Crossover!','¡Te hice un amague!'],hit:['¡Triple!','¡Bloqueo!'],hurt:['¡Falta, árbitro!','¡Ay, mi tobillo!'],fall:['¡Fuera de la cancha!'],win:['¡Encestado! Gané.']},
 calin:{jump:['¡Tranquilo, tranquilo!','¡Uy, qué viaje!'],overtake:['¡Suave, suave… ya te pasé!','¡Despacio, que llevo prisa!'],hit:['¡Hojazo!','¡Ármate esa!'],hurt:['¡Ay, mi gorra!','¡Qué onda, vos!'],fall:['¡Me fui volando!'],win:['Tranquilo… gané.']},
 'sap-heinz':{jump:['¡Croac!','¡Salto de sapo!'],overtake:['¡Paso de sapito!','¡Adiós, renacuajo!'],hit:['¡Sapazo!','¡Te cayó el sapito!'],hurt:['¡Ay, mi pizza!','¡Me aplastaron!'],fall:['¡Al charco!'],win:['¡Pizza para todos! Gané.']},
 enanonitas:{jump:['¡Mirame volar!','¡Arriba, pues!'],overtake:['¡Chiquito pero rápido!','¡Cebolla y adiós!'],hit:['¡Cebollazo!','¡A llorar se ha dicho!'],hurt:['¡Me hicieron llorar!','¡Ideay!'],fall:['¡Me caí y ni me vieron!'],win:['¡El más pequeño, el primero!']},
 jorsi:{jump:['¡Pincelada en el aire!','¡Weee!'],overtake:['¡Te borré del mapa!','¡Te pinté la raya!'],hit:['¡Pintado!','¡Obra de arte!'],hurt:['¡Me rayaron el dibujo!','¡Borrón y cuenta nueva!'],fall:['¡Se me cayó el lápiz!'],win:['Firmado: Jorsi.']},
 raulin:{jump:['¡Pepino volador!','¡Arriba la leche!'],overtake:['¡Fresco como pepino!','¡Te pasé, lechero!'],hit:['¡Pepinazo!','¡Te lo dije, fresco!'],hurt:['¡Se me regó la leche!','¡Ay, ay, ay!'],fall:['¡Me resbalé en mi propia leche!'],win:['¡Gané, y de postre leche!']},
};
/** `file` is the line's key: '<pilot>/<line>' without extension (special, jump-1, hurt-2…). */
export interface LineRef{characterId:string;kind:VoiceKind;index:number;text:string;file:string}
/** Every line in the game with its key; recordings go to public/voices/<key>.mp3 (or .ogg/.m4a/.webm). */
export function allLines():LineRef[]{
 const out:LineRef[]=[];
 for(const [id,phrase] of Object.entries(SPECIAL_PHRASES)){out.push({characterId:id,kind:'special',index:0,text:phrase,file:id+'/special'});
  const r=REACTIONS[id];for(const kind of VOICE_KINDS)if(kind!=='special')r[kind].forEach((text,index)=>out.push({characterId:id,kind,index,text,file:`${id}/${kind}-${index+1}`}));}
 return out;
}
/** Generic system-voice settings per pilot, only so that they sound different from each other. */
const TTS_STYLE:Record<string,{pitch:number;rate:number}>={semilla:{pitch:.8,rate:1},morly:{pitch:.7,rate:1.05},chete:{pitch:1.1,rate:1.1},coconitas:{pitch:1,rate:1.15},calin:{pitch:.9,rate:.92},'sap-heinz':{pitch:1.3,rate:1.1},enanonitas:{pitch:1.45,rate:1.15},jorsi:{pitch:1.05,rate:1.05},raulin:{pitch:1.15,rate:1}};
const PRIORITY:Record<VoiceKind,number>={special:5,win:4,fall:3,hurt:2,hit:2,overtake:1,jump:1};
const COOLDOWN:Record<VoiceKind,number>={special:0,win:0,fall:5,hurt:3.5,hit:3.5,overtake:7,jump:6};
const CHANCE:Record<VoiceKind,number>={special:1,win:1,fall:1,hurt:.75,hit:.75,overtake:.55,jump:.6};

// ——— Recordings made in the studio live in IndexedDB on this device. ———
const DB='morly-voices',STORE='lines';
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined')return reject(new Error('no idb'));const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function saveRecording(file:string,blob:Blob){const d=await db();await new Promise<void>((resolve,reject)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).put(blob,file);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});d.close();}
export async function deleteRecording(file:string){const d=await db();await new Promise<void>((resolve,reject)=>{const t=d.transaction(STORE,'readwrite');t.objectStore(STORE).delete(file);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});d.close();}
export async function loadRecordings():Promise<Map<string,Blob>>{
 try{const d=await db();const out=new Map<string,Blob>();await new Promise<void>((resolve,reject)=>{const t=d.transaction(STORE,'readonly'),req=t.objectStore(STORE).openCursor();req.onsuccess=()=>{const c=req.result;if(c){out.set(String(c.key),c.value as Blob);c.continue();}else resolve();};req.onerror=()=>reject(req.error);});d.close();return out;}catch{return new Map();}
}
/** Recorded files that ship with the game: key (no extension) → path under /voices/. */
export async function shippedVoices():Promise<Map<string,string>>{try{const r=await fetch('/voices/manifest.json',{cache:'no-cache'});if(!r.ok)return new Map();const j=await r.json() as {files?:string[]};return new Map((j.files??[]).map(f=>[f.replace(/\.[a-z0-9]+$/i,''),f]));}catch{return new Map();}}

export interface SpokenLine{who:string;text:string;color:string;special:boolean;provisional:boolean;seconds:number}
let spanishVoice:SpeechSynthesisVoice|null|undefined;
function pickVoice(){
 if(typeof speechSynthesis==='undefined')return null;if(spanishVoice)return spanishVoice;
 const voices=speechSynthesis.getVoices();if(!voices.length)return null;
 for(const lang of ['es-419','es-MX','es-US','es-NI','es-CO','es-ES'])for(const v of voices)if(v.lang.replace('_','-').toLowerCase()===lang.toLowerCase())return spanishVoice=v;
 return spanishVoice=voices.find(v=>v.lang.toLowerCase().startsWith('es'))??null;
}
export function ttsAvailable(){return typeof speechSynthesis!=='undefined'&&!!pickVoice();}
/** Speaks with the provisional system voice; resolves when done. */
export function speakProvisional(characterId:string,text:string,volume=audioSettings.voice):Promise<number>{
 return new Promise(resolve=>{
  const voice=pickVoice();if(!voice||typeof SpeechSynthesisUtterance==='undefined'){resolve(0);return;}
  const u=new SpeechSynthesisUtterance(text.replace(/!!/g,'!')),style=TTS_STYLE[characterId]??{pitch:1,rate:1};u.voice=voice;u.lang=voice.lang;u.pitch=style.pitch;u.rate=style.rate;u.volume=volume;
  const start=performance.now();u.onend=u.onerror=()=>resolve((performance.now()-start)/1000);speechSynthesis.cancel();speechSynthesis.speak(u);
 });
}
const estimate=(text:string)=>Math.max(1.1,Math.min(3.6,.55+text.length*.07));

export class VoiceSystem{
 private buffers=new Map<string,AudioBuffer>();private shipped=new Map<string,string>();private recordings=new Map<string,Blob>();
 private busyUntil=0;private busyPriority=0;private lastAny=-9;private lastKind=new Map<string,number>();private lastIndex=new Map<string,number>();private loading=true;
 constructor(private audio:GameAudio,private onLine:(line:SpokenLine)=>void){}
 /** Fetch the list of shipped recordings and this device's own; decode them lazily per pilot. */
 async init(characterIds:string[]){
  [this.shipped,this.recordings]=await Promise.all([shippedVoices(),loadRecordings()]);
  pickVoice();if(typeof speechSynthesis!=='undefined')speechSynthesis.onvoiceschanged=()=>{spanishVoice=undefined;pickVoice();};
  const ids=new Set(characterIds),wanted=allLines().filter(l=>ids.has(l.characterId)&&(this.recordings.has(l.file)||this.shipped.has(l.file)));
  await Promise.all(wanted.map(l=>this.decode(l.file)));this.loading=false;
 }
 private async decode(file:string){
  const ctx=this.audio.context;if(!ctx||this.buffers.has(file))return;
  try{const path=this.shipped.get(file),blob=this.recordings.get(file)??(path?await fetch('/voices/'+path).then(r=>r.ok?r.blob():null):null);if(!blob)return;this.buffers.set(file,await ctx.decodeAudioData(await blob.arrayBuffer()));}catch{/* a broken file falls back to the next source */}
 }
 /** Asks a pilot to say a line of a kind; returns false when skipped by the rate limits. */
 say(characterId:string,kind:VoiceKind,{now=performance.now()/1000,pan=0,force=false}:{now?:number;pan?:number;force?:boolean}={}){
  if(audioSettings.muted)return false;
  const p=PRIORITY[kind],key=characterId+'|'+kind;
  if(!force){
   if(now<this.busyUntil&&p<=this.busyPriority)return false;
   if(kind!=='special'&&kind!=='win'&&now-this.lastAny<1.4)return false;
   if(now-(this.lastKind.get(key)??-99)<COOLDOWN[kind])return false;
   if(CHANCE[kind]<1&&Math.random()>CHANCE[kind])return false;
  }
  const line=this.pick(characterId,kind);if(!line)return false;
  this.lastKind.set(key,now);this.lastAny=now;
  const c=character(characterId),buffer=this.buffers.get(line.file);let seconds=0,provisional=false;
  if(now<this.busyUntil&&p>this.busyPriority&&typeof speechSynthesis!=='undefined')speechSynthesis.cancel();
  if(buffer){seconds=this.audio.playVoice(buffer,pan);}
  else if(audioSettings.tts&&ttsAvailable()){provisional=true;seconds=estimate(line.text);void speakProvisional(characterId,line.text,audioSettings.voice);}
  else{seconds=estimate(line.text);provisional=true;}
  seconds=Math.max(seconds,.9);this.busyUntil=now+seconds;this.busyPriority=p;this.audio.duck(seconds+.15);
  if(audioSettings.subtitles||kind==='special')this.onLine({who:c.name,text:line.text,color:c.color,special:kind==='special',provisional:provisional&&!buffer,seconds});
  return true;
 }
 private pick(characterId:string,kind:VoiceKind):LineRef|null{
  if(kind==='special'){const text=SPECIAL_PHRASES[characterId];return text?{characterId,kind,index:0,text,file:characterId+'/special'}:null;}
  const list=REACTIONS[characterId]?.[kind];if(!list?.length)return null;const key=characterId+'|'+kind,last=this.lastIndex.get(key)??-1;
  // Never the same line twice in a row.
  let index=Math.floor(Math.random()*list.length);if(list.length>1&&index===last)index=(index+1)%list.length;this.lastIndex.set(key,index);
  return{characterId,kind,index,text:list[index],file:`${characterId}/${kind}-${index+1}`};
 }
 get ready(){return !this.loading;}
 dispose(){if(typeof speechSynthesis!=='undefined')speechSynthesis.cancel();}
}
