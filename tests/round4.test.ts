import { describe,expect,it } from 'vitest';
import { makePlayer,Simulation,stepPlayer,WALL,TREAT } from '../shared/simulation';
import { closest,routeFor,sample } from '../shared/track';
import { hazardGap,hazardsFor } from '../shared/hazards';
import { BONG } from '../shared/items';
import { vehicleDynamics } from '../shared/dynamics';
import { EMPTY_INPUT } from '../shared/types';

describe('ronda 4: muros, quesillo, buses, espiral y Bong',()=>{
 it('los muros son sólidos: ni a fondo contra la pared el carro se mete en ella',()=>{
  for(const id of ['la-salle','oriental','managua','hipa-hipa','masaya','san-juan']){
   const route=routeFor(id),d0=route.length*.12,s0=sample(route,d0),p=makePlayer('p','p','semilla','white-empanade',0);
   Object.assign(p,{x:s0.x,z:s0.z,y:s0.y,yaw:s0.yaw+.9,speed:30,progress:d0});
   let worst=-9;for(let i=0;i<90;i++){stepPlayer(p,{...EMPTY_INPUT,steer:1,assist:false},route,'race',1/60);const n=closest(route,p.x,p.z,{y:p.y,hint:p.progress});worst=Math.max(worst,n.distance+vehicleDynamics(p.vehicleId).halfWidth-(n.width*WALL.face-WALL.inset));}
   expect(worst,id).toBeLessThan(.35);
  }
 });
 it('el quesillo de la señora da turbo y cae otro a los pocos segundos',()=>{
  const s=new Simulation('race','la-salle'),me=s.addPlayer(makePlayer('me','Yo','semilla','silver-surfer',0));s.start();s.state.phase='running';s.state.time=10;
  const q=s.state.pickups.find(v=>v.kind===2)!;expect(q).toBeTruthy();Object.assign(me,{x:q.x,z:q.z,y:q.y,speed:15,boost:0});
  s.tick(1/60);expect(me.boost).toBeGreaterThan(.5);expect(q.availableAt).toBeCloseTo(s.state.time+TREAT.respawn-1/60,1);
 });
 it('el bus es largo: chocar con su trompa o su cola también cuenta',()=>{
  const bus=hazardsFor('oriental',0).find(h=>h.kind==='bus')!;expect(bus.solid).toBe(true);
  const nose={x:bus.x+Math.sin(bus.yaw)*4.6,z:bus.z+Math.cos(bus.yaw)*4.6};expect(hazardGap(bus,nose.x,nose.z).d).toBeLessThan(bus.radius+1.1);
 });
 it('en la espiral de Hipa Hipa el carro de arriba sigue arriba aunque pase sobre la entrada',()=>{
  const route=routeFor('hipa-hipa');let upper=0,lower=0,best=Infinity;
  for(let d=0;d<route.length;d+=1){const a=sample(route,d);if(a.y<6)continue;for(let e=0;e<route.length;e+=1){const b=sample(route,e);if(b.y>.5)continue;const h=Math.hypot(a.x-b.x,a.z-b.z);if(h<best){best=h;upper=d;lower=e;}}}
  expect(best).toBeLessThan(3);
  const s0=sample(route,upper-20),p=makePlayer('p','p','semilla','silver-surfer',0);Object.assign(p,{x:s0.x,z:s0.z,y:s0.y,yaw:s0.yaw,speed:20,progress:upper-20});
  for(let i=0;i<70;i++)stepPlayer(p,{...EMPTY_INPUT},route,'race',1/60);
  expect(p.progress).toBeGreaterThan(upper);expect(p.y).toBeGreaterThan(5);
 });
 it('el Bong aparece con ventajas más cortas que antes',()=>{expect(BONG.lead).toBeLessThan(70);expect(BONG.cooldown).toBeLessThan(25);});
});
