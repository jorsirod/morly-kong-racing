import { Room, type Client } from '@colyseus/core';
import { randomBytes } from 'node:crypto';
import { CHARACTERS, VEHICLES, TRACKS } from '../shared/content';
import { makePlayer, normalizeInput, Simulation } from '../shared/simulation';
import { RaceWire, syncWire } from '../shared/network';
import type { Mode, PlayerInput } from '../shared/types';
import { saveResults } from './store';
export const rooms=new Map<string,GameRoom>();
interface Selection { nickname:string;characterId:string;vehicleId:string; }
function selection(d:unknown):Selection {const o=d as Record<string,unknown>;if(!o||typeof o.nickname!=='string'||!o.nickname.trim()||o.nickname.length>24||!CHARACTERS.some(c=>c.id===o.characterId)||!VEHICLES.some(v=>v.id===o.vehicleId))throw new Error('Selección inválida');return{nickname:o.nickname.trim(),characterId:String(o.characterId),vehicleId:String(o.vehicleId)};}
export class GameRoom extends Room<{state:RaceWire}> {
 sim!:Simulation;queues=new Map<string,PlayerInput[]>();private counts=new Map<string,{n:number;start:number}>();private lastSaved='';private lastEvent=0;private botCount=5;private accum=0;
 onCreate(options:Record<string,unknown>){
  if(rooms.size>=3)throw new Error('El servidor está ocupado. Prueba de nuevo en un momento.');
  if(!['race','practice','battle','championship'].includes(String(options.mode))||!TRACKS.some(t=>t.id===options.trackId))throw new Error('Partida inválida');
  this.roomId=randomBytes(4).toString('hex').toUpperCase();this.maxClients=12;this.setPrivate(true);
  this.sim=new Simulation(options.mode as Mode,String(options.trackId));this.botCount=Math.max(0,Math.min(11,Number(options.bots)||0));this.sim.difficulty=[0,1,2].includes(Number(options.difficulty))?Number(options.difficulty):1;this.setState(new RaceWire());syncWire(this.state,this.sim.state);rooms.set(this.roomId,this);this.setPatchRate(50);
  this.onMessage('input',(client,data)=>{if(!this.allowMessage(client))return;const input=normalizeInput(data);const p=this.sim.state.players.find(p=>p.id===client.sessionId);if(!p||!input||input.seq<=p.ack)return;const queue=this.queues.get(p.id)??[];if(queue.length&&input.seq<=queue.at(-1)!.seq)return;if(queue.length>=8)queue.shift();queue.push(input);this.queues.set(p.id,queue);});
  this.onMessage('ready',(c)=>{if(!this.allowMessage(c))return;if(this.sim.state.phase==='lobby'||this.sim.state.phase==='results'){const p=this.sim.state.players.find(p=>p.id===c.sessionId);if(p)p.ready=!p.ready;syncWire(this.state,this.sim.state);}});
  this.onMessage('select',(c,d)=>{if(!this.allowMessage(c))return;if(this.sim.state.phase!=='lobby')return;try{const v=selection(d),p=this.sim.state.players.find(p=>p.id===c.sessionId);if(p){Object.assign(p,v);p.ready=false;syncWire(this.state,this.sim.state);}}catch{c.send('notice','Esa selección no es válida.');}});
  this.onMessage('start',(c)=>{if(!this.allowMessage(c))return;if(c.sessionId!==this.sim.state.hostId||this.sim.state.phase!=='lobby')return;if(this.sim.state.players.some(p=>p.connected&&!p.ready)){c.send('notice','Falta que todos marquen «Listo».');return;}this.fillBots();this.lock();this.lastSaved='';this.sim.start();this.queues.clear();});
  this.onMessage('next',(c)=>{if(!this.allowMessage(c))return;if(c.sessionId!==this.sim.state.hostId)return;if(this.sim.state.phase==='results'&&this.sim.state.mode==='championship'){this.sim.nextRound();this.queues.clear();return;}if(this.sim.state.phase==='results'||this.sim.state.phase==='cup-results'){this.lastSaved='';if(this.sim.state.mode==='championship')this.sim.restartCup();else this.sim.start();this.queues.clear();}});
  this.onMessage('ping',(c,d)=>{if(!this.allowMessage(c))return;if(typeof d==='number'&&Number.isFinite(d))c.send('pong',d);});
  this.setSimulationInterval(ms=>{this.accum+=Math.min(ms,100);let steps=0;while(this.accum>=1000/60&&steps++<6){for(const p of this.sim.state.players){const queue=this.queues.get(p.id),next=queue?.shift();if(next)this.sim.inputs.set(p.id,next);else{const old=this.sim.inputs.get(p.id);if(old)this.sim.inputs.set(p.id,{...old,attack:0});}}this.sim.tick();this.accum-=1000/60;}syncWire(this.state,this.sim.state);const events=this.sim.state.events.filter(e=>e.id>this.lastEvent);if(events.length){this.broadcast('events',events);this.lastEvent=events.at(-1)!.id;}const phase=this.sim.state.phase;if((phase==='results'||phase==='cup-results')&&this.lastSaved!==this.sim.state.round+'-'+phase){saveResults(this.roomId,this.sim.state);this.lastSaved=this.sim.state.round+'-'+phase;}},1000/60);
 }
 validResume(token:string){if(typeof token!=='string'||!token)return false;if(this.clients.some(c=>c.reconnectionToken===token))return true;return Boolean(this.checkReconnectionToken(token));}
 allowMessage(c:Client){const now=Date.now(),v=this.counts.get(c.sessionId)??{n:0,start:now};if(now-v.start>1000){v.n=0;v.start=now;}v.n++;this.counts.set(c.sessionId,v);if(v.n>180){c.leave(4008);return false;}return true;}
 fillBots(){const target=Math.min(12,Math.max(this.clients.length,this.clients.length+this.botCount));while(this.sim.state.players.length<target){const i=this.sim.state.players.length;this.sim.addPlayer(makePlayer('bot-'+i,CHARACTERS[i%9].name,CHARACTERS[i%9].id,VEHICLES[i%6].id,i,true));}}
 onAuth(_client:Client,options:unknown){if(this.sim.state.phase!=='lobby')throw new Error('La carrera ya empezó');return selection(options);}
 onJoin(client:Client,options:unknown){const v=selection(options);if(this.sim.state.players.length>=12)throw new Error('Sala completa');this.sim.addPlayer(makePlayer(client.sessionId,v.nickname,v.characterId,v.vehicleId,this.sim.state.players.length));syncWire(this.state,this.sim.state);}
 async onDrop(client:Client){const p=this.sim.state.players.find(p=>p.id===client.sessionId);if(p){p.connected=false;this.queues.delete(p.id);this.sim.inputs.delete(p.id);}this.transferHost(client.sessionId);try{await this.allowReconnection(client,30);}catch{if(p){if(this.sim.state.phase==='lobby')this.sim.state.players=this.sim.state.players.filter(v=>v!==p);else p.bot=true;}}}
 onReconnect(client:Client){const p=this.sim.state.players.find(p=>p.id===client.sessionId);if(p){p.connected=true;p.bot=false;this.queues.delete(p.id);this.sim.inputs.delete(p.id);}if(!this.sim.state.hostId)this.sim.state.hostId=client.sessionId;}
 onLeave(client:Client){const p=this.sim.state.players.find(p=>p.id===client.sessionId);if(this.sim.state.phase==='lobby')this.sim.state.players=this.sim.state.players.filter(v=>v.id!==client.sessionId);else if(p){p.connected=false;p.bot=true;}this.queues.delete(client.sessionId);this.counts.delete(client.sessionId);this.transferHost(client.sessionId);}
 transferHost(id:string){if(this.sim.state.hostId===id)this.sim.state.hostId=this.sim.state.players.find(p=>p.connected&&!p.bot&&p.id!==id)?.id??'';}
 onDispose(){rooms.delete(this.roomId);}
 onUncaughtException(error:Error,methodName:string){console.error('Error en sala, método '+methodName,error);this.broadcast('notice','Esta manga se trabó. Vuelve al garaje para intentarlo otra vez.');if(this.sim){this.sim.state.phase='results';syncWire(this.state,this.sim.state);}}
}
