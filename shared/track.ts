import { track } from './content';
import type { Point, TrackDefinition } from './types';
export interface Route { points: Point[]; distances:number[]; length:number; width:number; roughRanges?: [number,number][]; shortcut?: {from:number;to:number;a:Point;b:Point}; }
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
 const result:Route={points,distances,length:distances.at(-1)!,width:def.width,roughRanges:def.id==='masaya'?[[.12,.88]]:def.id==='oriental'?[[.30,.58]]:[]};const from=result.length*.38,to=result.length*.49;result.shortcut={from,to,a:sample(result,from),b:sample(result,to)};return result;
}
export function sample(route:Route,distance:number):Point & {yaw:number;index:number} {
 const d=((distance%route.length)+route.length)%route.length; let lo=0,hi=route.points.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(route.distances[m]<=d)lo=m;else hi=m-1;}
 const a=route.points[lo],b=route.points[(lo+1)%route.points.length],t=(d-route.distances[lo])/(route.distances[lo+1]-route.distances[lo]); return{x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),yaw:Math.atan2(b.x-a.x,b.z-a.z),index:lo};
}
export function closest(route:Route,x:number,z:number){
 let best=Infinity,idx=0,t=0;
 for(let i=0;i<route.points.length;i++){const a=route.points[i],b=route.points[(i+1)%route.points.length],dx=b.x-a.x,dz=b.z-a.z;const u=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);const dd=(x-a.x-dx*u)**2+(z-a.z-dz*u)**2;if(dd<best){best=dd;idx=i;t=u;}}
 const a=route.points[idx],b=route.points[(idx+1)%route.points.length],cut=route.shortcut;
 if(cut){const dx=cut.b.x-cut.a.x,dz=cut.b.z-cut.a.z,u=clamp(((x-cut.a.x)*dx+(z-cut.a.z)*dz)/(dx*dx+dz*dz),0,1),dd=(x-cut.a.x-dx*u)**2+(z-cut.a.z-dz*u)**2;if(dd+1<best)return{distance:Math.sqrt(dd),progress:lerp(cut.from,cut.to,u),x:lerp(cut.a.x,cut.b.x,u),y:lerp(cut.a.y,cut.b.y,u),z:lerp(cut.a.z,cut.b.z,u),yaw:Math.atan2(dx,dz),shortcut:true};}
 return{shortcut:false,distance:Math.sqrt(best),progress:lerp(route.distances[idx],route.distances[idx+1],t),x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),yaw:Math.atan2(b.x-a.x,b.z-a.z)};
}
