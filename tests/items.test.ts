import { describe,it,expect } from 'vitest';
import { CHARACTERS,VEHICLES } from '../shared/content';
import { BONG,ITEMS,rollItem } from '../shared/items';
import { Simulation,leadInfo,makePlayer } from '../shared/simulation';
import { sample } from '../shared/track';
import { EMPTY_INPUT } from '../shared/types';

/** A running race with `n` players spread along the track at the given progress values. */
function race(progress:number[],trackId='la-salle'){
 const s=new Simulation('race',trackId);progress.forEach((d,i)=>{const p=s.addPlayer(makePlayer('p'+i,'P'+i,CHARACTERS[i%9].id,VEHICLES[i%6].id,i));const q=sample(s.route,d);Object.assign(p,{x:q.x,z:q.z,y:q.y,yaw:q.yaw,progress:d,safe:d,gate:Math.floor(d/(s.route.length/8))+1,speed:18});});
 s.state.phase='running';s.state.time=40;return s;
}
const idle=(s:Simulation)=>{for(const p of s.state.players)s.inputs.set(p.id,{...EMPTY_INPUT,seq:s.state.tick});};
describe('ítems y El Bong Cachinflín',()=>{
 it('cada ítem tiene nombre, función y color propios',()=>{
  const roles=new Set(Object.values(ITEMS).map(i=>i.role));for(const r of ['MOVILIDAD','DEFENSA','ATAQUE','INTERFERENCIA','REMONTADA'])expect(roles.has(r as never)).toBe(true);
  expect(new Set(Object.values(ITEMS).map(i=>i.color)).size).toBe(Object.keys(ITEMS).length);
 });
 it('el puntero nunca recibe el Bong y los de atrás reciben más turbos',()=>{
  const draws=(f:number,allowed:boolean)=>Array.from({length:400},(_,i)=>rollItem(f,8,allowed,(i*.618)%1,(i*.377)%1));
  expect(draws(0,true).includes('bong')).toBe(false);
  expect(draws(1,false).includes('bong')).toBe(false);expect(draws(1,true).includes('bong')).toBe(true);
  const boosts=(f:number)=>draws(f,false).filter(v=>v==='cafe'||v==='cafe3').length;expect(boosts(1)).toBeGreaterThan(boosts(0)*2);
 });
 it('la ventaja se mide con avance real, vueltas y controles incluidos',()=>{
  const s=race([400,200,150]);const info=leadInfo(s.state,s.route.length);expect(info.leader?.id).toBe('p0');expect(Math.round(info.lead)).toBe(200);
  // Progress without the checkpoints does not count.
  s.state.players[0].gate=1;expect(leadInfo(s.state,s.route.length).lead).toBeLessThan(100);
 });
 it('el Bong solo aparece si el líder se escapó y respeta el enfriamiento',()=>{
  const close=race([300,300-BONG.lead+20,100]),far=race([600,600-BONG.lead-40,100]);
  const rolls=(s:Simulation,id:string)=>Array.from({length:120},(_,i)=>{s.state.tick=i*7;return s.rollFor(s.state.players.find(p=>p.id===id)!);});
  expect(rolls(close,'p1').includes('bong')).toBe(false);expect(rolls(far,'p0').includes('bong')).toBe(false);expect(rolls(far,'p2').includes('bong')).toBe(true);
  far.bongReadyAt=far.state.time+10;expect(rolls(far,'p2').includes('bong')).toBe(false);
 });
 it('el Bong persigue al primero, avisa antes del impacto, lo marea y lo frena',()=>{
  const s=race([700,520,480]),leader=s.state.players[0],me=s.state.players[2];me.item='bong';me.itemUses=1;
  expect(s.useItem(me)).toBe(true);const bong=s.state.shots.find(v=>v.object==='bong')!;expect(bong.target).toBe(leader.id);expect(s.state.events.some(e=>e.type==='warn'&&e.targetId===leader.id)).toBe(true);
  let warnedAt=-1,hitAt=-1;for(let i=0;i<60*14&&hitAt<0;i++){idle(s);s.tick();if(warnedAt<0&&leader.bongWarn>0&&leader.bongWarn<=BONG.warn)warnedAt=s.state.time;if(s.state.events.some(e=>e.type==='hit'&&e.object==='bong'&&e.targetId===leader.id))hitAt=s.state.time;}
  expect(hitAt).toBeGreaterThan(0);expect(hitAt-warnedAt).toBeGreaterThan(1.2);
  expect(leader.slow).toBeGreaterThan(1.5);expect(leader.stun).toBeGreaterThan(.5);
  // Moderado: el líder sigue en carrera y nadie más es golpeado.
  expect(s.state.players.filter(p=>p.hitsTaken>0).map(p=>p.id)).toEqual([leader.id]);
  expect(s.bongReadyAt).toBeGreaterThan(s.state.time+10);
 });
 it('el casco bloquea el golpe (también el Bong) y se rompe',()=>{
  const s=race([700,520,480]),leader=s.state.players[0],me=s.state.players[2];leader.shield=10;me.item='bong';me.itemUses=1;s.useItem(me);
  for(let i=0;i<60*14&&s.state.shots.length;i++){idle(s);s.tick();}
  expect(leader.slow).toBe(0);expect(leader.shield).toBe(0);expect(s.state.events.some(e=>e.type==='shield'&&e.targetId===leader.id)).toBe(true);
 });
 it('los cohetes encandilan solo a los de adelante y el café da súper turbo',()=>{
  const s=race([300,250,200]),mid=s.state.players[1];mid.item='cohetes';mid.itemUses=1;s.useItem(mid);
  expect(s.state.players[0].flash).toBeGreaterThan(1);expect(s.state.players[2].flash).toBe(0);expect(mid.item).toBe('');
  mid.item='cafe3';mid.itemUses=3;mid.cooldown=0;s.useItem(mid);expect(mid.boostLevel).toBe(4);expect(mid.item).toBe('cafe3');expect(mid.itemUses).toBe(2);
 });
 it('en carreras de bots el Bong permite remontar sin dominar la partida',()=>{
  let launches=0,hits=0,races=0,leaderChanges=0;
  for(const trackId of ['la-salle','oriental','managua','masaya']){for(const level of [1,2]){
   const s=new Simulation('race',trackId);s.difficulty=level;for(let i=0;i<8;i++)s.addPlayer(makePlayer('b'+i,'B',CHARACTERS[i%9].id,VEHICLES[i%6].id,i,true));s.start();let last=0,leader='';
   for(let i=0;i<22000&&s.state.phase!=='results';i++){s.tick();for(const e of s.state.events){if(e.id<=last)continue;last=e.id;if(e.type==='bong')launches++;if(e.type==='hit'&&e.object==='bong')hits++;}
    if(i%120===0&&s.state.phase==='running'){const l=leadInfo(s.state,s.route.length).leader?.id??'';if(leader&&l!==leader)leaderChanges++;leader=l;}}
   races++;expect(s.state.phase).toBe('results');
  }}
  // Rare enough to stay special (at most a few per race), common enough to exist.
  expect(launches).toBeGreaterThan(0);expect(launches/races).toBeLessThanOrEqual(4);expect(hits).toBeLessThanOrEqual(launches);expect(leaderChanges).toBeGreaterThan(races);
 },60000);
});
