import { readFileSync } from 'node:fs';
import { describe,it,expect } from 'vitest';
import { CHARACTERS } from '../shared/content';
import { REACTIONS,SPECIAL_PHRASES,VOICE_KINDS,VoiceSystem,allLines } from '../src/game/voices';
import type { GameAudio } from '../src/game/audio';

// The nine phrases exactly as the gang asked for them.
const EXACT:Record<string,string>={semilla:'Acompáñame a comprar bicha',chete:'Si yo me voy nadie juega play',morly:'Chinelazo Voltio Impact!!',coconitas:'Kokonit Fatality',calin:'Ármate 1','sap-heinz':'Pizza de la rotonda',enanonitas:'Yo te invoco, Claudia Salinas',jorsi:'Yo te pinto la mochila',raulin:'Balde de leche'};
const fakeAudio=()=>{const calls={duck:0};return{calls,audio:{context:null,duck(){calls.duck++;},playVoice(){return 1;}} as unknown as GameAudio};};

describe('voces de la pandilla',()=>{
 it('las nueve frases especiales son exactas y coinciden con los poderes del juego',()=>{
  expect(SPECIAL_PHRASES).toEqual(EXACT);
  for(const c of CHARACTERS)expect(c.special.name,c.id).toBe(EXACT[c.id]);
 });
 it('cada piloto tiene reacciones con variantes para saltos, rebases, golpes, caídas y victoria',()=>{
  for(const c of CHARACTERS){const r=REACTIONS[c.id];expect(r,c.id).toBeDefined();
   for(const kind of VOICE_KINDS)if(kind!=='special')expect(r[kind].length,c.id+' '+kind).toBeGreaterThanOrEqual(kind==='fall'||kind==='win'?1:2);}
  const keys=allLines().map(l=>l.file);expect(new Set(keys).size).toBe(keys.length);
 });
 it('el README de voces lista cada línea pendiente con su texto exacto',()=>{
  const md=readFileSync('public/voices/README.md','utf8'),manifest=JSON.parse(readFileSync('public/voices/manifest.json','utf8'));expect(Array.isArray(manifest.files)).toBe(true);
  for(const l of allLines()){expect(md,l.file).toContain('`'+l.file+'.mp3`');expect(md,l.file).toContain('«'+l.text+'»');}
 });
 it('la especial siempre suena, interrumpe reacciones, baja la música y muestra subtítulo exacto',()=>{
  const {audio,calls}=fakeAudio(),lines:{text:string;special:boolean;provisional:boolean}[]=[],v=new VoiceSystem(audio,l=>lines.push(l));
  expect(v.say('morly','fall',{now:10})).toBe(true);
  expect(v.say('morly','special',{now:10.3})).toBe(true);
  expect(lines.at(-1)).toMatchObject({text:'Chinelazo Voltio Impact!!',special:true});expect(calls.duck).toBe(2);
  // Without a recording or a system voice the line is subtitle-only and marked provisional.
  expect(lines.at(-1)!.provisional).toBe(true);
 });
 it('las reacciones respetan pausas: no se enciman ni se repiten seguidas',()=>{
  const random=Math.random;Math.random=()=>0;
  try{
   const {audio}=fakeAudio(),lines:string[]=[],v=new VoiceSystem(audio,l=>lines.push(l.text));
   expect(v.say('jorsi','jump',{now:0})).toBe(true);
   expect(v.say('jorsi','hit',{now:.5})).toBe(false);   // still talking
   expect(v.say('jorsi','hit',{now:2.5})).toBe(true);
   expect(v.say('jorsi','hit',{now:4.2})).toBe(false);  // same kind too soon
   expect(v.say('jorsi','hit',{now:7})).toBe(true);
   expect(lines[1]).not.toBe(lines[2]);                 // never the same variant twice in a row
   expect(v.say('jorsi','jump',{now:7.5})).toBe(false); // global gap between reactions
  }finally{Math.random=random;}
 });
});
