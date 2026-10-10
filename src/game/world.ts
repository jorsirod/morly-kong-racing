import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { track } from '../../shared/content';
import { routeFor, sample } from '../../shared/track';
import { cylinder,sphere,material,textLabel } from './models';
import { Kit,surfaceTexture,type Anim } from './worlds/kit';
import { buildCourse,type TrackStyle } from './worlds/course';
import { buildLaSalle } from './worlds/lasalle';
import { dressOriental,dressManagua,dressHipa,dressMasaya,dressSanJuan,managuaLandmarks } from './worlds/others';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import '@babylonjs/core/Meshes/Builders/ribbonBuilder';
import '@babylonjs/core/Meshes/Builders/groundBuilder';
// Flat environmental pieces use simple geometry; detail is reserved for the cars.
function box(scene:Scene,parent:TransformNode|null,name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:string){const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=material(scene,color);if(parent)mesh.parent=parent;mesh.isPickable=false;return mesh;}
function groundShadow(scene:Scene,parent:TransformNode,x:number,z:number,size:number){const shadow=cylinder(scene,parent,'baked-shadow',x+.6,-.06,z+.6,.015,size,'#294b3c');shadow.scaling.z=.75;shadow.material=material(scene,'#294b3c',false,.13);}

/** Per-world look of the road, its walls, embankments, ramps and alternative lanes. */
const STYLES:Record<string,TrackStyle>={
 'la-salle':{road:'#4a5568',rough:'#b49964',barrier:{body:'#efe2bf',top:'#2f6b4f',h:.9},skirt:'grass',skirtColor:'#78a94d',shelf:8,ramp:'stripes',lane:{canchas:{kind:'court',color:'#d98852'}}},
 oriental:{road:'#4d5466',rough:'#b49964',barrier:{body:'#c77d4f',top:'#e9c25a',stripe:'#3f8fa0',h:1},skirt:'dirt',skirtColor:'#a48760',shelf:7,ramp:'wood',lane:{callejon:{kind:'dirt',color:'#a88a5e'}}},
 managua:{road:'#4a5568',rough:'#b49964',barrier:{body:'#e7e2d6',top:'#d8433a',stripe:'#f2efe6',h:.95},skirt:'grass',skirtColor:'#8ea36a',shelf:8,ramp:'stripes',lane:{mirador:{kind:'concrete',color:'#9a9488'}}},
 'hipa-hipa':{road:'#2d4268',rough:'#5a4a6a',barrier:{body:'#24304f',top:'#ff5fb0',stripe:'#45e0ff',h:.8},skirt:'dirt',skirtColor:'#3a3550',shelf:7,ramp:'neon',lane:{baile:{kind:'neon',color:'#222'}},night:true},
 masaya:{road:'#4a4f5c',rough:'#5b5048',barrier:{body:'#5e5a52',top:'#7b746a',h:1.1,post:true},skirt:'rock',skirtColor:'#5d564d',shelf:16,ramp:'rock',lane:{cresta:{kind:'rock',color:'#4a4440'}}},
 'san-juan':{road:'#4a5568',rough:'#e3c98e',barrier:{body:'#c9a57a',top:'#f6efe1',stripe:'#4fb2c4',h:.9,post:true},skirt:'grass',skirtColor:'#9cb874',shelf:14,ramp:'wood',lane:{playa:{kind:'planks',color:'#b98b58'}}},
};

export function buildWorld(scene:Scene,id:string,battle=false) {
 const def=track(id),route=routeFor(id),root=new TransformNode('world-'+id,scene);
 const kit=new Kit(scene,root,route),c=route.course,L=route.length;
 // Tiled procedural ground so the world never looks like a flat-coloured board.
 const groundKind=id==='masaya'?'rock':id==='oriental'?'dirt':id==='hipa-hipa'?'tile':'grass';
 const base=MeshBuilder.CreateGround('ground',{width:1400,height:1400},scene);const groundMat=surfaceTexture(scene,groundKind,id==='la-salle'?'#7fb653':def.ground);const gt=groundMat.diffuseTexture as Texture|null;if(gt){gt.uScale=gt.vScale=id==='hipa-hipa'?160:120;}base.material=groundMat;base.parent=root;base.position.y=-.2;
 if(battle){box(scene,root,'arena',0,-.03,0,160,.15,130,'#bfaa79');for(const x of [-80,80])box(scene,root,'wall',x,1.2,0,1.2,2.5,132,'#d9bc77');for(const z of [-65,65])box(scene,root,'wall',0,1.2,z,160,2.5,1.2,'#d9bc77');}
 else {
  buildCourse(kit,route,id,STYLES[id]??STYLES['la-salle']);
  const start=sample(route,0),gate=new TransformNode('start-gate',scene);gate.parent=root;gate.position.set(start.x,start.y,start.z);gate.rotation.y=start.yaw;
  // La Salle builds its own school gate as the start arch.
  if(id!=='la-salle'){box(scene,gate,'gate-post',-def.width/2-1,3,0,.8,6,1,'#d8ba77');box(scene,gate,'gate-post',def.width/2+1,3,0,.8,6,1,'#d8ba77');box(scene,gate,'gate-top',0,6,0,def.width+3,1.3,1,'#f1d88f');
  textLabel(scene,gate,def.name.toUpperCase(),0,6,-.55,def.width+1,1.1,'#244c44','#f1d88f');}
  for(let col=-5;col<=5;col++)for(let row=0;row<2;row++){const m=box(scene,root,'finish-tile',start.x+Math.cos(start.yaw)*col*1.3+Math.sin(start.yaw)*row*.7,start.y+.07,start.z-Math.sin(start.yaw)*col*1.3+Math.cos(start.yaw)*row*.7,1.25,.035,.65,(col+row)%2?'#faf1da':'#2c4943');m.rotation.y=start.yaw;}
 }
 /** Sections where roadside dressing would float or block: gaps, bridges, tunnels, ramps. */
 const special=(d:number)=>c.gaps.some(g=>g.lane===''&&d>g.from-10&&d<g.to+10)||c.bridges.some(([a,b])=>d>a-6&&d<b+6)||c.tunnels.some(([a,b])=>d>a-4&&d<b+4)||c.ramps.some(r=>r.lane===''&&r.big&&d>r.at-6&&d<r.at+r.len+6);
 function tree(x:number,z:number,y=0,palm=false){if(y===0)groundShadow(scene,root,x,z,6);sphere(scene,root,'tree-split',x+1.6,y+6.8,z-.8,3.4,'#91d564',new Vector3(1,.95,1));cylinder(scene,root,'trunk',x,y+3,z,6,.55,'#887456',.35);if(palm){for(let i=0;i<6;i++){const leaf=sphere(scene,root,'palm-leaf',x+Math.sin(i)*2,y+6,z+Math.cos(i)*2,3,'#60956d',new Vector3(.6,.15,1.7));leaf.rotation.y=i;}}else{sphere(scene,root,'tree',x,y+6,z,6,'#6da477',new Vector3(1,1.3,1));sphere(scene,root,'tree',x-1.5,y+5,z+1,4,'#7caf81');}}
 function building(x:number,z:number,w:number,d:number,color='#e7cc91',h=7,y=0){box(scene,root,'building',x,y+h/2,z,w,h,d,color);box(scene,root,'roof',x,y+h+.12,z,w+.5,.5,d+.5,'#bb735a');for(const xSide of [-1,1])box(scene,root,'building-corner',x+xSide*(w/2-.3),y+h*.5,z-d/2-.14,.35,h,.3,'#fff1d2');for(let i=0;i<Math.floor(w/4);i++)box(scene,root,'window',x-w/2+2+i*4,y+h*.6,z-d/2-.03,1.8,2.3,.05,'#39766f');}
 function sign(text:string,x:number,z:number,y=4){cylinder(scene,root,'sign-post',x,y/2,z,y,.2,'#64745e');const m=textLabel(scene,root,text,x,y,z,10,2);if(m)m.billboardMode=Mesh.BILLBOARDMODE_Y;}
 const night=id==='hipa-hipa';
 if(id==='la-salle'){
  buildLaSalle(kit,route,battle);
 } else if(id==='oriental'){
  const shades=['#cc795c','#d7b960','#729ba1','#84a76f'];for(let d=10;d<L;d+=22){if(special(d))continue;const p=sample(route,d);for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*18*side,z=p.z-Math.sin(p.yaw)*18*side;if(kit.blocked(x,z,7))continue;const stall=new TransformNode('chinamo',scene);stall.parent=root;stall.position.set(x,p.y,z);stall.rotation.y=p.yaw;box(scene,stall,'stall',0,1.6,0,12,3.2,8,'#d1b48a');box(scene,stall,'awning',0,3.5,1,13,.25,11,shades[Math.floor(d/22)%4]);for(let k=-2;k<=2;k++)box(scene,stall,'crate',k*2,1,4,1.5,1.8,1.3,shades[(k+3)%4]);}}
  sign('GANCHO DE CAMINO',-70,-178,5);sign('CALLE DEL MAÍZ',170,52,6);for(let i=0;i<15;i++){const x=-30+i*4,z=battle?100:5;if(!battle&&kit.blocked(x,z,2))continue;box(scene,root,'box',x,1.4,z,2,2.8,2,shades[i%4]);}
 } else if(id==='managua'){
  managuaLandmarks(kit,route,battle);
 } else if(night){
  box(scene,root,'dance-floor',0,.03,0,110,.1,105,'#31444f');for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++){const m=box(scene,root,'dance-tile',x*9,.12,z*9,8,.05,8,(x+z)%2?'#5e7f8d':'#66889a');m.material=material(scene,(x+z)%2?'#62afb4':'#ac6996',true);}
  building(-10,battle?90:55,80,15,'#875649',11);box(scene,root,'bar',-10,2.5,battle?85:45,76,5,4,'#b68563');sign('HIPA HIPA',-10,50,14);
  box(scene,root,'dj-stage',20,-.05,battle?-90:-55,50,2,15,'#5a6874');for(const x of [-7,47]){box(scene,root,'speaker',x,4.5,battle?-90:-55,5,9,5,'#243440');for(const y of [2.5,6]){const woofer=cylinder(scene,root,'woofer',x,y,battle?-87.4:-52.4,.2,3,'#5c7180');woofer.rotation.x=Math.PI/2;}}
  sphere(scene,root,'disco-ball',0,22,0,8,'#a6c5d0');for(let i=0;i<12;i++){const d=sample(route,i/12*L);if(special(i/12*L))continue;const x=d.x+18*Math.cos(d.yaw),z=d.z-18*Math.sin(d.yaw);if(kit.blocked(x,z,1))continue;const post=cylinder(scene,root,'neon-pole',x,4,z,8,.3,'#77c7cd');post.material=material(scene,i%2?'#cc77a5':'#70ccd2',true);}
 } else if(id==='masaya'){
  cylinder(scene,root,'volcano',0,13,battle?240:0,32,250,'#768273',180);cylinder(scene,root,'crater',0,30,battle?240:0,2,155,'#3e504a',168);cylinder(scene,root,'lava',0,30.1,battle?240:0,.15,105,'#d67b45');const glow=scene.getMaterialByName('mat-#d67b45-false-1');if(glow)(glow as ReturnType<typeof material>).emissiveColor=(glow as ReturnType<typeof material>).diffuseColor.scale(.6);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;sphere(scene,root,'crater-rock',Math.sin(a)*85,30,Math.cos(a)*85+(battle?240:0),16,'#657368',new Vector3(1,.6,1));}
  for(let i=0;i<35;i++){const a=i*2.4,x=Math.sin(a)*(220+i*3),z=Math.cos(a)*(220+i*3);if(kit.blocked(x,z,8))continue;sphere(scene,root,'rock',x,2,z,6+i%5,'#788678');}
  sign('CRÁTER SANTIAGO',45,181,46);for(let i=0;i<10;i++){const x=-215+i*8,z=-130;if(!kit.blocked(x,z,4))tree(x,z,0);}
 } else {
  box(scene,root,'ocean',0,-.15,-445,1400,.1,550,'#63b5c4');box(scene,root,'beach',0,-.1,-210,750,.1,75,'#e8cc92');
  for(let i=0;i<14;i++){const x=-190+i*29,z=-226;if(!kit.blocked(x,z,4))tree(x,z,0,true);}for(let i=0;i<8;i++){const x=-95+i*26,z=-262;if(!kit.blocked(x,z,8))building(x,z,20,13,['#df9a78','#e4cb8c','#9fbaba'][i%3],6);}
  box(scene,root,'pier',-55,1,-300,8,1,95,'#ad9067');for(let i=0;i<8;i++)box(scene,root,'pier-leg',-55,-2,-260-i*10,.4,7,.4,'#907955');
  const cx=78,cz=208,cy=40;cylinder(scene,root,'christ-hill',cx,15,cz,35,125,'#8ea478',72);cylinder(scene,root,'christ-base',cx,cy+3,cz,6,15,'#d9d5bd');cylinder(scene,root,'christ-robe',cx,cy+13,cz,16,8,'#efebd4',4);sphere(scene,root,'christ-head',cx,cy+24,cz,4.5,'#efebd4');
  const arms=box(scene,root,'christ-arms',cx,cy+19,cz,27,2.5,2.5,'#efebd4');arms.rotation.z=-.06;for(const x of [-14,14])sphere(scene,root,'christ-hands',cx+x,cy+19,cz,2.8,'#efebd4');sign('CRISTO DE LA MISERICORDIA',cx,cz-16,cy+7);
 }
 if(!battle){const dress={oriental:dressOriental,managua:dressManagua,'hipa-hipa':dressHipa,masaya:dressMasaya,'san-juan':dressSanJuan}[id];dress?.(kit,route);}
 if(!night){for(let i=0;i<7;i++){const cloud=new TransformNode('cloud',scene);cloud.parent=root;cloud.position.set(-250+i*75,48+(i%3)*5,-220);for(let k=0;k<3;k++)sphere(scene,cloud,'cloud-puff',k*8,Math.sin(k)*2,0,17,'#fff6df',new Vector3(1.15,.5,.7));}
 if(!battle)for(let d=20;d<L;d+=35){if(special(d))continue;const p=sample(route,d);if(id==='la-salle'&&p.x>140&&p.z>-75&&p.z<65)continue;for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*(def.width*.85+4)*side,z=p.z-Math.sin(p.yaw)*(def.width*.85+4)*side;if(!kit.blocked(x,z,1.5)){for(let k=0;k<3;k++)sphere(scene,root,'roadside-bush',x+k*.8,p.y+1.1,z,2.4,['#62ad43','#85c84e','#b8dc5a'][k]);}const next=sample(route,d+15);if(Math.abs(Math.atan2(Math.sin(next.yaw-p.yaw),Math.cos(next.yaw-p.yaw)))>.15){const fx=p.x+Math.cos(p.yaw)*(def.width*.72+.7)*side,fz=p.z-Math.sin(p.yaw)*(def.width*.72+.7)*side;if(kit.onLane(fx,fz,1.5))continue;const sign=box(scene,root,'curve-arrow',fx,p.y+1.8,fz,2.2,1.1,.12,'#ffdc49');sign.rotation.y=p.yaw;const mark=textLabel(scene,root,side>0?'‹':'›',fx,p.y+1.8,fz,1.7,.9,'#1a355c','#ffdc49');if(mark)mark.rotation.y=p.yaw;cylinder(scene,root,'arrow-post',fx,p.y+.8,fz,1.6,.12,'#597080');}}}
 for(let i=0;i<14;i++){const a=i*2.4,x=Math.sin(a)*(285+i*6),z=Math.cos(a)*(285+i*6);sphere(scene,root,'hill',x,8,z,90,def.ground,new Vector3(1,.45,1));}}
 // Bake static primitives into a small set of material batches.
 const groups=new Map<string,Mesh[]>();for(const m of root.getChildMeshes(false) as Mesh[]){if(!m.material||m.name.startsWith('label')||m.parent?.metadata?.animate)continue;const k=m.material.name,g=groups.get(k)??[];g.push(m);groups.set(k,g);}
 for(const group of groups.values())if(group.length>1){const m=Mesh.MergeMeshes(group,true,true,undefined,false,false);if(m){m.parent=root;m.isPickable=false;}}
 root.getChildMeshes().forEach(m=>{m.isPickable=false;m.receiveShadows=true;if(!m.parent?.metadata?.animate)m.freezeWorldMatrix();});root.metadata={anims:kit.anims as Anim[],gates:kit.gates};return root;
}
