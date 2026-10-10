import { describe,it,expect } from 'vitest';
import { CHARACTERS,TRACKS,VEHICLES } from '../shared/content';
import { resolveVehicleCollision,vehicleContact,vehicleDynamics,vehicleVelocity } from '../shared/dynamics';
import { makePlayer,Simulation,stepPlayer } from '../shared/simulation';
import { EMPTY_INPUT,FIXED_DT } from '../shared/types';
import { routeFor,sample,closest,sampleLane } from '../shared/track';
import { RaceWire,syncWire,fromWire } from '../shared/network';

const car=(id:string,vehicleId:string,x=0,z=0)=>Object.assign(makePlayer(id,id,'semilla',vehicleId,0),{x,z});
describe('contactos con masa e inercia',()=>{
 it('usa la carrocería larga de una Hilux y evita círculos fantasma alrededor de un Matiz',()=>{
  const hilux=car('h','white-empanade'),small=car('m','black-diamond',0,4.1);
  expect(vehicleContact(hilux,small)).not.toBeNull();small.z=4.3;expect(vehicleContact(hilux,small)).toBeNull();
  const a=car('a','black-diamond'),b=car('b','black-diamond',2.05);expect(vehicleContact(a,b)).toBeNull();
  b.x=0;b.z=2.2;b.yaw=Math.PI/2;expect(vehicleContact(a,b)).not.toBeNull();
 });
 it('separa el contacto en ese mismo paso y desplaza al liviano en proporción a la masa',()=>{
  const heavy=car('heavy','white-empanade'),light=car('light','black-diamond',1.8),startH=heavy.x,startL=light.x;
  const collision=resolveVehicleCollision(heavy,light);
  expect(collision.collided).toBe(true);expect(vehicleContact(heavy,light)).toBeNull();
  expect((light.x-startL)/(startH-heavy.x)).toBeCloseTo(vehicleDynamics(heavy.vehicleId).mass/vehicleDynamics(light.vehicleId).mass,8);
  expect(resolveVehicleCollision(heavy,light).collided).toBe(false);
 });
 it('el pesado gana el choque frontal y conserva el momentum lineal del par',()=>{
  const heavy=car('h','white-empanade',0,-2),light=car('l','black-diamond',0,2);heavy.speed=20;light.speed=20;light.yaw=Math.PI;// Head-on: the forward part changes each car's own speed.
  
  const massH=vehicleDynamics(heavy.vehicleId).mass,massL=vehicleDynamics(light.vehicleId).mass,before=massH*vehicleVelocity(heavy).z+massL*vehicleVelocity(light).z;
  const hit=resolveVehicleCollision(heavy,light),vh=vehicleVelocity(heavy),vl=vehicleVelocity(light);
  expect(hit.impulse).toBeGreaterThan(20);expect(vh.z).toBeGreaterThan(0);expect(vl.z).toBeGreaterThan(0);
  expect(Math.abs(light.speed-20)).toBeGreaterThan(Math.abs(heavy.speed-20)*3);
  expect(massH*vh.z+massL*vl.z).toBeCloseTo(before,8);
  expect(heavy.stun).toBe(0);expect(light.stun).toBe(0);
 });
 it('el golpe de costado desplaza más al liviano y conserva momentum en ambos ejes',()=>{
  const heavy=car('h','white-empanade',-1.4),light=car('l','black-diamond',1);heavy.yaw=Math.PI/2;heavy.speed=light.speed=20;
  const massH=vehicleDynamics(heavy.vehicleId).mass,massL=vehicleDynamics(light.vehicleId).mass,beforeH=vehicleVelocity(heavy),beforeL=vehicleVelocity(light),hx=heavy.x,lx=light.x;
  const result=resolveVehicleCollision(heavy,light),afterH=vehicleVelocity(heavy),afterL=vehicleVelocity(light);
  expect(result.impulse).toBeGreaterThan(0);expect((light.x-lx)/(hx-heavy.x)).toBeCloseTo(massH/massL,8);
  expect(afterL.x).toBeGreaterThan(afterH.x);expect(afterH.x).toBeGreaterThan(0);expect(vehicleContact(heavy,light)).toBeNull();
  for(const axis of ['x','z'] as const)expect(massH*afterH[axis]+massL*afterL[axis]).toBeCloseTo(massH*beforeH[axis]+massL*beforeL[axis],8);
  expect([heavy.turnRate,light.turnRate].every(Number.isFinite)).toBe(true);expect(heavy.stun+light.stun).toBe(0);
 });
 it('un roce en separación no agrega energía ni rebotes repetidos',()=>{
  const a=car('a','hola-willy',-.8),b=car('b','orange-seed',.8);a.pushX=-2;b.pushX=2;
  const hit=resolveVehicleCollision(a,b);expect(hit.collided).toBe(true);expect(hit.impulse).toBe(0);expect(a.pushX).toBe(-2);expect(b.pushX).toBe(2);
 });
 it('desenreda centros exactos inmóviles de forma finita y determinista',()=>{
  const a=car('a','white-empanade'),b=car('b','black-diamond');resolveVehicleCollision(a,b);
  expect([a.x,a.z,b.x,b.z,a.pushX,b.pushX].every(Number.isFinite)).toBe(true);expect(vehicleContact(a,b)).toBeNull();expect(a.pushX).toBe(0);expect(b.pushX).toBe(0);
  const c=car('a','white-empanade'),d=car('b','black-diamond');resolveVehicleCollision(c,d);expect(c.x).toBe(a.x);expect(d.x).toBe(b.x);
 });
 it('respeta el salto y dos niveles separados de la pista',()=>{
  const a=car('a','silver-surfer'),b=car('b','white-empanade');a.y=.6;a.vy=2;
  expect(resolveVehicleCollision(a,b).collided).toBe(false);a.vy=0;a.y=2;expect(resolveVehicleCollision(a,b).collided).toBe(false);
 });
 it('el golpe tiene recorrido durante medio segundo y no se borra al acelerar',()=>{
  const p=car('p','black-diamond');p.pushX=10;
  for(let i=0;i<30;i++)stepPlayer(p,{...EMPTY_INPUT,assist:false},routeFor('la-salle'),'battle');
  expect(p.pushX).toBeGreaterThan(4);expect(p.x).toBeGreaterThan(3);
 });
 it('dirección e inercia responden progresivamente y el derrape abre el arco',()=>{
  const grip=car('g','hola-willy'),drift=car('d','hola-willy');grip.speed=drift.speed=20;
  const turn={...EMPTY_INPUT,steer:.6,assist:false};stepPlayer(grip,turn,routeFor('la-salle'),'battle');
  expect(grip.turnRate).toBeGreaterThan(0);expect(grip.turnRate).toBeLessThan(.6);expect(grip.steerAngle).toBeGreaterThan(0);
  // Start both branches from the same state, away from arena boundaries.
  Object.assign(drift,grip,{id:'d'});
  for(let i=0;i<40;i++){stepPlayer(grip,turn,routeFor('la-salle'),'battle');stepPlayer(drift,{...turn,drift:true},routeFor('la-salle'),'battle');}
  expect(Math.abs(drift.lateralSpeed)).toBeGreaterThan(Math.abs(grip.lateralSpeed)*1.6);
  stepPlayer(drift,EMPTY_INPUT,routeFor('la-salle'),'battle');expect(drift.boost).toBeGreaterThan(0);
 });
 it('el borde retorna con suavidad y permite usar el atajo',()=>{
  const route=routeFor('la-salle'),q=sample(route,80),p=car('p','silver-surfer');p.x=q.x+Math.cos(q.yaw)*route.width*.78;p.z=q.z-Math.sin(q.yaw)*route.width*.78;p.y=q.y;p.progress=80;p.yaw=q.yaw;p.pushX=Math.cos(q.yaw)*8;p.pushZ=-Math.sin(q.yaw)*8;
  const before=closest(route,p.x,p.z).distance,curb=stepPlayer(p,{...EMPTY_INPUT,assist:false},route,'race');
  expect(curb).toBeDefined();expect(closest(route,p.x,p.z).distance).toBeLessThan(before+.1);expect(p.stun).toBe(0);
  const market=routeFor('oriental'),lane=market.lanes[0],mid=sampleLane(lane,lane.length*.4),other=car('cut','silver-surfer');Object.assign(other,{x:mid.x,z:mid.z,y:mid.y,yaw:mid.yaw,progress:lane.from+(lane.to-lane.from)*.4,speed:15});
  expect(stepPlayer(other,EMPTY_INPUT,market,'race')).toBeUndefined();expect(closest(market,other.x,other.z,{hint:other.progress}).lane).toBe(lane.id);
 });
 it('protege datos no finitos y conserva la nueva dinámica en el estado online',()=>{
  const s=new Simulation('battle'),p=s.addPlayer(car('p','silver-surfer'));p.speed=NaN;p.lateralSpeed=Infinity;p.pushX=NaN;p.turnRate=NaN;
  stepPlayer(p,EMPTY_INPUT,s.route,'battle');expect([p.x,p.z,p.speed,p.lateralSpeed,p.pushX,p.turnRate].every(Number.isFinite)).toBe(true);
  p.steerAngle=.22;p.turnRate=.4;p.lateralSpeed=-1.2;p.impact=.7;const w=new RaceWire();syncWire(w,s.state);const wire=fromWire(w).players[0];expect([wire.steerAngle,wire.turnRate,wire.lateralSpeed,wire.impact]).toEqual([.22,.4,-1.2,.7]);
 });
 it('el pelotón mixto no se superpone tras un choque normal y mantiene pilotos en carrera',()=>{
  const s=new Simulation('battle');for(let i=0;i<6;i++){const p=s.addPlayer(car(String(i),VEHICLES[i].id));p.x=(i%3)*2;p.z=Math.floor(i/3)*4;p.yaw=i<3?0:Math.PI;p.speed=20;}
  s.state.phase='running';s.tick();
  for(let i=0;i<s.state.players.length;i++)for(let j=i+1;j<s.state.players.length;j++)expect(vehicleContact(s.state.players[i],s.state.players[j])?.penetration??0).toBeLessThan(.002);
  expect(s.state.players.every(p=>[p.x,p.z,p.pushX,p.pushZ].every(Number.isFinite)&&p.stun===0)).toBe(true);
 });
 it('los que terminaron siguen rodando y no se convierten en fantasmas sobre la meta',()=>{
  const s=new Simulation('race'),done=s.addPlayer(car('done','white-empanade')),next=s.addPlayer(car('next','black-diamond'));s.state.phase='running';
  const q=sample(s.route,10);Object.assign(done,{x:q.x,z:q.z,yaw:q.yaw,progress:10,speed:20,finishTime:150,ack:88,actionSeq:9,charges:6});
  Object.assign(next,{x:q.x+Math.cos(q.yaw)*1.5,z:q.z-Math.sin(q.yaw)*1.5,yaw:q.yaw,progress:10,speed:20});
  s.inputs.set(done.id,{...EMPTY_INPUT,seq:99,actionSeq:10,brake:true,attack:4});s.state.time=150;const x=done.x,z=done.z;s.tick();
  expect(Math.hypot(done.x-x,done.z-z)).toBeGreaterThan(.1);expect(vehicleContact(done,next)).toBeNull();expect(done.finishTime).toBe(150);expect(done.ack).toBe(88);expect(done.actionSeq).toBe(9);expect(done.charges).toBe(6);expect(s.state.shots.some(shot=>shot.owner===done.id)).toBe(false);
 });
 it('todos los tipos de vehículo conservan una vuelta accesible con ayudas y bots en los seis mundos',()=>{
  for(const t of TRACKS){const s=new Simulation('race',t.id);for(let i=0;i<6;i++)s.addPlayer(makePlayer('bot-'+i,'Bot',CHARACTERS[i].id,VEHICLES[i].id,i,true));s.start();
   for(let i=0;i<19000&&s.state.phase!=='results';i++)s.tick(FIXED_DT);
   expect(s.state.players.filter(p=>p.finishTime>=0).length,t.id).toBeGreaterThanOrEqual(4);expect(s.state.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.speed)),t.id).toBe(true);expect(s.state.phase,t.id).toBe('results');
  }
 },30000);
});
