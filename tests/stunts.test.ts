import { describe,it,expect } from 'vitest';
import { TRACKS } from '../shared/content';
import { routeFor,sample } from '../shared/track';
import { stuntPose,stuntRail,STUNT } from '../shared/stunts';
import { stepPlayer } from '../shared/simulation';
import { EMPTY_INPUT } from '../shared/types';

describe('loops, tirabuzones y tubos',()=>{
 it('hay acrobacias en casi todas las pistas, sin chocar con rampas, huecos ni carriles',()=>{
  const all=TRACKS.flatMap(t=>routeFor(t.id).course.stunts.map(st=>({t:t.id,st})));
  expect(all.length).toBeGreaterThanOrEqual(5);expect(new Set(all.map(x=>x.st.kind))).toEqual(new Set(['loop','roll','tube']));
  for(const {t,st} of all){const r=routeFor(t),a=st.from-STUNT.runUp,b=st.to+STUNT.runOut;
   for(const ramp of r.course.ramps.filter(x=>!x.lane))expect(ramp.at+ramp.len<a||ramp.at>b,t+' rampa').toBe(true);
   for(const g of r.course.gaps.filter(x=>!x.lane))expect(g.to<a||g.from>b,t+' hueco').toBe(true);}
 });
 it('la pose empieza y termina en la pista, derecha, y da la vuelta completa',()=>{
  for(const t of TRACKS){const r=routeFor(t.id);for(const st of r.course.stunts){
   const a=stuntPose(r,st,st.from),b=stuntPose(r,st,st.to),ca=sample(r,st.from),cb=sample(r,st.to);
   expect(Math.hypot(a.x-ca.x,a.z-ca.z),t.id).toBeLessThan(.05);expect(Math.abs(a.y-ca.y)).toBeLessThan(.05);
   expect(Math.hypot(b.x-cb.x,b.z-cb.z),t.id).toBeLessThan(.2);expect(Math.abs(b.y-cb.y)).toBeLessThan(.2);
   const mid=stuntPose(r,st,(st.from+st.to)/2);expect(mid.up[1],t.id+' boca abajo a la mitad').toBeLessThan(-.9);expect(mid.y-sample(r,(st.from+st.to)/2).y).toBeGreaterThan(st.radius*1.5);
   let prev=a;for(let i=1;i<=80;i++){const p=stuntPose(r,st,st.from+(st.to-st.from)*i/80);expect(Math.hypot(p.x-prev.x,p.y-prev.y,p.z-prev.z),t.id+' sin saltos').toBeLessThan(4);prev=p;}
  }}
 });
 it('en la acrobacia el carro va centrado, sin perder velocidad, y sale andando',()=>{
  for(const t of TRACKS){const r=routeFor(t.id);for(const st of r.course.stunts){
   const start=sample(r,st.from-STUNT.runUp-6),right={x:Math.cos(start.yaw),z:-Math.sin(start.yaw)};
   const p:any={id:'p',vehicleId:'black-diamond',characterId:'jorsi',x:start.x+right.x*3,y:start.y,z:start.z+right.z*3,yaw:start.yaw+.2,speed:14,progress:st.from-STUNT.runUp-6,safe:st.from-STUNT.runUp-6,lap:0,gate:Math.floor((st.from-STUNT.runUp-6)/(r.length/8))+1,
    steerAngle:0,turnRate:0,lateralSpeed:0,impact:0,pushX:0,pushZ:0,vy:0,driftDir:0,driftCharge:0,yawKick:0,recover:0,aid:0,boost:0,boostLevel:0,air:0,surface:0,stun:0,immune:0,cooldown:0,sliding:0,haze:0,paint:0,shield:0,flash:0,slow:0,fall:0,fallKind:'',respawn:0,gvy:0,roulette:0,bongWarn:0,finishTime:-1,turbos:0};
   let seen=false;for(let i=0;i<60*8&&p.progress<st.to+20;i++){stepPlayer(p,{...EMPTY_INPUT,steer:i%40<20?1:-1},r,'race');if(stuntRail(r,p.progress)&&p.progress>st.from){seen=true;expect(p.speed).toBeGreaterThanOrEqual(STUNT.minSpeed-.01);}}
   expect(seen,t.id).toBe(true);expect(p.progress,t.id+' salió').toBeGreaterThan(st.to+10);expect(p.fall,t.id).toBe(0);
  }}
 });
});
