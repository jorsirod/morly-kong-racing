// Probe: simulated laps per track and driving style (npx tsx scripts/probes/drive.ts [all|laps|cars|steer]).
import { Simulation, makePlayer, stepPlayer } from '../../shared/simulation';
import { routeFor, closest, sample, angle, clamp } from '../../shared/track';
import { TRACKS, VEHICLES } from '../../shared/content';
import { EMPTY_INPUT, FIXED_DT } from '../../shared/types';
import { keyRamp } from '../../src/game/input';
const mode=process.argv[2]??'all';
// Keyboard-like novice: digital steering with 0.15s reaction delay, aims 14m ahead.
function lap(trackId:string,vehicleId:string,assist:boolean,style:'kb'|'stick'|'none',drift=false){
 const sim=new Simulation('practice',trackId);const p=sim.addPlayer(makePlayer('a','a','semilla',vehicleId,0));sim.start();sim.state.phase='running';
 const route=routeFor(trackId);let off=0,verge=0,t=0,hist:number[]=[],maxLat=0,yawFlips=0,lastSign=0,boosts=0,kdir=0,kheld=0;
 while(p.gate<9&&t<200){
  const q=closest(route,p.x,p.z);if(q.distance>route.width*.5)off+=FIXED_DT;if(q.distance>route.width*.7)verge+=FIXED_DT;
  const aim=sample(route,q.progress+14);const to=angle(Math.atan2(aim.x-p.x,aim.z-p.z)-p.yaw);hist.push(to);const delayed=hist[Math.max(0,hist.length-10)];
  const kd=Math.abs(delayed)>.06?Math.sign(delayed):0;if(kd!==kdir){kdir=kd;kheld=0;}else kheld+=FIXED_DT;
  let steer=style==='none'?0:style==='kb'?(kd?kd*keyRamp(kheld):0):clamp(delayed*2.2,-1,1);
  const s=Math.sign(p.turnRate);if(s&&s!==lastSign){yawFlips++;lastSign=s;}
  const b0=p.boost;sim.inputs.set('a',{...EMPTY_INPUT,seq:sim.state.tick,steer,assist,drift:drift&&Math.abs(delayed)>.25});sim.tick();if(b0<=0&&p.boost>0)boosts++;
  maxLat=Math.max(maxLat,Math.abs(p.lateralSpeed));t+=FIXED_DT;
 }
 return {t:+t.toFixed(1),off:+off.toFixed(1),verge:+verge.toFixed(1),flips:yawFlips,maxLat:+maxLat.toFixed(1),boosts};
}
if(mode==='all'||mode==='laps'){
 for(const tr of TRACKS){const r:any={};for(const [k,a,s,d] of [['kb-assist',true,'kb',false],['kb-raw',false,'kb',false],['stick',true,'stick',false],['hands-off',true,'none',false],['drift',true,'stick',true]] as const)r[k]=lap(tr.id,'silver-surfer',a,s,d);console.log(tr.id,JSON.stringify(r));}
}
if(mode==='all'||mode==='cars'){for(const v of VEHICLES)console.log(v.id,JSON.stringify(lap('la-salle',v.id,true,'stick')),JSON.stringify(lap('masaya',v.id,true,'stick')));}
// Steering response: speed 20, full steer step
if(mode==='all'||mode==='steer'){for(const v of VEHICLES){const sim=new Simulation('practice','la-salle');const p=sim.addPlayer(makePlayer('a','a','semilla',v.id,0));sim.start();p.speed=19;let t=0,t63=-1,peak=0;const route=routeFor('la-salle');for(let i=0;i<60;i++){stepPlayer(p,{...EMPTY_INPUT,steer:1,assist:false},route,'battle');t+=FIXED_DT;peak=Math.max(peak,p.turnRate);}
 const sim2=new Simulation('practice','la-salle');const q=sim2.addPlayer(makePlayer('a','a','semilla',v.id,0));sim2.start();q.speed=19;for(let i=0;i<60;i++){stepPlayer(q,{...EMPTY_INPUT,steer:1,assist:false},route,'battle');if(t63<0&&q.turnRate>peak*.63)t63=i*FIXED_DT;}
 console.log(v.id,'yawRate',peak.toFixed(2),'t63',t63.toFixed(2),'radius',(19/peak).toFixed(1));}}
