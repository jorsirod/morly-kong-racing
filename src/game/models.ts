import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import type { Scene } from '@babylonjs/core/scene';
import { character, vehicle } from '../../shared/content';
import '@babylonjs/core/Meshes/Builders/boxBuilder';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import '@babylonjs/core/Meshes/Builders/planeBuilder';
import '@babylonjs/core/Meshes/Builders/discBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';
import '@babylonjs/core/Meshes/Builders/tubeBuilder';

export function material(scene:Scene,color:string,emissive=false,alpha=1){
 const name='mat-'+color+'-'+emissive+'-'+alpha,existing=scene.getMaterialByName(name);if(existing)return existing as StandardMaterial;
 const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=new Color3(.2,.2,.2);m.specularPower=48;if(emissive)m.emissiveColor=m.diffuseColor.scale(.55);m.alpha=alpha;return m;
}
function roundedBox(scene:Scene,name:string,w:number,h:number,d:number){
 const half=[w/2,h/2,d/2],r=Math.min(.19,Math.min(...half)*.45),positions:number[]=[],normals:number[]=[],indices:number[]=[],uvs:number[]=[];
 for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const u=(axis+1)%3,v=(axis+2)%3,us=[-half[u],-half[u]+r,half[u]-r,half[u]],vs=[-half[v],-half[v]+r,half[v]-r,half[v]],base=positions.length/3;
  for(let j=0;j<4;j++)for(let i=0;i<4;i++){const q=[0,0,0];q[axis]=half[axis]*sign;q[u]=us[i];q[v]=vs[j];const c=q.map((n,k)=>Math.max(-half[k]+r,Math.min(half[k]-r,n))),delta=q.map((n,k)=>n-c[k]),length=Math.hypot(...delta);positions.push(...q.map((_,k)=>c[k]+delta[k]/length*r));normals.push(...delta.map(n=>n/length));uvs.push(i/3,j/3);}
  for(let j=0;j<3;j++)for(let i=0;i<3;i++){const a=base+j*4+i,b=a+1,c=a+4,e=c+1;indices.push(...(sign>0?[a,e,b,a,c,e]:[a,b,e,a,e,c]));}
 }
 const mesh=new Mesh(name,scene),data=new VertexData();Object.assign(data,{positions,normals,indices,uvs});data.applyToMesh(mesh);return mesh;
}
export function box(scene:Scene,parent:TransformNode|null,name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:string){
 const rounded=/underbody|sill|hood|roof|door|mirror|dashboard|seat|hatch|bed-side|tailgate|bumper|headlight|fender|cap-brim|backpack|ps3|packet|cigarette|eraser|paintbrush|ice-cube|silver-side|jersey/.test(name);
 const m=rounded?roundedBox(scene,name,w,h,d):MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);m.position.set(x,y,z);m.material=material(scene,color);if(parent)m.parent=parent;m.isPickable=false;return m;
}
export function sphere(scene:Scene,parent:TransformNode|null,name:string,x:number,y:number,z:number,size:number,color:string,scale?:Vector3){
 const m=MeshBuilder.CreateSphere(name,{diameter:size,segments:name==='head'||name==='alf-head'?12:size<=.28?4:8},scene);m.position.set(x,y,z);if(scale)m.scaling=scale;m.material=material(scene,color);if(parent)m.parent=parent;m.isPickable=false;return m;
}
export function cylinder(scene:Scene,parent:TransformNode|null,name:string,x:number,y:number,z:number,h:number,diameter:number,color:string,top=diameter){
 const m=MeshBuilder.CreateCylinder(name,{height:h,diameterBottom:diameter,diameterTop:top,tessellation:16},scene);m.position.set(x,y,z);m.material=material(scene,color);if(parent)m.parent=parent;m.isPickable=false;return m;
}
export function tube(scene:Scene,parent:TransformNode,name:string,points:number[][],radius:number,color:string){
 const m=MeshBuilder.CreateTube(name,{path:points.map(p=>new Vector3(...p as [number,number,number])),radius,tessellation:8,cap:Mesh.CAP_ALL},scene);m.parent=parent;m.material=material(scene,color);m.isPickable=false;return m;
}
export function torus(scene:Scene,parent:TransformNode,name:string,x:number,y:number,z:number,diameter:number,thickness:number,color:string){
 const m=MeshBuilder.CreateTorus(name,{diameter,thickness,tessellation:16},scene);m.parent=parent;m.position.set(x,y,z);m.material=material(scene,color);m.isPickable=false;return m;
}
function decal(scene:Scene,parent:TransformNode,name:string,x:number,y:number,z:number,w:number,h:number,paint:(ctx:CanvasRenderingContext2D)=>void){
 if(typeof document==='undefined')return null;
 const tex=new DynamicTexture(name,{width:512,height:256},scene,false);tex.hasAlpha=true;paint(tex.getContext() as CanvasRenderingContext2D);tex.update();
 const mat=new StandardMaterial('decal-'+name,scene);mat.diffuseTexture=tex;mat.emissiveColor=new Color3(.25,.25,.25);mat.specularColor=Color3.Black();mat.backFaceCulling=false;
 const plane=MeshBuilder.CreatePlane('label-'+name,{width:w,height:h,sideOrientation:Mesh.DOUBLESIDE},scene);plane.position.set(x,y,z);plane.parent=parent;plane.material=mat;plane.isPickable=false;return plane;
}
export function textLabel(scene:Scene,parent:TransformNode|null,text:string,x:number,y:number,z:number,w:number,h:number,color='#fff5d8',bg='#163e3b'){
 if(typeof document==='undefined')return null;
 // Identical labels (names on twelve cars, plates, signs) share one texture and material.
 const key='label-'+text+'|'+color+'|'+bg,shared=scene.getMaterialByName(key) as StandardMaterial|null;
 if(shared){const plane=MeshBuilder.CreatePlane('label-'+text,{width:w,height:h,sideOrientation:Mesh.DOUBLESIDE},scene);plane.position.set(x,y,z);plane.material=shared;if(parent)plane.parent=parent;plane.isPickable=false;return plane;}
 const tex=new DynamicTexture('text-'+text,{width:512,height:128},scene,false);tex.hasAlpha=true;const ctx=tex.getContext() as CanvasRenderingContext2D;ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);let size=54;ctx.font='900 '+size+'px Arial';while(ctx.measureText(text).width>480&&size>16){size-=2;ctx.font='900 '+size+'px Arial';}ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,65);tex.update();
 const mat=new StandardMaterial(key,scene);mat.diffuseTexture=tex;mat.emissiveColor=Color3.White();mat.disableLighting=true;mat.backFaceCulling=false;
 const plane=MeshBuilder.CreatePlane('label-'+text,{width:w,height:h,sideOrientation:Mesh.DOUBLESIDE},scene);plane.position.set(x,y,z);plane.material=mat;if(parent)plane.parent=parent;plane.isPickable=false;return plane;
}
export function mergeParts(root:TransformNode,recursive=true){
 const parent=root.parent,position=root.position.clone(),rotation=root.rotation.clone(),scaling=root.scaling.clone();root.parent=null;root.position.setAll(0);root.rotation.setAll(0);root.scaling.setAll(1);root.computeWorldMatrix(true);
 const groups=new Map<string,Mesh[]>();const meshes=recursive?root.getChildMeshes(false):root.getChildren().filter(n=>n instanceof Mesh);
 for(const m of meshes as Mesh[]){if(!m.material||m.name.startsWith('label'))continue;const g=groups.get(m.material.name)??[];g.push(m);groups.set(m.material.name,g);}
 for(const meshes of groups.values())if(meshes.length>1){const merged=Mesh.MergeMeshes(meshes,true,true,undefined,false,false);if(merged){merged.parent=root;merged.isPickable=false;}}
 root.parent=parent;root.position.copyFrom(position);root.rotation.copyFrom(rotation);root.scaling.copyFrom(scaling);
}

// Stylised caricatures. Traits marked «confirmed» come from Jorsi; the rest are artistic choices
// to tell the nine apart at a glance (see outputs/referencias-personajes.md).
type Smile='grin'|'smirk'|'flat'|'wide'|'open';
interface Look { skin:string; hair:string; head:[number,number,number]; eyes:number; brow:number; browTilt:number; haircut:'crop'|'side'|'spike'|'quiff'|'buzz'|'curly'|'up';
 /** Torso height / width multipliers and extra neck — Semilla tall, Sap Heinz thin, Enanonitas short. */ height:number; width:number; neck:number;
 cheeks:number; ears:number; nose:number; smile:Smile; beard?:'full'|'short'|'goatee'; moustache?:'thick'|'thin'; }
const LOOKS:Record<string,Look>={
 // Semilla: the tallest of the gang (confirmed). Long face, short beard, half smile.
 semilla:{skin:'#c88b68',hair:'#2e2525',head:[.96,1.14,.94],eyes:.16,brow:.06,browTilt:.04,haircut:'crop',height:1.22,width:.94,neck:.2,cheeks:.04,ears:.21,nose:.25,smile:'smirk',beard:'short',moustache:'thick'},
 // Morly: the darkest skin of the group (confirmed), light cap, big grin, beard and moustache.
 morly:{skin:'#7d4e33',hair:'#1f1a1b',head:[1.06,1.04,.96],eyes:.16,brow:.05,browTilt:-.02,haircut:'crop',height:1,width:1.05,neck:0,cheeks:.04,ears:.21,nose:.27,smile:'grin',beard:'short',moustache:'thick'},
 // Chete: the only one with big round cheeks (confirmed). Side part, confident smile, gold chain.
 chete:{skin:'#d3a07c',hair:'#332c25',head:[1.08,1.02,.98],eyes:.15,brow:-.04,browTilt:.06,haircut:'side',height:.98,width:1.1,neck:-.04,cheeks:.36,ears:.2,nose:.24,smile:'wide'},
 // Coconitas: basketball player look — spiky hair, sweatband, open laugh.
 coconitas:{skin:'#b37c59',hair:'#292b30',head:[.94,1.12,.96],eyes:.17,brow:.11,browTilt:.08,haircut:'spike',height:1.08,width:1,neck:.06,cheeks:.04,ears:.21,nose:.25,smile:'open'},
 // Calín: big ears and big nose (confirmed), white shirt and red cap (confirmed), serious brow.
 calin:{skin:'#c59576',hair:'#2b2522',head:[.96,1.1,.95],eyes:.17,brow:.02,browTilt:-.1,haircut:'up',height:1.02,width:.98,neck:.04,cheeks:.04,ears:.36,nose:.42,smile:'flat'},
 // Sap Heinz: very thin (confirmed): narrow long face, thin neck and body, lighter skin and hair.
 'sap-heinz':{skin:'#e0b896',hair:'#7a5536',head:[.82,1.2,.86],eyes:.15,brow:-.04,browTilt:.05,haircut:'side',height:1.1,width:.74,neck:.12,cheeks:.04,ears:.2,nose:.27,smile:'smirk'},
 // Enanonitas: compact build (artistic reading of the nickname, pending confirmation), hair up, thin moustache, wide smile.
 enanonitas:{skin:'#c18b6e',hair:'#292326',head:[1.1,.98,.96],eyes:.18,brow:.08,browTilt:.02,haircut:'up',height:.84,width:1.04,neck:-.08,cheeks:.04,ears:.22,nose:.26,smile:'wide',moustache:'thin'},
 // Jorsi: the artist — quiff, pencil behind the ear, paint on the shirt.
 jorsi:{skin:'#c58f71',hair:'#302b2a',head:[.99,1.06,.98],eyes:.16,brow:.1,browTilt:.03,haircut:'quiff',height:1.04,width:.98,neck:.02,cheeks:.04,ears:.21,nose:.25,smile:'grin',beard:'goatee'},
 // Raulín: round face and buzz cut, easy laugh.
 raulin:{skin:'#c39479',hair:'#392d27',head:[1.14,1.04,.96],eyes:.18,brow:-.03,browTilt:0,haircut:'buzz',height:.98,width:1.08,neck:-.02,cheeks:.04,ears:.23,nose:.28,smile:'open'},
};
export function characterLook(id:string){return LOOKS[id]??LOOKS.semilla;}
/** Height of the head centre above the driver socket, used to frame portraits. */
export function headCenter(id:string){const f=characterLook(id);return 1.02+(.52+.3*f.height+f.neck-.8)+1.17;}
export function buildCharacter(scene:Scene,id:string,parent:TransformNode){
 const c=character(id),f=characterLook(c.id),root=new TransformNode('driver-'+id,scene);root.parent=parent;root.position.set(-.43,1.02,.2);
 const torsoH=1.15*f.height,shoulderY=.29+.2*f.height+.02,neckTop=.52+.3*f.height+f.neck;
 sphere(scene,root,'torso',0,.29+.08*(f.height-1),0,.86,c.shirt,new Vector3(.94*f.width,torsoH,.76*Math.max(.82,f.width)));
 box(scene,root,'seat-belt',-.11*f.width,.3,.31,.09,.72*f.height,.035,'#263b54').rotation.z=.28;
 cylinder(scene,root,'neck',0,neckTop-.06,0,.21+f.neck,.29*Math.min(1,f.width+.15),f.skin);
 // Everything above the neck hangs from one node so taller pilots carry the whole face up.
 const head=new TransformNode('head-root',scene);head.parent=root;head.position.y=neckTop-.8;
 const [hx,hy,hz]=f.head;
 sphere(scene,head,'head',0,1.17,.035,.91,f.skin,new Vector3(hx,hy,hz));
 for(const x of [-1,1]){const ear=sphere(scene,head,'ear',x*.44*hx,1.17,.01,f.ears,f.skin,new Vector3(.8,1,.75));if(f.ears>.3){ear.position.x+=x*.06;ear.rotation.z=x*-.25;sphere(scene,head,'ear-inner',x*.5*hx,1.17,.06,f.ears*.5,'#a86f58',new Vector3(.5,.8,.4));}}
 sphere(scene,head,'nose',0,1.19-(f.nose-.25)*.25,.47*hz+(f.nose-.25)*.6,f.nose,f.skin,new Vector3(.8,f.nose>.35?.95:.8,1.1));
 for(const x of [-1,1])sphere(scene,head,'cheek',x*(.26+f.cheeks*.3)*hx,1.02,.27*hz+f.cheeks*.2,f.cheeks+.12,f.skin,f.cheeks>.3?new Vector3(1,.9,.9):new Vector3(.9,.8,.7));
 for(const x of [-f.eyes,f.eyes]){
  const side=Math.sign(x);
  sphere(scene,head,'eye-white',x*hx,1.3,.423*hz,.21,'#fff8e8',new Vector3(.85,1.05,.45));sphere(scene,head,'iris',x*hx,1.3,.472*hz,.103,'#382d29',new Vector3(1,1,.35));sphere(scene,head,'pupil',x*hx,1.3,.488*hz,.065,'#16232c',new Vector3(1,1,.35));sphere(scene,head,'eye-glint',x*hx-.018,1.326,.501*hz,.025,'#ffffff');
  const inner=f.brow+f.browTilt*side*-1,outer=f.brow-f.browTilt*side*-1;
  tube(scene,head,'eyebrow',[[x*hx-side*.1,1.44+inner,.427*hz],[x*hx,1.48+f.brow,.44*hz],[x*hx+side*.1,1.44+outer-.04,.427*hz]],f.width<.8?.03:.038,f.hair);
 }
 if(f.beard==='full'||f.beard==='short')sphere(scene,head,'beard',0,.97,.19,.67,f.hair,new Vector3(.98*hx,f.beard==='full'?.62:.5,.8));
 if(f.beard==='goatee')sphere(scene,head,'goatee',0,.88,.43*hz,.24,f.hair,new Vector3(1,.9,.7));
 if(f.moustache==='thick')tube(scene,head,'moustache',[[-.21,1.07,.45*hz],[0,1.04,.49*hz],[.21,1.07,.45*hz]],.04,f.hair);
 if(f.moustache==='thin')tube(scene,head,'moustache',[[-.15,1.08,.475*hz],[0,1.06,.49*hz],[.15,1.08,.475*hz]],.022,f.hair);
 // Mouth shapes give each one a signature expression.
 const mz=.46*hz;
 if(f.smile==='grin'){sphere(scene,head,'mouth',0,1.0,mz,.3,'#542c31',new Vector3(1.35,.55,.25));box(scene,head,'smile-teeth',0,1.03,mz+.035,.3,.06,.025,'#fff8e6');}
 else if(f.smile==='wide'){sphere(scene,head,'mouth',0,.99,mz,.34,'#542c31',new Vector3(1.4,.45,.25));box(scene,head,'smile-teeth',0,1.015,mz+.035,.36,.05,.025,'#fff8e6');}
 else if(f.smile==='open'){sphere(scene,head,'mouth',0,.98,mz,.27,'#542c31',new Vector3(1.1,.85,.25));box(scene,head,'smile-teeth',0,1.035,mz+.04,.2,.05,.025,'#fff8e6');sphere(scene,head,'tongue',0,.94,mz+.03,.12,'#d06470',new Vector3(1.2,.5,.3));}
 else if(f.smile==='smirk'){tube(scene,head,'mouth-line',[[-.13,1.0,mz+.03],[.02,.985,mz+.04],[.15,1.03,mz+.02]],.03,'#542c31');}
 else tube(scene,head,'mouth-line',[[-.12,1.0,mz+.03],[.12,1.0,mz+.03]],.03,'#542c31');
 // Hair.
 const crown=f.haircut==='buzz'?sphere(scene,head,'hair-crown',0,1.5,-.06,.9,f.hair,new Vector3(1.0*hx,.5,.94)):sphere(scene,head,'hair-crown',0,1.55,-.055,.86,f.hair,new Vector3(1.01*hx,.58,.92));
 if(f.haircut==='side'||f.haircut==='quiff'){sphere(scene,head,'hair-lock',-.18*hx,1.62,.22,.48,f.hair,new Vector3(1.3,.45,.6));crown.rotation.z=.08;}
 if(f.haircut==='quiff')sphere(scene,head,'hair-quiff',.02,1.78,.18,.5,f.hair,new Vector3(1.1,.6,.8));
 if(f.haircut==='spike')for(let i=0;i<5;i++){const tuft=cylinder(scene,head,'hair-tuft',(i-2)*.13*hx,1.78,-.06,.32,.2,f.hair,.015);tuft.rotation.z=(i-2)*-.14;}
 if(f.haircut==='up')for(let i=0;i<4;i++){const tuft=cylinder(scene,head,'hair-tuft',(i-1.5)*.13*hx,1.74,.08,.26,.22,f.hair,.05);tuft.rotation.x=-.35;}
 if(f.haircut==='crop')sphere(scene,head,'hair-fringe',0,1.6,.24,.5,f.hair,new Vector3(1.4*hx,.3,.5));
 if(c.cap){sphere(scene,head,'cap-crown',0,1.64,-.035,.91,c.cap,new Vector3(1.03*hx,.47,.95));const brim=box(scene,head,'cap-brim',0,1.58,.4,.7,.055,.54,c.cap);brim.rotation.x=.1;box(scene,head,'cap-badge',0,1.68,.41,.18,.13,.025,c.id==='calin'?'#fff9e9':'#e8b52b');}
 if(c.id==='coconitas'){const band=torus(scene,head,'sweatband',0,1.46,0,.92*hx,.07,'#fff6e2');band.scaling.z=.98;}
 if(c.id==='jorsi'){const pencil=cylinder(scene,head,'ear-pencil',.46*hx,1.3,-.04,.62,.07,'#f3c12d');pencil.rotation.x=1.2;pencil.rotation.z=.3;}
 // Arms and hands on the wheel; thin pilots get thin arms.
 const arm=.11*Math.min(1.1,f.width+.12);
 for(const x of [-1,1]){
  sphere(scene,root,'shoulder',x*.32*f.width,shoulderY,.04,.36*Math.min(1.1,f.width+.1),c.id==='morly'?f.skin:c.shirt);
  tube(scene,root,'forearm',[[x*.36*f.width,shoulderY-.03,.1],[x*.41,.15,.28],[x*.29,.3,.58]],arm,f.skin);
  sphere(scene,root,'hand',x*.29,.3,.6,.24,f.skin);box(scene,root,'thumb',x*.235,.32,.62,.08,.13,.11,f.skin);
  sphere(scene,root,'knee',x*.22,-.1,.18,.34*Math.min(1.1,f.width+.15),'#344465',new Vector3(1,.7,1.4));
 }
 const wheel=torus(scene,root,'steering',0,.32,.62,.62,.065,'#25323f');wheel.rotation.x=Math.PI/2-.32;for(const x of [-1,1])tube(scene,root,'steering-spoke',[[0,.32,.63],[x*.25,.36,.59]],.028,'#a8b7c3');
 const chestZ=.338*Math.max(.82,f.width),chestY=.29+.08*(f.height-1);
 if(c.id==='morly'){
  box(scene,root,'jersey-purple-side',-.33,.26,.18,.1,.65,.18,'#613991');box(scene,root,'jersey-purple-side',.33,.26,.18,.1,.65,.18,'#613991');
  for(const l of [textLabel(scene,root,'LAKERS',0,.48,.338,.57,.16,'#603087','#f5bc32'),textLabel(scene,root,'24',0,.23,.347,.27,.19,'#603087','#f5bc32')])if(l)l.rotation.y=Math.PI;
  // The back is what the chase camera sees: name and number like a real jersey.
  textLabel(scene,root,'MORLY',0,.5,-.34,.5,.14,'#603087','#f5bc32');textLabel(scene,root,'24',0,.26,-.35,.34,.26,'#603087','#f5bc32');
 }else if(c.id==='calin'){box(scene,root,'shirt-collar',-.12,.64,.28,.19,.13,.05,'#ece5d9').rotation.z=-.35;box(scene,root,'shirt-collar',.12,.64,.28,.19,.13,.05,'#ece5d9').rotation.z=.35;for(let i=0;i<3;i++)sphere(scene,root,'shirt-button',0,.5-i*.16,.33,.05,'#cfc6b6');}
 else if(c.id==='chete'){for(let i=0;i<9;i++){const a=-1.1+i*.275;sphere(scene,root,'gold-chain',Math.sin(a)*.28,chestY+.36-Math.cos(a)*.18,chestZ-.02,.07,'#f2c13a');}textLabel(scene,root,'C$',0,chestY+.05,chestZ,.25,.2,'#f2c13a',c.shirt)?.rotation.set(0,Math.PI,0);}
 else if(c.id==='coconitas'){textLabel(scene,root,'7',0,chestY+.02,chestZ,.28,.26,'#fff6e2',c.shirt)?.rotation.set(0,Math.PI,0);textLabel(scene,root,'COCO 7',0,chestY+.12,-.34,.48,.2,'#fff6e2',c.shirt);}
 else if(c.id==='jorsi'){for(const [x,y,col] of [[-.15,.4,'#f04c72'],[.12,.22,'#ffcf4f'],[.05,.5,'#53d5e4']] as [number,number,string][])sphere(scene,root,'paint-splat',x,chestY+y-.25,chestZ+.005,.13,col,new Vector3(1,1,.2));}
 else{textLabel(scene,root,c.initials,0,chestY+.08,chestZ,.25,.2,'#fff2dc',c.shirt)?.rotation.set(0,Math.PI,0);}
 mergeParts(root);return root;
}
export type AlfParts={head:TransformNode;armL:TransformNode;armR:TransformNode};
export type VehicleModel={root:TransformNode;body:TransformNode;driverSocket:TransformNode;passengerSocket:TransformNode;alf?:TransformNode;alfParts?:AlfParts;wheels?:TransformNode[];frontWheels?:TransformNode[];driver?:TransformNode};
// The six vehicles (and ALF) are built in vehicles.ts.
export { buildVehicle, buildAlf } from './vehicles';

/** Runtime-only decals (canvas text cannot live in the GLB): rear name plates the chase camera
 * reads, a Nicaraguan plate, and each car's signature sticker. */
/** Where the rear name plate and the licence plate go on each body (z, y, width; plate z, y). */
const REAR:Record<string,{z:number;y:number;w:number;pz:number;py:number}>={suv:{z:-2.41,y:1.32,w:.66,pz:-2.11,py:.72},'pickup-double':{z:-2.43,y:1.0,w:1.55,pz:-2.58,py:.54},'pickup-single':{z:-2.43,y:.92,w:1.55,pz:-2.58,py:.48},golf:{z:-2.04,y:1.36,w:1.2,pz:-2.11,py:.92},mazda:{z:-2.12,y:1.42,w:1.2,pz:-2.07,py:.95},matiz:{z:-1.75,y:1.36,w:1.1,pz:-1.755,py:.9}};
export function addVehicleDecals(scene:Scene,body:TransformNode,id:string):TransformNode|null{
 if(typeof document==='undefined')return null;
 const v=vehicle(id),r=REAR[v.kind]??REAR.golf,dark=v.id==='black-diamond',group=new TransformNode('decals',scene);group.parent=body;body=group;
 // Planes face -z by default, which is exactly where the chase camera sits: no turning needed.
 textLabel(scene,body,v.name.toUpperCase(),0,r.y+(v.kind==='suv'?.08:.06),r.z,r.w,r.w*.2,dark?'#ffd33d':'#13234d',dark?'#27353c':v.color);
 if(v.kind==='suv'){textLabel(scene,body,'EL MÁS CULITO',0,r.y-.12,r.z,.62,.12,'#2fa5cd','#e9eef1');}
 textLabel(scene,body,v.id==='la-raulina'?'M 2003':v.id==='white-empanade'?'M 1999':v.id==='black-diamond'?'M 2009':'M 2008',0,r.py,r.pz,.56,.18,'#163a7a','#f7f4ea');
 if(dark)for(const x of [-1,1]){const gem=textLabel(scene,body,'◆',x*.97,1.12,-.2,.34,.34,'#7ef3ff','#27353c');if(gem)gem.rotation.y=x>0?-Math.PI/2:Math.PI/2;}
 return group;
}

function bottle(scene:Scene,root:TransformNode,object:string,x=0,y=0,z=0,size=1){
 const group=new TransformNode('bottle-'+object,scene);group.parent=root;group.position.set(x,y,z);group.scaling.setAll(size);
 const beer=object==='victoria'||object==='tona',glass=object==='victoria'?'#98621f':object==='tona'?'#246238':object==='flor'?'#785023':'#c5d9e3';
 cylinder(scene,group,'bottle-base',0,-.56,0,.13,.58,glass);cylinder(scene,group,'bottle-body',0,-.12,0,.88,.58,glass);cylinder(scene,group,'bottle-shoulder',0,.42,0,.27,.56,glass,.25);cylinder(scene,group,'bottle-neck',0,.72,0,.41,.25,glass);cylinder(scene,group,'bottle-cap',0,.956,0,.105,.275,beer?'#eec955':'#263541');
 const labelColor=object==='tona'?'#f7e7c2':object==='victoria'?'#eedc6c':object==='flor'?'#171f24':'#f1f0e7';
 cylinder(scene,group,'bottle-label-wrap',0,-.1,0,.52,.594,labelColor);
 decal(scene,group,'bottle-brand-'+object,0,-.07,.306,.51,.48,ctx=>{
  ctx.fillStyle=labelColor;ctx.fillRect(0,0,512,256);ctx.strokeStyle=object==='tona'?'#c91f32':'#ad863b';ctx.lineWidth=12;ctx.strokeRect(9,9,494,238);ctx.textAlign='center';ctx.fillStyle=object==='flor'?'#f3d481':object==='tona'?'#d52937':'#313932';ctx.font=object==='flor'?'bold 56px Georgia':'900 68px Arial';
  const name=object==='victoria'?'VICTORIA':object==='tona'?'TOÑA':object==='flor'?'Flor de Caña':'RON PLATA';ctx.fillText(name,256,126);ctx.font='bold 29px Arial';ctx.fillText(beer?'NICARAGUA':object==='flor'?'GRAN RESERVA':'HECHO PARA COMPARTIR',256,181);
 });return group;
}
function leaf(scene:Scene,root:TransformNode){
 const positions:number[]=[],indices:number[]=[],uvs:number[]=[],origin=new Vector3(0,0,-.48);
 for(let i=-3;i<=3;i++){const a=i*.37,tip=new Vector3(Math.sin(a)*(i===0?1.1:.93),0,Math.cos(a)*(i===0?1.1:.93)-.28),middle=Vector3.Lerp(origin,tip,.54),side=new Vector3(Math.cos(a)*.12,0,-Math.sin(a)*.12),base=positions.length/3;
  for(const p of [origin,middle.add(side),tip,middle.subtract(side)]){positions.push(p.x,p.y,p.z);uvs.push(p.x,p.z);}indices.push(base,base+1,base+2,base,base+2,base+3);tube(scene,root,'leaf-vein',[[origin.x,.02,origin.z],[tip.x*.93,.02,tip.z*.93]],.013,'#a6d560');
 }
 const m=new Mesh('seven-point-cannabis-leaf',scene),data=new VertexData();data.positions=positions;data.indices=indices;data.uvs=uvs;data.normals=[];VertexData.ComputeNormals(positions,indices,data.normals);data.applyToMesh(m);m.parent=root;m.material=material(scene,'#55aa43');(m.material as StandardMaterial).backFaceCulling=false;tube(scene,root,'leaf-stem',[[0,0,-.48],[0,0,-.88]],.044,'#75c351');root.rotation.x=-.38;
}
export function buildProjectile(scene:Scene,object:string,special=false){
 const root=new TransformNode('attack-'+object,scene);
 if(['victoria','tona','rum','flor'].includes(object)){bottle(scene,root,object);}
 else if(object==='sixpack'){
  box(scene,root,'sixpack-carrier',0,-.18,0,1.56,.74,1.06,'#e6c94c');for(let i=0;i<6;i++)bottle(scene,root,'victoria',(i%3-1)*.51,.18,(Math.floor(i/3)-.5)*.49,.69);
  box(scene,root,'carrier-handle',0,.72,0,.65,.36,.11,'#ddbb32');textLabel(scene,root,'VICTORIA',0,-.1,.55,1.24,.34,'#38522a','#ead772');
 }
 else if(object==='basketball'){
  sphere(scene,root,'basketball',0,0,0,1.28,'#ea772a');for(const rz of [0,Math.PI/2]){const line=torus(scene,root,'basketball-seam',0,0,0,1.282,.026,'#443021');line.rotation.z=rz;}const equator=torus(scene,root,'basketball-equator',0,0,0,1.284,.026,'#443021');equator.rotation.x=Math.PI/2;
 }
 else if(object==='leaf'){leaf(scene,root);}
 else if(object==='frog'){
  sphere(scene,root,'frog-belly',0,-.04,.06,1.04,'#75bc49',new Vector3(1,.68,1.02));sphere(scene,root,'frog-chest',0,-.12,.31,.68,'#c3df75',new Vector3(1,.7,.7));
  for(const x of [-1,1]){sphere(scene,root,'frog-eye-bulge',x*.3,.33,.23,.44,'#67b843');sphere(scene,root,'frog-eye-white',x*.3,.35,.398,.29,'#fff8d7');sphere(scene,root,'frog-pupil',x*.3,.37,.519,.13,'#203735',new Vector3(.7,1.1,.45));sphere(scene,root,'frog-thigh',x*.5,-.13,-.2,.55,'#55a740',new Vector3(.8,.58,1.2));for(let j=0;j<3;j++)sphere(scene,root,'frog-toe',x*(.48+j*.08),-.3,.36+j*.07,.17,'#78c34c',new Vector3(.75,.4,1.4));}
  tube(scene,root,'frog-smile',[[-.24,.05,.52],[0,-.018,.59],[.24,.05,.52]],.024,'#285b36');
 }
 else if(object==='pizza'){
  cylinder(scene,root,'pizza-crust',0,0,0,.19,1.85,'#cd8739');cylinder(scene,root,'pizza-cheese',0,.108,0,.055,1.68,'#ffda58');torus(scene,root,'pizza-crust-ring',0,.08,0,1.78,.135,'#e7a753');
  for(let i=0;i<9;i++){const a=i*2.4,r=i%3===0?.23:.58;cylinder(scene,root,'pepperoni',Math.cos(a)*r,.151,Math.sin(a)*r,.028,.28,'#cc4034');}for(let i=0;i<5;i++)torus(scene,root,'olive',Math.sin(i*2.7)*.6,.179,Math.cos(i*2.7)*.6,.16,.045,'#2c3831');root.rotation.x=.35;
 }
 else if(object==='slipper'){
  sphere(scene,root,'slipper-sole',0,-.05,0,1.18,'#2aa9d4',new Vector3(.73,.14,1.56));sphere(scene,root,'slipper-footbed',0,.048,0,1.1,'#80e3ed',new Vector3(.7,.11,1.5));
  tube(scene,root,'slipper-y-strap',[[-.34,.13,.08],[0,.33,.43],[.34,.13,.08]],.09,'#fffbd1');tube(scene,root,'slipper-toe-strap',[[0,.33,.43],[0,.16,.64]],.08,'#fffbd1');
  for(let i=0;i<3;i++){const a=i*2.094;tube(scene,root,'voltio-bolt',[[Math.sin(a)*.7,.05,Math.cos(a)*.7],[Math.sin(a)*1.0,.25,Math.cos(a)*1.0],[Math.sin(a)*.77,.49,Math.cos(a)*.77],[Math.sin(a)*1.12,.75,Math.cos(a)*1.12]],.04,'#fff184');}
 }
 else if(object==='console'){
  box(scene,root,'ps3-body',0,0,0,1.48,.37,1.08,'#17202b');sphere(scene,root,'ps3-curved-top',0,.15,0,1.15,'#273440',new Vector3(1.27,.29,.92));box(scene,root,'ps3-disc-slot',0,.07,.55,1.01,.034,.021,'#8694a8');box(scene,root,'ps3-status-led',.48,-.035,.564,.11,.025,.017,'#8adb59');textLabel(scene,root,'PLAYSTATION 3',0,.14,.571,1.14,.15,'#d9e2ee','#1c2a37');
 }
 else if(object==='milk'){
  cylinder(scene,root,'metal-bucket',0,-.07,0,1.34,1.04,'#87b3cf',1.43);cylinder(scene,root,'milk-surface',0,.62,0,.04,1.38,'#fff8e7');torus(scene,root,'bucket-rim',0,.63,0,1.39,.08,'#d1e6ef');const handle=torus(scene,root,'bucket-handle',0,.8,0,1.29,.064,'#e1edf0');handle.rotation.x=Math.PI/2;
  textLabel(scene,root,'LECHE',0,-.02,.645,.92,.32,'#253d68','#eef4ed');for(let i=0;i<5;i++){const a=i*1.256;sphere(scene,root,'milk-splash',Math.sin(a)*.63,.8+i%2*.14,Math.cos(a)*.63,.24,'#fff8e7',new Vector3(.5,1.8,.7));}
 }
 else if(object==='backpack'){
  box(scene,root,'backpack-body',0,0,0,1.08,1.28,.5,'#309eba');box(scene,root,'backpack-pocket',0,-.25,.31,.9,.55,.16,'#49c1cc');box(scene,root,'backpack-zip',0,.05,.42,.83,.04,.025,'#f1dc66');for(const x of [-1,1]){tube(scene,root,'backpack-strap',[[x*.36,.48,-.24],[x*.46,0,-.4],[x*.32,-.5,-.27]],.07,'#175170');}tube(scene,root,'backpack-handle',[[-.17,.6,0],[-.16,.79,0],[.16,.79,0],[.17,.6,0]],.07,'#215b70');
  decal(scene,root,'heart',0,.17,.28,.88,.86,ctx=>{ctx.clearRect(0,0,512,256);ctx.fillStyle='#f04c72';ctx.beginPath();ctx.moveTo(256,240);ctx.bezierCurveTo(82,170,18,90,93,37);ctx.bezierCurveTo(161,-2,223,25,256,69);ctx.bezierCurveTo(290,23,353,-2,420,37);ctx.bezierCurveTo(494,92,430,172,256,240);ctx.fill();ctx.fillStyle='#fff2b8';for(const x of [208,305]){ctx.beginPath();ctx.arc(x,101,15,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#fff2b8';ctx.lineWidth=13;ctx.beginPath();ctx.ellipse(256,125,68,45,0,.08,Math.PI-.08);ctx.stroke();});
 }
 else if(object==='claudia'){
  sphere(scene,root,'guest-torso',0,.19,0,.74,'#d786b1',new Vector3(.65,1.4,.7));cylinder(scene,root,'guest-neck',0,.77,0,.18,.19,'#d7a685');sphere(scene,root,'guest-hair',0,1.07,-.1,.89,'#50352c',new Vector3(1,1.3,.9));sphere(scene,root,'guest-face',0,1.08,.2,.71,'#d7a685',new Vector3(.86,1.1,.75));
  for(const x of [-1,1]){cylinder(scene,root,'guest-leg',x*.16,-.74,0,.96,.18,'#324f75');sphere(scene,root,'guest-shoe',x*.16,-1.25,.08,.27,'#453845',new Vector3(.8,.45,1.4));const frame=torus(scene,root,'guest-glasses',x*.175,1.18,.508,.3,.042,'#263344');frame.rotation.x=Math.PI/2;sphere(scene,root,'guest-eye',x*.175,1.18,.54,.075,'#263344');tube(scene,root,'guest-arm',[[x*.22,.5,.05],[x*.42,.21,.17],[x*.46,.54,.31]],.084,'#d7a685');}
  box(scene,root,'glasses-bridge',0,1.2,.528,.07,.028,.025,'#263344');sphere(scene,root,'guest-smile',0,.94,.52,.18,'#bb4d66',new Vector3(1,.3,.2));sphere(scene,root,'onion-in-hand',.44,.61,.33,.39,'#e2ba91');
 }
 else if(object==='onion'){
  sphere(scene,root,'onion-bulb',0,-.02,0,1.06,'#e4c5a1',new Vector3(1,.96,1));cylinder(scene,root,'onion-neck',0,.5,0,.27,.21,'#cfaa80',.11);for(let i=0;i<3;i++)tube(scene,root,'onion-sprout',[[0,.61,0],[(i-1)*.12,.86,.05],[.14*(i-1),1.02,.1]],.035,'#7ca755');for(let i=0;i<6;i++){const a=i*Math.PI/3;tube(scene,root,'onion-layer',[[Math.sin(a)*.15,-.49,Math.cos(a)*.15],[Math.sin(a)*.51,0,Math.cos(a)*.51],[Math.sin(a)*.24,.41,Math.cos(a)*.24]],.014,'#be986e');}
 }
 else if(object==='cucumber'){
  sphere(scene,root,'cucumber',0,0,0,1.13,'#438b3e',new Vector3(.34,.34,1.62));for(let i=0;i<15;i++){const a=i*2.399,z=(i%5-2)*.28;sphere(scene,root,'cucumber-bump',Math.cos(a)*.17,Math.sin(a)*.17,z,.065,'#82b954');}sphere(scene,root,'cucumber-stem',0,0,.96,.14,'#315e2d',new Vector3(.5,.5,1.1));
 }
 else if(object==='diamond'){
  const mesh=new Mesh('faceted-diamond',scene),d=new VertexData();d.positions=[0,.64,0,-.49,.15,-.49,.49,.15,-.49,.49,.15,.49,-.49,.15,.49,0,-.64,0];d.indices=[0,2,1,0,3,2,0,4,3,0,1,4,5,1,2,5,2,3,5,3,4,5,4,1];d.normals=[];VertexData.ComputeNormals(d.positions,d.indices,d.normals);d.applyToMesh(mesh);mesh.convertToFlatShadedMesh();mesh.parent=root;mesh.material=material(scene,'#70def0',true);torus(scene,root,'diamond-halo',0,0,0,1.52,.035,'#c4f9ff');
 }
 else if(object==='coin'){
  cylinder(scene,root,'coin-face',0,0,0,.14,1.05,'#efbc32').rotation.x=Math.PI/2;const rim=torus(scene,root,'coin-rim',0,0,.085,.92,.04,'#ffe99b');rim.rotation.x=Math.PI/2;textLabel(scene,root,'C$',0,0,.089,.7,.4,'#875e1a','#efbc32');
 }
 else if(object==='ice'){
  const bag=sphere(scene,root,'ice-bag',0,0,0,1.35,'#a4e4f4',new Vector3(.81,1,.72));bag.material=material(scene,'#a4e4f4',false,.46);for(let i=0;i<5;i++){const ice=box(scene,root,'ice-cube',(i%2-.5)*.47,Math.floor(i/2)*.32-.4,(i%3-1)*.2,.39,.37,.37,'#d2f4ff');ice.rotation.set(i*.24,i*.8,0);}cylinder(scene,root,'bag-knot',0,.78,0,.24,.27,'#e9fcff',.09);textLabel(scene,root,'HIELO',0,.17,.515,.76,.22,'#186bab','#f3fcff');
 }
 else if(object==='ashtray'){
  cylinder(scene,root,'ashtray-bottom',0,-.12,0,.16,1.2,'#89aeb9');cylinder(scene,root,'ashtray-inner',0,-.025,0,.04,.9,'#4b626c');torus(scene,root,'ashtray-rim',0,.025,0,1.05,.18,'#d1e1e2');for(let i=0;i<3;i++){const a=i*2.094;const cig=cylinder(scene,root,'stub',Math.sin(a)*.4,.12,Math.cos(a)*.4,.3,.075,'#f4efe5');cig.rotation.z=Math.PI/2;cig.rotation.y=a;}
 }
 else if(object==='bill'){
  box(scene,root,'banknote',0,0,0,1.61,.06,.78,'#a0d991');box(scene,root,'banknote-frame',0,.039,0,1.42,.02,.61,'#4f9854');box(scene,root,'banknote-center',0,.055,0,1.28,.01,.48,'#b4e1a5');const label=textLabel(scene,root,'500 CÓRDOBAS',0,.07,0,1.23,.32,'#25543b','#b4e1a5');if(label)label.rotation.x=Math.PI/2;
 }
 else if(object==='cigarettes'){
  box(scene,root,'cigarette-packet',0,0,0,.88,1.17,.31,'#f4f1e6');box(scene,root,'packet-red-cap',0,.4,.005,.89,.39,.32,'#d32836');
  decal(scene,root,'marlboro',0,.12,.175,.8,.72,ctx=>{ctx.fillStyle='#faf6ed';ctx.fillRect(0,0,512,256);ctx.fillStyle='#d62937';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(512,0);ctx.lineTo(512,97);ctx.lineTo(256,36);ctx.lineTo(0,97);ctx.fill();ctx.fillStyle='#272c31';ctx.textAlign='center';ctx.font='bold 76px Georgia';ctx.fillText('Marlboro',256,166);ctx.font='25px Arial';ctx.fillText('ORIGINAL',256,215);});
 }
 else if(object==='brush'){
  cylinder(scene,root,'paintbrush-handle',0,-.27,0,1.18,.13,'#edb849').rotation.z=-.2;box(scene,root,'paintbrush-metal',.11,.42,0,.42,.3,.2,'#b8d3dd').rotation.z=-.2;box(scene,root,'paintbrush-bristles',.18,.69,0,.4,.3,.19,'#ec4f80').rotation.z=-.2;for(let i=0;i<3;i++)sphere(scene,root,'paint-drop',(i-1)*.22,.88+i%2*.15,.01,.13,['#ed4e83','#53d5e4','#ffcf4f'][i]);
 }
 else if(object==='pencil'){
  cylinder(scene,root,'pencil-body',0,0,0,1.46,.18,'#f3c12d');cylinder(scene,root,'pencil-tip',0,.88,0,.32,.18,'#d2a376',0);cylinder(scene,root,'pencil-graphite',0,1.045,0,.09,.07,'#263440',0);cylinder(scene,root,'pencil-ferrule',0,-.76,0,.16,.19,'#bfd2dc');cylinder(scene,root,'pencil-eraser',0,-.89,0,.13,.19,'#ec5e94');root.rotation.z=.25;
 }
 else if(object==='eraser'){
  box(scene,root,'eraser',0,0,0,1.18,.4,.58,'#ff6da6');box(scene,root,'eraser-sleeve',0,0,0,.67,.42,.6,'#68cdf0');textLabel(scene,root,'BORRÓN',0,.02,.317,.61,.23,'#203f6e','#68cdf0');
 }
 else if(object==='smoke'||object==='talc'){
  const color=object==='talc'?'#fff8e6':'#bad3b4';for(let i=0;i<5;i++)sphere(scene,root,'cloud-puff',Math.sin(i*2.4)*.65,(i%2)*.35,Math.cos(i*2.4)*.65,1.25,color);
  if(object==='talc'){cylinder(scene,root,'talc-can',0,-.1,0,.84,.48,'#faf7ea');cylinder(scene,root,'talc-cap',0,.38,0,.12,.52,'#66bce0');textLabel(scene,root,'TALCO',0,-.12,.259,.41,.19,'#39709a','#faf7ea');}
 }
 else if(object==='coco'){
  // Coco loco: a green coconut with a cheeky face, rolls and bounces.
  sphere(scene,root,'coco-shell',0,0,0,1.25,'#5e8f2f',new Vector3(1,1.05,1));sphere(scene,root,'coco-top',0,.5,0,.5,'#8b6a3a',new Vector3(1,.5,1));
  for(const x of [-1,1]){sphere(scene,root,'coco-eye',x*.2,.15,.55,.22,'#fff8e8');sphere(scene,root,'coco-pupil',x*.2,.15,.64,.1,'#1a1a1a');}tube(scene,root,'coco-grin',[[-.22,-.12,.55],[0,-.2,.6],[.22,-.12,.55]],.035,'#2d3a1a');
 }
 else if(object==='chilero'){
  // A jar of chilero: pickled onions and chiles, red lid, the puddle it leaves is spicy.
  cylinder(scene,root,'chilero-jar',0,0,0,1,.75,'#f4e3c4',.7);for(let i=0;i<6;i++)sphere(scene,root,'chilero-chile',Math.sin(i*1.9)*.2,-.25+i*.1,Math.cos(i*1.9)*.2,.24,i%2?'#e8442c':'#f6d05a',new Vector3(.6,1.4,.6));
  cylinder(scene,root,'chilero-lid',0,.58,0,.18,.78,'#c8321f');textLabel(scene,root,'CHILERO',0,.05,.4,.7,.2,'#c8321f','#fff8e8');
  const puddle=cylinder(scene,root,'chilero-puddle',0,-.9,0,.04,2.6,'#e8442c');puddle.material=material(scene,'#e8442c',true,.7);
 }
 else if(object==='bong'){
  // «El Bong Cachinflín»: a cartoon glass bong with googly eyes, bubbles and a puff of smoke.
  const glass=material(scene,'#7fe0a0',true,.55);glass.backFaceCulling=false;
  const base=sphere(scene,root,'bong-base',0,-.55,0,1.15,'#7fe0a0',new Vector3(1,.85,1));base.material=glass;
  const neck=cylinder(scene,root,'bong-neck',0,.45,0,1.6,.42,'#7fe0a0',.5);neck.material=glass;cylinder(scene,root,'bong-mouth',0,1.28,0,.12,.62,'#b4ffd0');
  const water=sphere(scene,root,'bong-water',0,-.68,0,.95,'#3fb4e0',new Vector3(1,.55,1));water.material=material(scene,'#3fb4e0',true,.7);
  const stem=cylinder(scene,root,'bong-stem',.42,-.2,.0,.75,.13,'#b4ffd0');stem.rotation.z=-.85;cylinder(scene,root,'bong-bowl',.72,.1,0,.22,.32,'#2f6b4f',.22);
  for(const x of [-1,1]){sphere(scene,root,'bong-eye',x*.2,.55,.24,.3,'#ffffff');sphere(scene,root,'bong-pupil',x*.2,.55,.37,.14,'#1a1a1a');}
  tube(scene,root,'bong-smile',[[-.18,.28,.22],[0,.2,.26],[.18,.28,.22]],.035,'#1a4a2a');
  for(let i=0;i<4;i++)sphere(scene,root,'bong-bubble',Math.sin(i*2.1)*.25,-.6+i*.1,Math.cos(i*2.1)*.25,.14,'#e6fff2');
  for(let i=0;i<3;i++){const puff=sphere(scene,root,'bong-smoke',.1*i,1.55+i*.32,0,.55+i*.18,'#cfc6e8');puff.material=material(scene,'#cfc6e8',false,.65);}
 }
 else{box(scene,root,object,0,0,0,1.04,.57,.77,'#a3d8e4');}
 // Both sides read correctly when a projectile moves away from the chase camera.
 if(['victoria','tona','rum','flor','sixpack','console','cigarettes','backpack'].includes(object))for(const face of root.getChildMeshes(false) as Mesh[]){
  if(!face.name.startsWith('label-'))continue;const rear=face.clone(face.name+'-rear',face.parent);if(!rear)continue;rear.position.z=-Math.abs(face.position.z);rear.rotation.y+=Math.PI;rear.isPickable=false;
 }
 root.scaling.setAll(special?1.65:1.22);mergeParts(root);return root;
}
