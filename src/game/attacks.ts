import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { Scene } from '@babylonjs/core/scene';
import { character } from '../../shared/content';
import type { GameEvent, GameState, PlayerState, Shot } from '../../shared/types';
import { buildProjectile } from './models';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/Builders/discBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/tubeBuilder';

/** Each object has a colour that its halo, trail and debris share, so you can read it at a glance. */
export const OBJECT_COLORS:Record<string,string>={victoria:'#ffcf3d',tona:'#5fe07a',rum:'#d9f4ff',flor:'#ff9c3a',cigarettes:'#ff5964',ashtray:'#9fe6ff',sixpack:'#ffd33d',basketball:'#ff8a2a',leaf:'#7be05a',frog:'#8ef05c',onion:'#fff1d6',cucumber:'#6fdc5a',bill:'#7dffa8',coin:'#ffd84a',diamond:'#7ef3ff',console:'#b48cff',ice:'#a6ecff',slipper:'#5ff1ff',pizza:'#ffa63d',milk:'#ffffff',backpack:'#ff6f9f',brush:'#ff6f9f',pencil:'#ffd23d',eraser:'#ff8ab8',claudia:'#ff8fc8',talc:'#ffffff',smoke:'#c9f2b8'};
type Motion='tumble'|'bounce'|'hop'|'roll'|'spinY'|'flutter'|'spear'|'frisbee'|'lob'|'still';
const MOTION:Record<string,Motion>={victoria:'tumble',tona:'tumble',rum:'tumble',flor:'tumble',cigarettes:'tumble',sixpack:'lob',console:'lob',basketball:'bounce',frog:'hop',onion:'roll',cucumber:'roll',coin:'spinY',diamond:'spinY',eraser:'spinY',slipper:'spinY',bill:'flutter',leaf:'flutter',pencil:'spear',brush:'tumble',pizza:'frisbee',backpack:'tumble',ice:'still',ashtray:'still',milk:'still',talc:'still',smoke:'still'};
interface View { node:TransformNode; halo:Mesh; shadow:Mesh; extra?:TransformNode; motion:Motion; }
interface Transient { node:TransformNode; born:number; life:number; update:(t:number)=>void; }

/** Projectiles, traps, clouds, cast pillars, lightning and dizzy stars. Visual only. */
export class AttackView {
 private views=new Map<number,View>();private fx:Transient[]=[];private dizzy=new Map<string,TransformNode>();
 private textures=new Map<string,DynamicTexture>();private materials=new Map<string,StandardMaterial>();private lastEvent=0;private lastHit=new Map<string,Vector3>();private time=0;
 constructor(private scene:Scene){}
 private texture(kind:'halo'|'star'|'warn'|'ring'){
  const cached=this.textures.get(kind);if(cached)return cached;
  const tex=new DynamicTexture('attack-'+kind,{width:128,height:128},this.scene,false),ctx=tex.getContext() as CanvasRenderingContext2D;tex.hasAlpha=true;ctx.clearRect(0,0,128,128);
  if(kind==='halo'){const g=ctx.createRadialGradient(64,64,6,64,64,62);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.35,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);}
  else if(kind==='star'){ctx.fillStyle='white';ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?22:58;ctx.lineTo(64+Math.cos(a)*r,64+Math.sin(a)*r);}ctx.closePath();ctx.fill();}
  else if(kind==='ring'){ctx.strokeStyle='white';ctx.lineWidth=12;ctx.beginPath();ctx.arc(64,64,54,0,Math.PI*2);ctx.stroke();ctx.setLineDash([14,10]);ctx.lineWidth=6;ctx.beginPath();ctx.arc(64,64,38,0,Math.PI*2);ctx.stroke();}
  else{ctx.fillStyle='#ffd33d';ctx.beginPath();ctx.moveTo(64,8);ctx.lineTo(122,116);ctx.lineTo(6,116);ctx.closePath();ctx.fill();ctx.lineWidth=8;ctx.strokeStyle='#11204a';ctx.stroke();ctx.fillStyle='#11204a';ctx.font='900 70px Arial';ctx.textAlign='center';ctx.fillText('!',64,104);}
  tex.update();this.textures.set(kind,tex);return tex;
 }
 private mat(kind:'halo'|'star'|'warn'|'ring'|'solid',color:string,alpha=1,additive=true){
  const key=kind+color+alpha+additive,cached=this.materials.get(key);if(cached)return cached;
  const m=new StandardMaterial('attack-mat-'+key,this.scene);m.disableLighting=true;m.emissiveColor=Color3.FromHexString(color);m.diffuseColor=Color3.FromHexString(color);m.specularColor=Color3.Black();m.backFaceCulling=false;m.alpha=alpha;
  if(kind!=='solid'){m.diffuseTexture=this.texture(kind);m.useAlphaFromDiffuseTexture=true;m.disableDepthWrite=true;m.alphaMode=additive?Constants.ALPHA_ADD:Constants.ALPHA_COMBINE;}
  this.materials.set(key,m);return m;
 }
 private plane(name:string,size:number,material:StandardMaterial,billboard=true){const p=MeshBuilder.CreatePlane(name,{size},this.scene);p.material=material;p.isPickable=false;if(billboard)p.billboardMode=Mesh.BILLBOARDMODE_ALL;return p;}
 private create(shot:Shot):View{
  const color=OBJECT_COLORS[shot.object]??'#ffd33d',node=buildProjectile(this.scene,shot.object,shot.special);
  // Bigger than life on purpose: a basic must read at 40 m on a phone.
  if(shot.delivery!=='area')node.scaling.scaleInPlace(shot.special?1.3:1.25);
  const halo=this.plane('attack-halo',shot.special?4.4:2.8,this.mat('halo',color,shot.special?.95:.7));halo.parent=node;halo.scaling.setAll(1/node.scaling.x);
  const shadow=MeshBuilder.CreateDisc('attack-shadow',{radius:shot.delivery==='area'?shot.radius:.9,tessellation:20},this.scene);shadow.rotation.x=Math.PI/2;shadow.isPickable=false;shadow.material=this.mat('solid','#0b1636',.28,false);
  let extra:TransformNode|undefined;
  if(shot.delivery==='rear'){
   // A trap left behind: a pulsing ground ring and a warning sign everyone can read.
   extra=new TransformNode('trap-warning',this.scene);const ring=this.plane('trap-ring',4.2,this.mat('ring',color,.95),false);ring.rotation.x=Math.PI/2;ring.parent=extra;
   const sign=this.plane('trap-sign',1.1,this.mat('warn','#ffffff',1,false));sign.parent=extra;sign.position.y=2.6;
  }else if(shot.delivery==='area'){
   extra=new TransformNode('area-cloud',this.scene);const dome=MeshBuilder.CreateSphere('area-dome',{diameter:2,segments:12},this.scene);dome.scaling.set(shot.radius,shot.radius*(shot.object==='milk'?.06:.55),shot.radius);const domeMat=this.mat('solid',shot.object==='milk'?'#fff8ea':color,shot.object==='milk'?.7:.3,false);domeMat.backFaceCulling=true;dome.material=domeMat;dome.parent=extra;dome.isPickable=false;
   const ring=this.plane('area-ring',2,this.mat('ring',color,.9),false);ring.scaling.setAll(shot.radius);ring.rotation.x=Math.PI/2;ring.position.y=.12;ring.parent=extra;
  }
  return{node,halo,shadow,extra,motion:shot.delivery==='area'?'still':MOTION[shot.object]??'tumble'};
 }
 private me='';
 update(state:GameState,players:PlayerState[],dt:number,reduced:boolean,me=''){this.me=me;
  this.time+=dt;const live=new Set(state.shots.map(s=>s.id));
  for(const [key,v] of this.views)if(!live.has(key)){v.node.dispose();v.shadow.dispose();v.extra?.dispose();this.views.delete(key);}
  for(const shot of state.shots){
   let v=this.views.get(shot.id);if(!v){v=this.create(shot);this.views.set(shot.id,v);}
   const ground=shot.y-1,age=shot.age,heading=Math.hypot(shot.vx,shot.vz)>.1?Math.atan2(shot.vx,shot.vz):0,n=v.node;let lift=1.4;
   n.rotation.set(0,heading,0);
   switch(v.motion){
    case 'tumble':n.rotation.x=age*11;lift+=Math.sin(Math.min(1,age/.9)*Math.PI)*.9;break;
    case 'bounce':lift=.75+Math.abs(Math.sin(age*7.5))*1.6;n.rotation.x=age*9;break;
    case 'hop':lift=.6+Math.abs(Math.sin(age*6.2))*2;n.rotation.x=-.25+Math.cos(age*12.4)*.25;break;
    case 'roll':lift=.75+Math.abs(Math.sin(age*9))*.4;n.rotation.x=age*14;break;
    case 'spinY':n.rotation.y=age*(shot.object==='eraser'?24:16);lift+=Math.sin(age*5)*.25;break;
    case 'flutter':n.rotation.z=Math.sin(age*11)*.55;n.rotation.x=Math.sin(age*8)*.45;lift+=Math.sin(age*6)*.45;break;
    case 'spear':n.rotation.x=Math.PI/2;n.rotation.z=age*10;break;
    case 'frisbee':n.rotation.y=age*14;n.rotation.x=.3;lift+=.4;break;
    case 'lob':lift=1+Math.sin(Math.min(1,age/1.1)*Math.PI)*3.6;n.rotation.x=age*4;break;
    case 'still':lift=shot.delivery==='rear'?.75:.9;n.rotation.y=age*.8;break;
   }
   if(shot.delivery==='area'){
    const grow=Math.min(1,age/.35),fade=Math.min(1,shot.life/.5);n.position.set(shot.x,ground+(shot.object==='milk'?1.4:2.2),shot.z);n.scaling.setAll((shot.object==='milk'?1.6:1.2)*(1-grow*.35));
    if(v.extra){v.extra.position.set(shot.x,ground+.05,shot.z);v.extra.scaling.setAll(.25+.75*grow);for(const m of v.extra.getChildMeshes())m.visibility=fade;}
    n.setEnabled(age<1.2||shot.object==='milk');
   }else{
    n.position.set(shot.x,ground+lift,shot.z);
    if(v.extra){v.extra.position.set(shot.x,ground+.08,shot.z);const pulse=reduced?1:1+Math.sin(this.time*7)*.12;v.extra.getChildMeshes()[0]?.scaling.setAll(pulse);}
   }
   v.halo.visibility=.75+Math.sin(this.time*12+shot.id)*.25;
   v.shadow.position.set(shot.x,ground+.06,shot.z);v.shadow.scaling.setAll(shot.delivery==='area'?1:1/(1+Math.max(0,lift-.8)*.35));
   if(shot.object==='backpack')for(const paint of n.getChildMeshes().filter(m=>m.name.startsWith('label-heart')))paint.visibility=Math.min(1,age*3);
  }
  for(const event of state.events)if(event.id>this.lastEvent){this.lastEvent=event.id;this.event(event,state);}
  // Transient effects: cast pillars, shock rings, lightning.
  for(const f of this.fx){const t=(this.time-f.born)/f.life;if(t>=1){f.node.dispose();continue;}f.update(t);}
  this.fx=this.fx.filter(f=>(this.time-f.born)/f.life<1);
  // Dizzy stars over stunned drivers.
  for(const p of players){
   let stars=this.dizzy.get(p.id);
   if(p.stun>0){
    if(!stars){stars=new TransformNode('dizzy',this.scene);for(let i=0;i<3;i++){const s=this.plane('dizzy-star',.6,this.mat('star','#ffe14d',1));s.parent=stars;s.position.set(Math.sin(i*2.094)*.8,0,Math.cos(i*2.094)*.8);}this.dizzy.set(p.id,stars);}
    stars.setEnabled(true);stars.position.set(p.x,p.y+3.3,p.z);stars.rotation.y=this.time*6;
   }else stars?.setEnabled(false);
  }
 }
 private event(event:GameEvent,state:GameState){
  const caster=state.players.find(p=>p.id===event.playerId);
  if(event.type==='attack'&&event.special&&caster){
   const color=character(caster.characterId).color,x=caster.x,y=caster.y,z=caster.z;
   // A tall pillar in the caster's colour tells the whole track who used a special.
   // Never over your own car: the pillar is for everyone else to see who cast it.
   const pillar=MeshBuilder.CreateCylinder('special-pillar',{height:26,diameterTop:.8,diameterBottom:2.4,tessellation:12},this.scene);pillar.material=this.mat('solid',color,.4,false);pillar.isPickable=false;pillar.position.set(x,y+13,z);const meNow=state.players.find(p=>p.id===this.me);if(caster.id===this.me||(meNow&&Math.hypot(meNow.x-x,meNow.z-z)<22))pillar.setEnabled(false);
   const ring=this.plane('special-ring',2,this.mat('ring',color,caster.id===this.me?.45:1),false);ring.rotation.x=Math.PI/2;ring.position.set(x,y+.15,z);
   const holder=new TransformNode('special-cast',this.scene);pillar.parent=holder;ring.parent=holder;pillar.position.set(0,13,0);ring.position.set(0,.15,0);holder.position.set(x,y,z);
   this.fx.push({node:holder,born:this.time,life:.75,update:t=>{pillar.scaling.set(1-t*.6,1,1-t*.6);pillar.visibility=1-t;ring.scaling.setAll(1+t*14);ring.visibility=1-t;}});
  }
  if(event.type==='hit'&&event.x!==undefined){
   const at=new Vector3(event.x,(event.y??0)+1.2,event.z??0),color=OBJECT_COLORS[event.object??'']??'#ffffff';
   const ring=this.plane('hit-ring',2,this.mat('ring',color,1));ring.position.copyFrom(at);
   this.fx.push({node:ring,born:this.time,life:.35,update:t=>{ring.scaling.setAll(1+t*(event.special?5:3));ring.visibility=1-t;}});
   if(event.special&&(event.object==='sixpack'||event.object==='console')){const wave=this.plane('shockwave',2,this.mat('ring',color,1),false);wave.rotation.x=Math.PI/2;wave.position.set(event.x,(event.y??0)+.2,event.z??0);this.fx.push({node:wave,born:this.time,life:.5,update:t=>{wave.scaling.setAll(1+t*11);wave.visibility=1-t;}});}
   const from=this.lastHit.get(event.playerId);
   if(event.text==='chain'&&from){
    // Voltio: a jagged bolt from the first victim to the second.
    const points:Vector3[]=[];for(let i=0;i<=8;i++){const t=i/8;points.push(new Vector3(from.x+(at.x-from.x)*t+(i%8?(Math.random()-.5)*1.4:0),from.y+(at.y-from.y)*t+(i%8?Math.random()*1.2:0),from.z+(at.z-from.z)*t+(i%8?(Math.random()-.5)*1.4:0)));}
    const bolt=MeshBuilder.CreateTube('voltio',{path:points,radius:.12,tessellation:5},this.scene);bolt.material=this.mat('solid','#fff36b',1,false);bolt.isPickable=false;
    this.fx.push({node:bolt,born:this.time,life:.4,update:t=>{bolt.visibility=t<.5?1:1-(t-.5)*2;}});
   }
   this.lastHit.set(event.playerId,at);
  }
 }
 dispose(){for(const v of this.views.values()){v.node.dispose();v.shadow.dispose();v.extra?.dispose();}this.views.clear();for(const f of this.fx)f.node.dispose();this.fx=[];for(const d of this.dizzy.values())d.dispose();this.dizzy.clear();this.materials.forEach(m=>m.dispose());this.textures.forEach(t=>t.dispose());}
}
