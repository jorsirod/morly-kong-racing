import { clamp, sample, type Route } from './track';
import type { CStunt } from './course';

/*
 * Stunts: vertical loops, sideways corkscrews (barrel rolls) and tubes where you go all the way round.
 * The simulation keeps the car on a straight «rail» along the road through the stunt (centred, no steering, a minimum
 * speed so you always make it); the renderer draws the car on the 3D stunt path computed here from the same distance.
 * Everything is a function of the distance along the lap, so server, prediction and renderer always agree.
 */
/** Rail zone: a short run-up before the stunt centres the car, and a moment after it. */
export const STUNT={runUp:18,runOut:4,minSpeed:24};
export const TAU=Math.PI*2;
export interface StuntPose{x:number;y:number;z:number;yaw:number;pitch:number;roll:number;t:number;
 /** Car axes in the world (forward, up), for the chase camera. */ fwd:[number,number,number];up:[number,number,number]}

const mod=(s:number,l:number)=>((s%l)+l)%l;
/** The stunt whose visual section contains `s` (metres along the lap). */
export function stuntAt(route:Route,s:number):CStunt|undefined{const d=mod(s,route.length);return route.course.stunts.find(st=>d>=st.from&&d<=st.to);}
/** The stunt whose rail zone (run-up included) contains `s`. */
export function stuntRail(route:Route,s:number):CStunt|undefined{const d=mod(s,route.length);return route.course.stunts.find(st=>d>=st.from-STUNT.runUp&&d<=st.to+STUNT.runOut);}

/** Where a car is drawn at distance `s` inside a stunt, plus its orientation. */
export function stuntPose(route:Route,st:CStunt,s:number):StuntPose{
 const L=st.to-st.from,t=clamp((mod(s,route.length)-st.from)/L,0,1),R=st.radius;
 let f=L*t,h=0,lat=0,pitch=0,roll=0;
 if(st.kind==='loop'){
  // A real loop: forward, up, upside down moving back over yourself at the top, down and out. It drifts sideways a little
  // so the way in and the way out don't overlap.
  const a=TAU*t;f=L*t+R*Math.sin(a);h=R*(1-Math.cos(a));lat=st.dir*2.6*Math.sin(Math.PI*t);pitch=Math.atan2(TAU*R*Math.sin(a),L+TAU*R*Math.cos(a));
  if(t>.5&&pitch<0)pitch+=TAU;
 } else {
  // Corkscrew and tube: the car rolls all the way round the direction of travel, wheels always on the surface.
  roll=st.dir*TAU*st.turns*t;lat=R*Math.sin(roll);h=R*(1-Math.cos(roll));
 }
 const c=sample(route,st.from+f),yaw=c.yaw,rx=Math.cos(yaw),rz=-Math.sin(yaw),fx=Math.sin(yaw),fz=Math.cos(yaw);
 const cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);
 const fwd:[number,number,number]=[fx*cp,sp,fz*cp];
 const up:[number,number,number]=st.kind==='loop'?[-fx*sp,cp,-fz*sp]:[-rx*sr,cr,-rz*sr];
 return{x:c.x+rx*lat,y:c.y+h,z:c.z+rz*lat,yaw,pitch,roll,t,fwd,up};
}
