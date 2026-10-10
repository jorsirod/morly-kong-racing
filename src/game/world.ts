import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import { track } from '../../shared/content';
import { routeFor, sample } from '../../shared/track';
import { cylinder,sphere,material,textLabel } from './models';
import { Kit,surfaceTexture,type Anim } from './worlds/kit';
import { buildLaSalle } from './worlds/lasalle';
import { dressOriental,dressManagua,dressHipa,dressMasaya,dressSanJuan } from './worlds/others';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import '@babylonjs/core/Meshes/Builders/ribbonBuilder';
import '@babylonjs/core/Meshes/Builders/groundBuilder';
// Flat environmental pieces use simple geometry; detail is reserved for the cars.
function box(scene:Scene,parent:TransformNode|null,name:string,x:number,y:number,z:number,w:number,h:number,d:number,color:string){const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.material=material(scene,color);if(parent)mesh.parent=parent;mesh.isPickable=false;return mesh;}
function groundShadow(scene:Scene,parent:TransformNode,x:number,z:number,size:number){const shadow=cylinder(scene,parent,'baked-shadow',x+.6,-.06,z+.6,.015,size,'#294b3c');shadow.scaling.z=.75;shadow.material=material(scene,'#294b3c',false,.13);}


export function buildWorld(scene:Scene,id:string,battle=false) {
 const def=track(id),route=routeFor(id),root=new TransformNode('world-'+id,scene);
 const kit=new Kit(scene,root,route);
 // Tiled procedural ground so the world never looks like a flat-coloured board.
 const groundKind=id==='masaya'?'rock':id==='oriental'?'dirt':id==='hipa-hipa'?'tile':'grass';
 const base=MeshBuilder.CreateGround('ground',{width:1400,height:1400},scene);const groundMat=surfaceTexture(scene,groundKind,id==='la-salle'?'#7fb653':def.ground);const gt=groundMat.diffuseTexture as Texture|null;if(gt){gt.uScale=gt.vScale=id==='hipa-hipa'?160:120;}base.material=groundMat;base.parent=root;base.position.y=-.2;
 if(battle){box(scene,root,'arena',0,-.03,0,160,.15,130,'#bfaa79');for(const x of [-80,80])box(scene,root,'wall',x,1.2,0,1.2,2.5,132,'#d9bc77');for(const z of [-65,65])box(scene,root,'wall',0,1.2,z,160,2.5,1.2,'#d9bc77');}
 else {
  const paths=[-1,1].map(side=>route.points.map((p,i)=>{const next=route.points[(i+1)%route.points.length],yaw=Math.atan2(next.x-p.x,next.z-p.z);return new Vector3(p.x+Math.cos(yaw)*def.width*.5*side,p.y+.035,p.z-Math.sin(yaw)*def.width*.5*side);}));
  for(const [from,to] of route.roughRanges??[]){const roughPaths=[-1,1].map(side=>route.points.map((p,i)=>({p,i})).filter(({i})=>route.distances[i]/route.length>=from&&route.distances[i]/route.length<=to).map(({p,i})=>{const n=route.points[(i+1)%route.points.length],yaw=Math.atan2(n.x-p.x,n.z-p.z);return new Vector3(p.x+Math.cos(yaw)*def.width*.5*side,p.y+.045,p.z-Math.sin(yaw)*def.width*.5*side);}));const gravel=MeshBuilder.CreateRibbon('rough-road',{pathArray:roughPaths,sideOrientation:Mesh.DOUBLESIDE},scene);gravel.parent=root;const gm=surfaceTexture(scene,'dirt',id==='masaya'?'#5b5048':'#b49964');const gt2=gm.diffuseTexture as Texture|null;if(gt2){gt2.uScale=route.length/14;}gravel.material=gm;}
  paths.forEach(p=>p.push(p[0].clone()));const road=MeshBuilder.CreateRibbon('road',{pathArray:paths,sideOrientation:Mesh.DOUBLESIDE},scene);road.parent=root;const roadMat=surfaceTexture(scene,'asphalt',id==='hipa-hipa'?'#2d4268':'#4a5568');const rt=roadMat.diffuseTexture as Texture|null;if(rt){rt.uScale=route.length/14;rt.vScale=1.2;}road.material=roadMat;
  for(let d=0;d<route.length;d+=12){
   const p=sample(route,d),stripe=box(scene,root,'lane',p.x,p.y+.065,p.z,.24,.035,4,'#f4e3ba');stripe.rotation.y=p.yaw;
   for(const side of [-1,1]){const curb=box(scene,root,'curb',p.x+Math.cos(p.yaw)*(def.width/2+.2)*side,p.y+.2,p.z-Math.sin(p.yaw)*(def.width/2+.2)*side,.45,.35,5.6,Math.floor(d/12)%2?'#fff0c9':'#ed604d');curb.rotation.y=p.yaw;}
  }
  if(route.shortcut){const cut=route.shortcut,yaw=Math.atan2(cut.b.x-cut.a.x,cut.b.z-cut.a.z),paths=[-1,1].map(side=>[cut.a,cut.b].map(p=>new Vector3(p.x+Math.cos(yaw)*4*side,p.y+.055,p.z-Math.sin(yaw)*4*side)));const shortcut=MeshBuilder.CreateRibbon('shortcut',{pathArray:paths,sideOrientation:Mesh.DOUBLESIDE},scene);shortcut.parent=root;shortcut.material=material(scene,'#c4ae72');textLabel(scene,root,'ATAJO →',cut.a.x,3.5,cut.a.z,9,1.8,'#ffdf54','#2c4b79');}
  const ramp=sample(route,route.length*.68),rampMesh=box(scene,root,'ramp',ramp.x,ramp.y+.1,ramp.z,def.width,.25,6,'#d5a046');rampMesh.rotation.y=ramp.yaw;rampMesh.rotation.x=-.06;for(let i=-3;i<=3;i++){const chev=box(scene,root,'ramp-stripe',ramp.x+Math.cos(ramp.yaw)*i*2,ramp.y+.26,ramp.z-Math.sin(ramp.yaw)*i*2,.9,.04,4.5,i%2?'#ffd33d':'#11204a');chev.rotation.y=ramp.yaw;}
  const start=sample(route,0),gate=new TransformNode('start-gate',scene);gate.parent=root;gate.position.set(start.x,start.y,start.z);gate.rotation.y=start.yaw;
  // La Salle builds its own school gate as the start arch.
  if(id!=='la-salle'){box(scene,gate,'gate-post',-def.width/2-1,3,0,.8,6,1,'#d8ba77');box(scene,gate,'gate-post',def.width/2+1,3,0,.8,6,1,'#d8ba77');box(scene,gate,'gate-top',0,6,0,def.width+3,1.3,1,'#f1d88f');
  textLabel(scene,gate,def.name.toUpperCase(),0,6,-.55,def.width+1,1.1,'#244c44','#f1d88f');}
  for(let col=-5;col<=5;col++)for(let row=0;row<2;row++){const m=box(scene,root,'finish-tile',start.x+Math.cos(start.yaw)*col*1.3+Math.sin(start.yaw)*row*.7,start.y+.07,start.z-Math.sin(start.yaw)*col*1.3+Math.cos(start.yaw)*row*.7,1.25,.035,.65,(col+row)%2?'#faf1da':'#2c4943');m.rotation.y=start.yaw;}
 }
  // Low walls along both edges, exactly where the soft barrier of the physics begins.
  const BARRIERS:Record<string,{body:string;top:string;stripe?:string;h:number;post?:boolean}>={'la-salle':{body:'#efe2bf',top:'#2f6b4f',h:.9},oriental:{body:'#c77d4f',top:'#e9c25a',stripe:'#3f8fa0',h:1},managua:{body:'#e7e2d6',top:'#d8433a',stripe:'#f2efe6',h:.95},'hipa-hipa':{body:'#24304f',top:'#ff5fb0',stripe:'#45e0ff',h:.8},masaya:{body:'#5e5a52',top:'#7b746a',h:1.1,post:true},'san-juan':{body:'#c9a57a',top:'#f6efe1',stripe:'#4fb2c4',h:.9,post:true}};
  if(!battle){const cut=route.shortcut,corridor=(d:number)=>id==='la-salle'&&d>226&&d<338;
   kit.barrier(route,BARRIERS[id]??BARRIERS['la-salle'],(d,side)=>{if(corridor(d))return true;if(!cut)return false;
    // Leave a clear mouth on the side where the shortcut leaves and rejoins the road.
    const q=sample(route,d);if(Math.hypot(q.x-cut.a.x,q.z-cut.a.z)>18&&Math.hypot(q.x-cut.b.x,q.z-cut.b.z)>18)return false;
    const mx=(cut.a.x+cut.b.x)/2-q.x,mz=(cut.a.z+cut.b.z)/2-q.z,right=mx*Math.cos(q.yaw)-mz*Math.sin(q.yaw);return Math.sign(right)===side;});}
 function tree(x:number,z:number,y=0,palm=false){if(y===0)groundShadow(scene,root,x,z,6);sphere(scene,root,'tree-split',x+1.6,y+6.8,z-.8,3.4,'#91d564',new Vector3(1,.95,1));cylinder(scene,root,'trunk',x,y+3,z,6,.55,'#887456',.35);if(palm){for(let i=0;i<6;i++){const leaf=sphere(scene,root,'palm-leaf',x+Math.sin(i)*2,y+6,z+Math.cos(i)*2,3,'#60956d',new Vector3(.6,.15,1.7));leaf.rotation.y=i;}}else{sphere(scene,root,'tree',x,y+6,z,6,'#6da477',new Vector3(1,1.3,1));sphere(scene,root,'tree',x-1.5,y+5,z+1,4,'#7caf81');}}
 function building(x:number,z:number,w:number,d:number,color='#e7cc91',h=7,y=0){box(scene,root,'building',x,y+h/2,z,w,h,d,color);box(scene,root,'roof',x,y+h+.12,z,w+.5,.5,d+.5,'#bb735a');for(const xSide of [-1,1])box(scene,root,'building-corner',x+xSide*(w/2-.3),y+h*.5,z-d/2-.14,.35,h,.3,'#fff1d2');for(let i=0;i<Math.floor(w/4);i++)box(scene,root,'window',x-w/2+2+i*4,y+h*.6,z-d/2-.03,1.8,2.3,.05,'#39766f');}
 function sign(text:string,x:number,z:number,y=4){cylinder(scene,root,'sign-post',x,y/2,z,y,.2,'#64745e');const m=textLabel(scene,root,text,x,y,z,10,2);if(m)m.billboardMode=Mesh.BILLBOARDMODE_Y;}
 function court(x:number,z:number,w=48,d=34){box(scene,root,'court',x,.03,z,w,.12,d,'#d98852');for(const dx of [-w/2,w/2])box(scene,root,'court-line',x+dx,.12,z,.14,.025,d,'#fff2ce');for(const dz of [-d/2,d/2])box(scene,root,'court-line',x,.12,z+dz,w,.025,.14,'#fff2ce');box(scene,root,'court-mid',x,.12,z,.14,.025,d,'#fff2ce');const circle=MeshBuilder.CreateTorus('court-circle',{diameter:8,thickness:.14,tessellation:32},scene);circle.parent=root;circle.position.set(x,.15,z);circle.material=material(scene,'#fff2ce');for(const side of [-1,1]){const px=x+side*(w/2-2);cylinder(scene,root,'basket-pole',px,2.1,z,4.2,.18,'#446c66');box(scene,root,'backboard',px,4.2,z,.2,1.5,2.4,'#fcf4dd');const hoop=MeshBuilder.CreateTorus('basket-hoop',{diameter:.85,thickness:.065,tessellation:16},scene);hoop.parent=root;hoop.position.set(px-side*.65,3.8,z);hoop.material=material(scene,'#d7824e');}}
 const night=id==='hipa-hipa';
 if(id==='la-salle'){
  buildLaSalle(kit,route,battle);
 } else if(id==='oriental'){
  const shades=['#cc795c','#d7b960','#729ba1','#84a76f'];for(let d=10;d<route.length;d+=22){const p=sample(route,d);for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*18*side,z=p.z-Math.sin(p.yaw)*18*side;const stall=new TransformNode('chinamo',scene);stall.parent=root;stall.position.set(x,p.y,z);stall.rotation.y=p.yaw;box(scene,stall,'stall',0,1.6,0,12,3.2,8,'#d1b48a');box(scene,stall,'awning',0,3.5,1,13,.25,11,shades[Math.floor(d/22)%4]);for(let k=-2;k<=2;k++)box(scene,stall,'crate',k*2,1,4,1.5,1.8,1.3,shades[(k+3)%4]);}}
  sign('GANCHO DE CAMINO',-70,-178,5);sign('CALLE DEL MAÍZ',170,52,6);for(let i=0;i<15;i++)box(scene,root,'box',-30+i*4,1.4,battle?100:5,2,2.8,2,shades[i%4]);
 } else if(id==='managua'){
  box(scene,root,'lake',0,-.12,-440,1200,.12,480,'#74b6c5');for(let i=0;i<9;i++)tree(-145+i*35,-208,0,true);
  building(82,-210,58,18,'#e4d8bb',15);for(const x of [58,106]){cylinder(scene,root,'cathedral-tower',x,18,-210,36,9,'#d1b994');sphere(scene,root,'cathedral-cap',x,36,-210,10,'#b7a88a',new Vector3(1,.65,1));box(scene,root,'clock',x,29,-215,.8,1,.1,'#574c3b');}sign('VIEJA CATEDRAL',82,-190,8);
  building(-20,-205,62,25,'#f0e4c8',9);for(let i=0;i<9;i++)cylinder(scene,root,'culture-column',-46+i*6,5,-222,10,.7,'#e3d8bc');sign('PALACIO DE LA CULTURA',-20,-185,5);
  cylinder(scene,root,'tiscapa-hill',0,2,battle?200:0,8,120,'#829a67',85);cylinder(scene,root,'lagoon',0,6.1,battle?200:0,.2,65,'#6ea6b7');sign('TISCAPA',0,battle?150:-48,12);
  building(-120,190,58,30,'#dbccab',13);for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)sphere(scene,root,'dome',-120+x*10,14,190+z*10,11,'#c7bba0',new Vector3(1,.55,1));
  for(let i=0;i<12;i++)building(70+(i%4)*20,55+Math.floor(i/4)*24,15,18,['#dfc099','#a5b9a7','#c98b77'][i%3],8+i%3*3);
 } else if(night){
  box(scene,root,'dance-floor',0,.03,0,110,.1,105,'#31444f');for(let x=-5;x<=5;x++)for(let z=-5;z<=5;z++){const m=box(scene,root,'dance-tile',x*9,.12,z*9,8,.05,8,(x+z)%2?'#5e7f8d':'#66889a');m.material=material(scene,(x+z)%2?'#62afb4':'#ac6996',true);}
  building(-10,battle?90:55,80,15,'#875649',11);box(scene,root,'bar',-10,2.5,battle?85:45,76,5,4,'#b68563');sign('HIPA HIPA',-10,50,14);
  box(scene,root,'dj-stage',20,-.05,battle?-90:-55,50,2,15,'#5a6874');for(const x of [-7,47]){box(scene,root,'speaker',x,4.5,battle?-90:-55,5,9,5,'#243440');for(const y of [2.5,6]){const woofer=cylinder(scene,root,'woofer',x,y,battle?-87.4:-52.4,.2,3,'#5c7180');woofer.rotation.x=Math.PI/2;}}
  sphere(scene,root,'disco-ball',0,22,0,8,'#a6c5d0');for(let i=0;i<12;i++){const d=sample(route,i/12*route.length);const post=cylinder(scene,root,'neon-pole',d.x+18*Math.cos(d.yaw),4,d.z-18*Math.sin(d.yaw),8,.3,'#77c7cd');post.material=material(scene,i%2?'#cc77a5':'#70ccd2',true);}
 } else if(id==='masaya'){
  cylinder(scene,root,'volcano',0,13,battle?240:0,32,250,'#768273',180);cylinder(scene,root,'crater',0,30,battle?240:0,2,155,'#3e504a',168);cylinder(scene,root,'lava',0,30.1,battle?240:0,.15,105,'#d67b45');const glow=scene.getMaterialByName('mat-#d67b45-false-1');if(glow)(glow as ReturnType<typeof material>).emissiveColor=(glow as ReturnType<typeof material>).diffuseColor.scale(.6);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;sphere(scene,root,'crater-rock',Math.sin(a)*85,30,Math.cos(a)*85+(battle?240:0),16,'#657368',new Vector3(1,.6,1));}
  for(let i=0;i<35;i++){const a=i*2.4;sphere(scene,root,'rock',Math.sin(a)*(220+i*3),2,Math.cos(a)*(220+i*3),6+i%5,'#788678');}
  sign('CRÁTER SANTIAGO',45,181,46);building(195,10,18,12,'#c5b38d',4,28);for(let i=0;i<10;i++)tree(-215+i*8,-130,0);
 } else {
  box(scene,root,'ocean',0,-.15,-445,1400,.1,550,'#63b5c4');box(scene,root,'beach',0,-.1,-210,750,.1,75,'#e8cc92');
  for(let i=0;i<14;i++)tree(-190+i*29,-213,0,true);for(let i=0;i<8;i++)building(-95+i*26,-235,20,13,['#df9a78','#e4cb8c','#9fbaba'][i%3],6);
  box(scene,root,'pier',-55,1,-285,8,1,95,'#ad9067');for(let i=0;i<8;i++)box(scene,root,'pier-leg',-55,-2,-245-i*10,.4,7,.4,'#907955');
  const cx=78,cz=208,cy=40;cylinder(scene,root,'christ-hill',cx,15,cz,35,125,'#8ea478',72);cylinder(scene,root,'christ-base',cx,cy+3,cz,6,15,'#d9d5bd');cylinder(scene,root,'christ-robe',cx,cy+13,cz,16,8,'#efebd4',4);sphere(scene,root,'christ-head',cx,cy+24,cz,4.5,'#efebd4');
  const arms=box(scene,root,'christ-arms',cx,cy+19,cz,27,2.5,2.5,'#efebd4');arms.rotation.z=-.06;for(const x of [-14,14])sphere(scene,root,'christ-hands',cx+x,cy+19,cz,2.8,'#efebd4');sign('CRISTO DE LA MISERICORDIA',cx,cz-16,cy+7);
 }
 if(!battle){const dress={oriental:dressOriental,managua:dressManagua,'hipa-hipa':dressHipa,masaya:dressMasaya,'san-juan':dressSanJuan}[id];dress?.(kit,route);}
 if(!night){for(let i=0;i<7;i++){const cloud=new TransformNode('cloud',scene);cloud.parent=root;cloud.position.set(-250+i*75,48+(i%3)*5,-220);for(let k=0;k<3;k++)sphere(scene,cloud,'cloud-puff',k*8,Math.sin(k)*2,0,17,'#fff6df',new Vector3(1.15,.5,.7));}
 for(let d=20;d<route.length;d+=35){const p=sample(route,d);if(id==='la-salle'&&p.x>140&&p.z>-75&&p.z<65)continue;for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*(def.width*.85+4)*side,z=p.z-Math.sin(p.yaw)*(def.width*.85+4)*side;for(let k=0;k<3;k++)sphere(scene,root,'roadside-bush',x+k*.8,p.y+1.1,z,2.4,['#62ad43','#85c84e','#b8dc5a'][k]);const next=sample(route,d+15);if(Math.abs(Math.atan2(Math.sin(next.yaw-p.yaw),Math.cos(next.yaw-p.yaw)))>.15){const fx=p.x+Math.cos(p.yaw)*(def.width*.72+.7)*side,fz=p.z-Math.sin(p.yaw)*(def.width*.72+.7)*side;const sign=box(scene,root,'curve-arrow',fx,p.y+1.8,fz,2.2,1.1,.12,'#ffdc49');sign.rotation.y=p.yaw;const mark=textLabel(scene,root,side>0?'‹':'›',fx,p.y+1.8,fz,1.7,.9,'#1a355c','#ffdc49');if(mark)mark.rotation.y=p.yaw;cylinder(scene,root,'arrow-post',fx,p.y+.8,fz,1.6,.12,'#597080');}}}
 for(let i=0;i<14;i++){const a=i*2.4,x=Math.sin(a)*(285+i*6),z=Math.cos(a)*(285+i*6);sphere(scene,root,'hill',x,8,z,90,def.ground,new Vector3(1,.45,1));}}
 // Bake static primitives into a small set of material batches.
 const groups=new Map<string,Mesh[]>();for(const m of root.getChildMeshes(false) as Mesh[]){if(!m.material||m.name.startsWith('label')||m.parent?.metadata?.animate)continue;const k=m.material.name,g=groups.get(k)??[];g.push(m);groups.set(k,g);}
 for(const group of groups.values())if(group.length>1){const m=Mesh.MergeMeshes(group,true,true,undefined,false,false);if(m){m.parent=root;m.isPickable=false;}}
 root.getChildMeshes().forEach(m=>{m.isPickable=false;m.receiveShadows=true;if(!m.parent?.metadata?.animate)m.freezeWorldMatrix();});root.metadata={anims:kit.anims as Anim[]};return root;
}
