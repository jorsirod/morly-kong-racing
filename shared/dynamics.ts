import { clamp } from './track';
import type { PlayerState } from './types';

/** Arcade units: masses establish bumper authority, not real-world vehicle specs. */
export interface VehicleDynamics {
 mass:number; halfWidth:number; halfLength:number;
 steeringResponse:number; grip:number; driftGrip:number; impactDamping:number;
}
const DYNAMICS:Record<string,VehicleDynamics>={
 'silver-surfer':{mass:1.7,halfWidth:1.1,halfLength:2.03,steeringResponse:8.5,grip:10,driftGrip:3.2,impactDamping:1.8},
 'white-empanade':{mass:2.5,halfWidth:1.16,halfLength:2.46,steeringResponse:5.6,grip:8.4,driftGrip:2.8,impactDamping:1.7},
 'hola-willy':{mass:1.25,halfWidth:1.08,halfLength:2.14,steeringResponse:8.2,grip:9.3,driftGrip:3,impactDamping:1.65},
 'orange-seed':{mass:1.08,halfWidth:1.08,halfLength:2.14,steeringResponse:9.1,grip:9.7,driftGrip:2.8,impactDamping:1.6},
 'black-diamond':{mass:.75,halfWidth:.98,halfLength:1.75,steeringResponse:8.1,grip:8.6,driftGrip:2.7,impactDamping:1.5},
 'la-raulina':{mass:2.15,halfWidth:1.16,halfLength:2.46,steeringResponse:6.8,grip:9.1,driftGrip:3,impactDamping:1.75},
};
export const vehicleDynamics=(id:string):Readonly<VehicleDynamics>=>DYNAMICS[id]??DYNAMICS['silver-surfer'];
export interface CollisionResult { collided:boolean; impulse:number; intensity:number; x:number; y:number; z:number; }
const finite=(v:number,fallback=0)=>Number.isFinite(v)?v:fallback;
export function vehicleVelocity(p:PlayerState){
 const yaw=finite(p.yaw),speed=finite(p.speed),lateral=finite(p.lateralSpeed);
 return{x:Math.sin(yaw)*speed+Math.cos(yaw)*lateral+finite(p.pushX),z:Math.cos(yaw)*speed-Math.sin(yaw)*lateral+finite(p.pushZ)};
}
/** SAT on the four oriented body axes. No circle-shaped ghosts around long pickups. */
export function vehicleContact(a:PlayerState,b:PlayerState):{nx:number;nz:number;penetration:number}|null {
 if(a.id===b.id||![a.x,a.y,a.z,b.x,b.y,b.z,a.yaw,b.yaw].every(Number.isFinite))return null;
 // Cars on different elevations, including the crest of a jump, have separate bodies.
 const height=Math.abs(a.y-b.y);
 if(height>1.1||(height>.36&&(Math.abs(a.vy)>.1||Math.abs(b.vy)>.1)))return null;
 const da=vehicleDynamics(a.vehicleId),db=vehicleDynamics(b.vehicleId),dx=b.x-a.x,dz=b.z-a.z;
 if(dx*dx+dz*dz>(Math.hypot(da.halfWidth,da.halfLength)+Math.hypot(db.halfWidth,db.halfLength))**2)return null;
 const rightA={x:Math.cos(a.yaw),z:-Math.sin(a.yaw)},frontA={x:Math.sin(a.yaw),z:Math.cos(a.yaw)};
 const rightB={x:Math.cos(b.yaw),z:-Math.sin(b.yaw)},frontB={x:Math.sin(b.yaw),z:Math.cos(b.yaw)};
 let penetration=Infinity,nx=0,nz=0;
 for(const axis of [rightA,frontA,rightB,frontB]){
  const radiusA=da.halfWidth*Math.abs(axis.x*rightA.x+axis.z*rightA.z)+da.halfLength*Math.abs(axis.x*frontA.x+axis.z*frontA.z);
  const radiusB=db.halfWidth*Math.abs(axis.x*rightB.x+axis.z*rightB.z)+db.halfLength*Math.abs(axis.x*frontB.x+axis.z*frontB.z);
  const separation=dx*axis.x+dz*axis.z,overlap=radiusA+radiusB-Math.abs(separation);
  if(overlap<=0)return null;
  if(overlap<penetration){penetration=overlap;const sign=Math.abs(separation)>.000001?Math.sign(separation):(a.id<b.id?1:-1);nx=axis.x*sign;nz=axis.z*sign;}
 }
 return{nx,nz,penetration};
}
/** Applies a world-space velocity change in the car's own frame: the forward part changes
 * its speed (a bump from behind really pushes you along), the sideways part becomes a
 * shove that fades with the car's damping. World velocity and momentum are preserved. */
function applyVelocityChange(p:PlayerState,dvx:number,dvz:number){
 const yaw=finite(p.yaw),fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);
 const along=dvx*fx+dvz*fz,side=dvx*rx+dvz*rz;
 p.speed=finite(p.speed)+along;p.pushX=finite(p.pushX)+rx*side;p.pushZ=finite(p.pushZ)+rz*side;
}
export const RESTITUTION=.45;
/** Mutates both cars. Positional correction is immediate; impulse conserves momentum. */
export function resolveVehicleCollision(a:PlayerState,b:PlayerState):CollisionResult {
 const result:CollisionResult={collided:false,impulse:0,intensity:0,x:finite((a.x+b.x)/2),y:finite((a.y+b.y)/2)+.65,z:finite((a.z+b.z)/2)};
 const contact=vehicleContact(a,b);if(!contact)return result;
 result.collided=true;
 const da=vehicleDynamics(a.vehicleId),db=vehicleDynamics(b.vehicleId),inverseA=1/da.mass,inverseB=1/db.mass,inverseSum=inverseA+inverseB;
 const {nx,nz,penetration}=contact,correction=penetration+.002;
 a.x-=nx*correction*inverseA/inverseSum;a.z-=nz*correction*inverseA/inverseSum;
 b.x+=nx*correction*inverseB/inverseSum;b.z+=nz*correction*inverseB/inverseSum;
 const va=vehicleVelocity(a),vb=vehicleVelocity(b),relativeX=vb.x-va.x,relativeZ=vb.z-va.z,closing=relativeX*nx+relativeZ*nz;
 if(closing>=0)return result;
 // Moderate restitution plus a small arcade "bump" so contact always reads, never adds energy.
 const bump=closing< -3?.8:0,impulse=(-(1+RESTITUTION)*closing+bump)/inverseSum;
 // Contact friction keeps two sides from sliding through one another visually.
 const tx=-nz,tz=nx,tangent=relativeX*tx+relativeZ*tz;
 const friction=clamp(-tangent/inverseSum,-impulse*.22,impulse*.22);
 const ix=nx*impulse+tx*friction,iz=nz*impulse+tz*friction;
 applyVelocityChange(a,-ix*inverseA,-iz*inverseA);applyVelocityChange(b,ix*inverseB,iz*inverseB);
 result.impulse=impulse;result.intensity=clamp(-closing/20,0,1);
 a.impact=Math.max(finite(a.impact),clamp(impulse*inverseA/16,0,1));b.impact=Math.max(finite(b.impact),clamp(impulse*inverseB/16,0,1));
 // Off-centre contacts spin the lighter car more; stability settles the spin (see stepPlayer).
 const torqueA=(result.x-a.x)*(-iz)-(result.z-a.z)*(-ix),torqueB=(result.x-b.x)*iz-(result.z-b.z)*ix;
 a.yawKick=clamp(finite(a.yawKick)+torqueA/(da.mass*(da.halfWidth**2+da.halfLength**2))*.55,-2.2,2.2);
 b.yawKick=clamp(finite(b.yawKick)+torqueB/(db.mass*(db.halfWidth**2+db.halfLength**2))*.55,-2.2,2.2);
 // A hard shove breaks a drift: you were the one who got moved.
 if(impulse*inverseA>6&&a.driftDir){a.driftDir=0;a.driftCharge=0;}
 if(impulse*inverseB>6&&b.driftDir){b.driftDir=0;b.driftCharge=0;}
 return result;
}
