import { describe,it,expect } from 'vitest';
import { makePlayer,Simulation,stepPlayer,DRIVE,INTRO,roadFrame,yawCapacity } from '../shared/simulation';
import { resolveVehicleCollision,vehicleDynamics } from '../shared/dynamics';
import { routeFor,sample } from '../shared/track';
import { EMPTY_INPUT,FIXED_DT } from '../shared/types';
import { keyRamp,shapeAxis } from '../src/game/input';

const car=(id:string,vehicleId:string,x=0,z=0)=>Object.assign(makePlayer(id,id,'semilla',vehicleId,0),{x,z});
const steps=(p:ReturnType<typeof car>,seconds:number,input:Partial<typeof EMPTY_INPUT>)=>{for(let i=0;i<seconds*60;i++)stepPlayer(p,{...EMPTY_INPUT,assist:false,...input},routeFor('la-salle'),'battle');};
describe('conducción arcade',()=>{
 it('el derrape fija dirección, carga dos niveles y sale con empujón',()=>{
  const p=car('p','hola-willy');p.speed=19;steps(p,.1,{steer:.8,drift:true});expect(p.driftDir).toBe(1);
  steps(p,.3,{steer:-.4,drift:true});expect(p.driftDir).toBe(1); // contravolante no cambia el sentido
  steps(p,1.6,{steer:1,drift:true});expect(p.driftCharge).toBeGreaterThan(DRIVE.driftTier2);
  const before=p.speed;steps(p,FIXED_DT,{});expect(p.boostLevel).toBe(3);expect(p.boost).toBeGreaterThan(1);expect(p.speed).toBeGreaterThan(before+3);expect(p.driftDir).toBe(0);
 });
 it('soltar antes del primer nivel no da turbo',()=>{
  const p=car('p','silver-surfer');p.speed=19;steps(p,.25,{steer:1,drift:true});steps(p,FIXED_DT,{});expect(p.boost).toBe(0);
 });
 it('el giro es más tranquilo a tope y más cerrado a baja velocidad',()=>{
  const fast=car('f','silver-surfer');fast.speed=20;steps(fast,.5,{steer:1});
  expect(fast.speed/Math.abs(fast.turnRate)).toBeGreaterThan(13);expect(yawCapacity(8,5)).toBeGreaterThan(yawCapacity(20,5)*1.2);
 });
 it('un golpe por detrás acelera al de adelante y frena al que pega; el liviano sale más',()=>{
  const hilux=car('h','white-empanade'),matiz=car('m','black-diamond');const gap=vehicleDynamics('white-empanade').halfLength+vehicleDynamics('black-diamond').halfLength-.05;
  hilux.speed=23;matiz.speed=18;matiz.z=gap;resolveVehicleCollision(hilux,matiz);
  expect(matiz.speed-18).toBeGreaterThan(4);expect(23-hilux.speed).toBeGreaterThan(1);expect(matiz.speed-18).toBeGreaterThan((23-hilux.speed)*2.5);
 });
 it('un golpe de costado empuja de lado y gira según el punto de contacto',()=>{
  const s10=car('s','la-raulina'),mazda=car('m','orange-seed',2.2,1.2);s10.speed=mazda.speed=20;s10.lateralSpeed=5;
  resolveVehicleCollision(s10,mazda);expect(Math.hypot(mazda.pushX,mazda.pushZ)).toBeGreaterThan(Math.hypot(s10.pushX,s10.pushZ));expect(mazda.yawKick).not.toBe(0);
  steps(mazda,1.2,{});expect(Math.abs(mazda.yawKick)).toBeLessThan(.05);
 });
 it('se recupera rápido tras un aturdimiento',()=>{
  const p=car('p','silver-surfer');p.speed=20;p.stun=.45;steps(p,.5,{});expect(p.recover).toBeGreaterThan(.9);steps(p,1.4,{});expect(p.speed).toBeGreaterThan(17);
 });
 it('la ayuda del borde endereza sin bloquear y nadie sale con ayuda en manos libres',()=>{
  const route=routeFor('la-salle'),q=sample(route,200),p=car('p','silver-surfer');p.x=q.x+Math.cos(q.yaw)*(route.width*.5-2.5);p.z=q.z-Math.sin(q.yaw)*(route.width*.5-2.5);p.yaw=q.yaw+.15;p.speed=20;p.progress=200;
  let worst=0;for(let i=0;i<90;i++){stepPlayer(p,{...EMPTY_INPUT,assist:true},route,'race');worst=Math.max(worst,Math.abs(roadFrame(route,p).offset));}expect(worst).toBeLessThan(route.width*.5);
  // Without help the same car leaves the asphalt: the guard is what saved it.
  const raw=car('r','silver-surfer');Object.assign(raw,{x:q.x+Math.cos(q.yaw)*(route.width*.5-2.5),z:q.z-Math.sin(q.yaw)*(route.width*.5-2.5),yaw:q.yaw+.15,speed:20,progress:200});let rawWorst=0;for(let i=0;i<90;i++){stepPlayer(raw,{...EMPTY_INPUT,assist:false},route,'race');rawWorst=Math.max(rawWorst,Math.abs(roadFrame(route,raw).offset));}expect(rawWorst).toBeGreaterThan(route.width*.5);
 });
 it('salida perfecta con derrape justo antes del ¡DALE!; antes de tiempo no',()=>{
  const sim=new Simulation('race');const good=sim.addPlayer(car('a','silver-surfer')),early=sim.addPlayer(car('b','silver-surfer'));sim.start();
  expect(sim.state.countdown).toBeCloseTo(INTRO+3,5);
  while(sim.state.countdown>2){sim.inputs.set('b',{...EMPTY_INPUT,drift:true});sim.tick();}
  while(sim.state.phase==='countdown'){if(sim.state.countdown<.5)sim.inputs.set('a',{...EMPTY_INPUT,drift:true});sim.tick();}
  expect(good.boost).toBeGreaterThan(0);expect(early.boost).toBe(0);
 });
 it('teclado entra suave y el analógico tiene zona muerta y curva',()=>{
  expect(keyRamp(0)).toBeCloseTo(.42,5);expect(keyRamp(.2)).toBe(1);expect(shapeAxis(.1)).toBe(0);expect(shapeAxis(.5)).toBeLessThan(.5);expect(shapeAxis(1)).toBe(1);expect(shapeAxis(-1)).toBe(-1);
 });
 it('el rebufo carga detrás de otro carro y da un empujón',()=>{
  const sim=new Simulation('battle');const lead=sim.addPlayer(car('lead','white-empanade',0,10)),tail=sim.addPlayer(car('tail','black-diamond',0,0));sim.state.phase='running';
  for(const p of [lead,tail]){p.yaw=0;p.speed=18;p.x=0;}lead.z=-30;tail.z=-40;let boosted=false;
  for(let i=0;i<90;i++){sim.tick();if(tail.boost>0)boosted=true;}expect(boosted).toBe(true);
 });
});
