import { hazardsFor } from './hazards';
import { resolveVehicleCollision, vehicleDynamics, vehicleVelocity } from './dynamics';
import { character, vehicle, TRACKS } from './content';
import { angle, clamp, closest, lerp, routeFor, sample, type Route } from './track';
import { EMPTY_INPUT, FIXED_DT, type AttackDefinition, type GameState, type Mode, type PlayerInput, type PlayerState, type Shot } from './types';

export function makePlayer(id:string,nickname:string,characterId:string,vehicleId:string,color:number,bot=false):PlayerState {
 return { id,nickname,characterId,vehicleId,color,bot,connected:!bot,ready:bot,x:0,y:0,z:0,yaw:0,speed:0,steerAngle:0,turnRate:0,lateralSpeed:0,impact:0,vy:0,pushX:0,pushZ:0,progress:0,gate:0,lap:0,charges:0,score:0,cupPoints:0,cupTime:0,finishTime:-1,stun:0,immune:0,cooldown:0,boost:0,driftCharge:0,sliding:0,haze:0,paint:0,ack:0,actionSeq:0,draft:0,driftDir:0,yawKick:0,surface:0,recover:0,aid:0,boostLevel:0,air:0,launch:0,hitsGiven:0,hitsTaken:0,turbos:0,bumps:0,tows:0,lapStart:0,bestLap:-1 };
}
export function normalizeInput(data:unknown):PlayerInput | null {
 if(!data || typeof data!=='object')return null;const d=data as Record<string,unknown>;
 if(!Number.isSafeInteger(d.seq)||Number(d.seq)<0||!Number.isSafeInteger(d.actionSeq)||Number(d.actionSeq)<0||typeof d.steer!=='number'||!Number.isFinite(d.steer)||!Number.isInteger(d.attack)||Number(d.attack)<0||Number(d.attack)>4)return null;
 return{seq:Number(d.seq),actionSeq:Number(d.actionSeq),steer:clamp(d.steer,-1,1),brake:d.brake===true,drift:d.drift===true,attack:Number(d.attack),assist:d.assist!==false};
}
/** Tunables shared by client prediction and the authoritative server. */
/** Seconds of the pre-race intro shot before the 3-2-1. */
export const INTRO = 1.6;
export const DRIVE = {
 topSpeed: 20, driftTier1: .6, driftTier2: 1.5, tier1Boost: .8, tier2Boost: 1.3, tier1Kick: 3, tier2Kick: 5,
 boostFactor: 1.24, draftTime: 1.1, maxAid: .045,
} as const;
/** Steering capacity at full lock, in rad/s. Tighter at low speed, calmer at top speed. */
export function yawCapacity(speed:number,handling:number){
 const s=Math.abs(speed);
 return (1.78-.58*clamp((s-6)/14,0,1))*(1+.06*(handling-3))*clamp(s/5.5,0,1);
}
/** Signed lateral offset from the centre line (right positive) and heading relative to the road. */
export function roadFrame(route:Route,p:{x:number;z:number;yaw:number}){
 const q=closest(route,p.x,p.z),offset=(p.x-q.x)*Math.cos(q.yaw)-(p.z-q.z)*Math.sin(q.yaw);
 return{q,offset,heading:angle(p.yaw-q.yaw)};
}
export function stepPlayer(p:PlayerState,input:PlayerInput,route:Route,mode:Mode,dt=FIXED_DT) {
 if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);
 const stats=vehicle(p.vehicleId).stats,dynamics=vehicleDynamics(p.vehicleId),battle=mode==='battle';
 // Old cached clients and malformed coordinates cannot poison an entire room.
 for(const key of ['speed','steerAngle','turnRate','lateralSpeed','impact','pushX','pushZ','yaw','vy','driftDir','yawKick','recover','aid','boostLevel','air','surface'] as const)if(!Number.isFinite(p[key]))p[key]=0;
 if(![p.x,p.y,p.z].every(Number.isFinite)){const safe=sample(route,Number.isFinite(p.progress)?p.progress:0);p.x=safe.x;p.y=safe.y;p.z=safe.z;p.yaw=safe.yaw;p.speed=0;p.pushX=p.pushZ=0;}
 p.impact*=Math.exp(-5*dt);let curb:{x:number;y:number;z:number;intensity:number}|undefined;
 const wasStunned=p.stun>0;
 p.stun=Math.max(0,p.stun-dt);p.immune=Math.max(0,p.immune-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.boost=Math.max(0,p.boost-dt);p.sliding=Math.max(0,p.sliding-dt);p.haze=Math.max(0,p.haze-dt);p.paint=Math.max(0,p.paint-dt);p.recover=Math.max(0,p.recover-dt);
 if(p.boost<=0)p.boostLevel=0;
 // Getting back up after a spin should feel quick: a short burst of extra pull.
 if(wasStunned&&p.stun<=0)p.recover=1.1;
 const frame=roadFrame(route,p),q=frame.q;
 const halfWidth=route.width*.5,offroad=!battle&&!q.shortcut&&q.distance>halfWidth;
 const fraction=q.progress/route.length,rough=!battle&&(q.shortcut||!!route.roughRanges?.some(([a,b])=>fraction>=a&&fraction<=b));
 p.surface=offroad?2:rough?1:0;
 const terrain=stats[4],surfaceSpeed=offroad?.66+.045*terrain:rough?.82+.035*terrain:1;
 const boosting=p.boost>0;
 const vmax=DRIVE.topSpeed*(1+.04*(stats[0]-3))*(boosting?DRIVE.boostFactor:1)*(boosting&&offroad?Math.max(1,1/surfaceSpeed):surfaceSpeed)*(p.sliding>0?.74:1)*(1+DRIVE.maxAid*clamp(p.aid,0,1));
 // Strong pull from low speed, tapering near the top: quick recoveries, calm top end.
 const ratio=clamp(p.speed/Math.max(1,vmax),0,1.2);
 let accel=13.5*(1+.08*(stats[1]-3))*(1-.62*ratio*ratio);
 if(p.recover>0)accel*=1.45;if(boosting)accel=Math.max(accel,16);

 // ---- Steering ----
 let steer=Number.isFinite(input.steer)?clamp(input.steer,-1,1):0;
 if(input.assist&&!battle&&!q.shortcut) {
  // Path assist fades quickly as soon as the player expresses an intention.
  const aim=sample(route,q.progress+clamp(p.speed*.9,12,28)),to=angle(Math.atan2(aim.x-p.x,aim.z-p.z)-p.yaw);
  const freedom=(1-Math.abs(steer))**2;
  steer=clamp(steer+freedom*.5*clamp(to*1.3,-.9,.9),-1,1);
  // Edge guard: near the verge and heading out, steer gently back. It never blocks the player.
  const edge=clamp((Math.abs(frame.offset)-(halfWidth-2.6))/2.6,0,1),outward=Math.sin(frame.heading)*Math.sign(frame.offset);
  if(edge>0&&outward>0&&p.speed>4)steer=clamp(steer-Math.sign(frame.offset)*edge*clamp(outward*5,0,1)*.75,-1,1);
 }
 const handling=stats[2],capacity=yawCapacity(p.speed,handling);
 const stunned=p.stun>0;if(stunned){p.speed*=Math.exp(-9*dt);steer*=.15;}
 else if(input.brake){p.speed=p.speed>0?Math.max(0,p.speed-26*dt):Math.min(0,p.speed+26*dt);}
 else if(p.speed<vmax)p.speed=Math.min(vmax,p.speed+Math.max(1.5,accel)*dt);
 else p.speed=lerp(p.speed,vmax,Math.min(1,dt*(boosting?6:2.2)));

 // ---- Drift: clear entry, a locked direction, two charge tiers and a punchy exit ----
 const grounded=p.vy===0||battle;
 const canDrift=input.drift&&p.speed>9.5&&!stunned&&p.sliding<=0;
 if(canDrift&&p.driftDir===0&&Math.abs(steer)>.28&&grounded){p.driftDir=Math.sign(steer);p.driftCharge=0;}
 if(p.driftDir!==0&&!canDrift){
  // Release: tier 2 (orange) or tier 1 (blue). Releasing early only ends the slide.
  if(p.driftCharge>=DRIVE.driftTier1&&!stunned){const tier2=p.driftCharge>=DRIVE.driftTier2;p.boost=Math.max(p.boost,tier2?DRIVE.tier2Boost:DRIVE.tier1Boost);p.boostLevel=Math.max(p.boostLevel,tier2?3:2);p.turbos=(p.turbos||0)+1;p.speed=Math.min(p.speed+(tier2?DRIVE.tier2Kick:DRIVE.tier1Kick),vmax*DRIVE.boostFactor+2);}
  p.driftDir=0;p.driftCharge=0;
 }
 const drifting=p.driftDir!==0;
 let targetTurn:number;
 if(drifting){
  const inside=clamp(steer*p.driftDir,-1,1);
  // Neutral stick holds a medium arc; pushing in tightens it, counter-steer opens it.
  targetTurn=p.driftDir*capacity*(.68+.56*inside);
  if(grounded)p.driftCharge+=dt*(.72+.6*Math.max(0,inside))*(p.surface===2?.5:1);
 } else {
  targetTurn=steer*capacity*(input.brake&&p.speed>6?1.22:1)*(p.sliding>0?.7:1);
  if(p.driftCharge>0&&!input.drift)p.driftCharge=0;
 }
 p.steerAngle=lerp(p.steerAngle,(drifting?clamp(steer*.7+p.driftDir*.25,-1,1):steer)*.48,1-Math.exp(-14*dt));
 const response=dynamics.steeringResponse*(drifting?.8:1);
 p.turnRate=lerp(p.turnRate,targetTurn,1-Math.exp(-response*dt));
 // Impact spin is a separate yaw velocity; stability decides how fast it settles.
 p.yawKick*=Math.exp(-(2.6+.55*stats[3])*dt);if(Math.abs(p.yawKick)<.002)p.yawKick=0;
 const turn=(p.turnRate+p.yawKick)*dt;p.yaw=angle(p.yaw+turn);
 // The chassis turns before its momentum catches up. Grip makes it forgiving;
 // a drift deliberately carries the tail outward.
 const lateralLimit=Math.max(2,Math.abs(p.speed)*.5);
 p.lateralSpeed=clamp(p.lateralSpeed-p.speed*turn,-lateralLimit,lateralLimit);
 if(drifting)p.lateralSpeed=lerp(p.lateralSpeed,-p.driftDir*p.speed*.17,1-Math.exp(-3.2*dt));
 const surfaceGrip=p.surface===2?.72:p.surface===1?.86:1;
 const grip=p.sliding>0?1.5:stunned?3:drifting?dynamics.driftGrip:dynamics.grip*surfaceGrip;
 p.lateralSpeed*=Math.exp(-grip*dt);
 // Shoves fade with the car's own damping; heavy, stable cars shrug them off sooner.
 const damping=dynamics.impactDamping*(1+.08*(stats[3]-3))*(p.surface===2?1.25:1);
 p.pushX*=Math.exp(-damping*dt);p.pushZ*=Math.exp(-damping*dt);
 p.x+=(Math.sin(p.yaw)*p.speed+Math.cos(p.yaw)*p.lateralSpeed+p.pushX)*dt;p.z+=(Math.cos(p.yaw)*p.speed-Math.sin(p.yaw)*p.lateralSpeed+p.pushZ)*dt;
 if(battle) {
  const bounce=(axis:'x'|'z')=>{p.speed*=.62;p.lateralSpeed*=.4;p.turnRate*=.4;p.yawKick*=.3;p.impact=Math.max(p.impact,.3);if(p.driftDir){p.driftDir=0;p.driftCharge=0;}if(axis==='x')p.pushX*=-.2;else p.pushZ*=-.2;};
  if(Math.abs(p.x)>77-dynamics.halfWidth){p.x=clamp(p.x,-77+dynamics.halfWidth,77-dynamics.halfWidth);p.yaw=-p.yaw;bounce('x');}
  if(Math.abs(p.z)>62-dynamics.halfLength){p.z=clamp(p.z,-62+dynamics.halfLength,62-dynamics.halfLength);p.yaw=Math.PI-p.yaw;bounce('z');}
  p.y=0;p.vy=0;p.air=0;
 } else {
  const n=closest(route,p.x,p.z);
  if(!n.shortcut&&n.distance>route.width*.70&&n.distance<route.width*2.5){
   const nx=(p.x-n.x)/n.distance,nz=(p.z-n.z)/n.distance,penetration=n.distance-route.width*.70,velocity=vehicleVelocity(p),outward=velocity.x*nx+velocity.z*nz;
   // A forgiving verge catches the tail instead of teleporting or killing all speed.
   const response=(penetration*7+Math.max(0,outward)*3)*dt;
   p.pushX-=nx*response;p.pushZ-=nz*response;
   const correction=Math.min(.3,penetration*.08);p.x-=nx*correction;p.z-=nz*correction;
   p.speed*=Math.exp(-Math.min(penetration,8)*.25*dt);
   // Scraping the barrier while sliding cancels the drift charge.
   if(outward>4&&p.driftDir){p.driftCharge=Math.min(p.driftCharge,DRIVE.driftTier1*.5);}
   if(outward>2){const intensity=clamp(outward/22,.12,.65);p.impact=Math.max(p.impact,intensity);curb={x:p.x,y:p.y,z:p.z,intensity};}
  }
  let delta=n.progress-(((p.progress%route.length)+route.length)%route.length);
  if(delta>route.length/2)delta-=route.length;if(delta<-route.length/2)delta+=route.length;
  if(Math.abs(delta)<8)p.progress+=delta;
  const target=Math.floor(p.gate/8)*route.length+(p.gate%8)*route.length/8;
  if(p.progress>=target&&p.progress-target<18&&n.distance<route.width&&p.finishTime<0){p.gate++;p.lap=Math.max(0,Math.floor((p.gate-1)/8));}
  if(n.distance>route.width*2.5){const restore=sample(route,p.progress);p.x=restore.x;p.z=restore.z;p.yaw=restore.yaw;p.speed=Math.max(10,p.speed*.5);p.pushX=0;p.pushZ=0;p.lateralSpeed=0;p.turnRate=0;p.yawKick=0;p.driftDir=0;p.driftCharge=0;}
  // A small ramp near the last third of every circuit, with real airborne motion.
  const ramp=(p.progress/route.length)%1;
  if(ramp>.68&&ramp<.687&&p.y<=n.y+.05&&p.speed>14&&p.vy===0)p.vy=4.4;
  if(p.vy!==0||p.y>n.y+.1){
   p.vy-=12*dt;p.y+=p.vy*dt;p.air+=dt;
   if(p.y<n.y){
    p.y=n.y;
    // A clean landing from a real jump gives a small push; a stunned one does not.
    if(p.air>.45&&!stunned&&p.vy<-3){p.boost=Math.max(p.boost,.45);p.boostLevel=Math.max(p.boostLevel,1);}
    p.vy=0;p.air=0;
   }
  }else{p.y=n.y;p.air=0;}
  if(n.shortcut&&p.stun<=0){p.boost=Math.max(p.boost,.3);p.boostLevel=Math.max(p.boostLevel,1);}
 }
 return curb;
}
/** Three different worlds starting from the chosen one. */
export function cupFor(trackId:string){const i=Math.max(0,TRACKS.findIndex(t=>t.id===trackId));return [0,1,2].map(k=>TRACKS[(i+k)%TRACKS.length].id);}
export function ranking(state:GameState):PlayerState[] {
 return [...state.players].sort((a,b)=>state.mode==='battle'?b.score-a.score||a.id.localeCompare(b.id):(a.finishTime>=0&&b.finishTime>=0?a.finishTime-b.finishTime:a.finishTime>=0?-1:b.finishTime>=0?1:b.progress-a.progress));
}
export function cupRanking(state:GameState){return [...state.players].sort((a,b)=>b.cupPoints-a.cupPoints||a.cupTime-b.cupTime||a.id.localeCompare(b.id));}

export class Simulation {
 state:GameState; route:Route; inputs=new Map<string,PlayerInput>(); private shotId=0;private castId=0;private eventId=0;private firstFinish=-1;private curbEvents=new Map<string,number>();private launchHeld=new Map<string,boolean>();private bumpTimes=new Map<string,number>();
 constructor(mode:Mode='race',trackId='la-salle') {
  this.route=routeFor(trackId);this.state={version:1,phase:'lobby',mode,trackId,cup:mode==='championship'?cupFor(trackId).join(','):'',time:0,tick:0,round:1,countdown:3,players:[],shots:[],pickups:[],events:[],hostId:''};this.setupPickups();
 }
 addPlayer(p:PlayerState){if(this.state.players.length>=12)throw new Error('Sala completa');this.state.players.push(p);if(!this.state.hostId&&!p.bot)this.state.hostId=p.id;this.place(p,this.state.players.length-1);return p;}
 place(p:PlayerState,index:number) {
  const points=p.cupPoints,totalTime=p.cupTime,bot=p.bot,ready=p.ready,connected=p.connected;
  Object.assign(p,makePlayer(p.id,p.nickname,p.characterId,p.vehicleId,p.color,bot));p.cupPoints=points;p.cupTime=totalTime;p.ready=ready;p.connected=connected;
  if(this.state.mode==='battle'){const a=index/12*Math.PI*2;p.x=Math.cos(a)*45;p.z=Math.sin(a)*45;p.yaw=Math.atan2(-p.x,-p.z);p.charges=3;}
  else{const d=-18-Math.floor(index/2)*6,pt=sample(this.route,d),offset=(index%2===0?-2.8:2.8);p.x=pt.x+Math.cos(pt.yaw)*offset;p.z=pt.z-Math.sin(pt.yaw)*offset;p.y=pt.y;p.yaw=pt.yaw;p.progress=d;p.charges=this.state.mode==='practice'?3:0;}
 }
 /** Charge boxes come in rows of three across the road, like item rows: one pick per row per car.
  * Battle keeps a ring of boxes plus a cluster in the middle to force encounters. */
 setupPickups(){
  if(this.state.mode==='battle'){this.state.pickups=[...Array.from({length:10},(_,i)=>({id:i,x:Math.cos(i*Math.PI/5)*42,y:0,z:Math.sin(i*Math.PI/5)*34,availableAt:0})),...[[-6,0],[6,0],[0,-6],[0,6]].map(([x,z],i)=>({id:10+i,x,y:0,z,availableAt:0}))];return;}
  const rows=[.06,.17,.29,.41,.55,.66,.79,.9],out:GameState['pickups']=[];
  rows.forEach((f,r)=>{const t=sample(this.route,f*this.route.length);for(const [k,o] of [-4.6,0,4.6].entries())out.push({id:r*3+k,x:t.x+Math.cos(t.yaw)*o,y:t.y,z:t.z-Math.sin(t.yaw)*o,availableAt:0});});
  this.state.pickups=out;
 }
 start(){this.state.phase='countdown';this.state.countdown=INTRO+3;this.launchHeld.clear();this.bumpTimes.clear();this.state.time=0;this.state.shots=[];this.firstFinish=-1;this.curbEvents.clear();this.state.players.forEach((p,i)=>this.place(p,i));this.setupPickups();this.inputs.clear();}
 /** Each round of the cup moves to the next world; points carry over. */
 nextRound(){if(this.state.mode!=='championship'||this.state.round>=3)return;this.state.round++;const next=this.state.cup.split(',')[this.state.round-1];if(next)this.setTrack(next);this.start();}
 /** Back to round one of the same cup (rematch). */
 restartCup(){this.state.round=1;const first=this.state.cup.split(',')[0];if(first)this.setTrack(first);this.state.players.forEach(p=>{p.cupPoints=0;p.cupTime=0;});this.start();}
 setTrack(id:string){if(!TRACKS.some(t=>t.id===id))return;this.state.trackId=id;this.route=routeFor(id);this.setupPickups();}
 /** Arcade launch: press drift just before «¡DALE!» (last 0.7 s) for a start boost. Earlier is a false start. */
 private launchWindow(){
  const s=this.state;
  for(const p of s.players){
   if(p.bot||!p.connected){if(p.launch===0&&s.countdown<.5)p.launch=(p.color*7+s.round)%3===0?0:1;continue;}
   const held=!!this.inputs.get(p.id)?.drift,was=this.launchHeld.get(p.id)??false;this.launchHeld.set(p.id,held);
   if(held&&!was&&p.launch===0&&s.countdown<=3){p.launch=s.countdown<=.7?1:-1;}
  }
 }
 private launch(){for(const p of this.state.players){if(p.launch===1){p.boost=.9;p.boostLevel=2;p.speed=8;this.emit('boost',p.id,{intensity:2,text:'launch'});}else if(p.launch===-1)this.emit('boost',p.id,{intensity:0,text:'early'});p.launch=0;}}
 emit(type:GameState['events'][number]['type'],playerId:string,extra:Partial<GameState['events'][number]>={}){this.state.events.push({id:++this.eventId,type,playerId,...extra});if(this.state.events.length>40)this.state.events.shift();}
 /** 0 relaxed, 1 normal, 2 hard. Set by whoever creates the race; not part of the synced state. */
 difficulty=1;
 private botMemory=new Map<string,{lane:number;nextFire:number;wobble:number}>();
 /** Bots drive a personal line, overtake, drift long curves, look for boxes and aim before firing.
  * Deterministic per tick (no Math.random) so tests and replays are stable. */
 botInput(p:PlayerState):PlayerInput {
  const s=this.state,level=this.difficulty,seed=p.color*7919+p.id.length*131;
  let mem=this.botMemory.get(p.id);if(!mem){mem={lane:((seed%7)-3)*.9,nextFire:3+(seed%5)*.6,wobble:0};this.botMemory.set(p.id,mem);}
  const noise=(k:number)=>Math.sin(s.tick*.013*k+seed);
  let target:{x:number;z:number},drift=false,brake=false,steerScale=1;
  if(s.mode==='battle'){
   const rivals=s.players.filter(v=>v.id!==p.id).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z));
   target=rivals[0]??{x:0,z:0};
   if(p.charges===0||(p.charges<2&&level>0)){const pick=s.pickups.filter(v=>v.availableAt<=s.time).sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];if(pick)target=pick;}
   // Circle the rival instead of ramming head-on.
   if(rivals[0]&&target===rivals[0]&&Math.hypot(target.x-p.x,target.z-p.z)<14){const a=Math.atan2(target.x-p.x,target.z-p.z)+(seed%2?1.1:-1.1);target={x:p.x+Math.sin(a)*12,z:p.z+Math.cos(a)*12};}
  }else{
   const look=clamp(p.speed*.95,12,24),ahead=sample(this.route,p.progress+look),far=sample(this.route,p.progress+look+22);
   const bend=angle(far.yaw-ahead.yaw);
   // Overtake: if someone is right in front on our lane, switch to the other side for a while.
   const blocker=s.players.find(v=>v.id!==p.id&&v.progress>p.progress&&v.progress-p.progress<10&&Math.abs(v.x-p.x)+Math.abs(v.z-p.z)<9);
   if(blocker&&s.tick%40===0)mem.lane=clamp(-mem.lane||(seed%2?2.5:-2.5),-3.2,3.2);
   let lane=mem.lane+noise(1.7)*.8;
   // Inside line on long bends, a little wide on the exit.
   lane+=clamp(-bend*6,-2.5,2.5);
   // Go for a charge box when low.
   if(p.charges<3){const box=s.pickups.find(v=>v.availableAt<=s.time&&(()=>{const dx=v.x-p.x,dz=v.z-p.z,d=Math.hypot(dx,dz);return d<26&&d>4&&Math.abs(angle(Math.atan2(dx,dz)-p.yaw))<.35;})());if(box)return this.steerTo(p,box,0,false,mem);}
   target={x:ahead.x+Math.cos(ahead.yaw)*lane,z:ahead.z-Math.sin(ahead.yaw)*lane};
   drift=level>0&&Math.abs(bend)>.32&&p.speed>15&&(p.driftDir!==0||Math.abs(angle(Math.atan2(target.x-p.x,target.z-p.z)-p.yaw))>.1);
   if(p.driftDir!==0&&p.driftCharge>=(level===2?DRIVE.driftTier2:DRIVE.driftTier1)&&Math.abs(bend)<.5)drift=false;
   brake=level<2&&Math.abs(bend)>.9&&p.speed>17;
   steerScale=level===0?.85:1;
   // Occasional human mistakes: a late correction on the relaxed level.
   if(level===0&&noise(.37)>.93)steerScale*=.4;
  }
  const out=this.steerTo(p,target,0,drift,mem,brake,steerScale);
  // Attacks: aim first. Front basics need someone ahead, rear ones someone behind, specials a target.
  if(s.phase==='running'&&s.time>=mem.nextFire&&p.charges>0&&p.cooldown<=0&&p.stun<=0){
   const c=character(p.characterId),ahead=s.players.some(v=>v.id!==p.id&&v.finishTime<0&&(()=>{const dx=v.x-p.x,dz=v.z-p.z,d=Math.hypot(dx,dz);return d<26&&v.immune<=0&&Math.abs(angle(Math.atan2(dx,dz)-p.yaw))<.28;})());
   const behind=s.players.some(v=>v.id!==p.id&&v.finishTime<0&&(()=>{const dx=v.x-p.x,dz=v.z-p.z,d=Math.hypot(dx,dz);return d<18&&Math.abs(angle(Math.atan2(dx,dz)-p.yaw))>2.5;})());
   let choice=0;
   if(p.charges>=5&&(ahead||c.special.delivery==='area'&&(ahead||behind)))choice=4;
   else{const options=[1,2,3].filter(i=>{const d=c.basics[i-1].delivery;return d==='rear'?behind:d==='area'?ahead||behind:ahead;});if(options.length)choice=options[(seed+s.tick)%options.length];}
   if(choice){out.attack=choice;out.actionSeq=s.tick+1;mem.nextFire=s.time+[10,6,4][level]+(seed%4)*.7;}
  }
  return out;
 }
 private steerTo(p:PlayerState,target:{x:number;z:number},_lane:number,drift:boolean,_mem:unknown,brake=false,scale=1):PlayerInput{
  const turn=angle(Math.atan2(target.x-p.x,target.z-p.z)-p.yaw);
  return{...EMPTY_INPUT,seq:this.state.tick,steer:clamp(turn*1.6*scale,-1,1),drift,brake,attack:0,actionSeq:p.actionSeq,assist:true};
 }
 attack(p:PlayerState,index:number){
  const cost=index===4?5:1;if(p.charges<cost||p.cooldown>0||p.stun>0||p.finishTime>=0)return false;
  p.charges-=cost;p.cooldown=index===4?1:.55;const c=character(p.characterId);const def=index===4?c.special:c.basics[index-1];this.spawn(p,def,index===4);this.emit('attack',p.id,{text:def.name,object:def.object,special:index===4});return true;
 }
 /** Soft aim limits: a narrow cone ahead and a slow curve, so a rival can still dodge. */
 static AIM={cone:.36,range:48,turn:1.15,time:1.5};
 private aimTarget(p:PlayerState,x:number,z:number,yaw:number){
  let best='',score=Infinity;
  for(const v of this.state.players){if(v.id===p.id||v.finishTime>=0)continue;const dx=v.x-x,dz=v.z-z,d=Math.hypot(dx,dz);if(d>Simulation.AIM.range||d<2)continue;const off=Math.abs(angle(Math.atan2(dx,dz)-yaw));if(off>Simulation.AIM.cone)continue;const s=d*(1+off*3);if(s<score){score=s;best=v.id;}}
  return best;
 }
 spawn(p:PlayerState,def:AttackDefinition,special:boolean){
  const cast=++this.castId;const count=def.count;const speed=special?36:count===1?34:28;
  for(let i=0;i<count;i++){
   const yaw=p.yaw+(i-(count-1)/2)*(count>3?.09:.22),rear=def.delivery==='rear',aimed=def.delivery==='projectile'||def.delivery==='boomerang';
   const x=p.x+Math.sin(yaw)*(rear?-4:3),z=p.z+Math.cos(yaw)*(rear?-4:3);
   this.state.shots.push({id:++this.shotId,cast,owner:p.id,object:def.object==='claudia'?'onion':def.object,effect:def.effect,special,x,y:p.y+1,z,vx:rear?0:Math.sin(yaw)*speed,vz:rear?0:Math.cos(yaw)*speed,radius:def.delivery==='area'?special?10:4:special?2.6:1.3,life:def.delivery==='area'?2.5:rear?8:2.6,age:0,delivery:def.delivery,hit:[],target:aimed?this.aimTarget(p,x,z,yaw):''});
  }
  // Cap active entities even if twelve racers repeatedly cast simultaneously.
  if(this.state.shots.length>160)this.state.shots.splice(0,this.state.shots.length-160);
 }
 applyHit(s:Shot,p:PlayerState,chainFrom?:{x:number;y:number;z:number}){
  if(p.immune>0)return false;
  const resist=1-.15*(vehicle(p.vehicleId).stats[3]-3);
  if(s.effect==='smoke'){p.haze=s.special?2.5:1.8;p.sliding=1;}
  else if(s.effect==='paint'){p.paint=1.8;p.speed*=.82;}
  else if(s.effect==='slip'){p.sliding=1.4;p.pushX=Math.cos(p.yaw)*5*resist;p.pushZ=-Math.sin(p.yaw)*5*resist;}
  else if(s.effect==='slow'){p.speed*=.68;p.sliding=.7;}
  else{p.stun=s.special?1.5:.45;p.speed*=.28;p.pushX=s.vx*.2*resist;p.pushZ=s.vz*.2*resist;}
  if(s.object==='milk')p.sliding=2.7;
  p.immune=(s.effect==='stun'||s.effect==='spin'?p.stun:0)+1;
  const owner=this.state.players.find(v=>v.id===s.owner);if(owner){owner.hitsGiven++;if(this.state.mode==='battle')owner.score+=s.special?2:1;}p.hitsTaken++;
  this.emit('hit',s.owner,{targetId:p.id,special:s.special,object:s.object,x:p.x,y:p.y,z:p.z,text:chainFrom?'chain':undefined,intensity:chainFrom?Math.hypot(chainFrom.x-p.x,chainFrom.z-p.z):undefined});return true;
 }
 tick(dt=FIXED_DT){
  const s=this.state;s.tick++;if(s.phase==='countdown'){s.countdown-=dt;this.launchWindow();if(s.countdown<=0){s.phase='running';s.time=0;this.launch();}return;}if(s.phase!=='running')return;s.time+=dt;
  const hazards=s.mode==='battle'?[]:hazardsFor(s.trackId,s.time);
  // Limited, transparent catch-up: far behind the leader you get up to 4.5% more top speed.
  const racing=s.mode==='race'||s.mode==='championship',leader=Math.max(...s.players.map(p=>p.progress));
  for(const p of s.players)p.aid=racing&&p.finishTime<0?clamp((leader-p.progress-40)/160,0,1):0;
  for(const p of s.players){
   // Finished racers keep rolling under a bot on their cooldown lap. A frozen,
   // non-solid car at the finish line used to let the rest of the pack pass through.
   if(p.finishTime>=0){stepPlayer(p,this.botInput(p),this.route,s.mode,dt);continue;}
   const automatic=p.bot||!p.connected;const input=automatic?this.botInput(p):(this.inputs.get(p.id)??EMPTY_INPUT);
   const boost=p.boost,level=p.boostLevel,drift=p.driftDir,lap=p.lap,falling=p.vy<-.5,curb=stepPlayer(p,input,this.route,s.mode,dt);if(p.lap>lap){const t=s.time-p.lapStart;p.bestLap=p.bestLap<0?t:Math.min(p.bestLap,t);p.lapStart=s.time;}if(!automatic)p.ack=input.seq;if((boost<=0&&p.boost>0)||p.boostLevel>level)this.emit('boost',p.id,{intensity:p.boostLevel});if(!drift&&p.driftDir)this.emit('drift',p.id,{intensity:p.driftDir});
   if(curb&&s.time-(this.curbEvents.get(p.id)??-1)>.45){this.curbEvents.set(p.id,s.time);this.emit('collision',p.id,{...curb,object:'curb'});}
   if(falling&&p.vy===0)this.emit('land',p.id,{x:p.x,y:p.y,z:p.z,intensity:.3});
   if(input.attack>0&&(automatic||input.actionSeq>p.actionSeq)){if(!automatic)p.actionSeq=input.actionSeq;this.attack(p,input.attack);}
   for(const hazard of hazards)if(p.immune<=0&&Math.hypot(p.x-hazard.x,p.z-hazard.z)<hazard.radius+1){p.speed*=.55;p.sliding=.4;p.immune=.8;p.pushX=Math.cos(p.yaw)*5;p.pushZ=-Math.sin(p.yaw)*5;this.emit('hit',p.id,{object:'obstacle'});}
   for(const pick of s.pickups)if(pick.availableAt<=s.time&&Math.hypot(p.x-pick.x,p.z-pick.z)<3.8&&p.charges<6){p.charges=Math.min(6,p.charges+3);pick.availableAt=s.time+7;this.emit('pickup',p.id);}
   if(s.mode!=='battle'&&p.gate>=25){p.finishTime=s.time;if(this.firstFinish<0)this.firstFinish=s.time;this.emit('finish',p.id);}
  }
  // Several contact passes separate a crowded pack in the same simulation step.
  // They do not repeatedly bounce a pair: impulses apply only while approaching.
  for(let pass=0;pass<24;pass++){
   let contacts=0;
   for(let i=0;i<s.players.length;i++)for(let j=i+1;j<s.players.length;j++){
    const a=s.players[i],b=s.players[j],collision=resolveVehicleCollision(a,b);if(collision.collided)contacts++;
    // One event per pair per second: a long scrape is one bump, not sixty.
    const pair=a.id<b.id?a.id+'|'+b.id:b.id+'|'+a.id;
    if(collision.intensity>.15&&s.time-(this.bumpTimes.get(pair)??-1)>1){this.bumpTimes.set(pair,s.time);a.bumps++;b.bumps++;
    this.emit('collision',a.id,{targetId:b.id,x:collision.x,y:collision.y,z:collision.z,intensity:collision.intensity});}
   }
   if(!contacts)break;
  }
  // Slipstream: tuck in behind someone for about a second to earn a short tow.
  for(const a of s.players){
   if(a.draft<0){a.draft=Math.min(0,a.draft+dt);continue;}
   if(a.finishTime>=0||a.stun>0||a.speed<14){a.draft=Math.max(0,a.draft-dt*2);continue;}
   const tow=s.players.some(b=>{if(b.id===a.id)return false;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);return d>3&&d<15&&Math.abs(angle(Math.atan2(dx,dz)-a.yaw))<.17&&Math.abs(b.y-a.y)<1.5&&b.speed>12;});
   if(tow){a.draft+=dt;if(a.draft>=DRIVE.draftTime){a.boost=Math.max(a.boost,.7);a.boostLevel=Math.max(a.boostLevel,1);a.speed+=1.5;a.draft=-1.8;a.tows++;this.emit('draft',a.id,{x:a.x,y:a.y,z:a.z});}}
   else a.draft=Math.max(0,a.draft-dt*1.5);
  }
  for(const shot of s.shots){
   shot.age+=dt;shot.life-=dt;if(shot.delivery==='projectile'||shot.delivery==='boomerang'){
    const owner=s.players.find(p=>p.id===shot.owner);
    if(shot.delivery==='boomerang'&&shot.age>1.1&&owner){const yaw=Math.atan2(owner.x-shot.x,owner.z-shot.z);shot.vx=Math.sin(yaw)*32;shot.vz=Math.cos(yaw)*32;}
    else if(shot.target&&shot.age<Simulation.AIM.time){
     // Gentle curve toward the chosen rival: visible, limited, dodgeable.
     const t=s.players.find(v=>v.id===shot.target);if(t&&t.finishTime<0){const heading=Math.atan2(shot.vx,shot.vz),turn=clamp(angle(Math.atan2(t.x-shot.x,t.z-shot.z)-heading),-Simulation.AIM.turn*dt,Simulation.AIM.turn*dt),v=Math.hypot(shot.vx,shot.vz);shot.vx=Math.sin(heading+turn)*v;shot.vz=Math.cos(heading+turn)*v;}
    }
    shot.x+=shot.vx*dt;shot.z+=shot.vz*dt;shot.y=s.mode==='battle'?1:closest(this.route,shot.x,shot.z).y+1;
   }
   for(const p of s.players){if(p.id===shot.owner||p.finishTime>=0||shot.hit.includes(p.id))continue;
    if(Math.hypot(p.x-shot.x,p.z-shot.z)<shot.radius+1.1){
     if(this.applyHit(shot,p)){
      for(const same of s.shots)if(same.cast===shot.cast)same.hit.push(p.id);
      // Electric slipper jumps once to a rival nearby; the six-pack and the PS3 splash around the target.
      if(shot.object==='slipper'){const next=s.players.find(v=>v.id!==p.id&&v.id!==shot.owner&&v.finishTime<0&&!shot.hit.includes(v.id)&&Math.hypot(v.x-p.x,v.z-p.z)<9);if(next&&this.applyHit(shot,next,{x:p.x,y:p.y,z:p.z})){for(const same of s.shots)if(same.cast===shot.cast)same.hit.push(next.id);}}
      if(shot.special&&(shot.object==='sixpack'||shot.object==='console'))for(const v of s.players){if(v.id===shot.owner||v.finishTime>=0||shot.hit.includes(v.id)||Math.hypot(v.x-p.x,v.z-p.z)>5.5)continue;if(this.applyHit(shot,v)){for(const same of s.shots)if(same.cast===shot.cast)same.hit.push(v.id);}}
      // Thrown objects and dropped traps are used up on contact; clouds and boomerangs keep going.
      if(shot.delivery==='projectile'||shot.delivery==='rear')shot.life=Math.min(shot.life,0);
     }
    }
   }
  }
  s.shots=s.shots.filter(v=>v.life>0);
  if(s.mode==='battle'?s.time>=180:s.players.every(p=>p.finishTime>=0)||s.time>=300||(this.firstFinish>=0&&s.time-this.firstFinish>=35))this.finish();
 }
 finish(){const s=this.state;if(s.phase!=='running')return;const ranks=ranking(s);if(s.mode==='championship')ranks.forEach((p,i)=>{p.cupPoints+=p.finishTime>=0?12-i:0;p.cupTime+=p.finishTime>=0?p.finishTime:300;});s.phase=s.mode==='championship'&&s.round===3?'cup-results':'results';}
}
