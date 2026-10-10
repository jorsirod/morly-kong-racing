import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { hazardsFor, type Hazard } from '../../shared/hazards';
import type { GameState, PlayerState } from '../../shared/types';
import { box, cylinder, sphere, material, textLabel, buildProjectile } from './models';
import '@babylonjs/core/Meshes/Builders/discBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';

/*
 * Moving obstacles drawn from the same pure function the physics uses (shared/hazards.ts).
 * Every one telegraphs: pedestrians walk on a rhythm, vents glow before erupting, rocks drop
 * where their shadow grows, the bus waits on an amber light, waves foam before they wash in.
 */
type View={node:TransformNode;kind:Hazard['kind'];parts:Record<string,TransformNode|Mesh>;dodge:number};
const SHIRTS=['#d74850','#3187c2','#ffd24e','#76b85b','#f3efe3','#e98a3b','#bd76e5'],SKINS=['#c6906c','#a8704f','#e0b090','#8a5a3f'];
function person(scene:Scene,parent:TransformNode,variant:number,dancer=false){
 const shirt=dancer?['#ff5fb0','#45e0ff','#ffd33d','#8bff6a'][variant%4]:SHIRTS[variant%SHIRTS.length],skin=SKINS[variant%SKINS.length];
 const legs:Mesh[]=[];for(const x of [-.18,.18]){const leg=box(scene,parent,'walker-leg',x,.55,0,.22,1.1,.26,dancer?'#202a44':'#3b4a66');legs.push(leg);}
 const body=cylinder(scene,parent,'walker-body',0,1.5,0,1,.75,shirt,.6);const head=sphere(scene,parent,'walker-head',0,2.3,0,.6,skin);sphere(scene,parent,'walker-hair',0,2.48,-.05,.58,'#2b2320',new Vector3(1,.55,1));
 const arms:Mesh[]=[];for(const x of [-.48,.48]){const arm=box(scene,parent,'walker-arm',x,1.55,0,.18,.85,.2,skin);arms.push(arm);}
 // Market shoppers carry a basket on the head; it makes them read as «del mercado» from far away.
 if(!dancer&&variant%2===0){cylinder(scene,parent,'walker-basket',0,2.75,0,.3,.9,'#c99a5b',.7);for(let i=0;i<3;i++)sphere(scene,parent,'walker-fruit',(i-1)*.22,2.95,.05,.28,['#f39c4a','#7cc36b','#d9473b'][i]);}
 return{legs,arms,body,head};
}
export class HazardView{
 private views=new Map<number,View>();private trackId='';private lights:{node:TransformNode;red:StandardMaterial;amber:StandardMaterial;green:StandardMaterial;hazard:number}[]=[];private lastEvent=0;
 private warnMat:StandardMaterial;private lavaMat:StandardMaterial;private foamMat:StandardMaterial;
 constructor(private scene:Scene){
  this.warnMat=material(scene,'#ff3b1f',true,.55);this.warnMat.disableDepthWrite=true;
  this.lavaMat=material(scene,'#ff7a2e',true,.92);this.foamMat=material(scene,'#f4fbff',true,.85);
 }
 private build(h:Hazard):View{
  const s=this.scene,node=new TransformNode('hazard-'+h.kind,s),parts:View['parts']={};
  if(h.kind==='pedestrian'||h.kind==='dancer'){const p=person(s,node,h.variant,h.kind==='dancer');Object.assign(parts,{legL:p.legs[0],legR:p.legs[1],armL:p.arms[0],armR:p.arms[1],head:p.head});node.scaling.setAll(1.15);}
  else if(h.kind==='crab'){const body=sphere(s,node,'crab-body',0,.35,0,1.1,'#e0442e',new Vector3(1.3,.5,.9));parts.body=body;for(const x of [-1,1]){const claw=sphere(s,node,'crab-claw',x*.75,.45,.45,.45,'#f05a3c',new Vector3(1,.7,1.2));parts[x<0?'clawL':'clawR']=claw;sphere(s,node,'crab-eye',x*.18,.72,.3,.16,'#1a1a1a');for(let i=0;i<3;i++){const leg=box(s,node,'crab-leg',x*.72,.2,-.25+i*.22,.6,.08,.08,'#b8321f');leg.rotation.z=x*.5;}}}
  else if(h.kind==='cart'){box(s,node,'cart-bed',0,1,0,1.9,.3,3.1,'#9a7046');for(const x of [-1.1,1.1]){const w=cylinder(s,node,'cart-wheel',x,.75,.6,.18,1.5,'#4a3b2c');w.rotation.z=Math.PI/2;}for(let j=0;j<9;j++)sphere(s,node,'cart-fruit',(j%3-1)*.55,1.4,(Math.floor(j/3)-1)*.8,.55,['#f39c4a','#7cc36b','#d9473b','#ffd24e'][j%4]);const v=new TransformNode('vendor',s);v.parent=node;v.position.set(0,0,-2.4);person(s,v,3);box(s,node,'cart-handle',0,1.4,-1.9,1.6,.1,.8,'#6b4a2c');}
  else if(h.kind==='crate'){for(let i=0;i<3;i++){const c=box(s,node,'crate',(i-1)*.4,.65+(i===1?1.25:0),i===1?0:.2,1.25,1.25,1.25,['#b8864e','#a2733f','#c99a5b'][i]);c.rotation.y=i*.3;}const warn=textLabel(s,node,'¡OJO!',0,3.3,0,1.6,.6,'#13234d','#ffd33d');if(warn)warn.billboardMode=7;}
  else if(h.kind==='ball'){const b=buildProjectile(s,'basketball');b.parent=node;b.scaling.setAll(1.25);parts.ball=b;}
  else if(h.kind==='slipper'){const b=buildProjectile(s,'slipper');b.parent=node;b.scaling.setAll(1.2);parts.ball=b;const warning=cylinder(s,node,'warning',0,-.65,0,.03,2.8,'#ffcb36');warning.material=material(s,'#ffcb36',true,.38);}
  else if(h.kind==='geyser'){
   cylinder(s,node,'vent-cone',0,.45,0,.9,4.4,'#3a302b',1.6);const mouth=cylinder(s,node,'vent-mouth',0,.92,0,.05,1.4,'#ff7a2e');mouth.material=this.lavaMat;
   const ring=MeshBuilder.CreateDisc('vent-warning',{radius:h.radius+.6,tessellation:28},s);ring.parent=node;ring.rotation.x=Math.PI/2;ring.position.y=.12;ring.material=this.warnMat;parts.ring=ring;
   const column=cylinder(s,node,'lava-column',0,4,0,8,1.8,'#ff7a2e',.6);column.material=this.lavaMat;parts.column=column;
   const top=sphere(s,node,'lava-blob',0,8.4,0,2.2,'#ffb347');top.material=this.lavaMat;parts.top=top;
  }
  else if(h.kind==='rock'){const shadow=MeshBuilder.CreateDisc('rock-shadow',{radius:h.radius+.4,tessellation:20},s);shadow.parent=node;shadow.rotation.x=Math.PI/2;shadow.position.y=.1;shadow.material=material(s,'#140c0a',false,.55);parts.shadow=shadow;const boulder=sphere(s,node,'boulder',0,1.1,0,2.4,'#4a3c35',new Vector3(1,.85,1.1));parts.boulder=boulder;const glow=sphere(s,node,'boulder-crack',.4,1.4,.6,.6,'#ff7a2e');glow.material=this.lavaMat;glow.parent=boulder;}
  else if(h.kind==='wave'){const wall=box(s,node,'wave-wall',0,1.2,0,.9,2.4,h.radius*2.4,'#4fb3d9');wall.material=material(s,'#4fb3d9',false,.78);parts.wall=wall;const foam=box(s,node,'wave-foam',0,2.45,0,1.2,.5,h.radius*2.5,'#f4fbff');foam.material=this.foamMat;parts.foam=foam;}
  else if(h.kind==='bus'){
   const bus=new TransformNode('ruta-bus',s);bus.parent=node;parts.bus=bus;
   box(s,bus,'bus-body',0,1.9,0,2.8,2.6,10.5,'#f2efe6');box(s,bus,'bus-stripe',0,1.5,0,2.86,.5,10.56,'#1f5fae');box(s,bus,'bus-stripe-2',0,2.1,0,2.86,.18,10.56,'#e53b35');box(s,bus,'bus-windows',0,2.7,0,2.9,.9,8.6,'#3e6f80');box(s,bus,'bus-front',0,2.2,5.28,2.6,1.6,.1,'#3e6f80');
   for(const x of [-1.25,1.25])for(const z of [-3.4,3.6]){const w=cylinder(s,bus,'bus-wheel',x,.55,z,.5,1.1,'#222b33');w.rotation.z=Math.PI/2;}
   const tag=textLabel(s,bus,'RUTA 119',0,3.45,5.33,2.2,.5,'#ffd33d','#1b1b1b');if(tag)tag.rotation.y=Math.PI;const side=textLabel(s,bus,'MANAGUA',1.45,2.3,0,5,.6,'#1f5fae','#f2efe6');if(side)side.rotation.y=-Math.PI/2;
  }
  else if(h.kind==='hoop'){/* built with the courts in the world */}
  return{node,kind:h.kind,parts,dodge:-9};
 }
 /** Traffic lights by each bus crossing: amber while it waits, red while it rolls. */
 private trafficLights(state:GameState){
  if(this.lights.length||state.trackId!=='managua')return;
  for(const h of hazardsFor(state.trackId,0).filter(v=>v.kind==='bus')){const node=new TransformNode('semaforo',this.scene);node.position.set(h.x+Math.sin(h.yaw)*-4,h.y,h.z+Math.cos(h.yaw)*-4);
   cylinder(this.scene,node,'semaforo-post',0,2.6,0,5.2,.22,'#3a4450');box(this.scene,node,'semaforo-box',0,5.6,0,.8,2.2,.6,'#1b2128');
   const mk=(c:string)=>{const m=new StandardMaterial('semaforo-'+c+h.id,this.scene);m.diffuseColor=Color3.FromHexString(c);m.emissiveColor=Color3.Black();return m;};const red=mk('#ff3b30'),amber=mk('#ffc130'),green=mk('#39d353');
   [[red,6.3],[amber,5.6],[green,4.9]].forEach(([m,y])=>{const lamp=sphere(this.scene,node,'semaforo-lamp',0,y as number,.32,.45,'#333');lamp.material=m as StandardMaterial;});
   const sign=textLabel(this.scene,node,'PARE',0,7.4,0,1.4,.6,'#ffffff','#c8321f');if(sign)sign.billboardMode=7;
   this.lights.push({node,red,amber,green,hazard:h.id});}
 }
 update(state:GameState,me:PlayerState|undefined,time:number){
  if(state.trackId!==this.trackId){for(const v of this.views.values())v.node.dispose();this.views.clear();for(const l of this.lights)l.node.dispose();this.lights=[];this.trackId=state.trackId;}
  if(state.mode==='battle')return;
  this.trafficLights(state);
  const lap=me?.lap??0,list=hazardsFor(state.trackId,state.time);
  // Pedestrians you bump jump aside comically (never hurt).
  for(const e of state.events)if(e.id>this.lastEvent){this.lastEvent=e.id;if(e.type==='hit'&&e.text==='hazard'&&e.x!==undefined){let best:View|undefined,bd=6;for(const [id,v] of this.views){const h=list.find(x=>x.id===id);if(!h)continue;const d=Math.hypot(h.x-e.x,h.z-(e.z??0));if(d<bd){bd=d;best=v;}}if(best)best.dodge=time;}}
  for(const h of list){
   if(h.kind==='hoop')continue;
   let v=this.views.get(h.id);if(!v){v=this.build(h);this.views.set(h.id,v);}
   const visible=lap>=h.minLap&&(!me||Math.hypot(h.x-me.x,h.z-me.z)<140);v.node.setEnabled(visible);if(!visible)continue;
   v.node.position.set(h.x,h.y,h.z);v.node.rotation.y=h.yaw;const p=v.parts,t=time;
   const dodge=Math.max(0,1-(t-v.dodge)/.7);
   if(h.kind==='pedestrian'||h.kind==='dancer'){
    const swing=h.kind==='dancer'?Math.sin(t*8.4+h.id):h.phase?Math.sin(t*9+h.id):0;
    (p.legL as Mesh).rotation.x=swing*.5;(p.legR as Mesh).rotation.x=-swing*.5;(p.armL as Mesh).rotation.x=h.kind==='dancer'?-2.6+Math.sin(t*8.4)*.4:-swing*.45;(p.armR as Mesh).rotation.x=h.kind==='dancer'?-2.6+Math.cos(t*8.4)*.4:swing*.45;
    v.node.position.y=h.y+(h.kind==='dancer'?Math.abs(Math.sin(t*8.4+h.id))*.25:0)+Math.sin(dodge*Math.PI)*1.6;v.node.rotation.z=dodge*Math.sin(t*20)*.4;
   }else if(h.kind==='crab'){(p.clawL as Mesh).rotation.x=Math.sin(t*10)*.4;(p.clawR as Mesh).rotation.x=Math.cos(t*10)*.4;v.node.position.y=h.y+Math.abs(Math.sin(t*14))*.08+Math.sin(dodge*Math.PI)*.8;}
   else if(h.kind==='ball'||h.kind==='slipper'){const b=p.ball as TransformNode;b.position.y=.8+(h.kind==='ball'?h.phase*2.2:0);b.rotation.y=t*.5;b.rotation.x=h.kind==='ball'?t*6:0;}
   else if(h.kind==='geyser'){const ring=p.ring as Mesh,col=p.column as Mesh,top=p.top as Mesh;ring.setEnabled(h.warn||h.active);ring.visibility=h.warn?.4+Math.abs(Math.sin(t*10))*.6:.9;col.setEnabled(h.active);top.setEnabled(h.active);if(h.active){const k=.7+Math.sin(t*30)*.08;col.scaling.set(k,1,k);top.position.y=8.4+Math.sin(t*18)*.5;}}
   else if(h.kind==='rock'){const shadow=p.shadow as Mesh,b=p.boulder as Mesh;shadow.setEnabled(h.warn||h.active);const fallT=h.warn?Math.min(1,h.phase*5.2/1.4):1;shadow.scaling.setAll(.4+fallT*.6);b.setEnabled(h.warn||h.active);b.position.y=h.active?1.1:1.1+(1-fallT)*9;b.rotation.y=t*2;}
   else if(h.kind==='wave'){const wall=p.wall as Mesh,foam=p.foam as Mesh;const show=h.warn||h.active;wall.setEnabled(show);foam.setEnabled(show);
    // The wave rolls in from the sea side (right of the lane) toward the land.
    const k=h.warn?h.phase*7/1.6:1,off=h.warn?(1-k)*8+2:Math.sin(t*3)*.6;wall.position.x=off;foam.position.x=off;wall.scaling.y=h.active?1:.4+k*.6;foam.position.y=h.active?2.45:1+k*1.4;}
   else if(h.kind==='bus'){(p.bus as TransformNode).setEnabled(h.active||h.warn);}
  }
  for(const l of this.lights){const h=list.find(v=>v.id===l.hazard);if(!h)continue;const visible=lap>=h.minLap;l.node.setEnabled(visible);l.red.emissiveColor=h.active?Color3.FromHexString('#ff3b30'):Color3.Black();l.amber.emissiveColor=h.warn&&Math.sin(time*12)>0?Color3.FromHexString('#ffc130'):Color3.Black();l.green.emissiveColor=!h.active&&!h.warn?Color3.FromHexString('#39d353'):Color3.Black();}
 }
 dispose(){for(const v of this.views.values())v.node.dispose();this.views.clear();for(const l of this.lights)l.node.dispose();this.lights=[];}
}
