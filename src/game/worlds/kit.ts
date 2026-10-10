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
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';

export type Anim={node:TransformNode;update:(time:number)=>void};
/** Deterministic pseudo-random so worlds look the same for every player in a room. */
export function rng(seed:number){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000;};}

/** Small builder for static scenery: everything here is merged by material afterwards. */
export class Kit {
 anims:Anim[]=[];
 constructor(readonly scene:Scene,readonly root:TransformNode,readonly route?:Route){}
 box(name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:string,yaw=0,parent:TransformNode=this.root){const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);m.position.set(x,y,z);m.rotation.y=yaw;m.material=material(this.scene,color);m.parent=parent;m.isPickable=false;return m;}
 glow(name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:string,yaw=0,parent:TransformNode=this.root){const m=this.box(name,x,y,z,w,h,d,color,yaw,parent);m.material=material(this.scene,color,true);return m;}
 cyl(name:string,x:number,y:number,z:number,h:number,diameter:number,color:string,top=diameter,parent:TransformNode=this.root,tessellation=12){const m=MeshBuilder.CreateCylinder(name,{height:h,diameterBottom:diameter,diameterTop:top,tessellation},this.scene);m.position.set(x,y,z);m.material=material(this.scene,color);m.parent=parent;m.isPickable=false;return m;}
 ball(name:string,x:number,y:number,z:number,size:number,color:string,scale?:Vector3,parent:TransformNode=this.root){const m=MeshBuilder.CreateSphere(name,{diameter:size,segments:7},this.scene);m.position.set(x,y,z);if(scale)m.scaling=scale;m.material=material(this.scene,color);m.parent=parent;m.isPickable=false;return m;}
 /** Flat sign facing a heading (yaw = direction the readable face looks toward). */
 label(text:string,x:number,y:number,z:number,w:number,h:number,yaw:number,color='#fff5d8',bg='#163e3b',parent:TransformNode=this.root){const m=textLabel(this.scene,parent,text,x,y,z,w,h,color,bg);if(m)m.rotation.y=yaw+Math.PI;return m;}
 /** Free-standing signboard on two posts. */
 sign(text:string,x:number,z:number,yaw:number,w=8,h=1.8,y=3.2,color='#fff5d8',bg='#1d4d43'){for(const s of [-1,1])this.cyl('sign-post',x+Math.cos(yaw)*s*w*.42,y/2,z-Math.sin(yaw)*s*w*.42,y,.18,'#5d6b70');this.box('sign-board',x,y+h/2-.1,z,w+.3,h+.3,.12,'#e9dfc2',yaw);this.label(text,x+Math.sin(yaw)*.08,y+h/2-.1,z+Math.cos(yaw)*.08,w,h,yaw,color,bg);}
 tree(x:number,z:number,kind:'mango'|'malinche'|'palm'|'pine'|'bush'|'ceiba'='mango',y=0,scale=1){
  const s=scale;
  if(kind==='bush'){for(let k=0;k<3;k++)this.ball('bush',x+(k-1)*.9*s,y+.8*s,z+(k%2)*.6*s,2.1*s,['#5aa63f','#76bd4a','#4f9a3e'][k]);return;}
  this.shadow(x,z,y,(kind==='palm'?4:7)*s);
  if(kind==='palm'){const t=this.cyl('palm-trunk',x,y+4*s,z,8*s,.55*s,'#9c8460',.4*s);t.rotation.z=.08;for(let i=0;i<7;i++){const leaf=this.ball('palm-leaf',x+Math.sin(i*.9)*2.2*s,y+7.9*s,z+Math.cos(i*.9)*2.2*s,3.4*s,i%2?'#4f9a54':'#6bb35c',new Vector3(.45,.13,1.6));leaf.rotation.y=i*.9;leaf.rotation.x=.35;}this.ball('coconuts',x,y+7.6*s,z,1*s,'#7d5a2e');return;}
  if(kind==='pine'){this.cyl('pine-trunk',x,y+1.5*s,z,3*s,.5*s,'#7b5e45');for(let i=0;i<3;i++)this.cyl('pine-crown',x,y+(3.2+i*1.7)*s,z,2.6*s,(4.6-i*1.3)*s,'#3f7a4f',.2*s);return;}
  this.cyl('trunk',x,y+2.4*s,z,4.8*s,.6*s,'#7f6a4f',.42*s);
  const crown=kind==='malinche'?['#e2492f','#f06a3a','#c93a2a']:kind==='ceiba'?['#5f9e4c','#7ab95a','#4d8a43']:['#4f8f44','#6aa955','#3f7d3b'];
  const wide=kind==='ceiba'?1.5:kind==='malinche'?1.3:1;
  this.ball('crown',x,y+5.8*s,z,5.6*s*wide,crown[0],new Vector3(1,.62,1));this.ball('crown',x+1.6*s,y+5.2*s,z-.8*s,3.8*s*wide,crown[1],new Vector3(1,.7,1));this.ball('crown',x-1.5*s,y+5*s,z+1*s,3.6*s*wide,crown[2],new Vector3(1,.7,1));
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
/** Tileable procedural textures: grass, dirt, sand, asphalt. Cheap and offline. */
export function surfaceTexture(scene:Scene,kind:'grass'|'dirt'|'sand'|'asphalt'|'rock'|'tile',base:string){
 const name='surface-'+kind+base,cached=scene.getMaterialByName(name) as StandardMaterial|null;if(cached)return cached;
 const m=new StandardMaterial(name,scene);m.specularColor=new Color3(.06,.06,.06);
 if(typeof document==='undefined'){m.diffuseColor=Color3.FromHexString(base);return m;}
 const size=256,tex=new DynamicTexture(name,{width:size,height:size},scene,true),ctx=tex.getContext() as CanvasRenderingContext2D,r=rng(kind.length*977+base.charCodeAt(1));
 ctx.fillStyle=base;ctx.fillRect(0,0,size,size);
 const c=Color3.FromHexString(base),shade=(k:number,a:number)=>`rgba(${Math.round(Math.min(255,c.r*255*k))},${Math.round(Math.min(255,c.g*255*k))},${Math.round(Math.min(255,c.b*255*k))},${a})`;
 const blotch=(n:number,min:number,max:number,k:number,a:number)=>{for(let i=0;i<n;i++){const x=r()*size,y=r()*size,s=min+r()*(max-min);for(const [ox,oy] of [[0,0],[size,0],[-size,0],[0,size],[0,-size]]){ctx.fillStyle=shade(k,a);ctx.beginPath();ctx.ellipse(x+ox,y+oy,s,s*(.6+r()*.5),r()*3,0,Math.PI*2);ctx.fill();}}};
 if(kind==='grass'){blotch(26,10,36,.86,.35);blotch(22,8,26,1.12,.3);for(let i=0;i<900;i++){ctx.fillStyle=shade(r()<.5?.75:1.2,.55);ctx.fillRect(r()*size,r()*size,1.4,3.5);}}
 else if(kind==='asphalt'){blotch(30,6,30,.88,.25);for(let i=0;i<2600;i++){ctx.fillStyle=shade(r()<.5?.7:1.3,.5);ctx.fillRect(r()*size,r()*size,1.5,1.5);}ctx.strokeStyle=shade(.6,.35);ctx.lineWidth=1.5;for(let i=0;i<5;i++){ctx.beginPath();let x=r()*size,y=r()*size;ctx.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-.5)*40;y+=(r()-.5)*40;ctx.lineTo(x,y);}ctx.stroke();}}
 else if(kind==='tile'){ctx.strokeStyle=shade(.82,.8);ctx.lineWidth=3;for(let i=0;i<=4;i++){ctx.beginPath();ctx.moveTo(i*64,0);ctx.lineTo(i*64,size);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i*64);ctx.lineTo(size,i*64);ctx.stroke();}blotch(10,6,20,.93,.25);}
 else{blotch(30,8,40,.85,.4);blotch(20,6,24,1.15,.3);for(let i=0;i<1600;i++){ctx.fillStyle=shade(r()<.5?.7:1.25,.6);const s=kind==='rock'?2.5:1.6;ctx.fillRect(r()*size,r()*size,s,s);}}
 tex.update();tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;tex.anisotropicFilteringLevel=4;m.diffuseTexture=tex;return m;
}
export {Vector3,Mesh,MeshBuilder,TransformNode};
