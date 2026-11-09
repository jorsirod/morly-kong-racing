import { surfaceMaterial } from './textures';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { sample, type Route } from '../../../shared/track';
import { material, textLabel } from '../models';
import type { PropSpot } from './props';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';

export type Anim={node:TransformNode;update:(time:number)=>void};
/** Deterministic pseudo-random so worlds look the same for every player in a room. */
export function rng(seed:number){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000;};}

/** Small builder for static scenery: everything here is merged by material afterwards. */
/** A gate that closes an alternative lane on laps where it is not open (shown per local player). */
export type LaneGate={node:TransformNode;lane:string;laps:number[]};
export class Kit {
 anims:Anim[]=[];gates:LaneGate[]=[];
 /** Pieces a Blender model can replace (see props.ts), and the nodes holding each type's code version. */
 props:PropSpot[]=[];propGroups=new Map<string,TransformNode[]>();
 constructor(readonly scene:Scene,readonly root:TransformNode,readonly route?:Route){}
 /** True when (x,z) is within `margin` of an alternative lane's surface. */
 onLane(x:number,z:number,margin=2){const r=this.route;if(!r)return false;for(const l of r.lanes)for(const p of l.points)if(Math.hypot(p.x-x,p.z-z)<l.width*.5+margin)return true;return false;}
 /** True when (x,z) is on (or within `margin` of) the main road or an alternative lane: keep scenery off the course. */
 blocked(x:number,z:number,margin=2){
  const r=this.route;if(!r)return false;
  for(let i=0;i<r.points.length;i+=2){const p=r.points[i];if(Math.hypot(p.x-x,p.z-z)<r.width*.72+margin)return true;}
  for(const l of r.lanes)for(let i=0;i<l.points.length;i++){const p=l.points[i];if(Math.hypot(p.x-x,p.z-z)<l.width*.72+margin)return true;}
  return false;
 }
 box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:string,yaw=0,parent:TransformNode=this.root){const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);m.position.set(x,y,z);m.rotation.y=yaw;m.material=material(this.scene,color);m.parent=parent;m.isPickable=false;return m;}
 glow(name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:string,yaw=0,parent:TransformNode=this.root){const m=this.box(name,x,y,z,w,h,d,color,yaw,parent);m.material=material(this.scene,color,true);return m;}
 cyl(name:string,x:number,y:number,z:number,h:number,diameter:number,color:string,top=diameter,parent:TransformNode=this.root,tessellation=12){const m=MeshBuilder.CreateCylinder(name,{height:h,diameterBottom:diameter,diameterTop:top,tessellation},this.scene);m.position.set(x,y,z);m.material=material(this.scene,color);m.parent=parent;m.isPickable=false;return m;}
 ball(name:string,x:number,y:number,z:number,size:number,color:string,scale?:Vector3,parent:TransformNode=this.root){const m=MeshBuilder.CreateSphere(name,{diameter:size,segments:7},this.scene);m.position.set(x,y,z);if(scale)m.scaling=scale;m.material=material(this.scene,color);m.parent=parent;m.isPickable=false;return m;}
 /** Flat sign facing a heading (yaw = direction the readable face looks toward). */
 label(text:string,x:number,y:number,z:number,w:number,h:number,yaw:number,color='#fff5d8',bg='#163e3b',parent:TransformNode=this.root){const m=textLabel(this.scene,parent,text,x,y,z,w,h,color,bg);if(m)m.rotation.y=yaw+Math.PI;return m;}
 /** Free-standing signboard on two posts. */
 sign(text:string,x:number,z:number,yaw:number,w=8,h=1.8,y=3.2,color='#fff5d8',bg='#1d4d43'){for(const s of [-1,1])this.cyl('sign-post',x+Math.cos(yaw)*s*w*.42,y/2,z-Math.sin(yaw)*s*w*.42,y,.18,'#5d6b70');this.box('sign-board',x,y+h/2-.1,z,w+.3,h+.3,.12,'#e9dfc2',yaw);this.label(text,x+Math.sin(yaw)*.08,y+h/2-.1,z+Math.cos(yaw)*.08,w,h,yaw,color,bg);}
 /** Holder (identity, under the root) for code that a type's Blender model replaces; removed when the model arrives. */
 propFallback(type:string){const n=new TransformNode('props-'+type,this.scene);n.parent=this.root;n.metadata={propType:type};const l=this.propGroups.get(type)??[];l.push(n);this.propGroups.set(type,l);return n;}
 /**
  * Scenery piece with a Blender model (props.ts). `build` draws the code version around (0,0,0), front toward +z.
  * With `parent` (an animated node) the piece moves with it; otherwise it is static and merged.
  */
 prop(type:string,x:number,y:number,z:number,yaw:number,scale:number|[number,number,number],build:(g:TransformNode)=>void,tint?:number|string,parent?:TransformNode){
  const g=new TransformNode('prop-'+type,this.scene);
  if(parent){g.parent=parent;g.metadata={animate:true};const l=this.propGroups.get(type)??[];l.push(g);this.propGroups.set(type,l);}
  else g.parent=this.propGroups.get(type)?.[0]??this.propFallback(type);
  g.position.set(x,y,z);g.rotation.y=yaw;if(typeof scale==='number')g.scaling.setAll(scale);else g.scaling.set(...scale);build(g);
  this.props.push({type,x,y,z,yaw,scale,tint,parent});return g;
 }
 tree(x:number,z:number,kind:'mango'|'malinche'|'palm'|'pine'|'bush'|'ceiba'='mango',y=0,scale=1){
  // Same spot, same tree for everyone: yaw and a slight shade change come from the position.
  const h=Math.abs(Math.sin(x*12.9898+z*78.233)*43758.5453)%1,yaw=h*Math.PI*2,tint=.9+((h*7.31)%1)*.18;
  if(kind!=='bush')this.shadow(x,z,y,(kind==='palm'?4:7)*scale);
  this.prop(kind,x,y,z,yaw,scale,g=>{
   if(kind==='bush'){for(let k=0;k<3;k++)this.ball('bush',(k-1)*.9,.8,(k%2)*.6,2.1,['#5aa63f','#76bd4a','#4f9a3e'][k],undefined,g);return;}
   if(kind==='palm'){const t=this.cyl('palm-trunk',0,4,0,8,.55,'#9c8460',.4,g);t.rotation.z=.08;for(let i=0;i<7;i++){const leaf=this.ball('palm-leaf',Math.sin(i*.9)*2.2,7.9,Math.cos(i*.9)*2.2,3.4,i%2?'#4f9a54':'#6bb35c',new Vector3(.45,.13,1.6),g);leaf.rotation.y=i*.9;leaf.rotation.x=.35;}this.ball('coconuts',0,7.6,0,1,'#7d5a2e',undefined,g);return;}
   if(kind==='pine'){this.cyl('pine-trunk',0,1.5,0,3,.5,'#7b5e45',.5,g);for(let i=0;i<3;i++)this.cyl('pine-crown',0,3.2+i*1.7,0,2.6,4.6-i*1.3,'#3f7a4f',.2,g);return;}
   this.cyl('trunk',0,2.4,0,4.8,.6,'#7f6a4f',.42,g);
   const crown=kind==='malinche'?['#e2492f','#f06a3a','#c93a2a']:kind==='ceiba'?['#5f9e4c','#7ab95a','#4d8a43']:['#4f8f44','#6aa955','#3f7d3b'];
   const wide=kind==='ceiba'?1.5:kind==='malinche'?1.3:1;
   this.ball('crown',0,5.8,0,5.6*wide,crown[0],new Vector3(1,.62,1),g);this.ball('crown',1.6,5.2,-.8,3.8*wide,crown[1],new Vector3(1,.7,1),g);this.ball('crown',-1.5,5,1,3.6*wide,crown[2],new Vector3(1,.7,1),g);
  },tint);
 }
 shadow(x:number,z:number,y:number,size:number){const m=MeshBuilder.CreateCylinder('baked-shadow',{height:.015,diameter:size,tessellation:14},this.scene);m.position.set(x+.6,y-.05,z+.6);m.scaling.z=.8;m.material=material(this.scene,'#263f33',false,.16);m.parent=this.root;m.isPickable=false;}
 /** Row of simple spectators that bob and cheer. Kept as one animated group. */
 crowd(x:number,z:number,yaw:number,count:number,y=0,spacing=1.1){
  const group=new TransformNode('crowd',this.scene);group.parent=this.root;group.position.set(x,y,z);group.rotation.y=yaw;group.metadata={animate:true};
  const r=rng(Math.round(x*7+z*13));const shirts=['#d74850','#3187c2','#ffd24e','#76b85b','#f3efe3','#e98a3b'],skins=['#c6906c','#a8704f','#e0b090','#8a5a3f'];
  const people:Mesh[]=[];for(let i=0;i<count;i++){const px=(i-(count-1)/2)*spacing;const body=this.cyl('fan-shirt',px,.55,0,.9,.55,shirts[Math.floor(r()*6)],.45,group,8);const head=this.ball('fan-head',px,1.25,0,.48,skins[Math.floor(r()*4)],undefined,group);people.push(body,head);}
  this.anims.push({node:group,update:t=>{for(let i=0;i<people.length;i+=2){const hop=Math.max(0,Math.sin(t*7+i*1.7))*.22;people[i].position.y=.55+hop;people[i+1].position.y=1.25+hop;}}});
 }
 flag(x:number,z:number,colors:string[],h=9){
  this.cyl('flagpole',x,h/2,z,h,.14,'#c9d6dc');const cloth=new TransformNode('flag',this.scene);cloth.parent=this.root;cloth.position.set(x,h-.9,z);cloth.metadata={animate:true};
  colors.forEach((c,i)=>this.box('flag-stripe',1.3,.45-i*.45,0,2.5,.45,.05,c,0,cloth));this.anims.push({node:cloth,update:t=>{cloth.rotation.y=Math.sin(t*1.7+x)*.35;cloth.rotation.x=Math.sin(t*3.1+z)*.05;}});
 }
 /** Low wall along the road edge that matches the soft barrier of the physics (0.70–0.74 of the width). */
 barrier(route:Route,style:{body:string;top:string;stripe?:string;h:number;post?:boolean},skip:(d:number,side:number)=>boolean){
  const width=route.width,off=width*.72+.25,step=6;
  for(let d=0;d<route.length;d+=step){
   const a=sample(route,d),b=sample(route,d+step);
   for(const side of [-1,1]){
    if(skip(d,side))continue;
    const ax=a.x+Math.cos(a.yaw)*off*side,az=a.z-Math.sin(a.yaw)*off*side,bx=b.x+Math.cos(b.yaw)*off*side,bz=b.z-Math.sin(b.yaw)*off*side;
    const len=Math.hypot(bx-ax,bz-az)+.15,yaw=Math.atan2(bx-ax,bz-az),y=(a.y+b.y)/2;
    this.box('barrier',(ax+bx)/2,y+style.h/2,(az+bz)/2,.55,style.h,len,style.body,yaw);
    this.box('barrier-top',(ax+bx)/2,y+style.h+.06,(az+bz)/2,.7,.14,len,Math.floor(d/step)%2&&style.stripe?style.stripe:style.top,yaw);
    if(style.post)this.cyl('barrier-post',ax,y+style.h/2+.2,az,style.h+.4,.32,style.top);
   }
  }
 }
}
/** Tileable surface materials (colour + normal map), painted on the device: see textures.ts. */
export function surfaceTexture(scene:Scene,kind:'grass'|'dirt'|'sand'|'asphalt'|'rock'|'tile',base:string,u=1,v=u){return surfaceMaterial(scene,kind,base,u,v);}
export {Vector3,Mesh,MeshBuilder,TransformNode};
