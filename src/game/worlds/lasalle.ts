import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { sample, sampleLane, type Route } from '../../../shared/track';
import type { Lane } from '../../../shared/course';
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
 // Blender modules (props.ts): one 12.6 m module per three bays, stretched to the block's length and depth, a floor
 // at a time, with its tiled roof on top. The code version below is drawn until they arrive.
 const n=Math.max(1,Math.round(w/12.6)),sx=w/(n*12.6),sz=d/16,cos=Math.cos(face),sin=Math.sin(face);
 for(let i=0;i<n;i++){const lx=-w/2+(i+.5)*w/n,wx=x+lx*cos,wz=z-lx*sin;for(let f=0;f<floors;f++)k.prop(f?'aula-pa':'aula-pb',wx,f*4.2,wz,face,[sx,1,sz],()=>{});k.prop('aula-techo',wx,floors*4.2,wz,face,[sx,1,sz],()=>{});}
 const c=new TransformNode('aula-block-code',k.scene);c.parent=k.propFallback('aula-pb');c.position.set(x,0,z);c.rotation.y=face;
 k.box('block-body',0,h/2,0,w,h,d,color,0,c);k.box('block-roof',0,h+.35,0,w+1.4,.7,d+1.4,ROOF,0,c);k.box('block-base',0,.35,d/2+.05,w+.1,.7,.15,'#a99a7c',0,c);
 for(let f=0;f<floors;f++){
  const y=f*4.2;
  if(f>0){k.box('balcony-slab',0,y+.1,d/2+1.1,w,.2,2.2,CONCRETE,0,c);k.box('balcony-rail',0,y+1.1,d/2+2.15,w,.1,.1,TRIM,0,c);for(let i=0;i<=w/2.4;i++)k.box('rail-bar',-w/2+i*2.4,y+.6,d/2+2.15,.08,1,.08,TRIM,0,c);}
  for(let i=0;i<Math.floor(w/4.2);i++){const wx=-w/2+2.6+i*4.2;if(i%3===1){k.box('door',wx,y+1.3,d/2+.03,1.4,2.6,.08,WOOD,0,c);k.box('door-frame',wx,y+2.7,d/2+.05,1.7,.18,.08,TRIM,0,c);}else{k.box('window',wx,y+2.2,d/2+.03,2.4,1.6,.08,WINDOW,0,c);k.box('window-sill',wx,y+1.35,d/2+.08,2.6,.12,.18,CREAM,0,c);k.box('window-bar',wx,y+2.2,d/2+.08,.07,1.6,.05,CREAM,0,c);}}
 }
 // Arcade columns along the front, the classic covered walkway.
 for(let i=0;i<=Math.floor(w/4.2);i++)k.box('column',-w/2+.4+i*4.2*(w-.8)/(Math.floor(w/4.2)*4.2),2.1,d/2+2.1,.55,4.2,.55,CREAM,0,c);
 k.box('walkway-roof',0,4.3,d/2+1.1,w,.25,2.4,CREAM,0,c);
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
 // Pillars, arch, gate leaves, walls and the guard booth: Blender model «porton-lasalle» (made for this 15 m road).
 k.prop('porton-lasalle',start.x,0,start.z,start.yaw,1,pg=>{
 for(const s of [-1,1]){k.box('gate-pillar',s*half,3.4,0,1.6,6.8,1.6,CREAM,0,pg);k.box('gate-pillar-cap',s*half,6.95,0,2,.4,2,TRIM,0,pg);
  // The two green gate leaves stand open against the wall.
  const leaf=k.box('gate-leaf',s*(half+3.6),2.2,-.9,6,4.2,.18,GATE,0,pg);leaf.rotation.y=s*.12;for(let i=0;i<7;i++)k.box('gate-bar',s*(half+1.1+i*.8),2.2,-.75,.12,4.2,.1,'#245e3c',0,pg);
  k.box('front-wall',s*(half+22),1.5,-.2,32,3,.8,CREAM,0,pg);k.box('front-wall-top',s*(half+22),3.1,-.2,32,.3,1,TRIM,0,pg);}
 k.box('gate-arch',0,7.8,0,half*2+2.4,1.9,1.4,CREAM,0,pg);k.box('gate-arch-trim',0,6.8,0,half*2+2.4,.25,1.5,TRIM,0,pg);
 });
 k.label('COLEGIO LA SALLE',0,7.85,-.75,half*2-2,1.3,Math.PI,'#fff3d0',TRIM,gate);k.label('INDIVISA MANENT',0,7.85,.75,half*2-6,1,0,'#fff3d0',TRIM,gate);
 {const pg=new TransformNode('booth-code',k.scene);pg.parent=k.propFallback('porton-lasalle');pg.position.set(start.x,0,start.z);pg.rotation.y=start.yaw;k.box('guard-booth',-(half+7),1.6,-6,4,3.2,4,CREAM,0,pg);k.box('guard-roof',-(half+7),3.4,-6,5,.4,5,ROOF,0,pg);}k.label('PORTERÍA',-(half+7),2.3,-3.95,3,.6,Math.PI,'#fff3d0',TRIM,gate);
 for(const s of [-1,1])k.flag(start.x+s*14,start.z-26,s<0?['#1f5fae','#ffffff','#1f5fae']:['#1a3f7a','#f2d14c','#1a3f7a'],11);
 // ── Edificio principal y capilla, del otro lado de la calle de entrada ──
 block(k,0,-206,150,16,0,{signs:['DIRECCIÓN','SECRETARÍA','PRIMARIA','SECUNDARIA']});
 k.prop('capilla',-104,0,-204,0,1,chapel=>{
 k.box('chapel-nave',0,5,0,18,10,26,'#f4ead0',0,chapel);k.box('chapel-roof',0,10.6,0,19,1.2,27,ROOF,0,chapel);k.box('bell-tower',0,9,14,6,18,6,'#f4ead0',0,chapel);k.box('tower-cap',0,18.6,14,7,1.2,7,ROOF,0,chapel);k.box('cross-v',0,21.3,14,.5,4.2,.5,'#f7f1dc',0,chapel);k.box('cross-h',0,21.9,14,2.4,.5,.5,'#f7f1dc',0,chapel);k.box('chapel-door',0,2.2,13.05+3,2.6,4.4,.1,WOOD,0,chapel);});k.label('CAPILLA',-104,7.4,-204+17.1,4.5,.9,0,'#fff3d0',TRIM);
 // Front lawn: palms, benches, sidewalk and the students cheering on the sidewalk.
 const walk=k.box('sidewalk',0,.02,-178,260,.1,7,CONCRETE);walk.material=surfaceTexture(k.scene,'tile',CONCRETE);
 for(let i=0;i<9;i++){k.tree(-120+i*30,-190,'palm',0,.95);if(i%2)k.box('bench',-105+i*30,.55,-182,3,.25,1,WOOD);}
 for(const x of [-70,-30,30,70,110])k.crowd(x,-174.5,0,9);
 // ── Parqueo con el bus escolar, dentro del circuito junto a la recta ──
 const lot=k.box('parking',55,.03,-122,64,.1,22,'#7d8186');lot.material=surfaceTexture(k.scene,'asphalt','#6f747a');
 for(let i=0;i<8;i++)k.box('parking-line',27+i*8,.1,-122,.25,.03,8,'#f1ecd8');
 k.prop('bus-escolar',40,0,-115,Math.PI/2,1,bus=>{
 k.box('bus-body',0,2.1,0,2.9,2.8,11,'#f2b81f',0,bus);k.box('bus-stripe',0,1.6,0,2.95,.25,11.05,'#1b1b1b',0,bus);k.box('bus-windows',0,2.9,0,2.96,.9,9,'#3e6f80',0,bus);k.box('bus-hood',0,1.35,6.1,2.7,1.5,1.4,'#f2b81f',0,bus);for(const x of [-1.3,1.3])for(const z of [-3.6,4.2])k.cyl('bus-wheel',x,.55,z,.5,1.1,'#222b33',1.1,bus).rotation.z=Math.PI/2;});k.label('ESCOLAR',34.47,2.1,-115,2.4,.6,-Math.PI/2,'#1b1b1b','#f2b81f');
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
 // ── Las canchas (ruta alterna desde la 2.ª vuelta) y el bar ──
 const lane=route.lanes.find(l=>l.id==='canchas');
 if(lane){
  // Hoops stand exactly where the shared hazards put their poles; the courts are the lane itself.
  for(const f of [.12,.84]){const p=sampleLane(lane,f*lane.length),side=f<.5?1:-1,dir=f<.5?-1:1,x=p.x+Math.cos(p.yaw)*3*side,z=p.z-Math.sin(p.yaw)*3*side;
   k.cyl('hoop-pole',x,p.y+2.3,z,4.6,.3,'#38515a',.3);k.box('hoop-arm',x-Math.sin(p.yaw)*.7*dir,p.y+4.5,z-Math.cos(p.yaw)*.7*dir,.18,.18,1.4,'#38515a',p.yaw);
   const bx=x-Math.sin(p.yaw)*1.4*dir,bz=z-Math.cos(p.yaw)*1.4*dir;k.box('backboard',bx,p.y+4.6,bz,2.8,1.8,.15,'#fbf6e8',p.yaw);k.box('backboard-square',bx,p.y+4.4,bz,.9,.6,.18,'#d6402f',p.yaw);
   const hoop=MeshBuilder.CreateTorus('hoop',{diameter:.95,thickness:.08,tessellation:16},k.scene);hoop.parent=k.root;hoop.position.set(bx-Math.sin(p.yaw)*.6*dir,p.y+3.9,bz-Math.cos(p.yaw)*.6*dir);hoop.material=material(k.scene,'#e0612f');}
  // Bleachers on the north side, fans facing the courts, the water ditch sign.
  const mid=sampleLane(lane,lane.length*.5);k.box('bleacher',mid.x,1,mid.z+15,110,2,4,'#c9b48c');k.box('bleacher-step',mid.x,2.2,mid.z+17,110,.4,3,'#b39f78');for(const dx of [-36,0,36])k.crowd(mid.x+dx,mid.z+17.2,Math.PI,16,2.4);
  k.sign('¡ZANJA! SALTA O AL AGUA',mid.x+6,mid.z-9,Math.PI*.5,7,1.2,3.2,'#13234d','#ffd33d');
  // The courts gate: closed on lap one, open from lap two (the renderer swings it per player).
  const entry=sampleLane(lane,6),gate=new TransformNode('courts-gate',k.scene);gate.parent=k.root;gate.position.set(entry.x,entry.y,entry.z);gate.rotation.y=entry.yaw;gate.metadata={animate:true};
  for(const s of [-1,1]){k.box('courts-gate-leaf',s*lane.width/4,1.6,0,lane.width/2,3.2,.2,GATE,0,gate);for(let i=0;i<5;i++)k.box('courts-gate-bar',s*(i+.5)*lane.width/10,1.6,.12,.1,3.2,.1,'#245e3c',0,gate);}
  k.label('CERRADO · ABRE EN LA 2.ª VUELTA',0,2,-.2,lane.width-.4,.8,0,'#fff3d0','#c8432f',gate);
  k.gates.push({node:gate,lane:'canchas',laps:[1,2]});
  for(const s of [-1,1]){const qx=entry.x+Math.cos(entry.yaw)*(lane.width/2+.6)*s,qz=entry.z-Math.sin(entry.yaw)*(lane.width/2+.6)*s;k.box('courts-gate-pillar',qx,entry.y+2,qz,.9,4,.9,CREAM,entry.yaw);}
 }
 barKiosk(k,48,116,Math.PI);
 k.sign('EL BAR →',-6,52,Math.PI*.8,7,1.5);
 // ── La cancha de fútbol: el atajo cruza la cancha de portería a portería ──
 const pitchLane=route.lanes.find(l=>l.id==='futbol');
 if(pitchLane)footballPitch(k,pitchLane);
 for(let i=0;i<10;i++){const a=i/10*Math.PI*2,tx=-20+Math.cos(a)*40+r()*4,tz=-45+Math.sin(a)*26+r()*4;if(k.blocked(tx,tz,3))continue;k.tree(tx,tz,i%4===0?'malinche':i%4===1?'ceiba':'mango',0,.9+r()*.3);}
 // ── La cafetería: la señora tira quesillos a la calle (turbo para quien lo agarre) ──
 const treat=route.course.treats[0];if(treat)cafeteria(k,route,treat.at,treat.side);
 // ── Oeste: gimnasio y biblioteca; norte: el viejo edificio con el nombre ──
 block(k,-212,-30,70,16,Math.PI/2,{color:'#e9d8b0',signs:['GIMNASIO','BIBLIOTECA']});
 block(k,-110,124,74,18,Math.PI,{floors:3,color:'#ecd9a8',signs:['LA SALLE','FUNDADO EN 1913']});
 // Ramp at the north-west bend: wooden planks, arrows and people on the wall.
 const ramp=sample(route,route.length*.68);k.sign('¡SALTO!',ramp.x-Math.sin(ramp.yaw)*14+Math.cos(ramp.yaw)*12,ramp.z-Math.cos(ramp.yaw)*14-Math.sin(ramp.yaw)*12,ramp.yaw+Math.PI,6,1.6);
 // Trees along the outside of the circuit.
 for(let d=20;d<route.length;d+=26){const p=sample(route,d);if(d>220&&d<345)continue;if(Math.abs(p.z+158)<14&&d<130)continue;for(const s of [-1,1]){if(r()<.35)continue;const off=19+r()*10;const x=p.x+Math.cos(p.yaw)*off*s,z=p.z-Math.sin(p.yaw)*off*s;if(Math.hypot(x-47,z-86)<34||Math.hypot(x+95,z+112)<46||(z<-170&&z>-215)||k.blocked(x,z,3))continue;k.tree(x,z,r()<.2?'malinche':r()<.5?'mango':'bush',0,.8+r()*.4);}}
 k.box('lawn-path',-20,.04,-100,4,.06,30,CONCRETE);
}
/** Full-size pitch laid along the shortcut lane, with both goals spanning the lane: you drive through them. */
function footballPitch(k:Kit,lane:Lane){
 const a=sampleLane(lane,lane.length*.24),b=sampleLane(lane,lane.length*.78),cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,yaw=Math.atan2(b.x-a.x,b.z-a.z),len=Math.hypot(b.x-a.x,b.z-a.z),wid=42;
 const g=new TransformNode('football-pitch',k.scene);g.parent=k.root;g.position.set(cx,0,cz);g.rotation.y=yaw;
 for(let i=0;i<8;i++){const stripe=k.box('pitch-stripe',0,.03,-len/2+len/16+i*len/8,wid,.06,len/8,i%2?'#4f9a3c':'#5fae45',0,g);stripe.material=surfaceTexture(k.scene,'grass',i%2?'#4f9a3c':'#5fae45');}
 const line=(x:number,z:number,w:number,d:number)=>k.box('pitch-line',x,.09,z,w,.02,d,'#f6f6ee',0,g);
 for(const s of [-1,1]){line(s*wid/2,0,.3,len);line(0,s*len/2,wid,.3);line(0,s*(len/2-8),18,.3);for(const x of [-9,9])line(x,s*(len/2-4),.3,8);}
 line(0,0,wid,.3);const circle=MeshBuilder.CreateTorus('pitch-circle',{diameter:14,thickness:.3,tessellation:36},k.scene);circle.parent=g;circle.position.y=.09;circle.scaling.y=.05;circle.material=material(k.scene,'#f6f6ee');
 // Goals at both ends, posts just outside the lane so the whole road goes under the crossbar. Nets in white mesh.
 for(const s of [-1,1]){const z=s*len/2;for(const x of [-7.8,7.8])k.cyl('goal-post',x,2.6,z,5.2,.35,'#ffffff',.35,g);k.box('goal-bar',0,5.2,z,15.9,.35,.35,'#ffffff',0,g);
  const net=k.box('goal-net',0,2.6,z+s*2.2,15.6,5,.05,'#ffffff',0,g);net.material=material(k.scene,'#ffffff',false,.35);for(const x of [-7.8,7.8]){const side=k.box('goal-net-side',x,2.6,z+s*1.1,.05,5,2.2,'#ffffff',0,g);side.material=net.material;}
  for(const x of [-wid/2,wid/2]){k.cyl('corner-flag-pole',x,.8,z,1.6,.06,'#ffffff',.06,g);k.box('corner-flag',x+.25,1.45,z,.5,.35,.03,'#ffd33d',0,g);}}
 // Stands with the school watching the shortcut and a scoreboard.
 k.box('pitch-stand',wid/2+6,1.1,0,4,2.2,len*.7,'#c9b48c',0,g);k.box('pitch-stand-step',wid/2+8,2.4,0,3,.5,len*.7,'#b39f78',0,g);
 const r=rng(91);for(let i=0;i<4;i++){const z=-len*.3+i*len*.2,lx=wid/2+8.2,wx=cx+Math.cos(yaw)*lx+Math.sin(yaw)*z,wz=cz-Math.sin(yaw)*lx+Math.cos(yaw)*z;k.crowd(wx,wz,yaw-Math.PI/2,7,2.6,1.1);}void r;
 const board=new TransformNode('scoreboard',k.scene);board.parent=g;board.position.set(-wid/2-5,0,0);board.rotation.y=Math.PI/2;
 for(const x of [-3,3])k.cyl('score-post',x,2.5,0,5,.3,'#555',.3,board);k.box('score-board',0,5.8,0,8,2.8,.3,'#1b2a2a',0,board);k.label('LA SALLE 2 · 1 VISITA',0,5.8,-.17,7.4,1.2,Math.PI,'#ffd33d','#1b2a2a',board);
}
/** The cafeteria by the road: counter, menu, tables and the lady who tosses quesillos onto the street. */
function cafeteria(k:Kit,route:Route,at:number,side:number){
 const p=sample(route,at),off=side*(route.width*.72+7.5),x=p.x+Math.cos(p.yaw)*off,z=p.z-Math.sin(p.yaw)*off,yaw=p.yaw+(side>0?-Math.PI/2:Math.PI/2);
 const g=new TransformNode('cafeteria',k.scene);g.parent=k.root;g.position.set(x,p.y,z);g.rotation.y=yaw;
 k.box('cafe-body',0,2,-2,16,4,6,'#f3e2b0',0,g);k.box('cafe-roof',0,4.25,-1,17.5,.5,8.5,ROOF,0,g);k.box('cafe-counter',0,.6,1.4,14,1.2,1.2,'#b9773f',0,g);k.box('cafe-counter-top',0,1.25,1.4,14.4,.12,1.5,'#e8d2a6',0,g);
 for(let i=0;i<9;i++)k.box('cafe-awning',-7.2+i*1.8,3.75,2.6,1.8,.2,3,i%2?'#f6efe1':'#2f7a4e',0,g);
 k.label('CAFETERÍA',0,5.3,3.1,9,1.5,0,'#fff3d0','#2f7a4e',g);k.box('cafe-sign-back',0,5.3,3,9.4,1.9,.15,'#f6efe1',0,g);
 k.label('QUESILLOS · VIGORÓN · ENCHILADAS · GASEOSA',0,3.1,1.02,12,.6,0,'#2b3a2c','#fff3d0',g);
 for(let i=0;i<4;i++)k.box('cafe-jar',-5+i*1.4,1.6,1.4,.8,.6,.8,['#f2c14e','#d23b3b','#fff4e0','#7cc36b'][i],0,g);
 for(let i=0;i<3;i++){const tx=-5+i*5;k.cyl('cafe-table',tx,.75,-7.5,.12,2,'#c49a62',2,g);k.cyl('cafe-table-leg',tx,.4,-7.5,.8,.15,'#555',.15,g);}
 // La señora: apron, hairnet, and the throwing arm the renderer swings with every quesillo.
 const lady=new TransformNode('senora',k.scene);lady.parent=g;lady.position.set(2.5,0,.2);
 k.cyl('senora-skirt',0,.65,0,1.3,1.1,'#5a6fb0',.8,lady);k.cyl('senora-body',0,1.55,0,.9,.8,'#e85a6a',.7,lady);k.box('senora-apron',0,1.2,.38,.75,1.2,.06,'#ffffff',0,lady);
 k.ball('senora-head',0,2.3,0,.66,'#b77d58',undefined,lady);k.ball('senora-hair',0,2.45,-.08,.7,'#2b2018',new Vector3(1,.75,1),lady);k.ball('senora-net',0,2.55,0,.62,'#e9e2d0',new Vector3(1,.45,1),lady);
 const arm=new TransformNode('senora-arm',k.scene);arm.parent=lady;arm.position.set(.45,1.85,0);arm.metadata={animate:true};k.cyl('senora-arm-mesh',0,-.35,0,.75,.18,'#b77d58',.16,arm);k.cyl('senora-arm-other',-.9,1.5,0,.75,.18,'#b77d58',.16,lady);
 k.crowd(x+Math.sin(yaw)*-9.5,z+Math.cos(yaw)*-9.5,yaw,5,p.y,1.2);
 const ahead=sample(route,at-route.length*.06),q={x:ahead.x+Math.cos(ahead.yaw)*side*(route.width*.72+2.5),z:ahead.z-Math.sin(ahead.yaw)*side*(route.width*.72+2.5)};
 k.sign('¡QUESILLO GRATIS! → TURBO',q.x,q.z,ahead.yaw+Math.PI,8,1.4,ahead.y+3,'#13234d','#ffd33d');
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
