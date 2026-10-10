import { describe,it,expect } from 'vitest';
import { CHARACTERS,TRACKS,VEHICLES } from '../shared/content';
import { AIR,DRIVE,Simulation,makePlayer,stepPlayer,groundAt } from '../shared/simulation';
import { closest,routeFor,sample,sampleLane } from '../shared/track';
import { hazardsFor } from '../shared/hazards';
import { EMPTY_INPUT,type PlayerState } from '../shared/types';

const put=(trackId:string,distance:number,speed=20,vehicleId='silver-surfer')=>{const r=routeFor(trackId),q=sample(r,distance),p=makePlayer('p','p','semilla',vehicleId,0);Object.assign(p,{x:q.x,z:q.z,y:q.y,yaw:q.yaw,progress:distance,safe:distance,speed});return{r,p};};
const drive=(p:PlayerState,trackId:string,seconds:number,input:Partial<typeof EMPTY_INPUT>={})=>{const r=routeFor(trackId);for(let i=0;i<seconds*60;i++)stepPlayer(p,{...EMPTY_INPUT,assist:true,...input},r,'race');};

describe('pistas: rampas, saltos, caídas y rutas',()=>{
 it('cada pista tiene un gran salto con súper turbo antes, rampas pequeñas, una ruta alterna y señales de riesgo',()=>{
  for(const t of TRACKS){const c=routeFor(t.id).course;
   const big=c.ramps.filter(r=>r.big&&r.lane==='');expect(big.length,t.id).toBeGreaterThanOrEqual(1);
   for(const r of big){expect(c.pads.some(p=>p.super&&p.lane===''&&p.at<r.at&&r.at-p.at<40),t.id+' súper turbo antes del gran salto').toBe(true);expect(c.gaps.some(g=>g.lane===''&&g.from>=r.at+r.len&&g.from-(r.at+r.len)<8),t.id+' hueco tras el labio').toBe(true);}
   expect(c.ramps.filter(r=>!r.big).length,t.id).toBeGreaterThanOrEqual(2);expect(routeFor(t.id).lanes.length,t.id).toBeGreaterThanOrEqual(1);expect(c.items.length,t.id).toBeGreaterThanOrEqual(3);
  }
 });
 it('tomar el gran salto de frente siempre libra el hueco, también con la velocidad mínima',()=>{
  for(const t of TRACKS){const r=routeFor(t.id),big=r.course.ramps.find(v=>v.big&&v.lane==='')!,gap=r.course.gaps.find(g=>g.lane===''&&g.from>=big.at)!;
   for(const speed of [13,20,27]){const {p}=put(t.id,big.at-30,speed);let airborne=false;for(let i=0;i<300;i++){stepPlayer(p,{...EMPTY_INPUT,assist:true},r,'race');if(p.air>0)airborne=true;if(p.progress>gap.to+12&&p.air===0)break;}
    expect(airborne,t.id+' despega a '+speed).toBe(true);expect(p.fall,t.id+' no cae a '+speed).toBe(0);expect(p.progress,t.id+' aterriza del otro lado a '+speed).toBeGreaterThan(gap.to);}
  }
 });
 it('caer en un hueco devuelve al último punto seguro, detrás de la caída y sin saltarse la pista',()=>{
  const r=routeFor('la-salle'),gap=r.course.gaps.find(g=>g.lane==='')!,q=sample(r,(gap.from+gap.to)/2),p=makePlayer('p','p','semilla','silver-surfer',0);
  // Lento y por un costado de la rampa: cae en el hueco.
  Object.assign(p,{x:q.x,z:q.z,y:q.y,yaw:q.yaw,progress:(gap.from+gap.to)/2,safe:gap.from-60,speed:6});
  expect(groundAt(r,closest(r,p.x,p.z,{hint:p.progress}))).toBeNull();
  let fell=false,frames=0;for(let i=0;i<400;i++){stepPlayer(p,{...EMPTY_INPUT,assist:false},r,'race');if(p.fall>0)fell=true;if(fell&&p.fall===0){frames=i;break;}}
  expect(fell).toBe(true);expect(p.progress).toBe(gap.from-60);expect(p.progress).toBeLessThan(gap.from);expect(p.respawn).toBeGreaterThan(0);expect(p.immune).toBeGreaterThan(1);
  expect(frames/60).toBeGreaterThan(AIR.fallTime*.9);expect(frames/60).toBeLessThan(AIR.fallTime+1.2);
 });
 it('el punto seguro nunca queda junto a un hueco ni en una ruta alterna',()=>{
  const r=routeFor('managua'),{p}=put('managua',r.course.ramps.find(v=>v.big)!.at-120,20);drive(p,'managua',8);
  const gap=r.course.gaps.find(g=>g.lane==='')!;expect(p.safe<gap.from-30||p.safe>gap.to).toBe(true);
 });
 it('salirse por el borde abierto del mirador cae al agua y vuelve antes del mirador',()=>{
  const r=routeFor('managua'),lane=r.lanes.find(l=>l.id==='mirador')!,q=sampleLane(lane,lane.length*.5),p=makePlayer('p','p','semilla','black-diamond',0);
  Object.assign(p,{x:q.x+Math.cos(q.yaw)*lane.width*.4,z:q.z-Math.sin(q.yaw)*lane.width*.4,y:q.y,yaw:q.yaw+.9,speed:16,progress:lane.from+(lane.to-lane.from)*.5,safe:lane.from-20,lap:0});
  let kind='';for(let i=0;i<240;i++){stepPlayer(p,{...EMPTY_INPUT,assist:false},r,'race');if(p.fall>0)kind=p.fallKind;else if(kind)break;}
  expect(kind).toBe('water');expect(p.progress).toBeLessThan(lane.from);
 });
 it('los pads dan súper turbo y el súper turbo supera la punta normal',()=>{
  const r=routeFor('masaya'),pad=r.course.pads.find(v=>v.super&&v.lane==='')!,{p}=put('masaya',pad.at-6,20);drive(p,'masaya',.6);
  expect(p.boostLevel).toBe(4);expect(p.speed).toBeGreaterThan(DRIVE.topSpeed*1.1);
 });
 it('las canchas de La Salle se abren desde la segunda vuelta',()=>{
  const r=routeFor('la-salle'),lane=r.lanes[0],q=sampleLane(lane,lane.length*.3);
  expect(closest(r,q.x,q.z,{lap:0}).lane).toBe('');expect(closest(r,q.x,q.z,{lap:1}).lane).toBe(lane.id);
 });
 it('en el paso a desnivel de Managua cada nivel conserva su propio avance',()=>{
  const r=routeFor('managua');let lower=0,upper=0,best=Infinity;
  for(let d=0;d<r.length*.45;d+=1){const a=sample(r,d);for(let e=r.length*.5;e<r.length*.8;e+=1){const b=sample(r,e),gap=Math.hypot(a.x-b.x,a.z-b.z);if(gap<best){best=gap;lower=d;upper=e;}}}
  expect(best).toBeLessThan(2);const a=sample(r,lower),b=sample(r,upper);expect(b.y-a.y).toBeGreaterThan(5);
  expect(Math.abs(closest(r,a.x,a.z,{y:a.y,hint:lower}).progress-lower)).toBeLessThan(3);expect(Math.abs(closest(r,b.x,b.z,{y:b.y,hint:upper}).progress-upper)).toBeLessThan(3);
  // Un carro que pasa por abajo sigue por abajo.
  const {p}=put('managua',lower-25,20);drive(p,'managua',2.5);expect(p.progress).toBeGreaterThan(lower+15);expect(p.progress).toBeLessThan(lower+60);expect(p.y).toBeLessThan(1);
 });
 it('los peatones avisan su ritmo y un choque aturde poco y sin repetirse',()=>{
  const s=new Simulation('race','oriental'),p=s.addPlayer(makePlayer('p','p','semilla','silver-surfer',0));s.start();s.state.phase='running';
  const walk=hazardsFor('oriental',0).filter(h=>h.kind==='pedestrian');expect(walk.length).toBeGreaterThanOrEqual(5);
  // Same hazard over time: it moves, then pauses on the kerb (predictable).
  const path=Array.from({length:60},(_,i)=>hazardsFor('oriental',i*.2).find(h=>h.id===walk[0].id)!);expect(path.some(h=>h.phase===0)).toBe(true);expect(path.some(h=>h.phase===1)).toBe(true);
  const h=walk[0];Object.assign(p,{x:h.x,z:h.z,y:h.y,speed:18});s.state.time=0;s.tick();
  expect(p.stun).toBeGreaterThan(0);expect(p.stun).toBeLessThan(.6);expect(p.immune).toBeGreaterThan(1);expect(s.state.events.some(e=>e.type==='hit'&&e.object==='pedestrian')).toBe(true);
 });
 it('las seis pistas se completan con bots que usan rutas, pads e ítems',()=>{
  for(const t of TRACKS){const s=new Simulation('race',t.id);s.difficulty=2;for(let i=0;i<8;i++)s.addPlayer(makePlayer('bot-'+i,'Bot',CHARACTERS[i%9].id,VEHICLES[i%6].id,i,true));s.start();
   const lanes=new Set<string>();for(let i=0;i<22000&&s.state.phase!=='results';i++){s.tick();if(i%30===0)for(const p of s.state.players){const q=closest(s.route,p.x,p.z,{y:p.y,hint:p.progress,lap:p.lap});if(q.lane)lanes.add(q.lane);}}
   expect(s.state.phase,t.id).toBe('results');expect(s.state.players.filter(p=>p.finishTime>=0).length,t.id).toBeGreaterThanOrEqual(6);expect(lanes.size,t.id+' alguien tomó la ruta alterna').toBeGreaterThanOrEqual(1);
  }
 },60000);
});
