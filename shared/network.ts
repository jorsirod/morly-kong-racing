import { Schema, MapSchema, ArraySchema, defineTypes } from '@colyseus/schema';
import { makePlayer } from './simulation';
import type { GameState, PlayerState, Shot, Pickup } from './types';

/** Award statistics travel packed in one array: a Schema allows at most 63 fields. */
export const PACKED_STATS=['hitsGiven','hitsTaken','turbos','bumps','tows','lapStart','bestLap'] as const;
export class PlayerWire extends Schema {
 declare id:string;declare nickname:string;declare characterId:string;declare vehicleId:string;declare bot:boolean;declare connected:boolean;declare ready:boolean;declare color:number;
 declare x:number;declare y:number;declare z:number;declare yaw:number;declare speed:number;declare steerAngle:number;declare turnRate:number;declare lateralSpeed:number;declare impact:number;declare vy:number;declare pushX:number;declare pushZ:number;declare progress:number;declare gate:number;declare lap:number;declare charges:number;declare score:number;declare cupPoints:number;declare cupTime:number;declare finishTime:number;declare stun:number;declare immune:number;declare cooldown:number;declare boost:number;declare driftCharge:number;declare sliding:number;declare haze:number;declare paint:number;declare ack:number;declare actionSeq:number;declare draft:number;
 declare stats:ArraySchema<number>;
 constructor(){super();const base=makePlayer('','','semilla','silver-surfer',0) as unknown as Record<string,unknown>;for(const k of PACKED_STATS)delete base[k];Object.assign(this,base);this.stats=new ArraySchema<number>(0,0,0,0,0,0,-1);}
}
defineTypes(PlayerWire,{...Object.fromEntries(Object.entries(makePlayer('','','','',0)).filter(([k])=>!(PACKED_STATS as readonly string[]).includes(k)).map(([k,v])=>[k,typeof v==='number'?'number':typeof v==='boolean'?'boolean':'string'])),stats:['number']});
export class ShotWire extends Schema {
 declare id:number;declare cast:number;declare owner:string;declare object:string;declare effect:string;declare special:boolean;declare x:number;declare y:number;declare z:number;declare vx:number;declare vz:number;declare radius:number;declare life:number;declare age:number;declare delivery:string;declare target:string;declare progress:number;
 constructor(){super();Object.assign(this,{id:0,cast:0,owner:'',object:'',effect:'spin',special:false,x:0,y:0,z:0,vx:0,vz:0,radius:1,life:0,age:0,delivery:'projectile',target:'',progress:0});}
}
defineTypes(ShotWire,{id:'number',cast:'number',owner:'string',object:'string',effect:'string',special:'boolean',x:'number',y:'number',z:'number',vx:'number',vz:'number',radius:'number',life:'number',age:'number',delivery:'string',target:'string',progress:'number'});
export class PickupWire extends Schema {
 declare id:number;declare x:number;declare y:number;declare z:number;declare availableAt:number;declare kind:number;
 constructor(){super();this.id=0;this.x=0;this.y=0;this.z=0;this.availableAt=0;this.kind=0;}
}
defineTypes(PickupWire,{id:'number',x:'number',y:'number',z:'number',availableAt:'number',kind:'number'});
export class RaceWire extends Schema {
 declare version:number;declare phase:string;declare mode:string;declare trackId:string;declare cup:string;declare time:number;declare tick:number;declare round:number;declare countdown:number;declare hostId:string;
 declare players:MapSchema<PlayerWire>;declare shots:MapSchema<ShotWire>;declare pickups:MapSchema<PickupWire>;
 constructor(){super();this.version=1;this.phase='lobby';this.mode='race';this.trackId='la-salle';this.cup='';this.time=0;this.tick=0;this.round=1;this.countdown=3;this.hostId='';this.players=new MapSchema();this.shots=new MapSchema();this.pickups=new MapSchema();}
}
defineTypes(RaceWire,{version:'number',phase:'string',mode:'string',trackId:'string',cup:'string',time:'number',tick:'number',round:'number',countdown:'number',hostId:'string',players:{map:PlayerWire},shots:{map:ShotWire},pickups:{map:PickupWire}});
function syncMap<T extends Schema>(map:MapSchema<T>,items:{id:string|number}[],factory:()=>T,packed:readonly string[]=[]){const keys=new Set(items.map(i=>String(i.id)));for(const key of map.keys())if(!keys.has(key))map.delete(key);for(const item of items){const key=String(item.id);if(!map.has(key))map.set(key,factory());const copy={...item} as Record<string,unknown>,target=map.get(key)! as unknown as Record<string,unknown>;delete copy.hit;
 if(packed.length){const values=packed.map(k=>Number(copy[k])||0);for(const k of packed)delete copy[k];const stats=target.stats as ArraySchema<number>|undefined;if(!stats||stats.length!==values.length)target.stats=new ArraySchema<number>(...values);else values.forEach((v,i)=>{if(stats[i]!==v)stats[i]=v;});}
 Object.assign(target,copy);}}
export function syncWire(w:RaceWire,s:GameState){for(const k of ['version','phase','mode','trackId','cup','time','tick','round','countdown','hostId'] as const)(w as unknown as Record<string,unknown>)[k]=s[k];syncMap(w.players,s.players,()=>new PlayerWire(),PACKED_STATS);syncMap(w.shots,s.shots,()=>new ShotWire());syncMap(w.pickups,s.pickups,()=>new PickupWire());}
function unpack(p:Record<string,unknown>):PlayerState{const stats=(p.stats as number[]|undefined)??[];const out={...p};delete out.stats;PACKED_STATS.forEach((k,i)=>{out[k]=stats[i]??(k==='bestLap'?-1:0);});return out as unknown as PlayerState;}
export function fromWire(w:RaceWire):GameState {const json=w.toJSON() as Record<string,unknown>;return{...json as unknown as GameState,players:Object.values(json.players as Record<string,Record<string,unknown>>).map(unpack),shots:Object.values(json.shots as Record<string,Shot>).map(s=>({...s,hit:[]})),pickups:Object.values(json.pickups as Record<string,Pickup>),events:[]};}
