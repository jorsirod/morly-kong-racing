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
function special(route:Route,d:number){const c=route.course,L=route.length,m=((d%L)+L)%L;return c.gaps.some(g=>g.lane===''&&m>g.from-12&&m<g.to+12)||c.bridges.some(([a,b])=>m>a-8&&m<b+8)||c.tunnels.some(([a,b])=>m>a-6&&m<b+6)||c.ramps.some(r=>r.lane===''&&m>r.at-8&&m<r.at+r.len+8)||c.covered.some(([a,b])=>m>a-6&&m<b+6)||c.crossings.some(x=>Math.abs(m-x)<16);}
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
   if(r()<.18)continue;const off=(route.width*.72+3.4+r()*1.6)*side,p=beside(route,d,off);if(k.onLane(p.x,p.z,3))continue;const Y=facing(p.yaw,side),t=tarps[Math.floor(r()*tarps.length)];
   k.prop('chinamo',p.x,p.y,p.z,Y,1,g=>{k.box('stall-table',0,.9,.6,5.6,.25,2,'#8a6a45',0,g);for(let i=0;i<5;i++)k.box('stall-goods',-2.2+i*1.1,1.25,.6,.8,.45,1.4,goods[Math.floor(r()*goods.length)],0,g);for(const x of [-2.7,2.7])k.cyl('stall-pole',x,1.8,1.6,3.6,.14,'#6b5a45',.14,g);});
   // The tarp is its own piece, modelled in white and tinted per stall.
   k.prop('lona',p.x,p.y,p.z,Y,1,g=>{const tarp=k.box('stall-tarp',0,3.7,.2,6.2,.12,4.2,t,0,g);tarp.rotation.x=-.18;},t);
   if(r()<.35){const Y=facing(p.yaw,side);k.crowd(p.x-Math.sin(Y)*1.6,p.z-Math.cos(Y)*1.6,Y,2,p.y,1.3);}
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
 for(const f of [.12,.26,.47,.66,.90])crossing(k,route,f*route.length);
 for(const [d,text] of [[150,'TODO A C$10'],[420,'SE VENDE HIELO'],[700,'ZAPATOS · ROPA · CELULARES'],[980,'NO HAY FIADO']] as [number,string][]){if(special(route,d))continue;const p=beside(route,d,route.width*.72+1.4);k.sign(text,p.x,p.z,facing(p.yaw,1),7,1.3,2.6,'#fff5d8','#b5332a');}
 // Las 4 esquinas: four corner buildings, the banner over the street, vendors and the buses waiting on the cross street.
 const x4=route.course.crossings[0];if(x4!==undefined){const c=sample(route,x4),rx=Math.cos(c.yaw),rz=-Math.sin(c.yaw),fx=Math.sin(c.yaw),fz=Math.cos(c.yaw);
  const names=[['FERRETERÍA EL CLAVO','#c8432f'],['PULPERÍA LAS 4 ESQUINAS','#2f8fd0'],['FARMACIA SAN JUDAS','#2e8b57'],['TIENDA LA BENDICIÓN','#e2763a']];
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b],i)=>{const ox=route.width*.72+11,oz=6.5+10,x=c.x+rx*a*ox+fx*b*oz,z=c.z+rz*a*ox+fz*b*oz,g=new TransformNode('esquina',k.scene);g.parent=k.root;g.position.set(x,c.y,z);g.rotation.y=facing(c.yaw,a);
   k.box('esquina-body',0,4.2,0,16,8.4,10,['#e9c58f','#9fc4c8','#e8a98c','#d9d0a6'][i],0,g);k.box('esquina-roof',0,8.6,0,16.6,.4,10.6,'#8a5a3e',0,g);
   k.box('esquina-awning',0,3.2,5.6,15,.18,2.6,names[i][1],0,g);k.label(names[i][0],0,4.7,5.06,11,1,0,'#ffffff',names[i][1],g);
   for(let w=0;w<3;w++)k.box('esquina-window',-5+w*5,6.6,5.03,2,1.6,.06,'#2f5d6e',0,g);
   const Y=facing(c.yaw,a);k.crowd(x+Math.sin(Y)*7.4,z+Math.cos(Y)*7.4,Y,4,c.y,1.2);});
  across(k,route,x4-14,8,(g,span)=>{k.box('banner',0,7,0,span,1.6,.15,'#ffd33d',0,g);k.label('LAS 4 ESQUINAS · OJO CON LOS BUSES',0,7,-.1,span-1,1.3,Math.PI,'#13234d','#ffd33d',g);});
  for(const s of [-1,1]){const p=beside(route,x4-45,s*(route.width*.72+2));k.sign('SEMÁFORO · LAS 4 ESQUINAS',p.x,p.z,p.yaw+Math.PI,8,1.3,p.y+2.8,'#13234d','#ffd33d');}}
 const cauce=beside(route,route.length*.585,route.width*.72+3);k.sign('CAUCE · ¡SALTA!',cauce.x,cauce.z,facing(cauce.yaw,1),6,1.2,cauce.y+2.6,'#13234d','#ffd33d');
}

/* Managua — malecón y lago Xolotlán, antigua Catedral, Palacio, Concha Acústica, Árboles de la
 * Vida, Loma de Tiscapa con su laguna y el paso a desnivel. Interpretación arcade de hitos reales. */
export function managuaLandmarks(k:Kit,route:Route,battle:boolean){
 const dz=battle?160:0;
 // Lago Xolotlán with the Momotombo across the water.
 const lake=k.box('lake',0,-.12,-470-dz*0,1400,.1,560,'#5aa6bd');lake.material=waterMat(k.scene,'#4f9fba',110,44);
 k.cyl('momotombo',-330,40,-640,90,320,'#7f8a7b',18);k.cyl('momotombo-cap',-330,86,-640,6,22,'#e9e4d8',14);k.ball('momotombo-smoke',-324,96,-640,22,'#efece4',new Vector3(1,.45,1));
 // Malecón: promenade, lamps, palms and the port sign on the lake side of the start straight.
 const promenade=k.box('malecon',-40,-.05,-178,420,.2,16,'#d8cfb8');promenade.material=surfaceTexture(k.scene,'tile','#d8cfb8');
 for(let i=0;i<14;i++){const x=-230+i*32;k.cyl('malecon-lamp',x,3,-184,6,.2,'#4c5a63');k.glow('malecon-lamp-head',x,6.1,-184,.9,.5,.9,'#fff2c2');if(i%2)k.tree(x+12,-188,'palm',0,.9);}
 k.sign('PUERTO SALVADOR ALLENDE',60,-190,0,10,1.4,3.4,'#fff3d0','#1f5fae');k.sign('MALECÓN DE MANAGUA',-150,-190,0,9,1.4,3.4,'#fff3d0','#1f5fae');
 // Concha Acústica: a white shell over a stage, facing the lake.
 const shell=new TransformNode('concha',k.scene);shell.parent=k.root;shell.position.set(-20,0,-205); // opens toward the plaza, the lake behind
 k.prop('concha',-20,0,-205,0,1,c=>{k.box('concha-stage',0,.6,0,16,1.2,8,'#e7e1d1',0,c);for(let i=0;i<7;i++){const a=-Math.PI/2+i*Math.PI/6;const rib=k.box('concha-rib',Math.sin(a)*8,5,Math.cos(a)*3-1,.9,9,.7,'#fbf8ef',a,c);rib.rotation.x=-.35;}});k.label('CONCHA ACÚSTICA',0,1.4,4.05,7,.8,0,'#1f5fae','#fbf8ef',shell);
 if(battle)return;
 // Antigua Catedral: neoclassical façade, two towers (clock on one), dome, weathered stone.
 // The Blender model has its façade at the origin facing +z; the code version keeps its old layout (façade at z=-7.5, turned).
 k.prop('catedral',-72,0,-100.5,0,1,p=>{const cat=new TransformNode('catedral-code',k.scene);cat.parent=p;cat.position.z=-7.5;cat.rotation.y=Math.PI;

 const stone='#d6ccb6',dark='#a39a86';k.box('cat-nave',0,8,8,22,16,30,stone,0,cat);k.box('cat-facade',0,10,-7.5,24,20,2,stone,0,cat);
 for(let i=0;i<6;i++)k.cyl('cat-column',-8.75+i*3.5,5,-9,10,1,'#e8e1cf',.9,cat);k.box('cat-pediment',0,15.5,-9,22,3,1.6,'#e8e1cf',0,cat);
 for(const x of [-9,9]){k.box('cat-tower',x,15,-6,6,30,6,stone,0,cat);k.box('cat-tower-top',x,31,-6,4.4,4,4.4,dark,0,cat);k.cyl('cat-tower-cap',x,34.2,-6,2.6,3.8,dark,.6,cat);for(let j=0;j<3;j++)k.box('cat-window',x,9+j*7,-9.05,1.4,3,.1,'#3c4a55',0,cat);}
 k.cyl('cat-clock',9,23,-9.1,.2,2.6,'#f4efe2',2.6,cat).rotation.x=Math.PI/2;k.cyl('cat-dome',0,18,14,6,12,stone,9,cat);k.ball('cat-dome-cap',0,21,14,10,dark,new Vector3(1,.6,1),cat);
 });
 k.label('ANTIGUA CATEDRAL',-72,2.6,-97.8,9,1.1,0,'#fff3d0','#5a4b3a');
 // Palacio Nacional de la Cultura across the plaza: columns and a long cornice.
 const pal=new TransformNode('palacio',k.scene);pal.parent=k.root;pal.position.set(-108,0,-94);pal.rotation.y=Math.PI*.9;
 k.prop('palacio',-108,0,-94,Math.PI*.9,1,c=>{k.box('pal-body',0,6,0,40,12,18,'#ead9b4',0,c);k.box('pal-cornice',0,12.4,0,42,1,19,'#d9c49a',0,c);for(let i=0;i<10;i++)k.cyl('pal-column',-16+i*3.55,5,-9.6,10,1,'#f5ecd6',.9,c);});
 k.label('PALACIO DE LA CULTURA',0,13,-13.2,12,.9,0,'#5a4b3a','#f5ecd6',pal);
 const plaza=k.box('plaza',-92,.01,-104,60,.06,34,'#cfc6b0');plaza.material=surfaceTexture(k.scene,'tile','#cfc6b0');
 // Loma de Tiscapa: crater lagoon right below the mirador lane, its rim and the silhouette on the hill.
 const lagoon=MeshBuilder.CreateDisc('tiscapa-lagoon',{radius:32,tessellation:40},k.scene);lagoon.parent=k.root;lagoon.rotation.x=Math.PI/2;lagoon.position.set(141,.6,40);lagoon.material=waterMat(k.scene,'#3b8f86',6);
 const rim=MeshBuilder.CreateCylinder('tiscapa-rim',{height:6.6,diameterTop:78,diameterBottom:118,tessellation:40},k.scene);rim.parent=k.root;rim.position.set(141,3,40);rim.material=surfaceTexture(k.scene,'grass','#7f9a5c',10,1);rim.isPickable=false;
 const pit=MeshBuilder.CreateCylinder('tiscapa-crater',{height:6.4,diameterTop:72,diameterBottom:64,tessellation:40,sideOrientation:2},k.scene);pit.parent=k.root;pit.position.set(141,3.4,40);pit.material=material(k.scene,'#5d6b45');pit.isPickable=false;
 // The famous black silhouette of a hatted figure stands on the crest above the lagoon.
 const sil=new TransformNode('tiscapa-silueta',k.scene);sil.parent=k.root;sil.position.set(118,6.4,76);sil.rotation.y=-.6;
 const black='#121418';k.box('sil-legs',0,4,0,1.6,8,.4,black,0,sil);k.box('sil-body',0,10,0,3.2,5.5,.4,black,0,sil);k.box('sil-arm',1.9,10.4,0,.8,4.6,.4,black,0,sil);k.ball('sil-head',0,14,0,2,black,new Vector3(1,1,.25),sil);k.box('sil-hat-brim',0,14.9,0,4.2,.35,.42,black,0,sil);k.box('sil-hat',0,15.6,0,2,1.2,.42,black,0,sil);k.box('sil-base',0,-.2,0,5,1,3,'#5d5a52',0,sil);
 for(const [x,z] of [[96,58],[170,92],[118,10]] as const)k.sign('LOMA DE TISCAPA',x,z,Math.atan2(141-x,40-z)+Math.PI,6.5,1.2,9.6,'#fff3d0','#2f6b4f');
 rotondaGalerias(k,route);
}
/** Rotonda Jean Paul Genie (the race goes half way round it, counter-clockwise like the traffic) and, right after,
 * the road runs through Galerías Santo Domingo: shop fronts, a glass roof and shoppers behind the rails. */
function rotondaGalerias(k:Kit,route:Route){
 const cx=-172,cz=-45,R=19;
 const ring=MeshBuilder.CreateDisc('rotonda-ring',{radius:R+13,tessellation:48},k.scene);ring.parent=k.root;ring.rotation.x=Math.PI/2;ring.position.set(cx,.012,cz);ring.material=surfaceTexture(k.scene,'asphalt','#555b66');ring.isPickable=false;
 k.cyl('rotonda-curb',cx,.35,cz,.7,R*2,'#f1ead4',R*2,k.root,40);const lawn=k.cyl('rotonda-lawn',cx,.72,cz,.08,R*2-1.2,'#5fb04a',R*2-1.2,k.root,40);lawn.material=surfaceTexture(k.scene,'grass','#5fb04a');
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2;k.box('rotonda-curb-paint',cx+Math.cos(a)*R,.72,cz+Math.sin(a)*R,1.2,.06,2.4,i%2?'#ffd33d':'#1b1b1b',-a);}
 // Fountain with jets in the middle.
 k.cyl('fountain-basin',cx,1.1,cz,.9,14,'#d9d2bd',14,k.root,32);const water=k.cyl('fountain-water',cx,1.6,cz,.1,12.6,'#7fd0e6',12.6,k.root,32);water.material=material(k.scene,'#7fd0e6',true,.8);
 k.cyl('fountain-column',cx,3,cz,3.6,1.6,'#e9e3d0',1.2);k.cyl('fountain-bowl',cx,4.9,cz,.5,5,'#e9e3d0',3.6);
 const jets=new TransformNode('fountain-jets',k.scene);jets.parent=k.root;jets.position.set(cx,1.6,cz);jets.metadata={animate:true};const parts:ReturnType<Kit['cyl']>[]=[];
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const j=k.cyl('jet',Math.cos(a)*4.4,1.6,Math.sin(a)*4.4,3.2,.35,'#dff6ff',.12,jets);j.material=material(k.scene,'#dff6ff',true,.6);parts.push(j);}
 const top=k.cyl('jet-top',0,5.8,0,4.4,.7,'#dff6ff',.1,jets);top.material=material(k.scene,'#dff6ff',true,.6);parts.push(top);
 k.anims.push({node:jets,update:t=>{parts.forEach((p,i)=>{p.scaling.y=.75+Math.sin(t*3+i)*.25;});}});
 // Árboles de la Vida around the fountain, palms, flags and the name on both approaches.
 const tones=['#f4c430','#ff6fae','#4fc3f7','#8ee36a','#f4c430','#b77bff'];for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.3;lifeTree(k,cx+Math.cos(a)*12.5,.7,cz+Math.sin(a)*12.5,tones[i],i*1.7);}
 for(let i=0;i<5;i++){const a=i/5*Math.PI*2;k.tree(cx+Math.cos(a)*16.5,cz+Math.sin(a)*16.5,'palm',.7,.9);}
 for(const [a,cols] of [[2.2,['#1f5fae','#ffffff','#1f5fae']],[4.1,['#1f5fae','#ffffff','#1f5fae']]] as const)k.flag(cx+Math.cos(a)*8,cz+Math.sin(a)*8,[...cols],12);
 const name=new TransformNode('rotonda-name',k.scene);name.parent=k.root;name.position.set(cx-9,.7,cz);name.rotation.y=-Math.PI/2;
 k.box('rotonda-name-base',0,1.2,0,14,2.4,1.2,'#e9e3d0',0,name);k.label('ROTONDA JEAN PAUL GENIE',0,1.3,-.65,13,1.4,Math.PI,'#1f5fae','#f7f2e4',name);
 for(const f of [.84,.925]){const p=beside(route,f*route.length,-(route.width*.72+3));k.sign(f<.9?'ROTONDA JEAN PAUL GENIE →':'GALERÍAS SANTO DOMINGO ↓',p.x,p.z,p.yaw+Math.PI,10,1.4,p.y+3.2,'#fff3d0','#1f5fae');}
 // Galerías Santo Domingo.
 const g=route.course.covered[0];if(!g)return;const [a,b]=g,w=route.width,half=w*.72+.6;
 const shops=[['SIMAN','#d6402f'],['PIZZA HUT','#c8102e'],['CINEMAS','#11204a'],['LA COLONIA','#e8442c'],['TIP TOP','#f2b81f'],['CELULARES','#2f8fd0'],['ZAPATOS','#7a3d9b'],['HELADOS','#ff8fb3'],['FARMACIA','#2e8b57'],['ROPA AMERICANA','#3a6db5']];
 const glass=material(k.scene,'#bfe9ff',false,.32);glass.backFaceCulling=false;
 let n=0;for(let d=a;d<b;d+=8){const p=sample(route,d),q=sample(route,Math.min(b,d+8)),yaw=Math.atan2(q.x-p.x,q.z-p.z),mx=(p.x+q.x)/2,mz=(p.z+q.z)/2,len=Math.hypot(q.x-p.x,q.z-p.z)+.3,rx=Math.cos(yaw),rz=-Math.sin(yaw);
  for(const s of [-1,1]){const ox=mx+rx*s*(half+3.4),oz=mz+rz*s*(half+3.4);
   k.box('mall-floor',mx+rx*s*(half+1.6),.06,mz+rz*s*(half+1.6),3.4,.12,len,'#e9e3d6',yaw);
   const [shop,color]=shops[n%shops.length];n++;
   k.box('mall-shop',ox,3,oz,1.2,6,len,'#f4efe6',yaw);k.box('shop-window',ox-rx*s*.62,2,oz-rz*s*.62,.08,3,len-1.4,'#9fd4ec',yaw);
   const band=k.box('shop-band',ox-rx*s*.64,4.6,oz-rz*s*.64,.1,1.2,len-.4,color,yaw);band.material=material(k.scene,color,true);
   const lab=k.label(shop,ox-rx*s*.72,4.6,oz-rz*s*.72,Math.min(len-1,7),1,yaw+(s>0?-Math.PI/2:Math.PI/2),'#ffffff',color);void lab;
   if(n%3===0)k.crowd(mx+rx*s*(half+1.8),mz+rz*s*(half+1.8),yaw+(s>0?-Math.PI/2:Math.PI/2),3,0,1.1);}
  k.box('mall-roof-frame',mx,9.2,mz,2*half+8,.3,.4,'#d9dde2',yaw);const roof=k.box('mall-roof-glass',mx,9.4,mz,2*half+8,.1,len,'#bfe9ff',yaw);roof.material=glass;
  k.glow('mall-light',mx,8.8,mz,6,.15,.6,'#fff6d8',yaw);
 }
 for(const d of [a,b]){const p=sample(route,d),rx=Math.cos(p.yaw),rz=-Math.sin(p.yaw);for(const s of [-1,1])k.box('mall-pillar',p.x+rx*s*(half+4.4),5,p.z+rz*s*(half+4.4),2.4,10,2.4,'#e9e3d6',p.yaw);
  k.box('mall-arch',p.x,10.6,p.z,2*half+11,2.6,2,'#f4efe6',p.yaw);k.label('GALERÍAS SANTO DOMINGO',p.x-Math.sin(p.yaw)*1.05*(d===a?1:-1),10.6,p.z-Math.cos(p.yaw)*1.05*(d===a?1:-1),2*half+6,1.8,d===a?p.yaw+Math.PI:p.yaw,'#ffffff','#1b3f78');}
}
/** «Árbol de la Vida»: tall metal tree of coloured curling branches studded with lights. */
function lifeTree(k:Kit,x:number,y:number,z:number,color:string,seed:number){
 // Modelled in white in Blender; each tree gets its colour as the instance tint (props.ts).
 k.prop('arbol-vida',x,y,z,seed,1,g=>{
 k.cyl('arbol-trunk',0,5,0,10,.55,color,.35,g);
 for(let i=0;i<7;i++){const a=i/7*Math.PI*2,h=6+(i%3)*2.4;const path:Vector3[]=[];for(let t=0;t<=10;t++){const u=t/10,r=1+u*3.4;path.push(new Vector3(Math.cos(a+u*2.6)*r*.9,h+u*4.5-u*u*2.6,Math.sin(a+u*2.6)*r*.9));}
  const tube=MeshBuilder.CreateTube('arbol-branch',{path,radius:.13,tessellation:6},k.scene);tube.parent=g;tube.material=material(k.scene,color);tube.isPickable=false;
  for(let t=2;t<=10;t+=3){const p=path[t];k.glow('arbol-light',p.x,p.y,p.z,.32,.32,.32,'#fff6c2',0,g);}}
 const crown=MeshBuilder.CreateTorus('arbol-crown',{diameter:4.2,thickness:.16,tessellation:20},k.scene);crown.parent=g;crown.position.y=12.6;crown.material=material(k.scene,color);crown.isPickable=false;
 },color);
}
/* Managua — barrios a los lados, postes, Árboles de la Vida y el paso a desnivel. */
export function dressManagua(k:Kit,route:Route){
 const r=rng(1972),walls=['#e8d3a8','#c9d6c1','#e2a98b','#b9c7d6','#f0e3c4','#d7b48e'];
 for(let d=10;d<route.length;d+=16){
  if(special(route,d))continue;
  for(const side of [-1,1]){
   if(r()<.3)continue;const p=beside(route,d,(route.width*.72+9+r()*8)*side);if(p.z<-168||k.blocked(p.x,p.z,6)||Math.hypot(p.x-141,p.z-40)<62||Math.hypot(p.x+72,p.z+108)<30||Math.hypot(p.x+108,p.z+94)<28||Math.hypot(p.x+172,p.z+45)<34)continue;
   const h=6+Math.floor(r()*3)*3.5,w=8+r()*6,Y=facing(p.yaw,side),g=new TransformNode('casa',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=Y;
   const wall=walls[Math.floor(r()*walls.length)],roof=r()<.5?'#a85a3e':'#6f7a82',sx=w/10;
   // Blender models «casa-m1/2/3» (by height) and «casa-techo», 10 m wide: stretched to the house and tinted with its colours.
   k.prop('casa-m'+(Math.round((h-6)/3.5)+1),p.x,p.y,p.z,Y,[sx,1,1],c=>{const f=new TransformNode('casa-code',k.scene);f.parent=c;f.scaling.x=1/sx;
    k.box('house',0,h/2,0,w,h,8,wall,0,f);for(let fl=0;fl<h/3.5-.5;fl++)for(let i=0;i<Math.floor(w/3);i++)k.box('house-window',-w/2+1.6+i*3,2+fl*3.4,4.05,1.3,1.4,.06,'#2f5d6e',0,f);},wall);
   k.prop('casa-techo',p.x,p.y+h,p.z,Y,[sx,1,1],c=>{const f=new TransformNode('casa-code',k.scene);f.parent=c;f.scaling.x=1/sx;k.box('house-roof',0,.25,0,w+.6,.5,8.6,roof,0,f);},roof);
   if(r()<.25){k.box('pulperia-awning',0,3,5,w,.15,2.5,'#c8432f',0,g);k.label('PULPERÍA',0,4.6,4.1,4,.7,0,'#fff3d0','#c8432f',g);}
  }
 }
 // Árboles de la Vida along the avenues: mostly yellow, a few in other bright colours.
 const tones=['#f4c430','#f4c430','#f4c430','#ff6fae','#4fc3f7','#8ee36a'];let n=0;
 for(const [a,b] of [[.19,.32],[.64,.76],[.04,.1]] as const)for(let f=a;f<=b;f+=.022)for(const side of [-1,1]){const d=f*route.length;if(special(route,d))continue;const p=beside(route,d,side*(route.width*.72+4.5));if(k.blocked(p.x,p.z,1)||Math.hypot(p.x-141,p.z-40)<46)continue;lifeTree(k,p.x,p.y,p.z,tones[n%tones.length],n);n++;}
 // Street lamps every 30 m on the outside, lit at the head.
 for(let d=0;d<route.length;d+=30){if(special(route,d))continue;const p=beside(route,d,route.width*.72+1.6);if(k.onLane(p.x,p.z,2))continue;k.prop('poste',p.x,p.y,p.z,p.yaw,1,g=>{k.cyl('lamp-post',0,3.6,0,7.2,.22,'#4c5a63',undefined,g);k.glow('lamp-head',-1.2,7.1,0,1.6,.25,.6,'#fff2c2',0,g);});}
 // The overpass: signs on both levels and a painted «PASO A DESNIVEL» on the deck.
 for(const [f,text,side] of [[.16,'PASO A DESNIVEL ↓',1],[.53,'PASO A DESNIVEL ↑',1],[.79,'CALLE ROTA · CAUCE',-1]] as const){const p=beside(route,f*route.length,side*(route.width*.72+3));k.sign(text,p.x,p.z,p.yaw+Math.PI,7.5,1.4,p.y+3.2,'#fff3d0',f>.7?'#b5332a':'#1f5fae');}
 for(const f of [.6,.62]){const p=beside(route,f*route.length,0);const paint=k.label('PASO A DESNIVEL',p.x,p.y+.08,p.z,10,1.4,p.yaw+Math.PI,'#fff4d2','#3a4658');if(paint)paint.rotation.x=Math.PI/2;}
 const mirador=route.lanes.find(l=>l.id==='mirador');if(mirador){for(let s=10;s<mirador.length-6;s+=14){const p=sampleLane(mirador,s);const q={x:p.x-Math.cos(p.yaw)*(mirador.width*.5+1.6),z:p.z+Math.sin(p.yaw)*(mirador.width*.5+1.6)};k.cyl('mirador-post',q.x,p.y+.7,q.z,1.4,.18,'#7a6a52');}}
 for(let i=0;i<8;i++)k.flag(-150+i*42,-196,['#1f5fae','#ffffff','#1f5fae'],8);
}

/** The entrance of Parque Nacional Volcán Masaya as the start arch: volcanic stone pillars, a wooden beam with the
 * name, the ticket booth with its tiled roof, the park's welcome board and the rangers. */
function parkEntrance(k:Kit,route:Route){
 const s0=sample(route,0),g=new TransformNode('park-gate',k.scene);g.parent=k.root;g.position.set(s0.x,s0.y,s0.z);g.rotation.y=s0.yaw;
 const half=route.width/2+2.6,stone='#4b4440',stone2='#5d5550',wood='#7a4f2c';
 for(const s of [-1,1]){
  for(let i=0;i<5;i++)k.box('gate-stone',s*half+(i%2?.2:-.2),.8+i*1.5,0,2.6-(i%2)*.3,1.5,2.6-(i%2)*.3,i%2?stone:stone2,i*.4,g);
  k.box('gate-cap',s*half,8.1,0,3.2,.5,3.2,wood,0,g);
  // Low stone walls leaving the gate on both sides.
  k.box('park-wall',s*(half+12),.8,.4,20,1.6,1.2,stone2,0,g);for(let i=0;i<5;i++)k.box('wall-cap-stone',s*(half+4+i*4),1.75,.4,3.2,.4,1.4,stone,0,g);
 }
 k.box('gate-beam',0,8.9,0,half*2+4.5,1.3,1.4,wood,0,g);k.box('gate-roof',0,10,0,half*2+6,.5,4,'#a8553a',0,g);k.box('gate-roof-ridge',0,10.45,0,half*2+6,.35,.6,'#8a3f2a',0,g);
 k.label('PARQUE NACIONAL VOLCÁN MASAYA',0,8.9,-.75,half*2+2,1.05,Math.PI,'#fff3d0','#3d2a1a',g);k.label('BIENVENIDOS',0,8.9,.75,10,1,0,'#fff3d0','#3d2a1a',g);
 // Ticket booth (boletería) on the right with its window and a ranger.
 const b=new TransformNode('boleteria',k.scene);b.parent=g;b.position.set(half+9,0,-8);
 k.box('booth-body',0,1.7,0,5,3.4,4,'#e7d8b8',0,b);k.box('booth-roof',0,3.7,0,6.2,.5,5.2,'#a8553a',0,b);k.box('booth-window',0,2,-2.03,2.6,1.2,.06,'#3e6f80',0,b);k.label('BOLETERÍA',0,3.1,-2.05,4,.6,Math.PI,'#fff3d0','#2f5a3a',b);
 k.cyl('ranger-body',-1.6,.9,-3.2,1.4,.7,'#3d5a3a',.6,b);k.ball('ranger-head',-1.6,1.9,-3.2,.55,'#b77d58',undefined,b);k.cyl('ranger-hat',-1.6,2.2,-3.2,.15,1,'#7a6a40',1,b);
 // Welcome board with the park's rules, the classic green-and-white style.
 const board=new TransformNode('park-board',k.scene);board.parent=g;board.position.set(-(half+8),0,-12);board.rotation.y=.35;
 for(const x of [-2.6,2.6])k.cyl('board-post',x,1.6,0,3.2,.25,wood,.25,board);k.box('board',0,3,0,6.4,2.6,.2,'#2f5a3a',0,board);
 k.label('VOLCÁN MASAYA · PARQUE NACIONAL',0,3.6,-.12,6,.6,Math.PI,'#ffffff','#2f5a3a',board);k.label('NO SE DETENGA · GASES · MÁX. 15 MIN',0,2.7,-.12,6,.5,Math.PI,'#ffd33d','#2f5a3a',board);
 for(let i=0;i<3;i++)k.tree(-(half+16)-i*7,-4-i*5,'bush',0,1.2);
}
/** A volcanic rock (Blender model «rock», modelled in white, stretched by `shape` and tinted with `color`). */
export function lavaRock(k:Kit,x:number,y:number,z:number,size:number,shape:Vector3,yaw:number,color:string){
 const sx=size*.8*shape.x,sy=size*shape.y,sz=size*.8*shape.z;
 k.prop('rock',x,y,z,yaw,[sx,sy,sz],g=>{const f=new TransformNode('rock-code',k.scene);f.parent=g;f.scaling.set(1/sx,1/sy,1/sz);k.ball('lava-rock',0,size*.35,0,size*1.6,color,shape,f);},Color3.FromHexString(color).scale(1.45).toHexString());
}
/* Volcán Masaya — roca volcánica, fumarolas, miradores y avisos de peligro. */
export function dressMasaya(k:Kit,route:Route){
 parkEntrance(k,route);
 const r=rng(1529),rocks=['#4f4a45','#5e5750','#3f3b38','#6b625a'];
 for(let d=4;d<route.length;d+=7){if(special(route,d))continue;for(const side of [-1,1]){if(r()<.45)continue;const p=beside(route,d,(route.width*.72+2.5+r()*9)*side),s=1+r()*2.6;if(k.onLane(p.x,p.z,3))continue;const col=rocks[Math.floor(r()*4)],sc=new Vector3(1+r()*.6,.55+r()*.4,1+r()*.6),yaw=r()*3;lavaRock(k,p.x,p.y,p.z,s,sc,yaw,col);}}
 // Fumaroles: puffs that rise and fade from the crater and from cracks near the road.
 const vents=[{x:0,y:30,z:0,big:true},...[200,520,860,1100].filter(d=>!special(route,d)).map(d=>{const p=beside(route,d,route.width*.72+8);return{x:p.x,y:p.y,z:p.z,big:false};})];
 for(const v of vents){const g=new TransformNode('fumarole',k.scene);g.parent=k.root;g.position.set(v.x,v.y,v.z);g.metadata={animate:true};const puffs=[0,1,2,3].map(i=>{const m=MeshBuilder.CreateSphere('smoke-puff',{diameter:v.big?26:5,segments:6},k.scene);m.parent=g;const mm=material(k.scene,'#d9d3c9',false,.35);mm.disableDepthWrite=true;m.material=mm;m.metadata=i;return m;});
  k.anims.push({node:g,update:t=>{for(const m of puffs){const ph=((t*.12+(m.metadata as number)*.25)%1);m.position.y=ph*(v.big?70:16);m.scaling.setAll(.5+ph*1.4);m.visibility=(1-ph)*.9;}}});}
 for(const [d,text] of [[90,'PRECAUCIÓN: GASES'],[380,'NO SE ACERQUE AL CRÁTER'],[640,'TÚNEL DE MAGMA →'],[1010,'PARQUE NACIONAL VOLCÁN MASAYA']] as [number,string][]){if(special(route,d))continue;const p=beside(route,d,route.width*.72+1.6);k.sign(text,p.x,p.z,facing(p.yaw,1),8,1.3,p.y+2.6,'#2b2b2b','#ffd33d');}
 // Mirador: wooden deck with railing looking at the crater.
 const m=beside(route,560,-(route.width*.72+6)),deck=new TransformNode('mirador',k.scene);deck.parent=k.root;deck.position.set(m.x,m.y,m.z);deck.rotation.y=facing(m.yaw,-1);
 k.box('deck',0,.4,0,12,.3,6,'#8a6a45',0,deck);for(let i=0;i<=6;i++)k.cyl('deck-post',-6+i*2,1,-3,1.2,.15,'#6b5236',.15,deck);k.box('deck-rail',0,1.55,-3,12,.12,.12,'#6b5236',0,deck);k.crowd(m.x,m.z,facing(m.yaw,-1)+Math.PI,6,m.y+.5,1.4);
 const glow=MeshBuilder.CreateDisc('lava-glow',{radius:52,tessellation:32},k.scene);glow.parent=k.root;glow.rotation.x=Math.PI/2;glow.position.set(0,30.2,0);const gm=material(k.scene,'#ff7a2e',true,.75);glow.material=gm;
 const lava=new TransformNode('lava',k.scene);lava.parent=k.root;lava.metadata={animate:true};k.anims.push({node:lava,update:t=>{gm.emissiveColor=Color3.FromHexString('#ff7a2e').scale(.6+Math.sin(t*1.3)*.25);const lm=k.scene.getMaterialByName('course-lava') as StandardMaterial|null;if(lm){lm.emissiveColor=Color3.FromHexString('#ff5a14').scale(.85+Math.sin(t*2.1)*.2);const tex=lm.diffuseTexture as {uOffset:number}|null;if(tex)tex.uOffset=t*.02;}}});
 // Lava flows outside the tunnel windows and around the exit jump: you see where not to fall.
 const c=route.course;for(const [a,b] of c.tunnels){for(let d=a;d<=b;d+=20){const p=beside(route,d,-(route.width/2+22));const pool=MeshBuilder.CreateDisc('lava-pool',{radius:12,tessellation:16},k.scene);pool.parent=k.root;pool.rotation.x=Math.PI/2;pool.position.set(p.x,p.y-6,p.z);pool.material=k.scene.getMaterialByName('course-lava')??material(k.scene,'#ff7a2e',true);pool.isPickable=false;}
  for(let d=a-30;d<b+30;d+=11){for(const side of [-1,1]){const p=beside(route,d,side*(route.width/2+12+r()*6));k.ball('tunnel-mountain',p.x,p.y+3+r()*5,p.z,16+r()*10,rocks[Math.floor(r()*4)],new Vector3(1,.8+r()*.4,1));}}}
}

/* San Juan del Sur — malecón, pueblo, ranchos de playa, botes, el río con su puente y la subida al Cristo. */
export function dressSanJuan(k:Kit,route:Route){
 const r=rng(1898),colors=['#f2b8a0','#9fd5d1','#f6dc8c','#c7b3e6','#f4f0e4','#a8d08d'];
 for(let d=8;d<route.length;d+=15){if(special(route,d))continue;for(const side of [-1,1]){if(r()<.4)continue;const raw=route.width*.72+5+r()*8,elevated=sample(route,d).y>1,p=beside(route,d,(elevated?Math.min(raw,route.width/2+12):raw)*side);if(k.blocked(p.x,p.z,4)||p.z<-176&&p.y<1)continue; // on raised road, stay on the 14 m shelf (no floating trees)
  if(p.y>12){k.tree(p.x,p.z,r()<.6?'palm':'bush',p.y,.9);continue;}
  const Y=facing(p.yaw,side),g=new TransformNode('casa-playa',k.scene);g.parent=k.root;g.position.set(p.x,p.y,p.z);g.rotation.y=Y;const h=4.5+Math.floor(r()*2)*3.4,wall=colors[Math.floor(r()*colors.length)];
  // Blender: walls «casa-playa-1/2» tinted pastel, and the tiled roof with its balcony «teja-playa» at the house's height.
  k.prop(h>5?'casa-playa-2':'casa-playa-1',p.x,p.y,p.z,Y,1,c=>k.box('beach-house',0,h/2,0,8,h,7,wall,0,c),wall);
  k.prop('teja-playa',p.x,p.y+h,p.z,Y,1,c=>{k.box('beach-roof',0,.4,0,9,.5,8,'#a8553a',0,c);k.box('balcony',0,-1.8,3.9,7.6,.15,1.4,'#8a5a3a',0,c);for(let i=0;i<5;i++)k.box('baluster',-3.6+i*1.8,-1.3,4.55,.12,.9,.12,'#f4f0e4',0,c);});
  if(r()<.3)k.label(['RANCHO EL TIBURÓN','SURF · TABLAS','MARISCOS DOÑA LUPE','HOSPEDAJE'][Math.floor(r()*4)],0,h-.6,3.55,5,.7,0,'#fff3d0','#2f6b8f',g);
 }}
 // Boats bobbing in the bay.
 for(let i=0;i<9;i++){const g=new TransformNode('boat',k.scene);g.parent=k.root;g.position.set(-180+i*45+r()*10,-.1,-270-r()*60);g.rotation.y=r()*3;g.metadata={animate:true};k.box('hull',0,.5,0,2.2,1,6,['#f4f0e4','#2f8fd0','#d9473b'][i%3],0,g);k.box('hull-stripe',0,.85,0,2.25,.2,6.05,'#11204a',0,g);if(i%3===0){k.cyl('mast',0,4,0,7,.15,'#ddd',.15,g);k.box('sail',0,4.5,.6,.05,5,3,'#fff8ea',0,g);}
  k.anims.push({node:g,update:t=>{g.position.y=-.1+Math.sin(t*1.3+i)*.18;g.rotation.z=Math.sin(t*1.1+i*2)*.06;}});}
 // The river under the bridge and its sandy banks down to the sea.
 const river=k.box('river',-230,-.12,-52,220,.08,14,'#4aa7c0');river.material=waterMat(k.scene,'#4aa7c0',30,2);for(const dz of [-8.5,8.5])k.box('river-bank',-230,-.14,-52+dz,220,.06,3,'#d8c08a');
 const bridge=beside(route,route.length*.79,route.width*.72+3);k.sign('PUENTE DEL RÍO',bridge.x,bridge.z,bridge.yaw+Math.PI,6,1.2,bridge.y+3,'#fff3d0','#2f6b8f');
 // Beach life: umbrellas, surfboards and a lifeguard tower next to the shore lane.
 const shore=route.lanes.find(l=>l.id==='playa');
 if(shore){for(let s=8;s<shore.length;s+=13){const p=sampleLane(shore,s);for(const side of [-1,1]){const x=p.x+Math.cos(p.yaw)*(shore.width*.72+3+r()*4)*side,z=p.z-Math.sin(p.yaw)*(shore.width*.72+3+r()*4)*side;if(k.blocked(x,z,1)||side>0)continue;k.cyl('umbrella-pole',x,1.4,z,2.8,.1,'#ddd');k.cyl('beach-umbrella',x,2.8,z,.5,3.6,['#ff6f6f','#ffd33d','#4fc3f7'][Math.floor(s)%3],.2);if(r()<.4){const b=k.box('surfboard',x+1.5,1.1,z,.5,2.2,.12,['#ff8a3a','#5ff1ff','#ffd33d'][Math.floor(r()*3)]);b.rotation.z=.2;}}}
  // Palms leaning over the sand lane.
  for(let s=6;s<shore.length-4;s+=9){const p=sampleLane(shore,s);for(const side of [-1,1]){const o=(shore.width*.72+1.8+r()*2)*side,x=p.x+Math.cos(p.yaw)*o,z=p.z-Math.sin(p.yaw)*o;if(k.blocked(x,z,-shore.width*.2)&&!k.onLane(x,z,2.5))continue;k.tree(x,z,'palm',p.y,.85+r()*.3);}}
  const mid=sampleLane(shore,shore.length*.4),tower=new TransformNode('lifeguard',k.scene);tower.parent=k.root;tower.position.set(mid.x-Math.cos(mid.yaw)*(shore.width*.72+6),0,mid.z+Math.sin(mid.yaw)*(shore.width*.72+6));
  for(const [x,z] of [[-1,-1],[1,-1],[-1,1],[1,1]])k.cyl('tower-leg',x,2,z,4,.18,'#f4f0e4',.18,tower);k.box('tower-cabin',0,4.6,0,2.8,1.8,2.8,'#e8442c',0,tower);k.box('tower-roof',0,5.7,0,3.4,.3,3.4,'#f4f0e4',0,tower);}
 // The beach along the main road: palms on the sand, umbrellas, a volleyball net and surfboards stuck in the sand.
 const L=route.length;for(const [a,b] of [[.87*L,L],[0,.11*L]] as const)for(let d=a+4;d<b;d+=11){if(special(route,d))continue;for(const side of [-1,1]){const o=(route.width*.72+2.2+r()*5)*side,p=beside(route,d,o);if(k.blocked(p.x,p.z,.8))continue;
  if(r()<.55)k.tree(p.x,p.z,'palm',p.y,.9+r()*.35);else if(side<0||r()<.5){k.cyl('umbrella-pole',p.x,1.4,p.z,2.8,.1,'#ddd');k.cyl('beach-umbrella',p.x,2.8,p.z,.5,3.8,['#ff6f6f','#ffd33d','#4fc3f7','#7dffa0'][Math.floor(r()*4)],.2);k.box('beach-towel',p.x+1.4,.08,p.z,1.2,.04,2.2,['#ff8fb3','#45e0ff','#ffd33d'][Math.floor(r()*3)],p.yaw);}
  else{const b2=k.box('surfboard',p.x,1.1,p.z,.6,2.4,.14,['#ff8a3a','#5ff1ff','#ffd33d'][Math.floor(r()*3)]);b2.rotation.z=.15;}}}
 {const v=beside(route,.035*L,-(route.width*.72+12));if(!k.blocked(v.x,v.z,3)){for(const s of [-1,1])k.cyl('volley-pole',v.x+Math.sin(v.yaw)*s*4.5,1.3,v.z+Math.cos(v.yaw)*s*4.5,2.6,.15,'#f4f0e4');const net=k.box('volley-net',v.x,2.1,v.z,.05,1,9,'#ffffff',v.yaw);net.material=material(k.scene,'#ffffff',false,.5);k.crowd(v.x+Math.cos(v.yaw)*3,v.z-Math.sin(v.yaw)*3,v.yaw,2,0,1.6);}}
 // The bay: green headlands closing the horseshoe on both sides, with the sea between them.
 for(const s of [-1,1]){for(let i=0;i<4;i++)k.ball('bay-headland',s*(250+i*45),6+i*3,-240-i*55,90-i*8,i%2?'#5f9a4a':'#6fae55',new Vector3(1,.42,.8));k.ball('headland-rock',s*(225+20),2,-330,22,'#7d6a58',new Vector3(1,.6,.8));}
 for(let i=0;i<3;i++){const g=new TransformNode('sailboat',k.scene);g.parent=k.root;g.position.set(-90+i*90,-.05,-360-i*30);g.metadata={animate:true};k.box('sail-hull',0,.6,0,2.4,1.1,7,'#f4f0e4',0,g);k.cyl('sail-mast',0,5,0,9,.18,'#ddd',.18,g);const sail=k.box('sail-cloth',0,5.4,.9,.06,7,3.6,['#ff6f6f','#ffd33d','#4fc3f7'][i],0,g);sail.rotation.x=.08;
  k.anims.push({node:g,update:t=>{g.position.x=-90+i*90+Math.sin(t*.05+i)*30;g.position.y=-.05+Math.sin(t*1.2+i)*.2;g.rotation.z=Math.sin(t*.9+i)*.05;}});}
 const welcome=beside(route,30,route.width*.72+1.8);k.sign('BIENVENIDOS A SAN JUAN DEL SUR',welcome.x,welcome.z,facing(welcome.yaw,1),11,1.5,3.2,'#fff3d0','#2f6b8f');
 const climb=beside(route,700,route.width*.72+1.8);if(!special(route,700))k.sign('↑ AL CRISTO DE LA MISERICORDIA',climb.x,climb.z,facing(climb.yaw,1),10,1.4,climb.y+3,'#fff3d0','#2f6b8f');
 for(let i=0;i<4;i++){const d=200+i*260;if(special(route,d))continue;const p=beside(route,d,-(route.width*.72+3));if(k.blocked(p.x,p.z,.5))continue;k.crowd(p.x,p.z,facing(p.yaw,-1),6,p.y,1.3);}
}
