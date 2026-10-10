import { track } from './content';
import { COURSES, buildLane, compileCourse, elevationAt, type Course, type Lane } from './course';
import type { Point, TrackDefinition } from './types';
export interface Route { id:string; points: Point[]; distances:number[]; length:number; width:number; lanes:Lane[]; course:Course; }
export interface RoadPoint { shortcut:boolean; lane:string; s:number; distance:number; offset:number; progress:number; x:number; y:number; z:number; yaw:number; width:number; }
export const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export const angle=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
export const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
function spline(a:number,b:number,c:number,d:number,t:number){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
const cache=new Map<string,Route>();
export function routeFor(id:string):Route { if(cache.has(id))return cache.get(id)!; const def=track(id); const result=makeRoute(def); cache.set(id,result); return result; }
export function makeRoute(def:TrackDefinition):Route {
 const points:Point[]=[]; const n=def.points.length,floor=Math.min(...def.points.map(p=>p.y));
 for(let i=0;i<n*28;i++){const s=i/28,k=Math.floor(s),t=s-k;const ps=[-1,0,1,2].map(o=>def.points[(k+o+n)%n]); points.push({x:spline(...ps.map(v=>v.x) as [number,number,number,number],t),y:Math.max(floor,spline(...ps.map(v=>v.y) as [number,number,number,number],t)),z:spline(...ps.map(v=>v.z) as [number,number,number,number],t)});}
 const distances=[0];for(let i=1;i<=points.length;i++){const a=points[i-1],b=points[i%points.length];distances.push(distances[i-1]+Math.hypot(a.x-b.x,a.z-b.z));}
 const length=distances.at(-1)!,design=COURSES[def.id];
 // Embankments, bridges and jump decks are added on top of the control-point profile.
 if(design?.elev?.length)points.forEach((p,i)=>{p.y+=elevationAt(design.elev!,distances[i],length);});
 const result:Route={id:def.id,points,distances,length,width:def.width,lanes:[],course:compileCourse(undefined,length,[])};
 result.lanes=(design?.alts??[]).map(a=>buildLane(a,length,d=>sample(result,d)));
 result.course=compileCourse(design,length,result.lanes);
 return result;
}
export function sample(route:{points:Point[];distances:number[];length:number},distance:number):Point & {yaw:number;index:number} {
 const d=((distance%route.length)+route.length)%route.length; let lo=0,hi=route.points.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(route.distances[m]<=d)lo=m;else hi=m-1;}
 const a=route.points[lo],b=route.points[(lo+1)%route.points.length],t=(d-route.distances[lo])/(route.distances[lo+1]-route.distances[lo]); return{x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),yaw:Math.atan2(b.x-a.x,b.z-a.z),index:lo};
}
/** Point at distance `s` along an alternative lane. */
export function sampleLane(lane:Lane,s:number):Point&{yaw:number}{
 const d=clamp(s,0,lane.length);let lo=0,hi=lane.points.length-2;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(lane.dist[m]<=d)lo=m;else hi=m-1;}
 const a=lane.points[lo],b=lane.points[lo+1],t=clamp((d-lane.dist[lo])/Math.max(1e-6,lane.dist[lo+1]-lane.dist[lo]),0,1);return{x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),yaw:Math.atan2(b.x-a.x,b.z-a.z)};
}
export const laneOpen=(lane:Lane,lap?:number)=>lap===undefined||!lane.laps||lane.laps.includes(lap);
/** Height mismatch penalty so stacked roads (bridges, the Managua overpass) never swap. */
function vertical(dy:number){return dy>3?(dy-3)**2*3:dy< -1.6?(dy+1.6)**2*4:0;}
export interface Locate { y?:number; hint?:number; lap?:number; lanes?:boolean }
/** Nearest road point. With `hint` (current progress) it searches around the car first, so a
 * figure-eight crossing or a parallel road never steals the car; with `y` it prefers the level
 * the car is on. Alternative lanes are only considered while open for `lap`. */
export function closest(route:Route,x:number,z:number,opts:Locate={}):RoadPoint {
 const pts=route.points,N=pts.length,y=opts.y;
 let best=Infinity,idx=0,t=0,bestD=Infinity;
 const scan=(start:number,count:number)=>{for(let k=0;k<count;k++){const i=(start+k)%N,a=pts[i],b=pts[(i+1)%N],dx=b.x-a.x,dz=b.z-a.z;const u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);const dd=(x-a.x-dx*u)**2+(z-a.z-dz*u)**2,score=dd+(y===undefined?0:vertical(y-(a.y+(b.y-a.y)*u)));if(score<best){best=score;bestD=dd;idx=i;t=u;}}};
 if(opts.hint!==undefined&&Number.isFinite(opts.hint)){
  const L=route.length,from=(((opts.hint-70)%L)+L)%L;let lo=0,hi=N-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(route.distances[m]<=from)lo=m;else hi=m-1;}
  scan(lo,Math.min(N,Math.ceil(N*230/L)+2));
  // Lost (far from the window): fall back to the whole lap.
  if(bestD>(route.width*2.6)**2)scan(0,N);
 }else scan(0,N);
 const a=pts[idx],b=pts[(idx+1)%N],yaw=Math.atan2(b.x-a.x,b.z-a.z),qx=lerp(a.x,b.x,t),qz=lerp(a.z,b.z,t);
 let result:RoadPoint={shortcut:false,lane:'',s:lerp(route.distances[idx],route.distances[idx+1],t),distance:Math.sqrt(bestD),offset:(x-qx)*Math.cos(yaw)-(z-qz)*Math.sin(yaw),progress:lerp(route.distances[idx],route.distances[idx+1],t),x:qx,y:lerp(a.y,b.y,t),z:qz,yaw,width:route.width};
 if(opts.lanes===false)return result;
 for(const lane of route.lanes){
  if(!laneOpen(lane,opts.lap))continue;
  let lb=Infinity,li=0,lt=0,ld=Infinity;
  for(let i=0;i<lane.points.length-1;i++){const a=lane.points[i],b=lane.points[i+1],dx=b.x-a.x,dz=b.z-a.z,l2=dx*dx+dz*dz;if(l2<1e-9)continue;const u=clamp(((x-a.x)*dx+(z-a.z)*dz)/l2,0,1);const dd=(x-a.x-dx*u)**2+(z-a.z-dz*u)**2,score=dd+(y===undefined?0:vertical(y-(a.y+(b.y-a.y)*u)));if(score<lb){lb=score;ld=dd;li=i;lt=u;}}
  if(lb+1<best){
   const a=lane.points[li],b=lane.points[li+1],ly=Math.atan2(b.x-a.x,b.z-a.z),qx=lerp(a.x,b.x,lt),qz=lerp(a.z,b.z,lt),s=lerp(lane.dist[li],lane.dist[li+1],lt);
   best=lb;result={shortcut:true,lane:lane.id,s,distance:Math.sqrt(ld),offset:(x-qx)*Math.cos(ly)-(z-qz)*Math.sin(ly),progress:(lane.from+(lane.to-lane.from)*s/lane.length)%route.length,x:qx,y:lerp(a.y,b.y,lt),z:qz,yaw:ly,width:lane.width};
  }
 }
 return result;
}
