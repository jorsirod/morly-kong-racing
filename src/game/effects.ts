import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Scene } from '@babylonjs/core/scene';
import type { GameState, PlayerState, GameEvent } from '../../shared/types';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import { OBJECT_COLORS } from './attacks';
import '@babylonjs/core/Engines/Extensions/engine.dynamicTexture';

type Sprite='spark'|'star'|'ring'|'dust'|'flame'|'trail';
type Particle={mesh:Mesh;life:number;duration:number;vx:number;vy:number;vz:number;gravity:number;drag:number;size:number;endSize:number;spin:number;opacity:number;critical:boolean};
const COLORS={gold:'#ffdf62',blue:'#50d6ff',white:'#fff8d6',dust:'#c3a77b',orange:'#ff934a',green:'#90e76a',pink:'#ff6faa',purple:'#b899ff'};
const objectColors:Record<string,string>={victoria:COLORS.gold,tona:COLORS.green,rum:COLORS.white,flor:COLORS.orange,cigarettes:COLORS.white,ashtray:COLORS.blue,sixpack:COLORS.gold,basketball:COLORS.orange,leaf:COLORS.green,frog:COLORS.green,onion:COLORS.white,cucumber:COLORS.green,bill:COLORS.green,coin:COLORS.gold,diamond:COLORS.blue,console:COLORS.purple,ice:COLORS.blue,slipper:COLORS.blue,pizza:COLORS.orange,milk:COLORS.white,backpack:COLORS.pink,brush:COLORS.pink,pencil:COLORS.gold,eraser:COLORS.blue,claudia:COLORS.pink,talc:COLORS.white,smoke:COLORS.green,coco:COLORS.orange,chilero:COLORS.orange,bong:COLORS.green};

/** Short additive sprites share geometry and materials; no mesh is allocated during a race. */
export class RaceEffects {
 private particles:Particle[]=[];private materials=new Map<string,StandardMaterial>();private textures=new Map<Sprite,DynamicTexture>();private lastEvent=0;private lastTick=0;private emission=0;private cursor=0;private limit=80;private disposed=false;private eventPriority=false;
 constructor(private scene:Scene){
  for(const kind of ['spark','star','ring','dust','flame','trail'] as Sprite[])this.makeTexture(kind);
  const source=MeshBuilder.CreatePlane('effect-pool-source',{size:1,sideOrientation:Mesh.DOUBLESIDE},scene);source.isVisible=false;source.isPickable=false;
  for(let i=0;i<80;i++){const mesh=source.clone('effect-'+i,null,true)!;mesh.isVisible=false;mesh.isPickable=false;mesh.billboardMode=Mesh.BILLBOARDMODE_ALL;mesh.alwaysSelectAsActiveMesh=false;this.particles.push({mesh,life:0,duration:1,vx:0,vy:0,vz:0,gravity:0,drag:0,size:1,endSize:1,spin:0,opacity:1,critical:false});}
  source.dispose();for(const kind of ['spark','star','ring','dust','flame','trail'] as Sprite[])for(const color of Object.values(COLORS))this.getMaterial(kind,color);
 }
 setQuality(low:boolean){this.limit=low?48:80;for(let i=this.limit;i<80;i++){this.particles[i].life=0;this.particles[i].mesh.isVisible=false;}}
 private makeTexture(kind:Sprite){
  if(typeof document==='undefined')return;
  const tex=new DynamicTexture('effect-texture-'+kind,{width:128,height:128},this.scene,false),ctx=tex.getContext() as CanvasRenderingContext2D;tex.hasAlpha=true;ctx.clearRect(0,0,128,128);
  if(kind==='star'){
   ctx.fillStyle='white';ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?23:57,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();
  }else if(kind==='ring'){
   ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=10;ctx.beginPath();ctx.arc(64,64,50,0,Math.PI*2);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.arc(64,64,37,0,Math.PI*2);ctx.stroke();
  }else if(kind==='flame'){
   const gradient=ctx.createLinearGradient(64,6,64,120);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(.42,'rgba(255,255,255,.9)');gradient.addColorStop(1,'rgba(255,255,255,1)');ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(66,7);ctx.bezierCurveTo(86,44,115,64,101,99);ctx.bezierCurveTo(89,124,37,126,26,98);ctx.bezierCurveTo(11,72,46,48,41,30);ctx.bezierCurveTo(50,38,59,48,62,54);ctx.bezierCurveTo(72,42,62,20,66,7);ctx.fill();
  }else if(kind==='spark'){
   ctx.fillStyle='white';ctx.beginPath();ctx.moveTo(64,6);ctx.lineTo(73,51);ctx.lineTo(109,63);ctx.lineTo(74,74);ctx.lineTo(63,122);ctx.lineTo(53,76);ctx.lineTo(18,64);ctx.lineTo(53,53);ctx.closePath();ctx.fill();
  }else{
   const gradient=ctx.createRadialGradient(64,64,2,64,64,62);gradient.addColorStop(0,'rgba(255,255,255,'+(kind==='dust'?'.7':'1')+')');gradient.addColorStop(.42,'rgba(255,255,255,.42)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  }
  tex.update();this.textures.set(kind,tex);
 }
 private getMaterial(kind:Sprite,color:string){
  const key=kind+color,cached=this.materials.get(key);if(cached)return cached;
  const m=new StandardMaterial('effect-'+key,this.scene);m.diffuseColor=Color3.FromHexString(color);m.emissiveColor=Color3.FromHexString(color);m.disableLighting=true;m.specularColor=Color3.Black();m.backFaceCulling=false;m.disableDepthWrite=true;const tex=this.textures.get(kind);if(tex){m.diffuseTexture=tex;m.useAlphaFromDiffuseTexture=true;}m.alphaMode=kind==='dust'?Constants.ALPHA_COMBINE:Constants.ALPHA_ADD;this.materials.set(key,m);return m;
 }
 private emit(kind:Sprite,color:string,x:number,y:number,z:number,size:number,duration:number,vx=0,vy=0,vz=0,endSize=size*.35,opacity=1,gravity=0){
  const span=this.eventPriority?this.limit:this.limit-16;let index=-1;for(let i=0;i<span;i++){const candidate=(this.cursor+i)%span;if(this.particles[candidate].life<=0){index=candidate;break;}}
  if(index<0&&this.eventPriority){let oldest=Infinity;for(let i=0;i<this.limit;i++)if(!this.particles[i].critical&&this.particles[i].life<oldest){oldest=this.particles[i].life;index=i;}}
  if(index<0)return;this.cursor=(index+1)%this.limit;const p=this.particles[index];p.critical=this.eventPriority;p.life=p.duration=duration;p.vx=vx;p.vy=vy;p.vz=vz;p.gravity=gravity;p.drag=kind==='dust'?2:1.1;p.size=size;p.endSize=endSize;p.opacity=opacity;p.spin=kind==='star'?7:kind==='spark'?3:0;p.mesh.position.set(x,y,z);p.mesh.scaling.setAll(size);p.mesh.rotation.set(0,0,Math.random()*Math.PI*2);p.mesh.material=this.getMaterial(kind,color);p.mesh.visibility=opacity;p.mesh.isVisible=true;
 }
 private burst(x:number,y:number,z:number,color:string,count:number,force:number,stars=false){
  for(let i=0;i<count;i++){const a=i*Math.PI*2/count+Math.random()*.45,speed=(.7+Math.random()*.6)*force;this.emit(stars?'star':'spark',color,x,y,z,stars?.42:.23,.28+Math.random()*.32,Math.sin(a)*speed,.8+Math.random()*1.8,Math.cos(a)*speed,stars?.13:.035,1,1.7);}
 }
 private event(event:GameEvent,state:GameState,me:PlayerState){
  const p=state.players.find(v=>v.id===(event.targetId??event.playerId));if(!p)return;const x=event.x??p.x,y=event.y??p.y,z=event.z??p.z;if(Math.hypot(x-me.x,z-me.z)>45)return;
  if(event.type==='attack'){
   const owner=state.players.find(v=>v.id===event.playerId)??p,back=event.object==='ice'||event.object==='ashtray',sign=back?-1:1,ax=owner.x+Math.sin(owner.yaw)*2.4*sign,az=owner.z+Math.cos(owner.yaw)*2.4*sign,color=objectColors[event.object??'']??COLORS.gold;
   this.emit('ring',color,ax,owner.y+1.35,az,event.special?1.12:.6,.25,0,0,0,event.special?1.85:.94,.7);this.burst(ax,owner.y+1.3,az,color,event.special?7:4,event.special?3:2);
  }else if(event.type==='hit'){
   // Debris in the object's own colour: glass, coins, leaves, milk… you can tell what hit you.
   const tint=OBJECT_COLORS[event.object??'']??COLORS.white,glassy=['victoria','tona','rum','flor','sixpack','ice','diamond'].includes(event.object??''),soft=['smoke','talc','milk','leaf','bill'].includes(event.object??'');
   this.emit('ring',tint,x,y+1.25,z,.45,.33,0,.25,0,event.special?1.8:1.2,.95);this.burst(x,y+1.1,z,tint,event.special?10:7,glassy?4:3,!glassy);
   if(soft)for(let i=0;i<5;i++){const a=i*1.26;this.emit('dust',tint,x+Math.sin(a),y+1,z+Math.cos(a),.9,.7,Math.sin(a)*2,1,Math.cos(a)*2,1.8,.55);}
  }else if(event.type==='collision'){
   const intensity=Math.max(.2,Math.min(1.5,event.intensity??.5));this.burst(x,y+.95,z,COLORS.orange,Math.round(3+intensity*3),1.7+intensity);this.emit('ring',COLORS.gold,x,y+.85,z,.25,.22,0,.15,0,.65+intensity*.25,.7);
  }else if(event.type==='pickup'){
   this.emit('ring',COLORS.blue,x,y+1.1,z,.65,.5,0,1,0,1.55,.9);this.burst(x,y+1.4,z,COLORS.gold,7,2.2,true);
  }else if(event.type==='boost'){
   for(const side of [-1,1]){const rear=this.rear(p,side);this.emit('flame',COLORS.blue,rear.x,rear.y,rear.z,.95,.36,-Math.sin(p.yaw)*2,.2,-Math.cos(p.yaw)*2,.3);}
  }else if(event.type==='land'){
   for(let i=0;i<6;i++){const a=i*Math.PI/3;this.emit('dust',COLORS.dust,x+Math.sin(a)*.8,y+.18,z+Math.cos(a)*.8,.48,.58,Math.sin(a)*2.8,.5,Math.cos(a)*2.8,1.12,.65);}
  }
 }
 private rear(p:PlayerState,side:number){const forward=Math.sin(p.yaw),forwardZ=Math.cos(p.yaw),right=forwardZ,rightZ=-forward;return{x:p.x-forward*1.7+right*side*.91,y:p.y+.48,z:p.z-forwardZ*1.7+rightZ*side*.91};}
 update(state:GameState,id:string,dt:number){
  if(this.disposed)return;dt=Math.min(.08,Math.max(0,dt));const me=state.players.find(p=>p.id===id)??state.players[0];
  if(state.tick<this.lastTick){this.lastEvent=0;for(const p of this.particles){p.life=0;p.mesh.isVisible=false;}}this.lastTick=state.tick;
  for(const p of this.particles){if(p.life<=0)continue;p.life-=dt;if(p.life<=0){p.mesh.isVisible=false;continue;}const age=1-p.life/p.duration,drag=Math.max(0,1-p.drag*dt);p.vx*=drag;p.vz*=drag;p.vy-=p.gravity*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;p.mesh.rotation.z+=p.spin*dt;p.mesh.scaling.setAll(p.size+(p.endSize-p.size)*age);p.mesh.visibility=p.opacity*Math.min(1,(1-age)*3);}
  if(!me)return;this.eventPriority=true;for(const event of state.events)if(event.id>this.lastEvent){this.lastEvent=event.id;this.event(event,state,me);}this.eventPriority=false;
  this.emission+=dt;if(this.emission<.055||state.phase!=='running')return;this.emission%=.055;
  // The nearest rivals share a budget, preserving room for hit feedback.
  const nearby=state.players.filter(p=>p.speed>6&&Math.hypot(p.x-me.x,p.z-me.z)<45).sort((a,b)=>Math.hypot(a.x-me.x,a.z-me.z)-Math.hypot(b.x-me.x,b.z-me.z)).slice(0,this.limit===48?4:6);
  for(const p of nearby)for(const side of [-1,1]){const rear=this.rear(p,side);
   if(p.boost>0)this.emit('flame',p.boost>.7?COLORS.blue:COLORS.orange,rear.x,rear.y,rear.z,.65,.19,-Math.sin(p.yaw)*3,0,-Math.cos(p.yaw)*3,.13,.75);
   else if(p.driftCharge>.12)this.emit('spark',p.driftCharge>.95?COLORS.gold:COLORS.blue,rear.x,p.y+.28,rear.z,p.driftCharge>.5?.34:.2,.28,-Math.sin(p.yaw)*1.3+side*Math.cos(p.yaw),.45,-Math.cos(p.yaw)*1.3-side*Math.sin(p.yaw),.07,.9,2);
   if((Math.abs(p.lateralSpeed)>1.4||p.sliding>0)&&Math.random()<.55)this.emit('dust',COLORS.dust,rear.x,p.y+.2,rear.z,.4,.48,-Math.sin(p.yaw)*1.5,.45,-Math.cos(p.yaw)*1.5,.88,.44);
  }
  const shots=state.shots.filter(s=>s.delivery!=='area'&&Math.hypot(s.x-me.x,s.z-me.z)<45).sort((a,b)=>Math.hypot(a.x-me.x,a.z-me.z)-Math.hypot(b.x-me.x,b.z-me.z)).slice(0,this.limit===48?6:12);
  for(const shot of shots)this.emit(shot.special?'spark':'trail',OBJECT_COLORS[shot.object]??COLORS.gold,shot.x,shot.y,shot.z,shot.special?.35:.23,shot.special?.37:.24,-shot.vx*.025,0,-shot.vz*.025,.03,shot.special?.82:.55);
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.particles.forEach(p=>p.mesh.dispose());this.materials.forEach(m=>m.dispose(false,false));this.textures.forEach(t=>t.dispose());this.particles=[];this.materials.clear();this.textures.clear();}
}
