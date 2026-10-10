import {Client,type Room} from '@colyseus/sdk';
import {RaceWire} from '../shared/network';
import {EMPTY_INPUT} from '../shared/types';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:2567',client=new Client(base),joined:Room<any,RaceWire>[]=[];
async function until(fn:()=>boolean,ms=5000){const start=Date.now();while(!fn()){if(Date.now()-start>ms)throw Error('Tiempo agotado');await new Promise(r=>setTimeout(r,30));}}
function observe(r:Room<any,RaceWire>){r.onMessage('events',()=>{});r.onMessage('notice',()=>{});joined.push(r);return r;}
try{
assert.equal((await fetch(base+'/api/health',{headers:{Origin:'https://intruso.example'}})).status,403);
assert.equal((await fetch(base+'/api/resume',{headers:{Cookie:'morly_resume=abc.'+'á'.repeat(64)}})).status,204);
const selection={nickname:'Reconexion',characterId:'morly',vehicleId:'hola-willy'};
const host=observe(await client.create<RaceWire>('race',{...selection,mode:'practice',trackId:'la-salle',bots:0},RaceWire));await until(()=>host.state.players?.size===1);
const friend=observe(await client.joinById<RaceWire>(host.roomId,{...selection,nickname:'Segundo'},RaceWire));await until(()=>friend.state.players?.size===2);
host.send('ready');friend.send('ready');await until(()=>[...host.state.players.values()].every(p=>p.ready));host.send('start');await until(()=>host.state.phase==='running');host.send('input',{...EMPTY_INPUT,seq:1,actionSeq:1});await until(()=>host.state.players.get(host.sessionId)!.ack===1);
const id=host.sessionId,token=host.reconnectionToken,tick=friend.state.tick;
const activeSave=await fetch(base+'/api/resume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});assert.equal(activeSave.status,200);await new Promise(r=>setTimeout(r,150));assert.equal(friend.state.players.get(id)!.connected,true);
host.reconnection.enabled=false;host.connection.close(4010,'Prueba de pérdida de conexión');await until(()=>friend.state.players.get(id)?.connected===false);await until(()=>friend.state.hostId===friend.sessionId);await new Promise(r=>setTimeout(r,350));assert.ok(friend.state.tick>tick);assert.equal(friend.state.players.get(id)!.ack,1);
const saved=await fetch(base+'/api/resume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});assert.equal(saved.status,200);const cookie=saved.headers.get('set-cookie')!.split(';')[0];assert.ok(saved.headers.get('set-cookie')!.includes('HttpOnly'));const resume=await fetch(base+'/api/resume',{headers:{Cookie:cookie}});assert.equal((await resume.json()).token,token);
const back=observe(await client.reconnect<RaceWire>(token,RaceWire));await until(()=>back.state.players.get(id)?.connected===true);assert.equal(back.sessionId,id);back.send('input',{...EMPTY_INPUT,seq:2,actionSeq:2,attack:1});await until(()=>back.state.players.get(id)!.ack===2);assert.equal(back.state.players.get(id)!.charges,2);
console.log(JSON.stringify({ok:true,checks:['rechazo de origen externo','cookie alterada sin caída','bot y transferencia del anfitrión','reserva y vuelta al mismo piloto','entradas y ataques después de reconectar','cookie HttpOnly de recarga']},null,2));
}catch(e){console.error(e);process.exitCode=1;}finally{for(const room of joined)if(room.connection.isOpen)await room.leave();}
