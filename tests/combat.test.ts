import { describe,it,expect } from 'vitest';
import { makePlayer,Simulation } from '../shared/simulation';
import { EMPTY_INPUT } from '../shared/types';

function arena(){const s=new Simulation('battle');s.state.phase='running';return s;}
const put=(s:Simulation,id:string,characterId:string,x:number,z:number,yaw=0)=>{const p=s.addPlayer(makePlayer(id,id,characterId,'silver-surfer',s.state.players.length));Object.assign(p,{x,z,yaw,speed:0,charges:6});return p;};
const still=(s:Simulation)=>{for(const p of s.state.players)s.inputs.set(p.id,{...EMPTY_INPUT,assist:false,brake:true});};
describe('ataques reconocibles y justos',()=>{
 it('la ayuda de apuntado curva hacia un rival dentro del cono, con límite',()=>{
  const s=arena(),me=put(s,'me','semilla',0,-40),rival=put(s,'r','morly',6,-10);still(s);
  s.attack(me,1);const shot=s.state.shots[0];expect(shot.target).toBe('r');
  let hit=false;for(let i=0;i<90&&!hit;i++){still(s);s.tick();hit=s.state.events.some(e=>e.type==='hit'&&e.targetId==='r');}expect(hit).toBe(true);expect(rival.stun).toBeGreaterThan(0);
 });
 it('fuera del cono no apunta: se puede esquivar abriéndose',()=>{
  const s=arena(),me=put(s,'me','semilla',0,-40);put(s,'r','morly',20,-25);still(s);s.attack(me,1);expect(s.state.shots[0].target).toBe('');
 });
 it('el objeto se gasta al golpear y una ráfaga no repite castigo sobre el mismo rival',()=>{
  const s=arena(),me=put(s,'me','raulin',0,-40),rival=put(s,'r','morly',0,-30);still(s);
  s.attack(me,3);expect(s.state.shots.length).toBe(3);
  for(let i=0;i<60;i++){still(s);s.tick();}
  const hits=s.state.events.filter(e=>e.type==='hit'&&e.targetId==='r');expect(hits.length).toBe(1);expect(me.score).toBe(1);expect(rival.immune).toBeGreaterThan(0);
 });
 it('el six-pack salpica a los que están junto al objetivo y suma dos puntos por rival',()=>{
  const s=arena(),me=put(s,'me','semilla',0,-40),a=put(s,'a','morly',0,-25),b=put(s,'b','chete',3.5,-23);still(s);
  me.charges=6;s.attack(me,4);for(let i=0;i<60;i++){still(s);s.tick();}
  expect(a.stun).toBeGreaterThan(0);expect(b.stun).toBeGreaterThan(0);expect(me.score).toBe(4);
 });
 it('la chinela de Morly salta una vez a un rival cercano',()=>{
  const s=arena(),me=put(s,'me','morly',0,-40),a=put(s,'a','semilla',0,-25),b=put(s,'b','chete',6,-22);put(s,'c','calin',30,-22);still(s);
  s.attack(me,4);for(let i=0;i<60;i++){still(s);s.tick();}
  const victims=new Set(s.state.events.filter(e=>e.type==='hit').map(e=>e.targetId));expect([...victims].sort()).toEqual(['a','b']);expect(s.state.events.some(e=>e.text==='chain')).toBe(true);
 });
 it('las especiales de impacto inmovilizan 1,5 s y luego dan un segundo de protección',()=>{
  const s=arena(),me=put(s,'me','sap-heinz',0,-40),r=put(s,'r','morly',0,-25);still(s);s.attack(me,4);
  let stunned=0;for(let i=0;i<60&&!stunned;i++){still(s);s.tick();stunned=r.stun;}expect(stunned).toBeGreaterThan(1.4);expect(r.immune).toBeCloseTo(r.stun+1,1);
 });
});
