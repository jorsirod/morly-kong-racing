import { describe,it,expect } from 'vitest';
import { TRACKS } from '../shared/content';
import { SCORES,barLengths,musicStep } from '../src/game/music';

describe('música original por pista',()=>{
 it('cada mundo tiene su pieza y cada compás está completo',()=>{
  for(const t of TRACKS){const s=SCORES[t.id];expect(s,t.id).toBeDefined();expect(s.form.length).toBeGreaterThan(0);
   for(const name of ['A','B'] as const){const sec=s.sections[name];expect(sec.chords.length,t.id+name).toBe(8);expect(barLengths(sec.melody),t.id+' '+name).toEqual(Array(8).fill(16));}}
 });
 it('suena distinto en calma, carrera, tensión y última vuelta, con notas válidas',()=>{
  for(const t of TRACKS){
   const s=SCORES[t.id],count=(level:number,tension=0)=>{let n=0;for(let b=0;b<16*8*s.form.length;b++){const out=musicStep(s,b,{level,tension,speed:.5,boost:false});for(const note of out.notes){expect(Number.isFinite(note.freq)&&note.freq>25&&note.freq<3000,t.id+' '+note.inst+' '+note.freq).toBe(true);expect(note.len).toBeGreaterThan(0);}n+=out.notes.length+out.drums.length;}return n;};
   const calm=count(0),race=count(1),last=count(2),tense=count(1,1);
   expect(race,t.id).toBeGreaterThan(calm);expect(last,t.id).toBeGreaterThan(race);expect(tense,t.id).toBeGreaterThan(race);
  }
 });
 it('ninguna pista reutiliza la melodía de otra',()=>{
  const melodies=Object.values(SCORES).map(s=>s.sections.A.melody);expect(new Set(melodies).size).toBe(melodies.length);
 });
});
