import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { sample, type Route } from '../../../shared/track';
import { material } from '../models';
import { Kit, rng } from './kit';

/** A point beside the road: `offset` metres to the right (negative = left) of the centre line. */
function beside(route:Route,d:number,offset:number){const p=sample(route,d);return{x:p.x+Math.cos(p.yaw)*offset,y:p.y,z:p.z-Math.sin(p.yaw)*offset,yaw:p.yaw};}
/** Faces the road from the given side. */
const facing=(yaw:number,side:number)=>yaw+(side>0?-Math.PI/2:Math.PI/2);
/** Something stretched across the road overhead (banner, rope with clothes, neon arch). */
function across(k:Kit,route:Route,d:number,h:number,build:(g:TransformNode,span:number)=>void){const p=sample(route,d),g=new TransformNode('across',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=p.yaw;const span=route.width*1.5+2;for(const s of [-1,1])k.cyl('across-post',s*span/2,h/2,0,h,.3,'#5b4a3a',.3,g);build(g,span);return g;}

/* Mercado Oriental — caos de colores, chinamos pegados a la calle, ropa colgada y carretones. */
export function dressOriental(k:Kit,route:Route){
 const r=rng(77),tarps=['#d9473b','#2f8fd0','#f2c14e','#4caf6d','#e2763a','#9b59b6'],goods=['#f2c14e','#d9473b','#7cc36b','#f39c4a','#fff2d6','#8e5a3c'];
 for(let d=6;d<route.length;d+=9){
  for(const side of [-1,1]){
   if(r()<.18)continue;const off=(route.width*.72+3.4+r()*1.6)*side,p=beside(route,d,off),g=new TransformNode('chinamo',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=facing(p.yaw,side);
   const t=tarps[Math.floor(r()*tarps.length)];k.box('stall-table',0,.9,.6,5.6,.25,2,'#8a6a45',0,g);for(let i=0;i<5;i++)k.box('stall-goods',-2.2+i*1.1,1.25,.6,.8,.45,1.4,goods[Math.floor(r()*goods.length)],0,g);
   for(const x of [-2.7,2.7])k.cyl('stall-pole',x,1.8,1.6,3.6,.14,'#6b5a45',.14,g);const tarp=k.box('stall-tarp',0,3.7,.2,6.2,.12,4.2,t,0,g);tarp.rotation.x=-.18;
   if(r()<.35)k.crowd(0,-1.6,0,2,0,1.3);
  }
 }
 // Clothes and banners strung across the street.
 const cloth=['#ff6f91','#ffd33d','#4cc8ff','#7dffa0','#ffffff','#c86bfa'];
 for(let d=40;d<route.length;d+=110)across(k,route,d,7,(g,span)=>{k.box('rope',0,6.6,0,span,.06,.06,'#3d2f22',0,g);for(let i=0;i<9;i++)k.box('hanging-cloth',-span/2+2+i*(span-4)/8,5.9,0,1.3,1.3,.05,cloth[(i+d)%cloth.length],0,g);});
 // Carretones parked by the walls, and one crossing far away.
 for(let i=0;i<10;i++){const d=60+i*118,side=i%2?1:-1,p=beside(route,d,(route.width*.72+2.2)*side),g=new TransformNode('carreton',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=p.yaw;k.box('cart-bed',0,1,0,1.8,.25,3,'#9a7046',0,g);for(const x of [-1.05,1.05]){const w=k.cyl('cart-wheel',x,.75,0,.15,1.5,'#4a3b2c',1.5,g);w.rotation.z=Math.PI/2;}for(let j=0;j<6;j++)k.ball('cart-fruit',(j%3-1)*.5,1.35,(Math.floor(j/3)-.5)*.9,.55,['#f39c4a','#7cc36b','#d9473b'][j%3],undefined,g);}
 for(const [d,text] of [[150,'TODO A C$10'],[420,'SE VENDE HIELO'],[700,'ZAPATOS · ROPA · CELULARES'],[980,'NO HAY FIADO']] as [number,string][]){const p=beside(route,d,route.width*.72+1.4);k.sign(text,p.x,p.z,facing(p.yaw,1),7,1.3,2.6,'#fff5d8','#b5332a');}
}

/* Managua — cuadras de la ciudad, rotondas con fuente, postes de luz y el lago al fondo. */
export function dressManagua(k:Kit,route:Route){
 const r=rng(1972),walls=['#e8d3a8','#c9d6c1','#e2a98b','#b9c7d6','#f0e3c4','#d7b48e'];
 for(let d=10;d<route.length;d+=16){
  for(const side of [-1,1]){
   if(r()<.3)continue;const p=beside(route,d,(route.width*.72+9+r()*8)*side);if(p.z<-196)continue;
   const h=6+Math.floor(r()*3)*3.5,w=8+r()*6,g=new TransformNode('casa',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=facing(p.yaw,side);
   k.box('house',0,h/2,0,w,h,8,walls[Math.floor(r()*walls.length)],0,g);k.box('house-roof',0,h+.25,0,w+.6,.5,8.6,r()<.5?'#a85a3e':'#6f7a82',0,g);
   for(let f=0;f<h/3.5-.5;f++)for(let i=0;i<Math.floor(w/3);i++)k.box('house-window',-w/2+1.6+i*3,2+f*3.4,4.05,1.3,1.4,.06,'#2f5d6e',0,g);
   if(r()<.25){k.box('pulperia-awning',0,3,5,w,.15,2.5,'#c8432f',0,g);k.label('PULPERÍA',0,4.6,4.1,4,.7,0,'#fff3d0','#c8432f',g);}
  }
 }
 // Street lamps every 30 m on the outside, lit at the head.
 for(let d=0;d<route.length;d+=30){const p=beside(route,d,route.width*.72+1.6);k.cyl('lamp-post',p.x,p.y+3.6,p.z,7.2,.22,'#4c5a63');k.glow('lamp-head',p.x-Math.cos(p.yaw)*1.2,p.y+7.1,p.z+Math.sin(p.yaw)*1.2,1.6,.25,.6,'#fff2c2',p.yaw);}
 // Rotondas: a fountain island on the inside of the three tightest bends.
 const bends:number[]=[];for(let d=0;d<route.length;d+=8){const a=sample(route,d),b=sample(route,d+24),turn=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw));if(Math.abs(turn)>.45&&bends.every(x=>Math.abs(x-d)>200))bends.push(d);}
 for(const d of bends.slice(0,3)){const a=sample(route,d),b=sample(route,d+24),turn=Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw)),p=beside(route,d+12,Math.sign(turn)*(route.width*.72+13));
  k.cyl('rotonda-curb',p.x,p.y+.3,p.z,.6,22,'#e9e2cf');k.cyl('rotonda-grass',p.x,p.y+.62,p.z,.1,20.5,'#6aa84f');k.cyl('fountain',p.x,p.y+1.2,p.z,1.2,7,'#d9d2bd');const water=k.cyl('fountain-water',p.x,p.y+1.85,p.z,.1,6,'#7fd0e6');water.material=material(k.scene,'#7fd0e6',true,.8);
  const jet=new TransformNode('fountain-jet',k.scene);jet.parent=k.root;jet.position.set(p.x,p.y+2,p.z);jet.metadata={animate:true};const spray=k.cyl('jet',0,1.6,0,3.2,.5,'#dff6ff',.1,jet);spray.material=material(k.scene,'#dff6ff',true,.6);k.anims.push({node:jet,update:t=>{jet.scaling.y=.8+Math.sin(t*4)*.2;}});
  for(let i=0;i<6;i++)k.tree(p.x+Math.cos(i)*8,p.z+Math.sin(i)*8,'palm',p.y,.8);}
 k.box('malecon',0,-.05,-205,700,.2,14,'#d8cfb8');k.box('lake-near',0,-.1,-300,1200,.1,180,'#5ea8bd');
 for(let i=0;i<8;i++)k.flag(-150+i*42,-200,['#1f5fae','#ffffff','#1f5fae'],8);
}

/* Hipa Hipa — discoteca: arcos de neón que laten, haces de luz, cabina del DJ y gente bailando. */
export function dressHipa(k:Kit,route:Route){
 const neon=['#ff5fb0','#45e0ff','#ffd33d','#8bff6a'],mats=neon.map(c=>{const m=new StandardMaterial('neon-'+c,k.scene);m.emissiveColor=Color3.FromHexString(c);m.diffuseColor=Color3.Black();m.disableLighting=true;return m;});
 const arches:TransformNode[]=[];
 for(let d=30;d<route.length;d+=70){const g=across(k,route,d,8,(g,span)=>{const bar=MeshBuilder.CreateBox('neon-arch',{width:span,height:.35,depth:.35},k.scene);bar.parent=g;bar.position.y=8;bar.material=mats[arches.length%4];for(const s of [-1,1]){const side=MeshBuilder.CreateBox('neon-side',{width:.3,height:8,depth:.3},k.scene);side.parent=g;side.position.set(s*span/2,4,0);side.material=mats[(arches.length+1)%4];}});arches.push(g);}
 // Pulsing to a 128 bpm beat; one shared animation for all arches.
 const pulse=new TransformNode('beat',k.scene);pulse.parent=k.root;pulse.metadata={animate:true};
 k.anims.push({node:pulse,update:t=>{const beat=Math.pow(Math.max(0,Math.cos(t*Math.PI*128/60)),6);mats.forEach((m,i)=>{const base=Color3.FromHexString(neon[i]);m.emissiveColor=base.scale(.45+beat*.75);});}});
 // Light beams sweeping from towers outside the walls.
 for(let i=0;i<8;i++){const p=beside(route,i*route.length/8+20,(i%2?1:-1)*(route.width*.72+6)),tower=new TransformNode('beam',k.scene);tower.parent=k.root;tower.position.set(p.x,p.y,p.z);k.cyl('beam-tower',p.x,p.y+3,p.z,6,.8,'#2b3550');
  const beam=MeshBuilder.CreateCylinder('light-beam',{height:40,diameterTop:9,diameterBottom:.6,tessellation:12},k.scene);beam.parent=tower;beam.position.y=6;beam.setPivotPoint(new Vector3(0,-20,0));beam.position.y=26;const bm=material(k.scene,neon[i%4],true,.16);bm.disableDepthWrite=true;bm.backFaceCulling=false;beam.material=bm;tower.metadata={animate:true};
  k.anims.push({node:tower,update:t=>{tower.rotation.z=Math.sin(t*.9+i)*.5;tower.rotation.x=Math.cos(t*.7+i*1.3)*.4;}});}
 // DJ booth by the start, speakers bouncing on the beat and a dancing crowd.
 const start=beside(route,40,-(route.width*.72+9)),dj=new TransformNode('dj',k.scene);dj.parent=k.root;dj.position.set(start.x,start.y,start.z);dj.rotation.y=facing(start.yaw,-1);
 k.box('dj-stage',0,.8,0,14,1.6,7,'#2b3550',0,dj);k.box('dj-table',0,2.2,.5,6,1.2,1.6,'#11182b',0,dj);k.label('DJ',0,2.4,1.35,2,.8,0,'#45e0ff','#11182b',dj);
 const speakers:TransformNode[]=[];for(const x of [-5.5,5.5]){const s=new TransformNode('speaker',k.scene);s.parent=dj;s.position.set(x,1.6,0);s.metadata={animate:true};k.box('speaker-box',0,2.5,0,2.6,5,2.4,'#1b2233',0,s);for(const y of [1.4,3.4]){const w=k.cyl('woofer',0,y,1.25,.2,1.6,'#46546d',1.6,s);w.rotation.x=Math.PI/2;}speakers.push(s);}
 k.anims.push({node:speakers[0],update:t=>{const b=1+Math.pow(Math.max(0,Math.cos(t*Math.PI*128/60)),8)*.08;for(const s of speakers)s.scaling.setAll(b);}});
 for(let i=0;i<5;i++){const p=beside(route,120+i*190,(i%2?1:-1)*(route.width*.72+4));k.crowd(p.x,p.z,facing(p.yaw,i%2?1:-1),8,p.y,1.2);}
 const sign=beside(route,90,route.width*.72+2);k.sign('HIPA HIPA · LADIES NIGHT',sign.x,sign.z,facing(sign.yaw,1),10,1.6,3.4,'#ff5fb0','#11182b');
}

/* Volcán Masaya — roca volcánica, fumarolas, miradores y avisos de peligro. */
export function dressMasaya(k:Kit,route:Route){
 const r=rng(1529),rocks=['#4f4a45','#5e5750','#3f3b38','#6b625a'];
 for(let d=4;d<route.length;d+=7){for(const side of [-1,1]){if(r()<.45)continue;const p=beside(route,d,(route.width*.72+2.5+r()*9)*side),s=1+r()*2.6;const rock=k.ball('lava-rock',p.x,p.y+s*.35,p.z,s*1.6,rocks[Math.floor(r()*4)],new Vector3(1+r()*.6,.55+r()*.4,1+r()*.6));rock.rotation.y=r()*3;}}
 // Fumaroles: puffs that rise and fade from the crater and from cracks near the road.
 const vents=[{x:0,y:30,z:0,big:true},...[200,520,860,1100].map(d=>{const p=beside(route,d,route.width*.72+8);return{x:p.x,y:p.y,z:p.z,big:false};})];
 for(const v of vents){const g=new TransformNode('fumarole',k.scene);g.parent=k.root;g.position.set(v.x,v.y,v.z);g.metadata={animate:true};const puffs=[0,1,2,3].map(i=>{const m=MeshBuilder.CreateSphere('smoke-puff',{diameter:v.big?26:5,segments:6},k.scene);m.parent=g;const mm=material(k.scene,'#d9d3c9',false,.35);mm.disableDepthWrite=true;m.material=mm;m.metadata=i;return m;});
  k.anims.push({node:g,update:t=>{for(const m of puffs){const ph=((t*.12+(m.metadata as number)*.25)%1);m.position.y=ph*(v.big?70:16);m.scaling.setAll(.5+ph*1.4);m.visibility=(1-ph)*.9;}}});}
 for(const [d,text] of [[90,'PRECAUCIÓN: GASES'],[380,'NO SE ACERQUE AL CRÁTER'],[700,'MIRADOR →'],[1010,'PARQUE NACIONAL VOLCÁN MASAYA']] as [number,string][]){const p=beside(route,d,route.width*.72+1.6);k.sign(text,p.x,p.z,facing(p.yaw,1),8,1.3,p.y+2.6,'#2b2b2b','#ffd33d');}
 // Mirador: wooden deck with railing looking at the crater.
 const m=beside(route,640,-(route.width*.72+6)),deck=new TransformNode('mirador',k.scene);deck.parent=k.root;deck.position.set(m.x,m.y,m.z);deck.rotation.y=facing(m.yaw,-1);
 k.box('deck',0,.4,0,12,.3,6,'#8a6a45',0,deck);for(let i=0;i<=6;i++)k.cyl('deck-post',-6+i*2,1,-3,1.2,.15,'#6b5236',.15,deck);k.box('deck-rail',0,1.55,-3,12,.12,.12,'#6b5236',0,deck);k.crowd(0,0,Math.PI,6,.5,1.4);
 const glow=MeshBuilder.CreateDisc('lava-glow',{radius:52,tessellation:32},k.scene);glow.parent=k.root;glow.rotation.x=Math.PI/2;glow.position.set(0,30.2,0);const gm=material(k.scene,'#ff7a2e',true,.75);glow.material=gm;
 const lava=new TransformNode('lava',k.scene);lava.parent=k.root;lava.metadata={animate:true};k.anims.push({node:lava,update:t=>{gm.emissiveColor=Color3.FromHexString('#ff7a2e').scale(.6+Math.sin(t*1.3)*.25);}});
}

/* San Juan del Sur — malecón, ranchos de playa, botes en la bahía y la subida al Cristo. */
export function dressSanJuan(k:Kit,route:Route){
 const r=rng(1898),colors=['#f2b8a0','#9fd5d1','#f6dc8c','#c7b3e6','#f4f0e4','#a8d08d'];
 for(let d=8;d<route.length;d+=15){for(const side of [-1,1]){if(r()<.4)continue;const p=beside(route,d,(route.width*.72+5+r()*8)*side);
  if(p.y>12){k.tree(p.x,p.z,r()<.6?'palm':'bush',p.y,.9);continue;}
  const g=new TransformNode('casa-playa',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=facing(p.yaw,side);const h=4.5+Math.floor(r()*2)*3.4;
  k.box('beach-house',0,h/2,0,8,h,7,colors[Math.floor(r()*colors.length)],0,g);k.box('beach-roof',0,h+.4,0,9,.5,8,'#a8553a',0,g);k.box('balcony',0,h-1.8,3.9,7.6,.15,1.4,'#8a5a3a',0,g);for(let i=0;i<5;i++)k.box('baluster',-3.6+i*1.8,h-1.3,4.55,.12,.9,.12,'#f4f0e4',0,g);
  if(r()<.3)k.label(['RANCHO EL TIBURÓN','SURF · TABLAS','MARISCOS DOÑA LUPE','HOSPEDAJE'][Math.floor(r()*4)],0,h-.6,3.55,5,.7,0,'#fff3d0','#2f6b8f',g);
 }}
 // Boats bobbing in the bay.
 for(let i=0;i<9;i++){const g=new TransformNode('boat',k.scene);g.parent=k.root;g.position.set(-180+i*45+r()*10,-.1,-262-r()*60);g.rotation.y=r()*3;g.metadata={animate:true};k.box('hull',0,.5,0,2.2,1,6,['#f4f0e4','#2f8fd0','#d9473b'][i%3],0,g);k.box('hull-stripe',0,.85,0,2.25,.2,6.05,'#11204a',0,g);if(i%3===0){k.cyl('mast',0,4,0,7,.15,'#ddd',.15,g);k.box('sail',0,4.5,.6,.05,5,3,'#fff8ea',0,g);}
  k.anims.push({node:g,update:t=>{g.position.y=-.1+Math.sin(t*1.3+i)*.18;g.rotation.z=Math.sin(t*1.1+i*2)*.06;}});}
 const welcome=beside(route,30,route.width*.72+1.8);k.sign('BIENVENIDOS A SAN JUAN DEL SUR',welcome.x,welcome.z,facing(welcome.yaw,1),11,1.5,3.2,'#fff3d0','#2f6b8f');
 const climb=beside(route,700,route.width*.72+1.8);k.sign('↑ AL CRISTO DE LA MISERICORDIA',climb.x,climb.z,facing(climb.yaw,1),10,1.4,climb.y+3,'#fff3d0','#2f6b8f');
 for(let i=0;i<4;i++){const p=beside(route,200+i*260,-(route.width*.72+3));k.crowd(p.x,p.z,facing(p.yaw,-1),6,p.y,1.3);}
}
