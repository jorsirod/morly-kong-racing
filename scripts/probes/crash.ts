// Probe: rear/side/front contacts between car pairs (npx tsx scripts/probes/crash.ts).
import { makePlayer, stepPlayer } from '../../shared/simulation';import { resolveVehicleCollision, vehicleDynamics } from '../../shared/dynamics';import { routeFor } from '../../shared/track';import { EMPTY_INPUT, FIXED_DT } from '../../shared/types';
const r=routeFor('la-salle');
function run(kind:'rear'|'side'|'front',A:string,B:string){
 const a=makePlayer('a','a','semilla',A,0),b=makePlayer('b','b','semilla',B,1);const da=vehicleDynamics(A),db=vehicleDynamics(B);
 if(kind==='rear'){a.z=0;b.z=da.halfLength+db.halfLength-.05;a.speed=23;b.speed=18;}
 if(kind==='side'){b.x=da.halfWidth+db.halfWidth-.05;b.z=.8;a.speed=b.speed=20;a.yaw=b.yaw=0;a.lateralSpeed=4;} // a drifts into b
 if(kind==='front'){b.z=da.halfLength+db.halfLength-.05;b.yaw=Math.PI;a.speed=b.speed=14;}
 const out:any={};const c=resolveVehicleCollision(a,b);out.dvA=+(a.speed-(kind==='rear'?23:kind==='front'?14:20)).toFixed(1);out.dvB=+(b.speed-(kind==='rear'?18:kind==='front'?14:20)).toFixed(1);
 const ax=a.x,bx=b.x,ay=a.yaw,by=b.yaw;let maxYawB=0;
 for(let i=0;i<60;i++){stepPlayer(a,{...EMPTY_INPUT,assist:false},r,'battle');stepPlayer(b,{...EMPTY_INPUT,assist:false},r,'battle');maxYawB=Math.max(maxYawB,Math.abs(b.yaw-by));}
 out.sideA=+(a.x-ax).toFixed(2);out.sideB=+(b.x-bx).toFixed(2);out.yawB=+(maxYawB*57.3).toFixed(0);out.J=+c.impulse.toFixed(1);return out;
}
const pairs=[['white-empanade','black-diamond'],['black-diamond','white-empanade'],['la-raulina','orange-seed'],['silver-surfer','hola-willy'],['hola-willy','hola-willy']];
for(const k of ['rear','side','front'] as const)for(const [A,B] of pairs)console.log(k.padEnd(5),A.padEnd(15),'→',B.padEnd(15),JSON.stringify(run(k,A,B)));
