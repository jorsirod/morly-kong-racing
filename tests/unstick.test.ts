import { describe,expect,it } from 'vitest';
import { makePlayer,Simulation,stepPlayer,roadFrame,STUCK,yawCapacity } from '../shared/simulation';
import { routeFor,sample } from '../shared/track';
import { TRACKS } from '../shared/content';
import { EMPTY_INPUT } from '../shared/types';

describe('nadie se queda atascado',()=>{
 it('un carro pegado al borde mirando hacia afuera sale solo, aunque el jugador siga girando hacia la pared',()=>{
  for(const t of TRACKS){
   const route=routeFor(t.id);
   for(const [vehicle,steer,assist] of [['silver-surfer',1,false],['white-empanade',-1,false],['black-diamond',1,true],['la-raulina',0,true]] as const){
    const d0=route.length*.31,s0=sample(route,d0),offset=route.width*.7+.3,p=makePlayer('p','p','semilla',vehicle,0);
    Object.assign(p,{x:s0.x+Math.cos(s0.yaw)*offset,z:s0.z-Math.sin(s0.yaw)*offset,y:s0.y,yaw:s0.yaw+Math.PI/2,speed:0,progress:d0});
    let escaped=-1;
    for(let i=0;i<10*60&&escaped<0;i++){stepPlayer(p,{...EMPTY_INPUT,steer,assist},route,'race',1/60);if(Math.abs(roadFrame(route,p).heading)<.7&&p.speed>8)escaped=i/60;}
    expect(escaped,t.id+' '+vehicle).toBeGreaterThanOrEqual(0);expect(escaped,t.id+' '+vehicle).toBeLessThan(3);
   }
  }
 });
 it('a baja velocidad el carro todavía puede girar',()=>{
  expect(yawCapacity(0,3)).toBeGreaterThan(.4);expect(yawCapacity(0,3)).toBeLessThan(yawCapacity(8,3));
 });
 const frozen=(brake:boolean,seconds:number)=>{
  const sim=new Simulation('race','masaya'),me=makePlayer('me','Yo','semilla','silver-surfer',0,false);me.connected=true;me.ready=true;sim.addPlayer(me);sim.start();
  for(let i=0;i<(sim.state.countdown+1)*60;i++)sim.tick(1/60);
  const x=me.x,z=me.z;let rescues=0,seq=0;
  for(let i=0;i<seconds*60;i++){const before=me.respawn;sim.inputs.set('me',{...EMPTY_INPUT,seq:++seq,actionSeq:seq,assist:false,brake});me.speed=0;me.x=x;me.z=z;sim.tick(1/60);if(me.respawn>before+.5)rescues++;}
  return rescues;
 };
 it('un carro encajado recibe el rescate «De vuelta» a los pocos segundos',()=>{
  expect(frozen(false,STUCK.lowTime-1)).toBe(0);
  expect(frozen(false,STUCK.lowTime+2)).toBe(1);
 });
 it('frenar a propósito nunca cuenta como atasco',()=>{expect(frozen(true,STUCK.window+4)).toBe(0);});
 it('una carrera normal de bots no dispara rescates',()=>{
  const sim=new Simulation('race','oriental');let rescues=0;
  for(let i=0;i<12;i++)sim.addPlayer(makePlayer('b'+i,'B'+i,'semilla',['silver-surfer','white-empanade','hola-willy','orange-seed','black-diamond','la-raulina'][i%6],0,true));
  sim.start();for(let i=0;i<70*60;i++){const before=sim.state.players.map(p=>p.respawn);sim.tick(1/60);sim.state.players.forEach((p,k)=>{if(p.respawn>before[k]+.5&&before[k]<=0&&p.fall<=0)rescues++;});}
  expect(rescues).toBe(0);
 });
});
