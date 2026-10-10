// Full online race: 12 human clients drive with pure pursuit until the podium.
// Requires the server running (npm run dev:server). Takes about three minutes.
import { Client,type Room } from '@colyseus/sdk';
import assert from 'node:assert/strict';
import { RaceWire } from '../shared/network';
import { CHARACTERS,VEHICLES } from '../shared/content';
import { EMPTY_INPUT } from '../shared/types';
import { routeFor,sample,angle,clamp } from '../shared/track';
const endpoint=process.env.TEST_SERVER_URL??'ws://127.0.0.1:2567',client=new Client(endpoint),rooms:Room<any,RaceWire>[]=[];
const waitFor=async(fn:()=>boolean,ms=10000)=>{const t=Date.now();while(!fn()){if(Date.now()-t>ms)throw new Error('Tiempo agotado');await new Promise(r=>setTimeout(r,50));}};
let events=0,hits=0,finishes=0;
try{
 const host=await client.create<RaceWire>('race',{nickname:'Anfitrión',characterId:'semilla',vehicleId:'silver-surfer',mode:'race',trackId:'hipa-hipa',bots:0},RaceWire);rooms.push(host);
 for(let i=1;i<12;i++){const r=await client.joinById<RaceWire>(host.roomId,{nickname:'Piloto '+i,characterId:CHARACTERS[i%9].id,vehicleId:VEHICLES[i%6].id},RaceWire);rooms.push(r);}
 for(const r of rooms)r.onMessage('events',(list:{type:string}[])=>{events+=list.length;hits+=list.filter(e=>e.type==='hit').length;finishes+=list.filter(e=>e.type==='finish').length;});
 await waitFor(()=>host.state.players.size===12);for(const r of rooms)r.send('ready');await waitFor(()=>[...host.state.players.values()].every(p=>p.ready));host.send('start');
 await waitFor(()=>host.state.phase==='running',15000);
 const route=routeFor('hipa-hipa');let seq=0;const started=Date.now();
 const timer=setInterval(()=>{seq++;for(const [i,r] of rooms.entries()){const p=r.state.players.get(r.sessionId);if(!p)continue;const aim=sample(route,p.progress+16),steer=clamp(angle(Math.atan2(aim.x-p.x,aim.z-p.z)-p.yaw)*1.6,-1,1);const fire=seq%(240+i*7)===0;r.send('input',{...EMPTY_INPUT,seq,actionSeq:fire?seq:0,attack:fire?1:0,steer,drift:Math.abs(steer)>.6});}},1000/30);
 await waitFor(()=>host.state.phase==='results',260000);clearInterval(timer);
 const players=[...host.state.players.values()];const finished=players.filter(p=>p.finishTime>=0);
 assert.ok(finished.length>=10,'casi todos terminan: '+finished.length);assert.ok(players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.progress)));
 const times=finished.map(p=>p.finishTime).sort((a,b)=>a-b);assert.ok(times[0]>90&&times[0]<260);
 // Every client sees the same podium.
 const podium=(r:Room<any,RaceWire>)=>[...r.state.players.values()].filter(p=>p.finishTime>=0).sort((a,b)=>a.finishTime-b.finishTime).slice(0,3).map(p=>p.id).join(',');
 await new Promise(r=>setTimeout(r,500));assert.ok(rooms.every(r=>podium(r)===podium(host)),'mismo podio en todos los clientes');
 console.log(JSON.stringify({ok:true,seconds:Math.round((Date.now()-started)/1000),finished:finished.length,winner:times[0].toFixed(1),hitsSeen:hits,eventsSeen:events,finishEvents:finishes},null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{for(const r of rooms)await Promise.race([r.leave(),new Promise(r=>setTimeout(r,200))]);}
