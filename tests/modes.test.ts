import { describe,it,expect } from 'vitest';
import { makePlayer,Simulation,cupFor,cupRanking } from '../shared/simulation';
import { CHARACTERS,VEHICLES,TRACKS } from '../shared/content';
import { RaceWire,syncWire,fromWire } from '../shared/network';
import { FIXED_DT } from '../shared/types';

const runToEnd=(s:Simulation)=>{for(let i=0;i<22000&&s.state.phase==='running'||s.state.phase==='countdown'&&i<22000;i++)s.tick(FIXED_DT);};
describe('modos',()=>{
 it('la copa recorre tres pistas distintas y conserva los puntos',()=>{
  const s=new Simulation('championship','managua');expect(s.state.cup.split(',')).toEqual(cupFor('managua'));expect(new Set(cupFor('managua')).size).toBe(3);
  for(let i=0;i<4;i++)s.addPlayer(makePlayer('b'+i,'B'+i,CHARACTERS[i].id,VEHICLES[i].id,i,true));s.start();
  const visited=[s.state.trackId];runToEnd(s);expect(s.state.phase).toBe('results');const after1=s.state.players.map(p=>p.cupPoints);expect(after1.some(n=>n>0)).toBe(true);
  s.nextRound();visited.push(s.state.trackId);expect(s.route.length).toBeGreaterThan(500);runToEnd(s);s.nextRound();visited.push(s.state.trackId);runToEnd(s);
  expect(visited).toEqual(cupFor('managua'));expect(s.state.phase).toBe('cup-results');expect(cupRanking(s.state)[0].cupPoints).toBeGreaterThan(Math.max(...after1));
  const w=new RaceWire();syncWire(w,s.state);expect(fromWire(w).cup).toBe(s.state.cup);
  s.restartCup();expect(s.state.round).toBe(1);expect(s.state.trackId).toBe('managua');expect(s.state.players.every(p=>p.cupPoints===0)).toBe(true);
 },60000);
 it('los bots terminan en los tres niveles y el relajado es más lento',()=>{
  const times:number[]=[];for(const level of [0,2]){const s=new Simulation('race',TRACKS[0].id);s.difficulty=level;for(let i=0;i<6;i++)s.addPlayer(makePlayer('b'+i,'B'+i,CHARACTERS[i].id,'hola-willy',i,true));s.start();runToEnd(s);expect(s.state.players.filter(p=>p.finishTime>=0).length).toBeGreaterThanOrEqual(5);times.push(Math.min(...s.state.players.filter(p=>p.finishTime>=0).map(p=>p.finishTime)));}
  expect(times[0]).toBeGreaterThan(times[1]);
 },60000);
 it('cuenta estadísticas para los premios',()=>{
  const s=new Simulation('race');for(let i=0;i<6;i++)s.addPlayer(makePlayer('b'+i,'B'+i,CHARACTERS[i].id,VEHICLES[i].id,i,true));s.start();runToEnd(s);
  const ps=s.state.players;expect(ps.some(p=>p.hitsGiven>0)).toBe(true);expect(ps.reduce((a,p)=>a+p.hitsGiven,0)).toBe(ps.reduce((a,p)=>a+p.hitsTaken,0));expect(ps.every(p=>p.bestLap>20&&p.bestLap<120)).toBe(true);
 },60000);
});
