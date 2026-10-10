import { routeFor, sample, sampleLane, type Route } from './track';
/*
 * Moving obstacles and surprise events. Pure functions of (track, time): server, prediction and
 * renderer agree without syncing them. Every hazard telegraphs itself (`warn`) before it can
 * hurt, and pedestrians walk on a fixed rhythm so they can be read and dodged.
 */
export type HazardKind='pedestrian'|'cart'|'ball'|'hoop'|'crate'|'geyser'|'rock'|'wave'|'crab'|'bus'|'dancer'|'slipper';
export interface Hazard { id:number; kind:HazardKind; x:number; y:number; z:number; yaw:number; radius:number; active:boolean; warn:boolean; phase:number; lane:string; minLap:number; variant:number }
const at=(r:Route,lane:string,f:number,offset:number)=>{const l=lane?r.lanes.find(v=>v.id===lane):undefined;const p=l?sampleLane(l,f*l.length):sample(r,f*r.length);return{x:p.x+Math.cos(p.yaw)*offset,y:p.y,z:p.z-Math.sin(p.yaw)*offset,yaw:p.yaw};};
/** Walks across the road and back: walk, pause on the kerb, walk back, pause. */
function crossing(time:number,period:number,shift:number,half:number){const t=((time+shift)%period+period)%period/period;const walk=.36;if(t<walk)return{offset:-half+2*half*t/walk,moving:true,dir:1};if(t<.5)return{offset:half,moving:false,dir:1};if(t<.5+walk)return{offset:half-2*half*(t-.5)/walk,moving:true,dir:-1};return{offset:-half,moving:false,dir:-1};}
export function hazardsFor(trackId:string,time:number):Hazard[]{
 const r=routeFor(trackId),out:Hazard[]=[];let id=0;
 const add=(kind:HazardKind,lane:string,f:number,offset:number,radius:number,o:Partial<Hazard>={})=>{const p=at(r,lane,f,offset);out.push({id:id++,kind,x:p.x,y:p.y,z:p.z,yaw:p.yaw,radius,active:true,warn:false,phase:0,lane,minLap:0,variant:0,...o});};
 const walker=(kind:HazardKind,lane:string,f:number,half:number,period:number,shift:number,radius=1.1,variant=0)=>{const c=crossing(time,period,shift,half);const p=at(r,lane,f,c.offset);out.push({id:id++,kind,x:p.x,y:p.y,z:p.z,yaw:p.yaw+(c.dir>0?Math.PI/2:-Math.PI/2),radius,active:true,warn:false,phase:c.moving?1:0,lane,minLap:0,variant});};
 /** Periodic eruption: `warn` seconds of telegraph, `on` seconds dangerous. */
 const cycle=(period:number,shift:number,warn:number,on:number)=>{const t=((time+shift)%period+period)%period;return{warn:t<warn,active:t>=warn&&t<warn+on,phase:t/period};};
 if(trackId==='la-salle'){
  // Basketballs bouncing across the courts lane, a loose one near the courts on the main road, and the hoops.
  for(const [k,f] of [[0,.2],[1,.68]] as const){const o=Math.sin(time*1.6+k*2)*3.2;add('ball','canchas',f,o,1,{phase:Math.abs(Math.sin(time*3.2+k))});}
  add('ball','',.455,Math.sin(time*.9)*5.5,1,{phase:Math.abs(Math.sin(time*3))});
  add('hoop','canchas',.27,2.7,.6);add('hoop','canchas',.62,-2.7,.6);
 }else if(trackId==='oriental'){
  // Shoppers on painted crossings, a cart pushed along the kerb, crates in the alley.
  [.12,.26,.47,.66,.935].forEach((f,i)=>walker('pedestrian','',f,8.2,9+i*.7,i*2.3,1.1,i));
  walker('pedestrian','callejon',.36,4.6,7.4,1.2,1.1,5);
  for(const [f,shift] of [[.19,0],[.815,3]] as const){const o=5+Math.sin((time+shift)*.45)*1.4,p=at(r,'',f+Math.sin((time+shift)*.18)*.006,o);out.push({id:id++,kind:'cart',x:p.x,y:p.y,z:p.z,yaw:p.yaw,radius:1.6,active:true,warn:false,phase:0,lane:'',minLap:0,variant:0});}
  add('crate','callejon',.62,2.2,1.1);add('crate','callejon',.78,-2.2,1.1);add('crate','callejon',.14,-2.4,1.1);
 }else if(trackId==='managua'){
  // The bus crosses at the light: amber, then it rolls across; from lap 2 a second one by the malecón.
  const bus=(f:number,period:number,shift:number,minLap:number)=>{const c=cycle(period,shift,1.6,4.2);const t=c.active?((((time+shift)%period)+period)%period-1.6)/4.2:c.warn?0:1;const off=-24+48*t;const p=at(r,'',f,off);out.push({id:id++,kind:'bus',x:p.x,y:p.y,z:p.z,yaw:p.yaw+Math.PI/2,radius:3.4,active:c.active,warn:c.warn,phase:t,lane:'',minLap,variant:0});};
  bus(.9,11,0,0);bus(.07,13,5,1);
 }else if(trackId==='hipa-hipa'){
  [.25,.5,.75].forEach((f,i)=>walker('dancer','baile',f,4.4,4.6+i*.5,i*1.3,1,i));
  for(const [k,f] of [[0,.24],[1,.78]] as const)add('slipper','',f,Math.sin(time*.8+k*2)*4.5,1.2);
 }else if(trackId==='masaya'){
  // Volcanic vents erupt on a rhythm (glow first); in the tunnel rocks fall where their shadow grows.
  [[.30,0,0],[.40,2.5,0],[.52,4,0],[.46,1.2,2]].forEach(([f,shift,minLap],i)=>{const c=cycle(6.4,shift,1.5,1.25);add('geyser','',f,(i%2?-1:1)*3.2,2.6,{active:c.active,warn:c.warn,phase:c.phase,minLap});});
  [[.603,0],[.645,2.1],[.688,3.6]].forEach(([f,shift],i)=>{const c=cycle(5.2,shift,1.4,1.1);add('rock','',f,(i%2?2.5:-1.5),1.9,{active:c.active,warn:c.warn,phase:c.phase});});
 }else if(trackId==='san-juan'){
  // Waves wash over the shore lane; crabs scuttle across the sand.
  [[.3,0],[.78,3.5]].forEach(([f,shift])=>{const c=cycle(7,shift,1.6,1.8);add('wave','playa',f,0,4.6,{active:c.active,warn:c.warn,phase:c.phase});});
  walker('crab','',.875,7.5,5.2,0,.9);walker('crab','',.895,7,4.4,2,.9,1);walker('crab','playa',.5,3.6,3.8,1,.9,2);
 }
 return out;
}
