import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { sample, sampleLane, type Route } from '../../../shared/track';
import { material } from '../models';
import { Kit, rng } from './kit';

/*
 * Hipa Hipa — inspirada en la discoteca Ipa Ipa: barras a los lados de la pista, la pista de baile con su palmera gigante
 * en el centro (la carrera le da una vuelta completa subiendo en espiral), la piscina VIP que se salta y el DJ en la salida.
 */
const NEON=['#ff5fb0','#45e0ff','#ffd33d','#8bff6a','#b77bff'];
/** Centre of the spiral and of the dance floor (see the control points of 'hipa-hipa' in shared/content.ts). */
export const PALM={x:-10,z:10};
const beside=(route:Route,d:number,offset:number)=>{const p=sample(route,d);return{x:p.x+Math.cos(p.yaw)*offset,y:p.y,z:p.z-Math.sin(p.yaw)*offset,yaw:p.yaw};};
const facing=(yaw:number,side:number)=>yaw+(side>0?-Math.PI/2:Math.PI/2);
function neonMat(k:Kit,c:string){const name='club-neon-'+c,m=(k.scene.getMaterialByName(name) as StandardMaterial|null)??new StandardMaterial(name,k.scene);m.emissiveColor=Color3.FromHexString(c);m.diffuseColor=Color3.Black();m.disableLighting=true;return m;}

/** A bar: counter, glowing bottle shelf, neon name, stools, a bartender and people waiting for their drink. */
function bar(k:Kit,x:number,y:number,z:number,yaw:number,name:string,color:string,seed:number){
 const g=new TransformNode('club-bar',k.scene);g.parent=k.root;g.position.set(x,y,z);g.rotation.y=yaw;const r=rng(seed);
 // The structure, shelves, bottles, stools and bartender are the Blender model «barra»; the neon in the bar's colour
 // (counter top, pillar strips, roof edge) stays here because it pulses with the music.
 k.prop('barra',x,y,z,yaw,1,b=>{
  k.box('bar-floor',0,.06,1,20,.12,12,'#2a2440',0,b);k.box('bar-counter',0,.65,2.2,16,1.3,1.4,'#3a2a4a',0,b);k.box('bar-back',0,2.6,-1.6,17,5.2,.6,'#1a1630',0,b);
  for(let row=0;row<3;row++){k.box('bar-shelf',0,1.6+row*1.1,-1.15,15,.1,.5,'#5a4a6a',0,b);for(let i=0;i<14;i++){const c=NEON[Math.floor(r()*NEON.length)];const bt=k.cyl('bottle',-6.5+i,2.05+row*1.1,-1.15,.8,.28,c,.14,b);bt.material=material(k.scene,c,true,.85);}}
  k.box('bar-roof',0,5.4,.8,20,.3,7.5,'#241c38',0,b);for(const s of [-1,1])k.cyl('bar-pillar',s*9.4,2.7,4.2,5.4,.35,'#3a2a4a',.35,b);
  for(let i=0;i<7;i++){const sx=-6+i*2;k.cyl('stool-leg',sx,.45,3.6,.9,.12,'#9aa0b4',.12,b);k.cyl('stool-seat',sx,.95,3.6,.14,.75,NEON[i%NEON.length],.75,b);}
  k.cyl('bartender-body',-2,1.35,.8,1.5,.8,'#11131a',.65,b);k.ball('bartender-head',-2,2.45,.8,.62,'#c48a64',undefined,b);k.box('bartender-bowtie',-2,2.05,1.2,.4,.14,.1,'#e53b35',0,b);
 });
 const top=k.box('bar-counter-top',0,1.35,2.2,16.4,.12,1.7,color,0,g);top.material=neonMat(k,color);
 for(const s of [-1,1]){const strip=k.box('bar-neon-strip',s*9.4,2.7,4.45,.12,5.2,.12,color,0,g);strip.material=neonMat(k,color);}
 const edge=k.box('bar-roof-neon',0,5.25,4.55,20,.18,.12,color,0,g);edge.material=neonMat(k,color);
 k.label(name,0,6.4,4.5,12,1.6,0,'#ffffff',color,g);
 k.crowd(x+Math.sin(yaw)*6.4,z+Math.cos(yaw)*6.4,yaw+Math.PI,8,y,1.2);
 return g;
}
/** The giant palm: a trunk with glowing rings, huge fronds and coconut lights, over a round dance floor. */
function giantPalm(k:Kit,beat:(t:number)=>number){
 const {x,z}=PALM;
 // Round dance floor inside the spiral: glowing tiles that light up to the beat.
 const floor=MeshBuilder.CreateDisc('dance-floor',{radius:19,tessellation:48},k.scene);floor.parent=k.root;floor.rotation.x=Math.PI/2;floor.position.set(x,.04,z);floor.material=material(k.scene,'#1b1730');floor.isPickable=false;
 const tiles=new TransformNode('dance-tiles',k.scene);tiles.parent=k.root;tiles.metadata={animate:true};
 const tileMats=NEON.map(c=>{const m=new StandardMaterial('dance-tile-'+c,k.scene);m.emissiveColor=Color3.FromHexString(c).scale(.5);m.diffuseColor=Color3.Black();m.disableLighting=true;return m;});
 for(let i=-4;i<=4;i++)for(let j=-4;j<=4;j++){const tx=i*4.4,tz=j*4.4;if(Math.hypot(tx,tz)>16.5||Math.hypot(tx,tz)<4)continue;const t=MeshBuilder.CreateBox('dance-tile',{width:4,height:.05,depth:4},k.scene);t.parent=tiles;t.position.set(x+tx,.1,z+tz);t.material=tileMats[(i*3+j*7+40)%tileMats.length];t.isPickable=false;}
 k.anims.push({node:tiles,update:t=>{const b=beat(t),step=Math.floor(t*128/60)%5;tileMats.forEach((m,i)=>{m.emissiveColor=Color3.FromHexString(NEON[(i+step)%NEON.length]).scale(.28+b*.8);});}});
 // Trunk: stacked, slightly leaning segments with neon rings.
 const palm=new TransformNode('giant-palm',k.scene);palm.parent=k.root;palm.position.set(x,0,z);
 // Trunk: Blender model «palmera-tronco» (fits inside the neon rings, which stay here and pulse with the music).
 k.prop('palmera-tronco',x,0,z,0,1,t=>{for(let i=0;i<11;i++){const seg=k.cyl('giant-palm-trunk',Math.sin(i*.3)*.25,1.6+i*3,0,3.2,3.8-i*.18,'#8a6a46',3.6-i*.18,t);seg.rotation.z=.02;}});
 for(let i=0;i<11;i++){
  if(i%2===0){const ring=MeshBuilder.CreateTorus('palm-ring',{diameter:4-i*.18,thickness:.22,tessellation:24},k.scene);ring.parent=palm;ring.position.set(Math.sin(i*.3)*.25,2.9+i*3,0);ring.material=neonMat(k,NEON[(i/2)%NEON.length]);ring.isPickable=false;}}
 const crown=new TransformNode('palm-crown',k.scene);crown.parent=palm;crown.position.set(.4,34,0);crown.metadata={animate:true};
 // Fronds and glowing coconuts: Blender model «palmera-copa», hung from the swaying crown.
 k.prop('palmera-copa',0,0,0,0,1,cp=>{
 for(let i=0;i<11;i++){const a=i/11*Math.PI*2,leaf=k.ball('giant-frond',Math.sin(a)*6.5,-1.2,Math.cos(a)*6.5,11,i%2?'#3f9a4f':'#5cbf5a',new Vector3(.36,.1,1.55),cp);leaf.rotation.y=a;leaf.rotation.x=.42;
  const tip=k.ball('frond-tip',Math.sin(a)*11.5,-4.2,Math.cos(a)*11.5,3.6,i%2?'#3f9a4f':'#5cbf5a',new Vector3(.4,.12,1.2),cp);tip.rotation.y=a;tip.rotation.x=.9;}
 for(let i=0;i<6;i++){const a=i/6*Math.PI*2,c=k.ball('glow-coconut',Math.sin(a)*1.3,-1.6,Math.cos(a)*1.3,1.1,'#ffd33d',undefined,cp);c.material=neonMat(k,'#ffd33d');}
 },undefined,crown);
 k.anims.push({node:crown,update:t=>{crown.rotation.y=Math.sin(t*.35)*.08;crown.rotation.z=Math.sin(t*.5)*.03;}});
 // Dancers in rings around the palm and a sign facing the entry of the spiral.
 for(const [rad,count] of [[7,10],[11,14],[15,18]] as const)for(let i=0;i<count;i+=Math.ceil(count/5)){const a=i/count*Math.PI*2+rad;k.crowd(x+Math.sin(a)*rad,z+Math.cos(a)*rad,a+Math.PI/2,3,0,1.1);}
 k.label('LA PALMERA',0,8.5,1.8,7,1.4,0,'#ffd33d','#11182b',palm);
}
export function dressHipaClub(k:Kit,route:Route){
 const beat=(t:number)=>Math.pow(Math.max(0,Math.cos(t*Math.PI*128/60)),6);
 const mats=NEON.map(c=>neonMat(k,c)),L=route.length,c=route.course;
 const special=(d:number)=>{const m=((d%L)+L)%L;return c.gaps.some(g=>g.lane===''&&m>g.from-12&&m<g.to+12)||c.bridges.some(([a,b])=>m>a-8&&m<b+8)||c.ramps.some(r=>r.lane===''&&m>r.at-8&&m<r.at+r.len+8);};
 giantPalm(k,beat);
 // Neon arches across the road, pulsing at 128 bpm (the spiral gets its own lights on the deck).
 for(let d=30;d<L;d+=64){if(special(d))continue;const p=sample(route,d),g=new TransformNode('neon-arch',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=p.yaw;const span=route.width+3,i=Math.round(d/64);
  const top=MeshBuilder.CreateBox('neon-arch',{width:span,height:.35,depth:.35},k.scene);top.parent=g;top.position.y=8;top.material=mats[i%mats.length];top.isPickable=false;
  for(const s of [-1,1]){const side=MeshBuilder.CreateBox('neon-side',{width:.3,height:8,depth:.3},k.scene);side.parent=g;side.position.set(s*span/2,4,0);side.material=mats[(i+1)%mats.length];side.isPickable=false;}}
 const pulse=new TransformNode('beat',k.scene);pulse.parent=k.root;pulse.metadata={animate:true};
 k.anims.push({node:pulse,update:t=>{const b=beat(t);mats.forEach((m,i)=>{m.emissiveColor=Color3.FromHexString(NEON[i]).scale(.45+b*.75);});}});
 // The spiral hangs from the palm like a parking ramp: spokes from the trunk to each floor and neon columns outside.
 {const R=Math.hypot(sample(route,(c.bridges[0][0]+c.bridges[0][1])/2).x-PALM.x,sample(route,(c.bridges[0][0]+c.bridges[0][1])/2).z-PALM.z);
  for(let d=c.bridges[0][0];d<c.bridges[0][1];d+=14){const p=sample(route,d),dx=p.x-PALM.x,dz=p.z-PALM.z,r=Math.hypot(dx,dz);if(r>R+4||p.y<2)continue;const ux=dx/r,uz=dz/r,inner=2,outer=r-route.width/2,len=outer-inner;
   const beam=k.box('spiral-spoke',PALM.x+ux*(inner+len/2),p.y-.7,PALM.z+uz*(inner+len/2),len,.5,.6,'#3a3456',Math.atan2(uz,-ux)*-1+Math.PI/2);beam.rotation.y=Math.atan2(-uz,ux);}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,x=PALM.x+Math.cos(a)*(R+12.5),z=PALM.z+Math.sin(a)*(R+12.5);if(k.blocked(x,z,.8))continue;
   const h=30;k.cyl('spiral-column',x,h/2,z,h,1.1,'#2b2548');const strip=k.box('spiral-column-neon',x,h/2,z,.3,h,.3,NEON[i%NEON.length]);strip.material=mats[i%mats.length];}}
 // Lights along both edges of the spiral deck so it reads as a glowing ramp from far away.
 for(let d=c.bridges[0]?.[0]??0;d<(c.bridges[0]?.[1]??0);d+=5){const p=sample(route,d);for(const s of [-1,1]){const q={x:p.x+Math.cos(p.yaw)*s*(route.width/2+.3),z:p.z-Math.sin(p.yaw)*s*(route.width/2+.3)};const m=k.box('spiral-light',q.x,p.y+.35,q.z,.35,.35,2.2,NEON[Math.floor(d/5)%NEON.length],p.yaw);m.material=mats[Math.floor(d/5)%mats.length];}}
 // Searchlights sweeping the sky from outside the walls.
 for(let i=0;i<8;i++){const d=i*L/8+20;if(special(d))continue;const p=beside(route,d,(i%2?1:-1)*(route.width*.72+7));if(k.blocked(p.x,p.z,1))continue;const tower=new TransformNode('beam',k.scene);tower.parent=k.root;tower.position.set(p.x,p.y,p.z);k.cyl('beam-tower',p.x,p.y+3,p.z,6,.8,'#2b3550');
  const beam=MeshBuilder.CreateCylinder('light-beam',{height:40,diameterTop:9,diameterBottom:.6,tessellation:12},k.scene);beam.parent=tower;beam.setPivotPoint(new Vector3(0,-20,0));beam.position.y=26;const bm=material(k.scene,NEON[i%NEON.length],true,.16);bm.disableDepthWrite=true;bm.backFaceCulling=false;beam.material=bm;beam.isPickable=false;tower.metadata={animate:true};
  k.anims.push({node:tower,update:t=>{tower.rotation.z=Math.sin(t*.9+i)*.5;tower.rotation.x=Math.cos(t*.7+i*1.3)*.4;}});}
 // DJ booth by the start: stage, decks, speakers that bounce and a screen.
 const start=beside(route,34,-(route.width*.72+10)),dj=new TransformNode('dj',k.scene);dj.parent=k.root;dj.position.set(start.x,start.y,start.z);dj.rotation.y=facing(start.yaw,-1);
 k.box('dj-stage',0,.8,0,18,1.6,8,'#2b3550',0,dj);k.box('dj-table',0,2.2,.5,6,1.2,1.6,'#11182b',0,dj);k.label('DJ',0,2.4,1.35,2,.8,0,'#45e0ff','#11182b',dj);
 const screen=k.box('dj-screen',0,6.2,-2.6,14,5.5,.3,'#45e0ff',0,dj);screen.material=mats[1];k.label('HIPA HIPA',0,6.2,-2.4,12,3,0,'#ffffff','#b0216d',dj);
 const speakers:TransformNode[]=[];for(const sx of [-7.5,7.5]){const s=new TransformNode('speaker',k.scene);s.parent=dj;s.position.set(sx,1.6,0);s.metadata={animate:true};k.box('speaker-box',0,2.5,0,2.6,5,2.4,'#1b2233',0,s);for(const y of [1.4,3.4]){const w=k.cyl('woofer',0,y,1.25,.2,1.6,'#46546d',1.6,s);w.rotation.x=Math.PI/2;}speakers.push(s);}
 k.anims.push({node:speakers[0],update:t=>{const b=1+Math.pow(Math.max(0,Math.cos(t*Math.PI*128/60)),8)*.08;for(const s of speakers)s.scaling.setAll(b);}});
 k.crowd(start.x+Math.sin(start.yaw)*6,start.z+Math.cos(start.yaw)*6,facing(start.yaw,-1),12,start.y,1.2);
 // The bars: outside the main road and both sides of the bar lane.
 const bars:[number,string,string][]=[[.06,'BARRA PRINCIPAL','#ff5fb0'],[.255,'BARRA TROPICAL','#8bff6a'],[.35,'COCTELES 2X1','#45e0ff'],[.93,'LA CANTINA','#ffd33d']];
 bars.forEach(([f,name,color],i)=>{const d=f*L;const p=beside(route,d,(route.width*.72+9)*(i%2?1:-1));if(k.blocked(p.x,p.z,4))return;bar(k,p.x,p.y,p.z,facing(p.yaw,i%2?1:-1),name,color,11+i);});
 const lane=route.lanes.find(l=>l.id==='barra');
 if(lane){for(const [f,s,name,color] of [[.3,1,'BARRA VIP','#b77bff'],[.68,-1,'SHOTS · C$20','#ff5fb0']] as const){const p=sampleLane(lane,f*lane.length),off=(lane.width*.72+8)*s,x=p.x+Math.cos(p.yaw)*off,z=p.z-Math.sin(p.yaw)*off;if(!k.blocked(x,z,3))bar(k,x,p.y,z,facing(p.yaw,s),name,color,40+f*10);}}
 // Pool deck by the VIP jump: loungers, umbrellas and an inflatable flamingo.
 const pool=c.gaps.find(g=>g.lane==='');if(pool){const mid=(pool.from+pool.to)/2;for(const s of [-1,1]){const p=beside(route,mid,s*(route.width*.72+5));if(k.blocked(p.x,p.z,1))continue;for(let i=0;i<3;i++){const q=beside(route,mid+(i-1)*7,s*(route.width*.72+5));k.box('lounger',q.x,.45,q.z,1.2,.3,3,'#f4f0e4',q.yaw);k.cyl('pool-umbrella',q.x+1.5,2.6,q.z,.4,3.2,NEON[i%NEON.length],.2);k.cyl('umbrella-pole',q.x+1.5,1.3,q.z,2.6,.1,'#ddd');}}
  const f=beside(route,mid,0);k.ball('flamingo-body',f.x+2,f.y-1.4,f.z,2.4,'#ff7bbd',new Vector3(1.4,.8,1));k.cyl('flamingo-neck',f.x+3.2,f.y-.2,f.z,2.4,.45,'#ff7bbd',.35);k.ball('flamingo-head',f.x+3.4,f.y+1,f.z,.8,'#ff7bbd');
  const sign=beside(route,pool.from-30,route.width*.72+3);k.sign('PISCINA VIP · ¡SALTA!',sign.x,sign.z,sign.yaw+Math.PI,8,1.4,sign.y+3,'#45e0ff','#11182b');}
 const spiral=beside(route,.42*L,route.width*.72+3);k.sign('LA ESPIRAL DE LA PALMERA ↻',spiral.x,spiral.z,spiral.yaw+Math.PI,11,1.5,spiral.y+3.2,'#ffd33d','#11182b');
 const welcome=beside(route,90,route.width*.72+2);k.sign('HIPA HIPA · LADIES NIGHT',welcome.x,welcome.z,facing(welcome.yaw,1),10,1.6,3.4,'#ff5fb0','#11182b');
}
