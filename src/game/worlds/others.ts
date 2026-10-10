import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { sample, sampleLane, type Route } from '../../../shared/track';
import { material } from '../models';
import { Kit, rng, surfaceTexture } from './kit';
import { waterMat } from './course';

/** A point beside the road: `offset` metres to the right (negative = left) of the centre line. */
function beside(route:Route,d:number,offset:number){const p=sample(route,d);return{x:p.x+Math.cos(p.yaw)*offset,y:p.y,z:p.z-Math.sin(p.yaw)*offset,yaw:p.yaw};}
/** Faces the road from the given side. */
const facing=(yaw:number,side:number)=>yaw+(side>0?-Math.PI/2:Math.PI/2);
/** Main-road sections where roadside dressing would float or block the action. */
function special(route:Route,d:number){const c=route.course,L=route.length,m=((d%L)+L)%L;return c.gaps.some(g=>g.lane===''&&m>g.from-12&&m<g.to+12)||c.bridges.some(([a,b])=>m>a-8&&m<b+8)||c.tunnels.some(([a,b])=>m>a-6&&m<b+6)||c.ramps.some(r=>r.lane===''&&m>r.at-8&&m<r.at+r.len+8);}
/** Something stretched across the road overhead (banner, rope with clothes, neon arch). */
function across(k:Kit,route:Route,d:number,h:number,build:(g:TransformNode,span:number)=>void){const p=sample(route,d),g=new TransformNode('across',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=p.yaw;const span=route.width*1.5+2;for(const s of [-1,1])k.cyl('across-post',s*span/2,h/2,0,h,.3,'#5b4a3a',.3,g);build(g,span);return g;}
/** Zebra crossing painted where pedestrians walk, with a sign on each side. */
function crossing(k:Kit,route:Route,d:number){const p=sample(route,d);for(let i=-3;i<=3;i++){const x=p.x+Math.cos(p.yaw)*i*2,z=p.z-Math.sin(p.yaw)*i*2;k.box('zebra',x,p.y+.07,z,1.2,.03,3.2,'#f6f1e2',p.yaw);}
 for(const side of [-1,1]){const q=beside(route,d-22,side*(route.width*.72+1.6));k.sign('¡PEATONES!',q.x,q.z,q.yaw+Math.PI,4.6,1.1,q.y+2.6,'#13234d','#ffd33d');}}

/* Mercado Oriental — caos de colores, chinamos pegados a la calle, ropa colgada y carretones. */
export function dressOriental(k:Kit,route:Route){
 const r=rng(77),tarps=['#d9473b','#2f8fd0','#f2c14e','#4caf6d','#e2763a','#9b59b6'],goods=['#f2c14e','#d9473b','#7cc36b','#f39c4a','#fff2d6','#8e5a3c'];
 for(let d=6;d<route.length;d+=9){
  if(special(route,d))continue;
  for(const side of [-1,1]){
   if(r()<.18)continue;const off=(route.width*.72+3.4+r()*1.6)*side,p=beside(route,d,off);if(k.onLane(p.x,p.z,3))continue;const g=new TransformNode('chinamo',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=facing(p.yaw,side);
   const t=tarps[Math.floor(r()*tarps.length)];k.box('stall-table',0,.9,.6,5.6,.25,2,'#8a6a45',0,g);for(let i=0;i<5;i++)k.box('stall-goods',-2.2+i*1.1,1.25,.6,.8,.45,1.4,goods[Math.floor(r()*goods.length)],0,g);
   for(const x of [-2.7,2.7])k.cyl('stall-pole',x,1.8,1.6,3.6,.14,'#6b5a45',.14,g);const tarp=k.box('stall-tarp',0,3.7,.2,6.2,.12,4.2,t,0,g);tarp.rotation.x=-.18;
   if(r()<.35)k.crowd(0,-1.6,0,2,0,1.3);
  }
 }
 // The alley: stalls pressed against both sides, crates and a tarp roof you drive under.
 const lane=route.lanes.find(l=>l.id==='callejon');
 if(lane)for(let s=10;s<lane.length-8;s+=7){const p=sampleLane(lane,s);for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*(lane.width*.72+2.4)*side,z=p.z-Math.sin(p.yaw)*(lane.width*.72+2.4)*side;if(k.blocked(x,z,-route.width*.3)&&!k.onLane(x,z,-1))continue;const g=new TransformNode('alley-stall',k.scene);g.parent=k.root;g.position.set(x,p.y,z);g.rotation.y=facing(p.yaw,side);k.box('alley-wall',0,2,.8,6.6,4,1.2,['#c97b5a','#d8b26a','#7aa0a6'][(s+side+3)%3],0,g);k.box('alley-goods',0,1.1,-.4,5.8,.9,1,goods[Math.floor(s)%goods.length],0,g);}
  if(Math.floor(s/7)%2===0){const t=k.box('alley-tarp',p.x,p.y+4.3,p.z,lane.width+4,.1,5.6,tarps[Math.floor(s/7)%tarps.length],p.yaw);t.rotation.z=.05;}}
 // Clothes and banners strung across the street.
 const cloth=['#ff6f91','#ffd33d','#4cc8ff','#7dffa0','#ffffff','#c86bfa'];
 for(let d=40;d<route.length;d+=110){if(special(route,d))continue;across(k,route,d,7,(g,span)=>{k.box('rope',0,6.6,0,span,.06,.06,'#3d2f22',0,g);for(let i=0;i<9;i++)k.box('hanging-cloth',-span/2+2+i*(span-4)/8,5.9,0,1.3,1.3,.05,cloth[(i+d)%cloth.length],0,g);});}
 // Painted crossings where shoppers walk (same spots as shared/hazards.ts).
 for(const f of [.12,.26,.47,.66,.935])crossing(k,route,f*route.length);
 for(const [d,text] of [[150,'TODO A C$10'],[420,'SE VENDE HIELO'],[700,'ZAPATOS · ROPA · CELULARES'],[980,'NO HAY FIADO']] as [number,string][]){if(special(route,d))continue;const p=beside(route,d,route.width*.72+1.4);k.sign(text,p.x,p.z,facing(p.yaw,1),7,1.3,2.6,'#fff5d8','#b5332a');}
 const cauce=beside(route,route.length*.585,route.width*.72+3);k.sign('CAUCE · ¡SALTA!',cauce.x,cauce.z,facing(cauce.yaw,1),6,1.2,cauce.y+2.6,'#13234d','#ffd33d');
}

/* Managua — malecón y lago Xolotlán, antigua Catedral, Palacio, Concha Acústica, Árboles de la
 * Vida, Loma de Tiscapa con su laguna y el paso a desnivel. Interpretación arcade de hitos reales. */
export function managuaLandmarks(k:Kit,route:Route,battle:boolean){
 const dz=battle?160:0;
 // Lago Xolotlán with the Momotombo across the water.
 const lake=k.box('lake',0,-.12,-470-dz*0,1400,.1,560,'#5aa6bd');lake.material=waterMat(k.scene,'#4f9fba');
 k.cyl('momotombo',-330,40,-640,90,320,'#7f8a7b',18);k.cyl('momotombo-cap',-330,86,-640,6,22,'#e9e4d8',14);k.ball('momotombo-smoke',-324,96,-640,22,'#efece4',new Vector3(1,.45,1));
 // Malecón: promenade, lamps, palms and the port sign on the lake side of the start straight.
 const promenade=k.box('malecon',-40,-.05,-178,420,.2,16,'#d8cfb8');promenade.material=surfaceTexture(k.scene,'tile','#d8cfb8');
 for(let i=0;i<14;i++){const x=-230+i*32;k.cyl('malecon-lamp',x,3,-184,6,.2,'#4c5a63');k.glow('malecon-lamp-head',x,6.1,-184,.9,.5,.9,'#fff2c2');if(i%2)k.tree(x+12,-188,'palm',0,.9);}
 k.sign('PUERTO SALVADOR ALLENDE',60,-190,0,10,1.4,3.4,'#fff3d0','#1f5fae');k.sign('MALECÓN DE MANAGUA',-150,-190,0,9,1.4,3.4,'#fff3d0','#1f5fae');
 // Concha Acústica: a white shell over a stage, facing the lake.
 const shell=new TransformNode('concha',k.scene);shell.parent=k.root;shell.position.set(-20,0,-205);shell.rotation.y=Math.PI;
 k.box('concha-stage',0,.6,0,16,1.2,8,'#e7e1d1',0,shell);for(let i=0;i<7;i++){const a=-Math.PI/2+i*Math.PI/6;const rib=k.box('concha-rib',Math.sin(a)*8,5,Math.cos(a)*3-1,.9,9,.7,'#fbf8ef',a,shell);rib.rotation.x=-.35;}k.label('CONCHA ACÚSTICA',0,1.4,4.05,7,.8,0,'#1f5fae','#fbf8ef',shell);
 if(battle)return;
 // Antigua Catedral: neoclassical façade, two towers (clock on one), dome, weathered stone.
 const cat=new TransformNode('catedral',k.scene);cat.parent=k.root;cat.position.set(-72,0,-108);cat.rotation.y=Math.PI;
 const stone='#d6ccb6',dark='#a39a86';k.box('cat-nave',0,8,8,22,16,30,stone,0,cat);k.box('cat-facade',0,10,-7.5,24,20,2,stone,0,cat);
 for(let i=0;i<6;i++)k.cyl('cat-column',-8.75+i*3.5,5,-9,10,1,'#e8e1cf',.9,cat);k.box('cat-pediment',0,15.5,-9,22,3,1.6,'#e8e1cf',0,cat);
 for(const x of [-9,9]){k.box('cat-tower',x,15,-6,6,30,6,stone,0,cat);k.box('cat-tower-top',x,31,-6,4.4,4,4.4,dark,0,cat);k.cyl('cat-tower-cap',x,34.2,-6,2.6,3.8,dark,.6,cat);for(let j=0;j<3;j++)k.box('cat-window',x,9+j*7,-9.05,1.4,3,.1,'#3c4a55',0,cat);}
 k.cyl('cat-clock',9,23,-9.1,.2,2.6,'#f4efe2',2.6,cat).rotation.x=Math.PI/2;k.cyl('cat-dome',0,18,14,6,12,stone,9,cat);k.ball('cat-dome-cap',0,21,14,10,dark,new Vector3(1,.6,1),cat);
 k.label('ANTIGUA CATEDRAL',0,2.6,-10.2,9,1.1,0,'#fff3d0','#5a4b3a',cat);
 // Palacio Nacional de la Cultura across the plaza: columns and a long cornice.
 const pal=new TransformNode('palacio',k.scene);pal.parent=k.root;pal.position.set(-130,0,-112);pal.rotation.y=Math.PI*.9;
 k.box('pal-body',0,6,0,40,12,18,'#ead9b4',0,pal);k.box('pal-cornice',0,12.4,0,42,1,19,'#d9c49a',0,pal);for(let i=0;i<10;i++)k.cyl('pal-column',-16+i*3.55,5,-9.6,10,1,'#f5ecd6',.9,pal);k.label('PALACIO DE LA CULTURA',0,11,-9.8,14,1.2,0,'#5a4b3a','#f5ecd6',pal);
 const plaza=k.box('plaza',-100,.01,-110,70,.06,40,'#cfc6b0');plaza.material=surfaceTexture(k.scene,'tile','#cfc6b0');
 // Loma de Tiscapa: crater lagoon right below the mirador lane, its rim and the silhouette on the hill.
 const lagoon=MeshBuilder.CreateDisc('tiscapa-lagoon',{radius:32,tessellation:40},k.scene);lagoon.parent=k.root;lagoon.rotation.x=Math.PI/2;lagoon.position.set(141,.6,40);lagoon.material=waterMat(k.scene,'#3b8f86');
 const rim=MeshBuilder.CreateCylinder('tiscapa-rim',{height:6.6,diameterTop:78,diameterBottom:118,tessellation:40},k.scene);rim.parent=k.root;rim.position.set(141,3,40);rim.material=surfaceTexture(k.scene,'grass','#7f9a5c');rim.isPickable=false;
 const pit=MeshBuilder.CreateCylinder('tiscapa-crater',{height:6.4,diameterTop:72,diameterBottom:64,tessellation:40,sideOrientation:2},k.scene);pit.parent=k.root;pit.position.set(141,3.4,40);pit.material=material(k.scene,'#5d6b45');pit.isPickable=false;
 // The famous black silhouette of a hatted figure stands on the crest above the lagoon.
 const sil=new TransformNode('tiscapa-silueta',k.scene);sil.parent=k.root;sil.position.set(118,6.4,76);sil.rotation.y=-.6;
 const black='#121418';k.box('sil-legs',0,4,0,1.6,8,.4,black,0,sil);k.box('sil-body',0,10,0,3.2,5.5,.4,black,0,sil);k.box('sil-arm',1.9,10.4,0,.8,4.6,.4,black,0,sil);k.ball('sil-head',0,14,0,2,black,new Vector3(1,1,.25),sil);k.box('sil-hat-brim',0,14.9,0,4.2,.35,.42,black,0,sil);k.box('sil-hat',0,15.6,0,2,1.2,.42,black,0,sil);k.box('sil-base',0,-.2,0,5,1,3,'#5d5a52',0,sil);
 for(const [x,z] of [[96,58],[170,92],[118,10]] as const)k.sign('LOMA DE TISCAPA',x,z,Math.atan2(141-x,40-z)+Math.PI,6.5,1.2,9.6,'#fff3d0','#2f6b4f');
 // Rotonda with a fountain inside the north-west lobe.
 k.cyl('rotonda-curb',-120,.3,40,.6,30,'#e9e2cf');k.cyl('rotonda-grass',-120,.62,40,.1,28.5,'#6aa84f');k.cyl('fountain',-120,1.2,40,1.2,9,'#d9d2bd');const water=k.cyl('fountain-water',-120,1.85,40,.1,8,'#7fd0e6');water.material=material(k.scene,'#7fd0e6',true,.8);
 const jet=new TransformNode('fountain-jet',k.scene);jet.parent=k.root;jet.position.set(-120,2,40);jet.metadata={animate:true};const spray=k.cyl('jet',0,2,0,4,.6,'#dff6ff',.1,jet);spray.material=material(k.scene,'#dff6ff',true,.6);k.anims.push({node:jet,update:t=>{jet.scaling.y=.8+Math.sin(t*4)*.2;}});
 for(let i=0;i<6;i++)k.tree(-120+Math.cos(i)*11,40+Math.sin(i)*11,'palm',0,.8);
}
/** «Árbol de la Vida»: tall metal tree of coloured curling branches studded with lights. */
function lifeTree(k:Kit,x:number,y:number,z:number,color:string,seed:number){
 const g=new TransformNode('arbol-vida',k.scene);g.parent=k.root;g.position.set(x,y,z);g.rotation.y=seed;
 k.cyl('arbol-trunk',0,5,0,10,.55,color,.35,g);
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,h=6+(i%3)*2.4;const path:Vector3[]=[];for(let t=0;t<=10;t++){const u=t/10,r=1+u*3.4;path.push(new Vector3(Math.cos(a+u*2.6)*r*.9,h+u*4.5-u*u*2.6,Math.sin(a+u*2.6)*r*.9));}
  const tube=MeshBuilder.CreateTube('arbol-branch',{path,radius:.13,tessellation:6},k.scene);tube.parent=g;tube.material=material(k.scene,color);tube.isPickable=false;
  for(let t=2;t<=10;t+=3){const p=path[t];k.glow('arbol-light',p.x,p.y,p.z,.32,.32,.32,'#fff6c2',0,g);}}
 const crown=MeshBuilder.CreateTorus('arbol-crown',{diameter:4.2,thickness:.16,tessellation:20},k.scene);crown.parent=g;crown.position.y=12.6;crown.material=material(k.scene,color);crown.isPickable=false;
}
/* Managua — barrios a los lados, postes, Árboles de la Vida y el paso a desnivel. */
export function dressManagua(k:Kit,route:Route){
 const r=rng(1972),walls=['#e8d3a8','#c9d6c1','#e2a98b','#b9c7d6','#f0e3c4','#d7b48e'];
 for(let d=10;d<route.length;d+=16){
  if(special(route,d))continue;
  for(const side of [-1,1]){
   if(r()<.3)continue;const p=beside(route,d,(route.width*.72+9+r()*8)*side);if(p.z<-168||k.blocked(p.x,p.z,6)||Math.hypot(p.x-141,p.z-40)<62||Math.hypot(p.x+72,p.z+108)<30||Math.hypot(p.x+130,p.z+112)<28||Math.hypot(p.x+120,p.z-40)<22)continue;
   const h=6+Math.floor(r()*3)*3.5,w=8+r()*6,g=new TransformNode('casa',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=facing(p.yaw,side);
   k.box('house',0,h/2,0,w,h,8,walls[Math.floor(r()*walls.length)],0,g);k.box('house-roof',0,h+.25,0,w+.6,.5,8.6,r()<.5?'#a85a3e':'#6f7a82',0,g);
   for(let f=0;f<h/3.5-.5;f++)for(let i=0;i<Math.floor(w/3);i++)k.box('house-window',-w/2+1.6+i*3,2+f*3.4,4.05,1.3,1.4,.06,'#2f5d6e',0,g);
   if(r()<.25){k.box('pulperia-awning',0,3,5,w,.15,2.5,'#c8432f',0,g);k.label('PULPERÍA',0,4.6,4.1,4,.7,0,'#fff3d0','#c8432f',g);}
  }
 }
 // Árboles de la Vida along the avenues: mostly yellow, a few in other bright colours.
 const tones=['#f4c430','#f4c430','#f4c430','#ff6fae','#4fc3f7','#8ee36a'];let n=0;
 for(const [a,b] of [[.19,.32],[.64,.76],[.04,.1]] as const)for(let f=a;f<=b;f+=.022)for(const side of [-1,1]){const d=f*route.length;if(special(route,d))continue;const p=beside(route,d,side*(route.width*.72+4.5));if(k.blocked(p.x,p.z,1)||Math.hypot(p.x-141,p.z-40)<46)continue;lifeTree(k,p.x,p.y,p.z,tones[n%tones.length],n);n++;}
 // Street lamps every 30 m on the outside, lit at the head.
 for(let d=0;d<route.length;d+=30){if(special(route,d))continue;const p=beside(route,d,route.width*.72+1.6);if(k.onLane(p.x,p.z,2))continue;k.cyl('lamp-post',p.x,p.y+3.6,p.z,7.2,.22,'#4c5a63');k.glow('lamp-head',p.x-Math.cos(p.yaw)*1.2,p.y+7.1,p.z+Math.sin(p.yaw)*1.2,1.6,.25,.6,'#fff2c2',p.yaw);}
 // The overpass: signs on both levels and a painted «PASO A DESNIVEL» on the deck.
 for(const [f,text,side] of [[.16,'PASO A DESNIVEL ↓',1],[.53,'PASO A DESNIVEL ↑',1],[.79,'CALLE ROTA · CAUCE',-1]] as const){const p=beside(route,f*route.length,side*(route.width*.72+3));k.sign(text,p.x,p.z,p.yaw+Math.PI,7.5,1.4,p.y+3.2,'#fff3d0',f>.7?'#b5332a':'#1f5fae');}
 for(const f of [.6,.62]){const p=beside(route,f*route.length,0);const paint=k.label('PASO A DESNIVEL',p.x,p.y+.08,p.z,10,1.4,p.yaw+Math.PI,'#fff4d2','#3a4658');if(paint)paint.rotation.x=Math.PI/2;}
 const mirador=route.lanes.find(l=>l.id==='mirador');if(mirador){for(let s=10;s<mirador.length-6;s+=14){const p=sampleLane(mirador,s);const q={x:p.x-Math.cos(p.yaw)*(mirador.width*.5+1.6),z:p.z+Math.sin(p.yaw)*(mirador.width*.5+1.6)};k.cyl('mirador-post',q.x,p.y+.7,q.z,1.4,.18,'#7a6a52');}}
 for(let i=0;i<8;i++)k.flag(-150+i*42,-196,['#1f5fae','#ffffff','#1f5fae'],8);
}

/* Hipa Hipa — discoteca: arcos de neón que laten, haces de luz, cabina del DJ y gente bailando. */
export function dressHipa(k:Kit,route:Route){
 const neon=['#ff5fb0','#45e0ff','#ffd33d','#8bff6a'],mats=neon.map(c=>{const m=new StandardMaterial('neon-'+c,k.scene);m.emissiveColor=Color3.FromHexString(c);m.diffuseColor=Color3.Black();m.disableLighting=true;return m;});
 const arches:TransformNode[]=[];
 for(let d=30;d<route.length;d+=70){if(special(route,d))continue;const g=across(k,route,d,8,(g,span)=>{const bar=MeshBuilder.CreateBox('neon-arch',{width:span,height:.35,depth:.35},k.scene);bar.parent=g;bar.position.y=8;bar.material=mats[arches.length%4];for(const s of [-1,1]){const side=MeshBuilder.CreateBox('neon-side',{width:.3,height:8,depth:.3},k.scene);side.parent=g;side.position.set(s*span/2,4,0);side.material=mats[(arches.length+1)%4];}});arches.push(g);}
 // Pulsing to a 128 bpm beat; one shared animation for all arches.
 const pulse=new TransformNode('beat',k.scene);pulse.parent=k.root;pulse.metadata={animate:true};
 k.anims.push({node:pulse,update:t=>{const beat=Math.pow(Math.max(0,Math.cos(t*Math.PI*128/60)),6);mats.forEach((m,i)=>{const base=Color3.FromHexString(neon[i]);m.emissiveColor=base.scale(.45+beat*.75);});}});
 // Light beams sweeping from towers outside the walls.
 for(let i=0;i<8;i++){const d=i*route.length/8+20;if(special(route,d))continue;const p=beside(route,d,(i%2?1:-1)*(route.width*.72+6));if(k.onLane(p.x,p.z,2))continue;const tower=new TransformNode('beam',k.scene);tower.parent=k.root;tower.position.set(p.x,p.y,p.z);k.cyl('beam-tower',p.x,p.y+3,p.z,6,.8,'#2b3550');
  const beam=MeshBuilder.CreateCylinder('light-beam',{height:40,diameterTop:9,diameterBottom:.6,tessellation:12},k.scene);beam.parent=tower;beam.position.y=6;beam.setPivotPoint(new Vector3(0,-20,0));beam.position.y=26;const bm=material(k.scene,neon[i%4],true,.16);bm.disableDepthWrite=true;bm.backFaceCulling=false;beam.material=bm;tower.metadata={animate:true};
  k.anims.push({node:tower,update:t=>{tower.rotation.z=Math.sin(t*.9+i)*.5;tower.rotation.x=Math.cos(t*.7+i*1.3)*.4;}});}
 // DJ booth by the start, speakers bouncing on the beat and a dancing crowd.
 const start=beside(route,40,-(route.width*.72+9)),dj=new TransformNode('dj',k.scene);dj.parent=k.root;dj.position.set(start.x,start.y,start.z);dj.rotation.y=facing(start.yaw,-1);
 k.box('dj-stage',0,.8,0,14,1.6,7,'#2b3550',0,dj);k.box('dj-table',0,2.2,.5,6,1.2,1.6,'#11182b',0,dj);k.label('DJ',0,2.4,1.35,2,.8,0,'#45e0ff','#11182b',dj);
 const speakers:TransformNode[]=[];for(const x of [-5.5,5.5]){const s=new TransformNode('speaker',k.scene);s.parent=dj;s.position.set(x,1.6,0);s.metadata={animate:true};k.box('speaker-box',0,2.5,0,2.6,5,2.4,'#1b2233',0,s);for(const y of [1.4,3.4]){const w=k.cyl('woofer',0,y,1.25,.2,1.6,'#46546d',1.6,s);w.rotation.x=Math.PI/2;}speakers.push(s);}
 k.anims.push({node:speakers[0],update:t=>{const b=1+Math.pow(Math.max(0,Math.cos(t*Math.PI*128/60)),8)*.08;for(const s of speakers)s.scaling.setAll(b);}});
 for(let i=0;i<5;i++){const d=120+i*190;if(special(route,d))continue;const p=beside(route,d,(i%2?1:-1)*(route.width*.72+4));if(k.onLane(p.x,p.z,2))continue;k.crowd(p.x,p.z,facing(p.yaw,i%2?1:-1),8,p.y,1.2);}
 const sign=beside(route,90,route.width*.72+2);k.sign('HIPA HIPA · LADIES NIGHT',sign.x,sign.z,facing(sign.yaw,1),10,1.6,3.4,'#ff5fb0','#11182b');
 // VIP terrace lane: velvet rope posts, sofas and a glowing sign.
 const vip=route.lanes.find(l=>l.id==='baile');if(vip){for(let s=8;s<vip.length-6;s+=10){const p=sampleLane(vip,s);for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*(vip.width*.72+1.6)*side,z=p.z-Math.sin(p.yaw)*(vip.width*.72+1.6)*side;if(k.blocked(x,z,-route.width*.4)&&!k.onLane(x,z,-.5))continue;k.cyl('vip-post',x,p.y+.6,z,1.2,.18,'#d4af37');if(s%20<10)k.box('vip-sofa',x+Math.cos(p.yaw)*side*2.2,p.y+.5,z-Math.sin(p.yaw)*side*2.2,1.4,1,3.4,'#8b1e5a',p.yaw);}}
  const mid=sampleLane(vip,vip.length*.5);k.sign('TERRAZA VIP · NO PISAR A LOS QUE BAILAN',mid.x+Math.cos(mid.yaw)*(vip.width*.72+5),mid.z-Math.sin(mid.yaw)*(vip.width*.72+5),facing(mid.yaw,1),12,1.5,3.6,'#ffd33d','#11182b');}
 const pool=beside(route,route.length*.684,0);k.sign('PISCINA VIP · SALTA',pool.x+Math.cos(pool.yaw)*(route.width*.72+4),pool.z-Math.sin(pool.yaw)*(route.width*.72+4),facing(pool.yaw,1),7,1.3,pool.y+3,'#45e0ff','#11182b');
}

/* Volcán Masaya — roca volcánica, fumarolas, miradores y avisos de peligro. */
export function dressMasaya(k:Kit,route:Route){
 const r=rng(1529),rocks=['#4f4a45','#5e5750','#3f3b38','#6b625a'];
 for(let d=4;d<route.length;d+=7){if(special(route,d))continue;for(const side of [-1,1]){if(r()<.45)continue;const p=beside(route,d,(route.width*.72+2.5+r()*9)*side),s=1+r()*2.6;if(k.onLane(p.x,p.z,3))continue;const rock=k.ball('lava-rock',p.x,p.y+s*.35,p.z,s*1.6,rocks[Math.floor(r()*4)],new Vector3(1+r()*.6,.55+r()*.4,1+r()*.6));rock.rotation.y=r()*3;}}
 // Fumaroles: puffs that rise and fade from the crater and from cracks near the road.
 const vents=[{x:0,y:30,z:0,big:true},...[200,520,860,1100].filter(d=>!special(route,d)).map(d=>{const p=beside(route,d,route.width*.72+8);return{x:p.x,y:p.y,z:p.z,big:false};})];
 for(const v of vents){const g=new TransformNode('fumarole',k.scene);g.parent=k.root;g.position.set(v.x,v.y,v.z);g.metadata={animate:true};const puffs=[0,1,2,3].map(i=>{const m=MeshBuilder.CreateSphere('smoke-puff',{diameter:v.big?26:5,segments:6},k.scene);m.parent=g;const mm=material(k.scene,'#d9d3c9',false,.35);mm.disableDepthWrite=true;m.material=mm;m.metadata=i;return m;});
  k.anims.push({node:g,update:t=>{for(const m of puffs){const ph=((t*.12+(m.metadata as number)*.25)%1);m.position.y=ph*(v.big?70:16);m.scaling.setAll(.5+ph*1.4);m.visibility=(1-ph)*.9;}}});}
 for(const [d,text] of [[90,'PRECAUCIÓN: GASES'],[380,'NO SE ACERQUE AL CRÁTER'],[640,'TÚNEL DE MAGMA →'],[1010,'PARQUE NACIONAL VOLCÁN MASAYA']] as [number,string][]){if(special(route,d))continue;const p=beside(route,d,route.width*.72+1.6);k.sign(text,p.x,p.z,facing(p.yaw,1),8,1.3,p.y+2.6,'#2b2b2b','#ffd33d');}
 // Mirador: wooden deck with railing looking at the crater.
 const m=beside(route,560,-(route.width*.72+6)),deck=new TransformNode('mirador',k.scene);deck.parent=k.root;deck.position.set(m.x,m.y,m.z);deck.rotation.y=facing(m.yaw,-1);
 k.box('deck',0,.4,0,12,.3,6,'#8a6a45',0,deck);for(let i=0;i<=6;i++)k.cyl('deck-post',-6+i*2,1,-3,1.2,.15,'#6b5236',.15,deck);k.box('deck-rail',0,1.55,-3,12,.12,.12,'#6b5236',0,deck);k.crowd(0,0,Math.PI,6,.5,1.4);
 const glow=MeshBuilder.CreateDisc('lava-glow',{radius:52,tessellation:32},k.scene);glow.parent=k.root;glow.rotation.x=Math.PI/2;glow.position.set(0,30.2,0);const gm=material(k.scene,'#ff7a2e',true,.75);glow.material=gm;
 const lava=new TransformNode('lava',k.scene);lava.parent=k.root;lava.metadata={animate:true};k.anims.push({node:lava,update:t=>{gm.emissiveColor=Color3.FromHexString('#ff7a2e').scale(.6+Math.sin(t*1.3)*.25);const lm=k.scene.getMaterialByName('course-lava') as StandardMaterial|null;if(lm){lm.emissiveColor=Color3.FromHexString('#ff5a14').scale(.85+Math.sin(t*2.1)*.2);const tex=lm.diffuseTexture as {uOffset:number}|null;if(tex)tex.uOffset=t*.02;}}});
 // Lava flows outside the tunnel windows and around the exit jump: you see where not to fall.
 const c=route.course;for(const [a,b] of c.tunnels){for(let d=a;d<=b;d+=20){const p=beside(route,d,-(route.width/2+22));const pool=MeshBuilder.CreateDisc('lava-pool',{radius:12,tessellation:16},k.scene);pool.parent=k.root;pool.rotation.x=Math.PI/2;pool.position.set(p.x,p.y-6,p.z);pool.material=k.scene.getMaterialByName('course-lava')??material(k.scene,'#ff7a2e',true);pool.isPickable=false;}
  for(let d=a-30;d<b+30;d+=11){for(const side of [-1,1]){const p=beside(route,d,side*(route.width/2+12+r()*6));k.ball('tunnel-mountain',p.x,p.y+3+r()*5,p.z,16+r()*10,rocks[Math.floor(r()*4)],new Vector3(1,.8+r()*.4,1));}}}
}

/* San Juan del Sur — malecón, pueblo, ranchos de playa, botes, el río con su puente y la subida al Cristo. */
export function dressSanJuan(k:Kit,route:Route){
 const r=rng(1898),colors=['#f2b8a0','#9fd5d1','#f6dc8c','#c7b3e6','#f4f0e4','#a8d08d'];
 for(let d=8;d<route.length;d+=15){if(special(route,d))continue;for(const side of [-1,1]){if(r()<.4)continue;const p=beside(route,d,(route.width*.72+5+r()*8)*side);if(k.blocked(p.x,p.z,4)||p.z<-176&&p.y<1)continue;
  if(p.y>12){k.tree(p.x,p.z,r()<.6?'palm':'bush',p.y,.9);continue;}
  const g=new TransformNode('casa-playa',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=facing(p.yaw,side);const h=4.5+Math.floor(r()*2)*3.4;
  k.box('beach-house',0,h/2,0,8,h,7,colors[Math.floor(r()*colors.length)],0,g);k.box('beach-roof',0,h+.4,0,9,.5,8,'#a8553a',0,g);k.box('balcony',0,h-1.8,3.9,7.6,.15,1.4,'#8a5a3a',0,g);for(let i=0;i<5;i++)k.box('baluster',-3.6+i*1.8,h-1.3,4.55,.12,.9,.12,'#f4f0e4',0,g);
  if(r()<.3)k.label(['RANCHO EL TIBURÓN','SURF · TABLAS','MARISCOS DOÑA LUPE','HOSPEDAJE'][Math.floor(r()*4)],0,h-.6,3.55,5,.7,0,'#fff3d0','#2f6b8f',g);
 }}
 // Boats bobbing in the bay.
 for(let i=0;i<9;i++){const g=new TransformNode('boat',k.scene);g.parent=k.root;g.position.set(-180+i*45+r()*10,-.1,-270-r()*60);g.rotation.y=r()*3;g.metadata={animate:true};k.box('hull',0,.5,0,2.2,1,6,['#f4f0e4','#2f8fd0','#d9473b'][i%3],0,g);k.box('hull-stripe',0,.85,0,2.25,.2,6.05,'#11204a',0,g);if(i%3===0){k.cyl('mast',0,4,0,7,.15,'#ddd',.15,g);k.box('sail',0,4.5,.6,.05,5,3,'#fff8ea',0,g);}
  k.anims.push({node:g,update:t=>{g.position.y=-.1+Math.sin(t*1.3+i)*.18;g.rotation.z=Math.sin(t*1.1+i*2)*.06;}});}
 // The river under the bridge and its sandy banks down to the sea.
 const river=k.box('river',-230,-.12,-52,220,.08,14,'#4aa7c0');river.material=waterMat(k.scene,'#4aa7c0');for(const dz of [-8.5,8.5])k.box('river-bank',-230,-.14,-52+dz,220,.06,3,'#d8c08a');
 const bridge=beside(route,route.length*.79,route.width*.72+3);k.sign('PUENTE DEL RÍO',bridge.x,bridge.z,bridge.yaw+Math.PI,6,1.2,bridge.y+3,'#fff3d0','#2f6b8f');
 // Beach life: umbrellas, surfboards and a lifeguard tower next to the shore lane.
 const shore=route.lanes.find(l=>l.id==='playa');
 if(shore){for(let s=8;s<shore.length;s+=13){const p=sampleLane(shore,s);for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*(shore.width*.72+3+r()*4)*side,z=p.z-Math.sin(p.yaw)*(shore.width*.72+3+r()*4)*side;if(k.blocked(x,z,1)||side>0)continue;k.cyl('umbrella-pole',x,1.4,z,2.8,.1,'#ddd');k.cyl('beach-umbrella',x,2.8,z,.5,3.6,['#ff6f6f','#ffd33d','#4fc3f7'][Math.floor(s)%3],.2);if(r()<.4){const b=k.box('surfboard',x+1.5,1.1,z,.5,2.2,.12,['#ff8a3a','#5ff1ff','#ffd33d'][Math.floor(r()*3)]);b.rotation.z=.2;}}}
  for(let s=4;s<shore.length;s+=4){const p=sampleLane(shore,s);for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*(shore.width/2+.2)*side,z=p.z-Math.sin(p.yaw)*(shore.width/2+.2)*side;k.cyl('boardwalk-post',x,p.y/2-.2,z,p.y+.4,.3,'#7d5a36');}}
  const mid=sampleLane(shore,shore.length*.4),tower=new TransformNode('lifeguard',k.scene);tower.parent=k.root;tower.position.set(mid.x-Math.cos(mid.yaw)*(shore.width*.72+6),0,mid.z+Math.sin(mid.yaw)*(shore.width*.72+6));
  for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]])k.cyl('tower-leg',x,2,z,4,.18,'#f4f0e4',.18,tower);k.box('tower-cabin',0,4.6,0,2.8,1.8,2.8,'#e8442c',0,tower);k.box('tower-roof',0,5.7,0,3.4,.3,3.4,'#f4f0e4',0,tower);}
 const welcome=beside(route,30,route.width*.72+1.8);k.sign('BIENVENIDOS A SAN JUAN DEL SUR',welcome.x,welcome.z,facing(welcome.yaw,1),11,1.5,3.2,'#fff3d0','#2f6b8f');
 const climb=beside(route,700,route.width*.72+1.8);if(!special(route,700))k.sign('↑ AL CRISTO DE LA MISERICORDIA',climb.x,climb.z,facing(climb.yaw,1),10,1.4,climb.y+3,'#fff3d0','#2f6b8f');
 for(let i=0;i<4;i++){const d=200+i*260;if(special(route,d))continue;const p=beside(route,d,-(route.width*.72+3));if(k.blocked(p.x,p.z,.5))continue;k.crowd(p.x,p.z,facing(p.yaw,-1),6,p.y,1.3);}
}
