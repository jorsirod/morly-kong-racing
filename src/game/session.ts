import { Client, type Room } from '@colyseus/sdk';
import { CHARACTERS, VEHICLES } from '../../shared/content';
import { makePlayer, Simulation } from '../../shared/simulation';
import { fromWire, type RaceWire } from '../../shared/network';
import { type GameEvent, type GameState, type Mode, type PlayerInput } from '../../shared/types';
import { RacePrediction } from './prediction';
export interface Selection {nickname:string;characterId:string;vehicleId:string;}
export interface Session { id:string; state:GameState; online:boolean; connected:boolean; rtt:number; update(input:PlayerInput):void; next():void; leave():void; ready?():void; start?():void; }
export class LocalSession implements Session {
 id='you';online=false;connected=true;rtt=0;sim:Simulation;get state(){return this.sim.state;}
 constructor(selection:Selection,mode:Mode,trackId:string,bots:number,difficulty=1){this.sim=new Simulation(mode,trackId);this.sim.difficulty=difficulty;this.sim.addPlayer(makePlayer(this.id,selection.nickname,selection.characterId,selection.vehicleId,0));for(let i=0;i<bots;i++)this.sim.addPlayer(makePlayer('bot-'+i,CHARACTERS[(i+1)%9].name,CHARACTERS[(i+1)%9].id,VEHICLES[(i+1)%6].id,i+1,true));this.sim.start();}
 update(input:PlayerInput){this.sim.inputs.set(this.id,input);this.sim.tick();}
 next(){if(this.state.mode==='championship'&&this.state.phase==='results'&&this.state.round<3)this.sim.nextRound();else if(this.state.mode==='championship')this.sim.restartCup();else this.sim.start();}
 leave(){}
}
export function networkClient(){const override=import.meta.env.VITE_SERVER_URL as string|undefined;if(override)return new Client(override);return new Client((location.protocol==='https:'?'wss://':'ws://')+location.host,{urlBuilder:url=>{if(url.protocol==='ws:'||url.protocol==='wss:')url.pathname='/game'+url.pathname;return url.toString();}});}
export class OnlineSession implements Session {
 online=true;connected=true;rtt=0;id:string;state:GameState;room:Room<any,RaceWire>;notice='';private predictor:RacePrediction;private eventQueue:GameEvent[]=[];private heartbeat:number;private lastDrift=false;
 get prediction(){return this.predictor.player;}
 constructor(room:Room<any,RaceWire>){this.room=room;this.id=room.sessionId;this.state=fromWire(room.state);this.predictor=new RacePrediction(this.id);this.receive(room.state);room.onStateChange(s=>this.receive(s));room.onMessage('events',(events:GameEvent[])=>{this.eventQueue.push(...events);this.eventQueue=this.eventQueue.slice(-40);this.state.events=this.eventQueue;});room.onMessage('notice',(text:string)=>this.notice=text);room.onMessage('pong',(time:number)=>this.rtt=Math.round(performance.now()-time));room.onDrop(()=>{this.connected=false;});room.onReconnect(()=>{this.connected=true;this.predictor.reset();this.receive(room.state);this.storeResume();});room.onLeave(()=>this.connected=false);this.heartbeat=window.setInterval(()=>{if(this.connected)room.send('ping',performance.now());},2000);this.storeResume();}
 private storeResume(){fetch('/api/resume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:this.room.reconnectionToken})}).catch(()=>{});}
 private receive(w:RaceWire){const s=fromWire(w);s.events=this.eventQueue;this.predictor.receive(s);this.state=s;}
 update(input:PlayerInput){if(!this.connected)return;if(this.state.phase==='countdown'){if(input.drift!==this.lastDrift)this.room.send('input',input);this.lastDrift=input.drift;return;}if(this.state.phase!=='running')return;this.room.send('input',input);this.predictor.update(input);}
 view(){return this.predictor.view(this.state);}
 ready(){this.room.send('ready');}
 start(){this.notice='';this.room.send('start');}
 next(){this.room.send('next');}
 leave(){clearInterval(this.heartbeat);this.room.leave();fetch('/api/resume',{method:'DELETE'}).catch(()=>{});}
}
