import { describe,it,expect } from 'vitest';
import { TRACKS } from '../shared/content';
import { PLAYLISTS,SCORES,barLengths,musicStep } from '../src/game/music';

const SONGS=TRACKS.flatMap(t=>(PLAYLISTS[t.id]??[]).map(s=>({id:t.id+' «'+s.title+'»',s})));

describe('música original por pista',()=>{
 it('cada mundo tiene al menos dos canciones y cada compás está completo',()=>{
  for(const t of TRACKS){expect(SCORES[t.id],t.id).toBeDefined();expect(PLAYLISTS[t.id].length,t.id).toBeGreaterThanOrEqual(2);}
  for(const {id,s} of SONGS){expect(s.form.length).toBeGreaterThan(0);const steps=s.steps??16;
   for(const name of ['A','B'] as const){const sec=s.sections[name];expect(sec.chords.length,id+name).toBe(8);expect(barLengths(sec.melody),id+' '+name).toEqual(Array(8).fill(steps));
    if(sec.riff)expect(barLengths(sec.riff),id+' riff '+name).toEqual(Array(8).fill(steps));}}
 });
 it('suena distinto en calma, carrera, tensión y última vuelta, con notas válidas',()=>{
  for(const {id,s} of SONGS){
   const count=(level:number,tension=0)=>{let n=0;for(let b=0;b<(s.steps??16)*8*s.form.length;b++){const out=musicStep(s,b,{level,tension,speed:.5,boost:false});for(const note of out.notes){expect(Number.isFinite(note.freq)&&note.freq>25&&note.freq<3000,id+' '+note.inst+' '+note.freq).toBe(true);expect(note.len).toBeGreaterThan(0);expect(note.offset).toBeGreaterThanOrEqual(0);}n+=out.notes.length+out.drums.length;}return n;};
   const calm=count(0),race=count(1),last=count(2),tense=count(1,1);
   expect(race,id).toBeGreaterThan(calm);expect(last,id).toBeGreaterThan(race);expect(tense,id).toBeGreaterThan(race);
  }
 });
 it('ninguna canción reutiliza la melodía o el título de otra',()=>{
  const melodies=SONGS.map(x=>x.s.sections.A.melody),titles=SONGS.map(x=>x.s.title);
  expect(new Set(melodies).size).toBe(melodies.length);expect(new Set(titles).size).toBe(titles.length);
 });
 it('hay muchos estilos distintos, con sus instrumentos y baterías',()=>{
  const grooves=new Set<string>(),insts=new Set<string>(),drums=new Set<string>();
  for(const {s} of SONGS){
   for(const name of ['A','B'] as const)grooves.add(s.sections[name].groove??s.groove);
   for(let b=0;b<(s.steps??16)*8*s.form.length;b++){const out=musicStep(s,b,{level:1,tension:0,speed:.9,boost:false});out.notes.forEach(n=>insts.add(n.inst));out.drums.forEach(d=>drums.add(d.drum));}}
  expect(grooves.size).toBeGreaterThanOrEqual(12);
  for(const inst of ['piano','organ','dist','clean','sub','chip','rhodes','vibes','upright','wah','nylon','strings','marimba','brass'])expect(insts.has(inst),inst).toBe(true);
  for(const drum of ['scratch','crash','tamb','boom','ride','brush'])expect(drums.has(drum),drum).toBe(true);
 });
 it('el son nica va en 6/8 y la canción con eco repite las notas a destiempo',()=>{
  const son=PLAYLISTS.oriental.find(s=>s.groove==='sonnica');expect(son?.steps).toBe(12);
  const dream=Object.values(PLAYLISTS).flat().find(s=>s.echo)!;let echoes=0;
  for(let b=0;b<16*8;b++)echoes+=musicStep(dream,b,{level:1,tension:0,speed:.5,boost:false}).notes.filter(n=>n.offset>0).length;
  expect(echoes).toBeGreaterThan(20);
 });
});
