import { Schema, MapSchema, defineTypes } from '@colyseus/schema';
import { makePlayer } from './simulation';
import type { GameState, PlayerState, Shot, Pickup } from './types';

export class PlayerWire extends Schema {
 declare id:string;declare nickname:string;declare characterId:string;declare vehicleId:string;declare bot:boolean;declare connected:boolean;declare ready:boolean;declare color:number;
 declare x:number;declare y:number;declare z:number;declare yaw:number;declare speed:number;declare steerAngle:number;declare turnRate:number;declare lateralSpeed:number;declare impact:number;declare vy:number;declare pushX:number;declare pushZ:number;declare progress:number;declare gate:number;declare lap:number;declare charges:number;declare score:number;declare cupPoints:number;declare cupTime:number;declare finishTime:number;declare stun:number;declare immune:number;declare cooldown:number;declare boost:number;declare driftCharge:number;declare sliding:number;declare haze:number;declare paint:number;declare ack:number;declare actionSeq:number;declare draft:number;
 constructor(){super();Object.assign(this,makePlayer('','','semilla','silver-surfer',0));}
}
defineTypes(PlayerWire,Object.fromEntries(Object.entries(makePlayer('','','','',0)).map(([k,v])=>[k,typeof v==='number'?'number':typeof v==='boolean'?'boolean':'string'])));
export class ShotWire extends Schema {
 declare id:number;declare cast:number;declare owner:string;declare object:string;declare effect:string;declare special:boolean;declare x:number;declare y:number;declare z:number;declare vx:number;declare vz:number;declare radius:number;declare life:number;declare age:number;declare delivery:string;declare target:string;
 constructor(){super();Object.assign(this,{id:0,cast:0,owner:'',object:'',effect:'spin',special:false,x:0,y:0,z:0,vx:0,vz:0,radius:1,life:0,age:0,delivery:'projectile',target:''});}
}
defineTypes(ShotWire,{id:'number',cast:'number',owner:'string',object:'string',effect:'string',special:'boolean',x:'number',y:'number',z:'number',vx:'number',vz:'number',radius:'number',life:'number',age:'number',delivery:'string',target:'string'});
export class PickupWire extends Schema {
 declare id:number;declare x:number;declare y:number;declare z:number;declare availableAt:number;
 constructor(){super();this.id=0;this.x=0;this.y=0;this.z=0;this.availableAt=0;}
}
defineTypes(PickupWire,{id:'number',x:'number',y:'number',z:'number',availableAt:'number'});
export class RaceWire extends Schema {
 declare version:number;declare phase:string;declare mode:string;declare trackId:string;declare cup:string;declare time:number;declare tick:number;declare round:number;declare countdown:number;declare hostId:string;
 declare players:MapSchema<PlayerWire>;declare shots:MapSchema<ShotWire>;declare pickups:MapSchema<PickupWire>;
 constructor(){super();this.version=1;this.phase='lobby';this.mode='race';this.trackId='la-salle';this.cup='';this.time=0;this.tick=0;this.round=1;this.countdown=3;this.hostId='';this.players=new MapSchema();this.shots=new MapSchema();this.pickups=new MapSchema();}
}
defineTypes(RaceWire,{version:'number',phase:'string',mode:'string',trackId:'string',cup:'string',time:'number',tick:'number',round:'number',countdown:'number',hostId:'string',players:{map:PlayerWire},shots:{map:ShotWire},pickups:{map:PickupWire}});
function syncMap<T extends Schema>(map:MapSchema<T>,items:{id:string|number}[],factory:()=>T){const keys=new Set(items.map(i=>String(i.id)));for(const key of map.keys())if(!keys.has(key))map.delete(key);for(const item of items){const key=String(item.id);if(!map.has(key))map.set(key,factory());const copy={...item} as Record<string,unknown>;delete copy.hit;Object.assign(map.get(key)!,copy);}}
export function syncWire(w:RaceWire,s:GameState){for(const k of ['version','phase','mode','trackId','cup','time','tick','round','countdown','hostId'] as const)(w as unknown as Record<string,unknown>)[k]=s[k];syncMap(w.players,s.players,()=>new PlayerWire());syncMap(w.shots,s.shots,()=>new ShotWire());syncMap(w.pickups,s.pickups,()=>new PickupWire());}
export function fromWire(w:RaceWire):GameState {const json=w.toJSON() as Record<string,unknown>;return{...json as unknown as GameState,players:Object.values(json.players as Record<string,PlayerState>),shots:Object.values(json.shots as Record<string,Shot>).map(s=>({...s,hit:[]})),pickups:Object.values(json.pickups as Record<string,Pickup>),events:[]};}
