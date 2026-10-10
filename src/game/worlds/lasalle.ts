import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { sample, type Route } from '../../../shared/track';
import { material } from '../models';
import { Kit, rng, surfaceTexture } from './kit';

/*
 * Colegio La Salle, Managua — interpretación artística de inicios de los 2000.
 * Basado en lo confirmado por Jorsi: entrada (portón verde), aulas, el bar junto a las canchas
 * y canchas de básquet. La distribución real del campus no está documentada: ver
 * outputs/referencias-mundos.md. Todo lo demás (capilla, biblioteca, parqueo) es ambientación.
 */
const CREAM='#efe2bf',WALL='#e8d6a8',TRIM='#2f6b4f',GATE='#2f7a4e',ROOF='#b4644c',WINDOW='#3e7f8f',WOOD='#8a5a3a',CONCRETE='#cfc8b6';

/** Two-storey block with arcade columns, balcony rail, windows and doors on the side facing `face`. */
function block(k:Kit,x:number,z:number,w:number,d:number,face:number,opts:{floors?:number;color?:string;signs?:string[]}={}){
 const floors=opts.floors??2,h=4.2*floors,color=opts.color??WALL,g=new TransformNode('aula-block',k.scene);g.parent=k.root;g.position.set(x,0,z);g.rotation.y=face;
 k.box('block-body',0,h/2,0,w,h,d,color,0,g);k.box('block-roof',0,h+.35,0,w+1.4,.7,d+1.4,ROOF,0,g);k.box('block-base',0,.35,d/2+.05,w+.1,.7,.15,'#a99a7c',0,g);
 for(let f=0;f<floors;f++){
  const y=f*4.2;
  if(f>0){k.box('balcony-slab',0,y+.1,d/2+1.1,w,.2,2.2,CONCRETE,0,g);k.box('balcony-rail',0,y+1.1,d/2+2.15,w,.1,.1,TRIM,0,g);for(let i=0;i<=w/2.4;i++)k.box('rail-bar',-w/2+i*2.4,y+.6,d/2+2.15,.08,1,.08,TRIM,0,g);}
  for(let i=0;i<Math.floor(w/4.2);i++){const wx=-w/2+2.6+i*4.2;if(i%3===1){k.box('door',wx,y+1.3,d/2+.03,1.4,2.6,.08,WOOD,0,g);k.box('door-frame',wx,y+2.7,d/2+.05,1.7,.18,.08,TRIM,0,g);}else{k.box('window',wx,y+2.2,d/2+.03,2.4,1.6,.08,WINDOW,0,g);k.box('window-sill',wx,y+1.35,d/2+.08,2.6,.12,.18,CREAM,0,g);k.box('window-bar',wx,y+2.2,d/2+.08,.07,1.6,.05,CREAM,0,g);}}
 }
 // Arcade columns along the front, the classic covered walkway.
 for(let i=0;i<=Math.floor(w/4.2);i++)k.box('column',-w/2+.4+i*4.2*(w-.8)/(Math.floor(w/4.2)*4.2),2.1,d/2+2.1,.55,4.2,.55,CREAM,0,g);
 k.box('walkway-roof',0,4.3,d/2+1.1,w,.25,2.4,CREAM,0,g);
 (opts.signs??[]).forEach((s,i)=>k.label(s,-w/2+4+i*(w-8)/Math.max(1,(opts.signs!.length-1)),3.25,d/2+.1,3,.7,0,'#fff7df',TRIM,g));
 return g;
}
function court(k:Kit,x:number,z:number,w:number,d:number,yaw=0){
 const g=new TransformNode('court',k.scene);g.parent=k.root;g.position.set(x,0,z);g.rotation.y=yaw;
 k.box('court-floor',0,.04,0,w+4,.1,d+4,'#3f7a8c',0,g);k.box('court-paint',0,.1,0,w,.04,d,'#d98852',0,g);
 for(const dx of [-w/2,w/2])k.box('court-line',dx,.13,0,.18,.02,d,'#fff2ce',0,g);for(const dz of [-d/2,d/2])k.box('court-line',0,.13,dz,w,.02,.18,'#fff2ce',0,g);k.box('court-mid',0,.13,0,.18,.02,d,'#fff2ce',0,g);
 const circle=MeshBuilder.CreateTorus('court-circle',{diameter:6,thickness:.18,tessellation:28},k.scene);circle.parent=g;circle.position.y=.14;circle.material=material(k.scene,'#fff2ce');
 for(const side of [-1,1]){
  const key=MeshBuilder.CreateTorus('court-key',{diameter:9,thickness:.18,tessellation:24},k.scene);key.parent=g;key.position.set(side*(w/2),.14,0);key.scaling.z=.8;key.material=material(k.scene,'#fff2ce');
  const px=side*(w/2+1.2);k.cyl('hoop-pole',px,2.3,0,4.6,.25,'#38515a',.25,g);k.box('hoop-arm',px-side*.7,4.4,0,1.4,.18,.18,'#38515a',0,g);k.box('backboard',px-side*1.4,4.6,0,.15,1.8,2.8,'#fbf6e8',0,g);k.box('backboard-square',px-side*1.48,4.4,0,.05,.6,.9,'#d6402f',0,g);
  const hoop=MeshBuilder.CreateTorus('hoop',{diameter:.95,thickness:.08,tessellation:16},k.scene);hoop.parent=g;hoop.position.set(px-side*2.05,3.85,0);hoop.material=material(k.scene,'#e0612f');
 }
 // Chain-link fence with green posts on the long sides.
 for(const dz of [-d/2-2,d/2+2]){for(let i=0;i<=8;i++)k.cyl('fence-post',-w/2-2+i*(w+4)/8,1.6,dz,3.2,.16,TRIM,.16,g);const mesh=k.box('fence-mesh',0,1.6,dz,w+4,3,.04,'#9fb3b0',0,g);mesh.material=material(k.scene,'#a9bdba',false,.35);}
 return g;
}
export function buildLaSalle(k:Kit,route:Route,battle:boolean){
 const r=rng(2004);
 if(battle){
  // Battle: inside the courts, with the bar and the stands around the walls.
  court(k,-36,0,56,32);court(k,36,0,56,32,0);
  for(const x of [-60,0,60])k.crowd(x,-72,0,16,2.4);for(const x of [-60,0,60])k.crowd(x,72,Math.PI,16,2.4);
  for(const z of [-72,72])k.box('bleacher',0,1.1,z+(z<0?-1:1)*1.2,170,2.2,4,'#c9b48c');
  barKiosk(k,0,96,Math.PI);k.flag(-70,-80,['#1f5fae','#ffffff','#1f5fae']);k.flag(70,-80,['#1f5fae','#ffffff','#1f5fae']);
  for(let i=0;i<10;i++){k.tree(-110+i*24,-100,i%3===0?'malinche':'mango');k.tree(-110+i*24,112,i%2?'mango':'palm');}
  return;
 }
 // ── La entrada: portón verde, pilares y rótulo, con banderas y la portería ──
 const start=sample(route,0),gate=new TransformNode('school-gate',k.scene);gate.parent=k.root;gate.position.set(start.x,0,start.z);gate.rotation.y=start.yaw;
 const half=route.width/2+3.2;
 for(const s of [-1,1]){k.box('gate-pillar',s*half,3.4,0,1.6,6.8,1.6,CREAM,0,gate);k.box('gate-pillar-cap',s*half,6.95,0,2,.4,2,TRIM,0,gate);
  // The two green gate leaves stand open against the wall.
  const leaf=k.box('gate-leaf',s*(half+3.6),2.2,-.9,6,4.2,.18,GATE,0,gate);leaf.rotation.y=s*.12;for(let i=0;i<7;i++)k.box('gate-bar',s*(half+1.1+i*.8),2.2,-.75,.12,4.2,.1,'#245e3c',0,gate);
  k.box('front-wall',s*(half+22),1.5,-.2,32,3,.8,CREAM,0,gate);k.box('front-wall-top',s*(half+22),3.1,-.2,32,.3,1,TRIM,0,gate);}
 k.box('gate-arch',0,7.8,0,half*2+2.4,1.9,1.4,CREAM,0,gate);k.box('gate-arch-trim',0,6.8,0,half*2+2.4,.25,1.5,TRIM,0,gate);
 k.label('COLEGIO LA SALLE',0,7.85,-.75,half*2-2,1.3,Math.PI,'#fff3d0',TRIM,gate);k.label('INDIVISA MANENT',0,7.85,.75,half*2-6,1,0,'#fff3d0',TRIM,gate);
 k.box('guard-booth',-(half+7),1.6,-6,4,3.2,4,CREAM,0,gate);k.box('guard-roof',-(half+7),3.4,-6,5,.4,5,ROOF,0,gate);k.label('PORTERÍA',-(half+7),2.3,-3.95,3,.6,Math.PI,'#fff3d0',TRIM,gate);
 for(const s of [-1,1])k.flag(start.x+s*14,start.z-26,s<0?['#1f5fae','#ffffff','#1f5fae']:['#1a3f7a','#f2d14c','#1a3f7a'],11);
 // ── Edificio principal y capilla, del otro lado de la calle de entrada ──
 block(k,0,-206,150,16,0,{signs:['DIRECCIÓN','SECRETARÍA','PRIMARIA','SECUNDARIA']});
 const chapel=new TransformNode('chapel',k.scene);chapel.parent=k.root;chapel.position.set(-104,0,-204);
 k.box('chapel-nave',0,5,0,18,10,26,'#f4ead0',0,chapel);k.box('chapel-roof',0,10.6,0,19,1.2,27,ROOF,0,chapel);k.box('bell-tower',0,9,14,6,18,6,'#f4ead0',0,chapel);k.box('tower-cap',0,18.6,14,7,1.2,7,ROOF,0,chapel);k.box('cross-v',0,21.3,14,.5,4.2,.5,'#f7f1dc',0,chapel);k.box('cross-h',0,21.9,14,2.4,.5,.5,'#f7f1dc',0,chapel);k.box('chapel-door',0,2.2,13.05+3,2.6,4.4,.1,WOOD,0,chapel);k.label('CAPILLA',0,5.4,17.1,4.5,.9,0,'#fff3d0',TRIM,chapel);
 // Front lawn: palms, benches, sidewalk and the students cheering on the sidewalk.
 const walk=k.box('sidewalk',0,.02,-178,260,.1,7,CONCRETE);walk.material=surfaceTexture(k.scene,'tile',CONCRETE);
 for(let i=0;i<9;i++){k.tree(-120+i*30,-190,'palm',0,.95);if(i%2)k.box('bench',-105+i*30,.55,-182,3,.25,1,WOOD);}
 for(const x of [-70,-30,30,70,110])k.crowd(x,-174.5,0,9);
 // ── Parqueo con el bus escolar, dentro del circuito junto a la recta ──
 const lot=k.box('parking',55,.03,-122,64,.1,22,'#7d8186');lot.material=surfaceTexture(k.scene,'asphalt','#6f747a');
 for(let i=0;i<8;i++)k.box('parking-line',27+i*8,.1,-122,.25,.03,8,'#f1ecd8');
 const bus=new TransformNode('school-bus',k.scene);bus.parent=k.root;bus.position.set(40,0,-115);bus.rotation.y=Math.PI/2;
 k.box('bus-body',0,2.1,0,2.9,2.8,11,'#f2b81f',0,bus);k.box('bus-stripe',0,1.6,0,2.95,.25,11.05,'#1b1b1b',0,bus);k.box('bus-windows',0,2.9,0,2.96,.9,9,'#3e6f80',0,bus);k.box('bus-hood',0,1.35,6.1,2.7,1.5,1.4,'#f2b81f',0,bus);k.label('ESCOLAR',0,2.1,-5.53,2.4,.6,Math.PI,'#1b1b1b','#f2b81f',bus);for(const x of [-1.3,1.3])for(const z of [-3.6,4.2])k.cyl('bus-wheel',x,.55,z,.5,1.1,'#222b33',1.1,bus).rotation.z=Math.PI/2;
 for(let i=0;i<4;i++){const c=k.box('parked-car',63+i*8,.95,-126,2.2,1.4,4.4,['#c23b3b','#e8e4d8','#3866a6','#7c8a92'][i]);c.position.y=.95;k.box('parked-roof',63+i*8,1.95,-126.4,2,.7,2.4,'#2f3f4a');}
 // ── Corredor de aulas: la recta este pasa techada entre dos bloques de dos pisos ──
 const corridor=(d:number)=>sample(route,d);
 for(let d=232;d<=332;d+=6){const p=corridor(d),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);
  for(const s of [-1,1]){k.box('corridor-column',p.x+rx*s*11.4,3.6,p.z+rz*s*11.4,.7,7.2,.7,CREAM,p.yaw);k.box('corridor-rail',p.x+rx*s*11.4,.55,p.z+rz*s*11.4,.25,1.1,6.2,TRIM,p.yaw);}
  k.box('corridor-roof',p.x,7.5,p.z,26,.45,6.3,'#d7c7a2',p.yaw);if(Math.round(d/6)%3===0)k.box('corridor-beam',p.x,7.1,p.z,26,.5,.5,TRIM,p.yaw);
  k.glow('corridor-lamp',p.x,7.18,p.z,1.6,.12,.5,'#fff5cf',p.yaw);
 }
 const mid=corridor(280);
 block(k,mid.x+26,mid.z,110,16,-Math.PI/2,{signs:['5TO AÑO A','5TO AÑO B','4TO AÑO A','LABORATORIO']});
 block(k,mid.x-25,mid.z+2,96,16,Math.PI/2,{signs:['AULA 2004','BIBLIOTECA','3RO AÑO','SALA DE MAESTROS']});
 // Hanging signs over the road inside the corridor.
 for(const [d,text] of [[244,'NO CORRER EN LOS PASILLOS'],[300,'SILENCIO · CLASES EN CURSO']] as [number,string][]){const p=corridor(d);k.box('hanging-chain',p.x,6.6,p.z,.06,1.2,.06,'#555');k.box('hanging-board',p.x,5.8,p.z,9.2,1.4,.15,'#f6ecd0',p.yaw);k.label(text,p.x-Math.sin(p.yaw)*.1,5.8,p.z-Math.cos(p.yaw)*.1,8.8,1.1,p.yaw+Math.PI,'#fff3d0',TRIM);}
 // A classroom you can glimpse: desks and a blackboard behind the inner arcade.
 const room=corridor(270),rx=Math.cos(room.yaw),rz=-Math.sin(room.yaw);
 for(let i=0;i<3;i++)for(let j=0;j<2;j++){const ox=-14.5-j*2.2,oz=(i-1)*2.6;k.box('desk',room.x+rx*ox+Math.sin(room.yaw)*oz,1,room.z+rz*ox+Math.cos(room.yaw)*oz,1.6,.15,1.2,'#b88857',room.yaw);}
 k.box('blackboard',room.x+rx*-16.9,2.5,room.z+rz*-16.9,.12,2,6,'#244f49',room.yaw);
 // ── Las canchas y el bar ──
 court(k,25,79,38,20);court(k,70,79,38,20);
 k.box('bleacher',47,1,96,86,2,4,'#c9b48c');k.box('bleacher-step',47,2.2,98,86,.4,3,'#b39f78');k.crowd(25,98.2,Math.PI,22,2.4);k.crowd(70,98.2,Math.PI,22,2.4);
 barKiosk(k,48,116,Math.PI);
 k.sign('CANCHAS',95,58,-Math.PI*.75,7,1.5);k.sign('EL BAR →',-6,52,Math.PI*.8,7,1.5);
 // A ball that keeps bouncing on the far court.
 const ball=new TransformNode('court-ball',k.scene);ball.parent=k.root;ball.position.set(78,0,82);ball.metadata={animate:true};k.ball('basketball',0,.6,0,1.1,'#e9792d',undefined,ball);
 k.anims.push({node:ball,update:t=>{ball.position.y=Math.abs(Math.sin(t*3.2))*3;ball.position.x=70+Math.sin(t*.7)*14;}});
 // ── Patio central (dentro del circuito): cancha de fútbol, árboles y bancas ──
 const field=k.box('football-field',-20,.03,-55,96,.08,58,'#5f9e45');field.material=surfaceTexture(k.scene,'grass','#5f9e45');
 for(const dz of [-29,29])k.box('field-line',-20,.09,-55+dz,96,.02,.25,'#f3f3e6');for(const dx of [-48,0,48])k.box('field-line',-20+dx,.09,-55,.25,.02,58,'#f3f3e6');
 for(const s of [-1,1]){const gx=-20+s*48;k.box('goal-post',gx,1.2,-55-3.6,.18,2.4,.18,'#f6f6f0');k.box('goal-post',gx,1.2,-55+3.6,.18,2.4,.18,'#f6f6f0');k.box('goal-bar',gx,2.4,-55,.18,.18,7.4,'#f6f6f0');}
 for(let i=0;i<14;i++){const a=i/14*Math.PI*2;k.tree(-20+Math.cos(a)*64+r()*4,-55+Math.sin(a)*40+r()*4,i%4===0?'malinche':i%4===1?'ceiba':'mango',0,.9+r()*.3);}
 // ── Oeste: gimnasio y biblioteca; norte: el viejo edificio con el nombre ──
 block(k,-212,-30,70,16,Math.PI/2,{color:'#e9d8b0',signs:['GIMNASIO','BIBLIOTECA']});
 block(k,-110,124,74,18,Math.PI,{floors:3,color:'#ecd9a8',signs:['LA SALLE','FUNDADO EN 1913']});
 // Ramp at the north-west bend: wooden planks, arrows and people on the wall.
 const ramp=sample(route,route.length*.68);k.sign('¡SALTO!',ramp.x-Math.sin(ramp.yaw)*14+Math.cos(ramp.yaw)*12,ramp.z-Math.cos(ramp.yaw)*14-Math.sin(ramp.yaw)*12,ramp.yaw+Math.PI,6,1.6);
 // Trees along the outside of the circuit.
 for(let d=20;d<route.length;d+=26){const p=sample(route,d);if(d>220&&d<345)continue;if(Math.abs(p.z+158)<14&&d<130)continue;for(const s of [-1,1]){if(r()<.35)continue;const off=19+r()*10;const x=p.x+Math.cos(p.yaw)*off*s,z=p.z-Math.sin(p.yaw)*off*s;if(Math.hypot(x-47,z-86)<34||Math.hypot(x+20,z+55)<52||(z<-170&&z>-215))continue;k.tree(x,z,r()<.2?'malinche':r()<.5?'mango':'bush',0,.8+r()*.4);}}
 k.box('lawn-path',-20,.04,-100,4,.06,30,CONCRETE);
}
function barKiosk(k:Kit,x:number,z:number,yaw:number){
 const g=new TransformNode('el-bar',k.scene);g.parent=k.root;g.position.set(x,0,z);g.rotation.y=yaw;
 k.box('bar-body',0,1.8,0,22,3.6,7,'#f0c95a',0,g);k.box('bar-counter',0,1.15,-3.9,22,1,1.2,'#a8673d',0,g);k.box('bar-awning',0,3.9,-4.6,24,.25,4,'#c8432f',0,g);
 for(let i=0;i<8;i++)k.box('awning-stripe',-10.5+i*3,3.94,-4.6,1.4,.27,4.05,'#f6efe1',0,g);
 k.box('bar-roof',0,3.85,0,23,.4,8,ROOF,0,g);k.label('EL BAR',0,5.1,-3.6,8,1.6,Math.PI,'#fff3d0','#c8432f',g);k.box('bar-sign-back',0,5.1,-3.5,8.4,2,.2,'#f6efe1',0,g);
 k.label('RASPADOS · ENCHILADAS · GASEOSA C$5 · VIGORÓN',0,2.9,-3.48,18,.7,Math.PI,'#2b3a2c','#fff3d0',g);
 for(let i=0;i<5;i++){const tx=-9+i*4.5;k.cyl('bar-table',tx,.75,-9,1.5,1.6,'#b28d54',1.6,g).scaling.y=.08;k.cyl('table-leg',tx,.4,-9,.8,.15,'#555',.15,g);k.cyl('umbrella-pole',tx,1.6,-9,3.2,.1,'#ddd',.1,g);k.cyl('umbrella',tx,3.1,-9,.5,3.6,i%2?'#2f7a4e':'#c8432f',.2,g);for(const s of [-1,1])k.box('bar-stool',tx+s*1.2,.5,-9,.6,.15,.6,'#d6724a',0,g);}
 for(let i=0;i<6;i++)k.box('bar-shelf-item',-8+i*3.2,1.95,-4.1,.5,.8,.4,['#d23b3b','#2e8b57','#f2c14e','#3a6db5','#fff','#7a3d9b'][i],0,g);
 return g;
}
export {Vector3};
