import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { sample, type Route } from '../../../shared/track';
import { material, torus } from '../models';
import { Kit, rng } from './kit';

/*
 * Las Isletas and El Play Land Park: roadside dressing. Like the other worlds, everything static is merged by
 * material after it is built; what moves (boats, the big wheel, the carousel) hangs from a node marked `animate`.
 */
const beside=(route:Route,d:number,offset:number)=>{const p=sample(route,d);return{x:p.x+Math.cos(p.yaw)*offset,y:p.y,z:p.z-Math.sin(p.yaw)*offset,yaw:p.yaw};};
/** Sections where dressing would float or get in the way: bridges, the big jump and its gap, loops. */
function special(route:Route,d:number,pad=10){const c=route.course;return c.bridges.some(([a,b])=>d>a-pad&&d<b+pad)||c.gaps.some(g=>g.lane===''&&d>g.from-pad-4&&d<g.to+pad+4)||c.ramps.some(r=>r.lane===''&&r.big&&d>r.at-pad&&d<r.at+r.len+pad)||c.stunts.some(s=>d>s.from-pad-8&&d<s.to+pad+8);}

/* Las Isletas de Granada — islets of volcanic rock and jungle on the lake, ranchos, lanchas and the Mombacho behind. */
export function dressIsletas(k:Kit,route:Route){
 const r=rng(1524),greens=['#5a9a48','#4f8f42','#679f50'];
 const islet=(x:number,z:number,rad:number,trees:number,hut:boolean)=>{
  k.cyl('isleta-arena',x,-.52,z,.5,rad*2+5,'#d9c79a',rad*2+3,undefined,20);k.cyl('isleta',x,-.42,z,.5,rad*2,greens[Math.floor(r()*3)],rad*2-2,undefined,20);
  for(let i=0;i<5;i++){const a=r()*6.28,s=1.4+r()*2.2;if(k.blocked(x+Math.cos(a)*(rad+1),z+Math.sin(a)*(rad+1),3))continue;k.ball('isleta-roca',x+Math.cos(a)*(rad+1),-.1,z+Math.sin(a)*(rad+1),s,i%2?'#5f6a6c':'#737d7c',new Vector3(1.2,.6,1));}
  for(let i=0;i<trees;i++){const a=r()*6.28,d=r()*(rad-4),tx=x+Math.cos(a)*d,tz=z+Math.sin(a)*d;if(k.blocked(tx,tz,5))continue;const kind=r()<.45?'palm':r()<.6?'mango':r()<.5?'ceiba':'bush';k.tree(tx,tz,kind,-.15,.8+r()*.35);}
  if(hut){const a=r()*6.28,hx=x+Math.cos(a)*rad*.45,hz=z+Math.sin(a)*rad*.45;if(!k.blocked(hx,hz,7)){for(const sx of [-1,1])for(const sz of [-1,1])k.cyl('rancho-poste',hx+sx*2.2,1.2,hz+sz*2.2,2.8,.22,'#7a5a3a');k.cyl('rancho-techo',hx,3.6,hz,2.4,8,'#b89a5a',.4,undefined,8);k.box('rancho-mesa',hx,.8,hz,2.4,.14,1.2,'#8a6a45');}}
 };
 // The islets the road crosses: land on both sides of every stretch that is not a bridge.
 for(let d=6;d<route.length;d+=30){if(special(route,d,6))continue;const q=sample(route,d);if(q.y>1.2)continue;
  for(const side of [-1,1]){const rad=13+r()*9,p=beside(route,d,(route.width*.5+rad*.55)*side);islet(p.x,p.z,rad,2+Math.floor(r()*3),r()<.3);}}
 // Loose islets all over the lake, inside the loop and around it.
 for(let i=0;i<46;i++){const x=(r()-.5)*560,z=(r()-.5)*560,rad=7+r()*13;if(k.blocked(x,z,rad+16))continue;islet(x,z,rad,1+Math.floor(r()*4),r()<.25);}
 // Lanchas and pangas bobbing between the islets.
 for(let i=0;i<12;i++){const x=(r()-.5)*460,z=(r()-.5)*460;if(k.blocked(x,z,18))continue;const g=new TransformNode('lancha',k.scene);g.parent=k.root;g.position.set(x,-.15,z);g.rotation.y=r()*6.28;g.metadata={animate:true};
  const paint=['#2f8fd0','#d9473b','#f2b81f','#39a66a'][i%4];k.box('hull',0,.45,0,2.2,.9,6.4,'#f4f0e4',0,g);k.box('hull-stripe',0,.78,0,2.25,.22,6.45,paint,0,g);if(i%2){for(const sx of [-1,1])for(const sz of [-1.8,1.8])k.cyl('post',sx*.95,1.7,sz,1.7,.09,'#e9e4d6',.09,g);k.box('canopy',0,2.6,0,2.4,.1,4.6,paint,0,g);}
  k.anims.push({node:g,update:t=>{g.position.y=-.15+Math.sin(t*1.2+i)*.16;g.rotation.z=Math.sin(t*1.05+i*2)*.06;}});}
 // The Mombacho volcano behind the lake (Blender «cerro», stretched tall and dark green).
 k.prop('cerro',-410,-.5,360,.6,[5,5.5,5],g=>{k.ball('mombacho',0,6,0,90,'#5d9160',new Vector3(1,.5,1),g);},'#5d9160');
 k.sign('GRANADA · LAS ISLETAS',14,-176,Math.PI,12,1.8,3.4,'#fff3d0','#1f6f8f');
}

/* El Play Land Park — the fair: the big wheel and the carousel turning, striped tents, bulbs, balloons and stalls. */
export function dressPlayland(k:Kit,route:Route){
 const s=k.scene,r=rng(2001),bulbs=['#ffd33d','#ff5fa2','#45e0ff','#7dff6a','#ff8a3d'],lit=(c:string)=>material(s,c,true);
 // Rueda de Chicago: ring, spokes and round gondolas with a bulb each, turning slowly inside the loop.
 {const cx=10,cz=-15,R=27,hub=31;for(const sx of [-1,1]){const leg=k.box('rueda-pata',cx+sx*9,hub/2,cz,1.2,hub+2,1.2,'#e9e4d6');leg.rotation.z=sx*.29;}k.box('rueda-base',cx,.5,cz,26,1,7,'#5b4a7a');
  const g=new TransformNode('rueda',s);g.parent=k.root;g.position.set(cx,hub,cz);g.metadata={animate:true};
  for(const dz of [-1.1,1.1]){const ring=torus(s,g,'rueda-aro',0,0,dz,R*2,.55,'#f2efe6');ring.rotation.x=Math.PI/2;}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,spoke=k.box('rueda-rayo',Math.cos(a)*R/2,Math.sin(a)*R/2,0,R,.28,.28,'#d7d2c4',0,g);spoke.rotation.z=a;
   k.ball('rueda-gondola',Math.cos(a)*R,Math.sin(a)*R,0,4.2,['#e53b6e','#ffd33d','#3fb6e0','#7dd957'][i%4],new Vector3(1,.9,1),g);k.ball('rueda-foco',Math.cos(a+.26)*R,Math.sin(a+.26)*R,0,1,bulbs[i%5],undefined,g).material=lit(bulbs[i%5]);}
  k.ball('rueda-eje',0,0,0,3.4,'#ffd33d',undefined,g).material=lit('#ffd33d');k.anims.push({node:g,update:t=>{g.rotation.z=t*.22;}});
  k.sign('RUEDA DE CHICAGO',cx,cz+9,0,14,2,2.2,'#fff3d0','#7a2f8f');}
 // Carousel: striped roof, poles and horses going round.
 for(const [cx,cz,dir] of [[78,-62,1],[-70,-48,-1]] as const){k.cyl('carrusel-base',cx,.4,cz,.8,15,'#e9c25a');k.cyl('carrusel-eje',cx,3,cz,5.2,1.4,'#f2efe6');
  const g=new TransformNode('carrusel',s);g.parent=k.root;g.position.set(cx,0,cz);g.metadata={animate:true};
  k.cyl('carrusel-techo',0,6.6,0,2.6,16.5,'#e53b6e',1,g,12);k.cyl('carrusel-falda',0,5.2,0,.5,16.5,'#fff3d0',16.5,g,12);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,x=Math.cos(a)*5.6,z=Math.sin(a)*5.6;k.cyl('carrusel-poste',x,3,z,4.6,.12,'#ffd33d',.12,g);const horse=k.box('carrusel-caballo',x,1.7+(i%2)*.5,z,.6,.9,1.8,['#f2efe6','#3fb6e0','#ffd33d','#ff8a3d'][i%4],0,g);horse.rotation.y=-a;}
  k.anims.push({node:g,update:t=>{g.rotation.y=t*.5*dir;}});}
 // Along the course: striped tents, stalls with their bulbs, lamp posts and bunches of balloons.
 const stalls=['ALGODÓN DE AZÚCAR','ELOTES LOCOS','RASPADOS','TIRO AL BLANCO','CHURROS','PESCA MILAGROSA','MANZANAS ACARAMELADAS','BOLETERÍA'];let n=0;
 for(let d=14;d<route.length;d+=26){if(special(route,d))continue;
  for(const side of [-1,1]){if(r()<.25)continue;const p=beside(route,d,(route.width*.72+8+r()*5)*side);if(k.blocked(p.x,p.z,5.5)||sample(route,d).y>1.5)continue;
   const yaw=side>0?p.yaw-Math.PI/2:p.yaw+Math.PI/2,tent=n++%3!==2,a=['#e53b3b','#3f7fe0','#f2b81f','#39a66a'][n%4];
   if(tent){k.cyl('carpa-falda',p.x,p.y+1.5,p.z,3,8,'#fff3d0',8,undefined,10);k.cyl('carpa-techo',p.x,p.y+4.6,p.z,3.2,9,a,.5,undefined,10);k.ball('carpa-punta',p.x,p.y+6.5,p.z,.8,'#ffd33d').material=lit('#ffd33d');}
   else{k.box('puesto',p.x,p.y+1.2,p.z,6.5,2.4,3.4,'#fff3d0',yaw);k.box('puesto-toldo',p.x,p.y+3.1,p.z,7.4,.3,4.6,a,yaw);k.label(stalls[n%stalls.length],p.x+Math.sin(yaw)*2.34,p.y+3.1,p.z+Math.cos(yaw)*2.34,6.4,.7,yaw,'#fff3d0','#7a2f8f');
    for(let i=0;i<5;i++){const o=(i-2)*1.5;k.ball('puesto-foco',p.x+Math.cos(yaw)*o+Math.sin(yaw)*2.3,p.y+2.6,p.z-Math.sin(yaw)*o+Math.cos(yaw)*2.3,.42,bulbs[i]).material=lit(bulbs[i]);}}
   if(r()<.5){const bx=p.x+(r()-.5)*7,bz=p.z+(r()-.5)*7;if(!k.blocked(bx,bz,3)){k.cyl('globos-hilo',bx,p.y+2.2,bz,4.4,.05,'#e9e4d6');for(let i=0;i<4;i++)k.ball('globo',bx+(i%2-.5)*1,p.y+4.6+i*.55,bz+(i>1?.5:-.5),1.25,bulbs[(i+n)%5],new Vector3(1,1.2,1));}}
  }
  const lamp=beside(route,d+13,route.width*.72+1.6);if(!special(route,d+13)&&!k.onLane(lamp.x,lamp.z,2))k.prop('poste',lamp.x,lamp.y,lamp.z,lamp.yaw,1,g=>{k.cyl('lamp-post',0,3.6,0,7.2,.22,'#4c5a63',undefined,g);k.glow('lamp-head',-1.2,7.1,0,1.6,.25,.6,'#fff2c2',0,g);});
 }
 k.sign('🎟 BIENVENIDOS AL PLAY LAND PARK',-30,-172,Math.PI,18,2,3.4,'#fff3d0','#e0509a');
}
