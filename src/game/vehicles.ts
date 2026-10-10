import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { vehicle } from '../../shared/content';
import { box, sphere, cylinder, tube, torus, material, mergeParts, buildCharacter, addVehicleDecals, type VehicleModel, type AlfParts } from './models';

/*
 * The six cars, rebuilt so each reads as its real model by silhouette, not by colour:
 * Jimny (boxy, upright, spare wheel, flares), Hilux double cab (tall blunt nose, four doors, bed),
 * Golf IV (rounded nose, twin round lamps, thick C-pillar hatch, ALF), Mazda 3 hatch (wedge,
 * raked glass, spoiler, round tail lamps), Matiz (tiny tall bubble, bug-eye lamps) and S-10
 * single cab (low, short cab, long bed). Arcade proportions: the windscreen is chopped and the
 * roof starts behind the pilot's head, so the big caricature heads are always in view.
 *
 * Cabin rule (every car): S = driver socket z. The head is centred at S+.24 with a radius of
 * ≈.47, so the windscreen top sits at S+.68 or further forward, the steering wheel at S+.82
 * and the roof begins at S-.32 or further back.
 */
type Sec={z:number;w:number;y0:number;y1:number;r?:number;rb?:number};
/** Smooth body shell lofted through rounded cross-sections (front to back), with flat end caps. */
function loft(scene:Scene,parent:TransformNode,name:string,secs:Sec[],color:string,seg=4){
 const rings=secs.map(s=>{const pts:[number,number][]=[],h=(s.y1-s.y0)/2-.01,r=Math.max(.02,Math.min(s.r??.2,h,s.w-.01)),rb=Math.max(.02,Math.min(s.rb??.1,h,s.w-.01));
  const arc=(cx:number,cy:number,rad:number,a0:number,a1:number)=>{for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg;pts.push([cx+Math.cos(a)*rad,cy+Math.sin(a)*rad]);}};
  arc(s.w-rb,s.y0+rb,rb,-Math.PI/2,0);arc(s.w-r,s.y1-r,r,0,Math.PI/2);arc(-(s.w-r),s.y1-r,r,Math.PI/2,Math.PI);arc(-(s.w-rb),s.y0+rb,rb,Math.PI,Math.PI*1.5);return pts;});
 const M=rings[0].length,positions:number[]=[],uvs:number[]=[],indices:number[]=[];
 rings.forEach((ring,i)=>ring.forEach(([x,y],j)=>{positions.push(x,y,secs[i].z);uvs.push(i/(rings.length-1),j/M);}));
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<M;j++){const a=i*M+j,b=i*M+(j+1)%M,c=(i+1)*M+j,d=(i+1)*M+(j+1)%M;indices.push(a,c,b,b,c,d);}
 // Caps get their own vertices so they stay flat.
 for(const [i,front] of [[0,true],[rings.length-1,false]] as const){const base=positions.length/3,ring=rings[i],cy=ring.reduce((s,p)=>s+p[1],0)/M;positions.push(0,cy,secs[i].z);uvs.push(.5,.5);ring.forEach(([x,y])=>{positions.push(x,y,secs[i].z);uvs.push(.5+x*.3,.5+y*.3);});
  for(let j=0;j<M;j++){const a=base+1+j,b=base+1+(j+1)%M;if(front)indices.push(base,b,a);else indices.push(base,a,b);}}
 let normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);
 // Faces must point outward: the right-most vertex of the second ring must face +x.
 let k=0;for(let j=0;j<M;j++)if(positions[(M+j)*3]>positions[(M+k)*3])k=j;
 if(normals[(M+k)*3]<0){for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t;}normals=[];VertexData.ComputeNormals(positions,indices,normals);}
 const mesh=new Mesh(name,scene),data=new VertexData();Object.assign(data,{positions,indices,normals,uvs});data.applyToMesh(mesh);mesh.parent=parent;mesh.material=material(scene,color);mesh.isPickable=false;return mesh;
}
type P3=[number,number,number];
/** Straight bar between two points (pillars, rails, frames). */
function bar(scene:Scene,parent:TransformNode,name:string,a:P3,b:P3,w:number,d:number,color:string){
 const A=new Vector3(...a),B=new Vector3(...b),len=Vector3.Distance(A,B),m=box(scene,parent,name,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,w,len,d,color);
 const dir=B.subtract(A).normalize();m.rotation.x=Math.atan2(dir.z,dir.y);m.rotation.z=-Math.atan2(dir.x,Math.hypot(dir.y,dir.z));return m;
}
function twoSided(scene:Scene,color:string,alpha:number){
 const name='mat2s-'+color+'-'+alpha,existing=scene.getMaterialByName(name);if(existing)return existing;
 const m=(material(scene,color,false,alpha) as StandardMaterial).clone(name);m.backFaceCulling=false;m.twoSidedLighting=true;return m;
}
/** Flat quad (glass, pillars) through four corners, visible from both sides. */
function quad(scene:Scene,parent:TransformNode,name:string,corners:P3[],color:string,alpha=1){
 const positions=corners.flat(),indices=[0,1,2,0,2,3],normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);
 const mesh=new Mesh(name,scene),data=new VertexData();Object.assign(data,{positions,indices,normals,uvs:[0,0,1,0,1,1,0,1]});data.applyToMesh(mesh);mesh.parent=parent;mesh.material=twoSided(scene,color,alpha);mesh.isPickable=false;return mesh;
}
interface Wheel { radius:number; width:number; z:[number,number]; x:number; rim:string; style:'offroad'|'alloy'|'steel'|'sport'|'cap'; lip?:string }
function wheels(scene:Scene,body:TransformNode,w:Wheel){
 const list:TransformNode[]=[],front:TransformNode[]=[],dark='#1f262e';
 for(const side of ['left','right'] as const)for(const axle of ['front','rear'] as const){
  const sign=side==='left'?-1:1,z0=axle==='front'?w.z[0]:w.z[1],pivot=new TransformNode('wheel-pivot-'+axle+'-'+side,scene);pivot.parent=body;pivot.position.set(sign*w.x,w.radius,z0);
  const spin=new TransformNode('wheel-spin-'+axle+'-'+side,scene);spin.parent=pivot;list.push(spin);if(axle==='front')front.push(pivot);
  cylinder(scene,spin,'tire',0,0,0,w.width,w.radius*2,dark).rotation.z=Math.PI/2;
  torus(scene,spin,'tire-sidewall',sign*w.width*.5,0,0,w.radius*1.62,.08,dark).rotation.z=Math.PI/2;
  cylinder(scene,spin,'rim',sign*(w.width*.5+.01),0,0,.035,w.radius*(w.style==='offroad'?1.12:1.3),w.rim).rotation.z=Math.PI/2;
  cylinder(scene,spin,'hub',sign*(w.width*.5+.04),0,0,.06,w.radius*.36,w.style==='cap'?'#d9e2ea':'#2b3440').rotation.z=Math.PI/2;
  const spokes=w.style==='offroad'?6:w.style==='steel'?4:w.style==='cap'?0:5;
  for(let i=0;i<spokes;i++){const a=i*Math.PI*2/spokes;const spoke=box(scene,spin,'spoke',sign*(w.width*.5+.035),Math.cos(a)*w.radius*.32,Math.sin(a)*w.radius*.32,.05,w.radius*(w.style==='sport'?.62:.5),w.style==='sport'?.07:w.style==='offroad'?.16:.12,w.rim);spoke.rotation.x=a;}
  if(w.style==='cap')for(let i=0;i<8;i++){const a=i*Math.PI/4;const slot=box(scene,spin,'cap-slot',sign*(w.width*.5+.03),Math.cos(a)*w.radius*.42,Math.sin(a)*w.radius*.42,.03,.1,.05,'#8a96a2');slot.rotation.x=a;}
  const blocks=w.style==='offroad'?12:8;for(let i=0;i<blocks;i++){const a=i*Math.PI*2/blocks;const tread=box(scene,spin,'tread',0,Math.cos(a)*w.radius*.99,Math.sin(a)*w.radius*.99,w.width*(w.style==='offroad'?1.04:.85),w.style==='offroad'?.07:.03,w.style==='offroad'?.16:.12,dark);tread.rotation.x=-a;}
  mergeParts(spin);
  // A dark lip over each tyre reads as the wheel arch.
  if(w.lip){const R=w.radius+.09,x=sign*(w.x+w.width*.5-.02),pts:number[][]=[];for(let i=0;i<=10;i++){const a=Math.PI*(.1+.08*i);pts.push([x,w.radius+Math.sin(a)*R,z0+Math.cos(a)*R]);}tube(scene,body,'wheel-arch',pts,.06,w.lip);}
 }
 return{wheels:list,frontWheels:front};
}
const lamp=(scene:Scene,parent:TransformNode,name:string,x:number,y:number,z:number,size:number,color:string,scale?:Vector3)=>{const m=sphere(scene,parent,name,x,y,z,size,color,scale);m.material=material(scene,color,true);return m;};
const glass='#3f6f86',seat='#334b68',interior='#25303b';
interface Cab { S:number; belt:number; yt:number; hw:number; wsBase:number; roofFront:number; frame:string; upright?:boolean; bpillar?:string }
/** Chopped windscreen, A-pillars, roof rails up to the roof, B-pillars, seats and dash. */
function cabin(scene:Scene,body:TransformNode,c:Cab){
 const topZ=c.S+(c.upright?.84:.68),topY=c.belt+.55,inner=c.hw-.13;
 for(const s of [-1,1]){
  bar(scene,body,'a-pillar',[s*(c.hw-.06),c.belt,c.wsBase],[s*inner,topY,topZ],.09,.09,c.frame);
  bar(scene,body,'roof-rail',[s*inner,topY,topZ],[s*(c.hw-.09),c.yt+.02,c.roofFront],.08,.08,c.frame);
  bar(scene,body,'b-pillar',[s*(c.hw-.05),c.belt,c.roofFront-.04],[s*(c.hw-.09),c.yt+.02,c.roofFront-.04],.12,.12,c.bpillar??c.frame);
  box(scene,body,'door-top-trim',s*(c.hw-.05),c.belt+.02,(c.wsBase+c.roofFront)/2,.1,.06,c.wsBase-c.roofFront,'#2a3038');
 }
 box(scene,body,'windscreen-top',0,topY,topZ+.02,inner*2+.08,.07,.08,c.frame);
 quad(scene,body,'low-windscreen',[[-(c.hw-.1),c.belt+.02,c.wsBase-.02],[c.hw-.1,c.belt+.02,c.wsBase-.02],[inner-.02,topY-.04,topZ+.03],[-(inner-.02),topY-.04,topZ+.03]],'#a9dcea',.32);
 for(const x of [-.43,.45])box(scene,body,'seat-back',x,c.belt-.06,c.S-.4,.57,.62,.22,seat);
 const dash=box(scene,body,'dashboard',0,c.belt+.03,Math.min(c.S+.98,c.wsBase-.12),c.hw*2-.34,.22,.3,interior);dash.rotation.x=-.1;
}
function mirrors(scene:Scene,body:TransformNode,x:number,y:number,z:number,color:string){for(const s of [-1,1]){const g=new TransformNode('mirror',scene);g.parent=body;g.position.set(s*x,y,z);box(scene,g,'mirror-shell',s*.13,0,0,.26,.17,.2,color);box(scene,g,'mirror-glass',s*.13,0,-.105,.2,.11,.018,'#83bbd2');box(scene,g,'mirror-arm',s*.02,0,.02,.12,.05,.06,interior);}}
function sideGlass(scene:Scene,body:TransformNode,x:number,y0:number,y1:number,z0:number,z1:number,top1=y1){for(const s of [-1,1])quad(scene,body,'side-glass',[[s*x,y0,z0],[s*x,y0,z1],[s*(x-.05),top1,z1],[s*(x-.05),y1,z0]],glass,.8);}

/** Suzuki Jimny 2008 (JB43): upright box, five-slot grille, round lamps in square bezels, flares, spare wheel. */
function jimny(scene:Scene,body:TransformNode,paint:string){
 const dark='#2b3036',chrome='#c9d6de',trim='#3b4248',S=-.12,belt=1.44,yt=2.12,hw=1.05,roofFront=-.44;
 loft(scene,body,'hull',[{z:1.96,w:.96,y0:.62,y1:1.28,r:.08},{z:1.9,w:1.0,y0:.56,y1:1.34,r:.1},{z:1.6,w:1.04,y0:.52,y1:1.39,r:.12},{z:.9,w:hw,y0:.5,y1:belt,r:.12},{z:-1.82,w:hw,y0:.5,y1:1.46,r:.12},{z:-1.94,w:1.0,y0:.54,y1:1.42,r:.1}],paint);
 // Clamshell hood seams and the bonnet scoop.
 for(const s of [-1,1])box(scene,body,'hood-seam',s*.8,1.405,1.25,.04,.03,.72,trim);box(scene,body,'hood-scoop',0,1.43,1.3,.6,.07,.34,trim);
 // Five vertical slots in a dark frame; round lamps in square bezels.
 box(scene,body,'grille-frame',0,1.06,1.97,1.02,.42,.04,dark);for(let i=-2;i<=2;i++)box(scene,body,'grille-slot-bar',i*.19,1.06,1.995,.07,.36,.03,paint);
 for(const s of [-1,1]){box(scene,body,'lamp-bezel',s*.72,1.08,1.965,.42,.38,.05,dark);lamp(scene,body,'headlight',s*.72,1.08,1.99,.3,'#fff1b7',new Vector3(1,1,.35));}
 box(scene,body,'front-bumper',0,.72,2.0,2.18,.26,.26,'#2a2f35');box(scene,body,'tow-hook',0,.64,2.15,.12,.12,.14,chrome);
 for(const s of [-1,1]){lamp(scene,body,'fog-lamp',s*.6,.72,2.13,.14,'#fff6d0');lamp(scene,body,'turn-signal',s*.98,.74,2.1,.14,'#ff9f35',new Vector3(1.2,.7,.5));}
 // Boxy fender flares over every wheel, side step, one long door.
 for(const s of [-1,1])for(const z of [1.3,-1.32]){box(scene,body,'fender-flare',s*1.13,1.2,z,.24,.1,1.34,trim);for(const e of [-.66,.66])box(scene,body,'fender-flare',s*1.13,.96,z+e,.24,.44,.1,trim);}
 for(const s of [-1,1]){box(scene,body,'side-step',s*1.14,.56,0,.2,.1,1.24,dark);box(scene,body,'door-line',s*1.052,1.0,roofFront-.04,.02,.82,.03,trim);box(scene,body,'door-handle',s*1.07,1.26,roofFront+.14,.04,.05,.2,chrome);}
 cabin(scene,body,{S,belt,yt,hw,wsBase:.9,roofFront,frame:paint,upright:true});
 // Flat roof over the rear, rails and a crossbar, rear quarter glass, D-pillars.
 box(scene,body,'rear-roof',0,yt+.06,(roofFront-1.92)/2,hw*2-.06,.12,roofFront+1.92,paint);
 for(const s of [-1,1]){box(scene,body,'roof-rail',s*.72,yt+.2,-1.2,.07,.07,1.34,'#58646e');for(const z of [-.6,-1.8])box(scene,body,'roof-rail-foot',s*.72,yt+.14,z,.08,.1,.1,'#58646e');
  bar(scene,body,'d-pillar',[s*(hw-.04),belt,-1.86],[s*(hw-.08),yt+.02,-1.86],.16,.16,paint);}
 box(scene,body,'roof-crossbar',0,yt+.24,-1.6,1.5,.06,.08,chrome);sideGlass(scene,body,hw-.02,belt+.06,yt-.06,-.56,-1.76);
 box(scene,body,'rear-door-panel',0,belt+.06,-1.92,hw*2-.12,.16,.06,paint);quad(scene,body,'rear-glass',[[-.84,belt+.12,-1.955],[.84,belt+.12,-1.955],[.82,yt-.08,-1.95],[-.82,yt-.08,-1.95]],glass,.55);
 // Rear: corner lamps, black bumper and the famous spare wheel on the door.
 for(const s of [-1,1])lamp(scene,body,'tail-light',s*.9,1.12,-1.96,.24,'#ee414c',new Vector3(.7,1.5,.3));box(scene,body,'rear-bumper',0,.72,-1.98,2.16,.24,.24,'#2a2f35');
 cylinder(scene,body,'spare-tire',0,1.3,-2.16,.36,1.0,'#1f262e').rotation.x=Math.PI/2;cylinder(scene,body,'spare-cover',0,1.3,-2.35,.05,.84,'#e9eef1').rotation.x=Math.PI/2;torus(scene,body,'spare-ring',0,1.3,-2.36,.86,.04,chrome).rotation.x=Math.PI/2;
 cylinder(scene,body,'exhaust',-.7,.5,-2.0,.3,.14,chrome).rotation.x=Math.PI/2;
 mirrors(scene,body,hw,belt+.2,.8,dark);
 return{S,...wheels(scene,body,{radius:.56,width:.44,z:[1.3,-1.32],x:1.08,rim:'#c7d0d6',style:'offroad'})};
}
/** Toyota Hilux 1999 double cab, or (single) Chevrolet S-10 single cab: long hood, cab, bed. */
function pickup(scene:Scene,body:TransformNode,paint:string,single:boolean){
 const dark='#2a3038',chrome='#d3dde4',trim='#4a525b';
 const S=single?-.02:.1,belt=single?1.32:1.44,yt=single?2.0:2.16,hw=single?1.08:1.1,wsBase=single?1.0:1.12,roofFront=single?-.3:-.22,cabBack=single?-.62:-1.12,bedFront=cabBack-.06,bedEnd=-2.42,front=single?2.47:2.46;
 const hull=single?[{z:front,w:.94,y0:.5,y1:1.12,r:.08},{z:2.37,w:1.04,y0:.46,y1:1.22,r:.12},{z:wsBase,w:hw,y0:.44,y1:belt,r:.12},{z:cabBack,w:hw,y0:.44,y1:belt+.01,r:.12},{z:cabBack-.04,w:hw-.04,y0:.48,y1:belt-.04,r:.1}]
  :[{z:front,w:.98,y0:.6,y1:1.3,r:.06},{z:2.38,w:1.06,y0:.55,y1:1.36,r:.1},{z:wsBase,w:hw,y0:.52,y1:belt,r:.12},{z:cabBack,w:hw,y0:.52,y1:belt+.01,r:.12},{z:cabBack-.04,w:hw-.04,y0:.55,y1:belt-.04,r:.1}];
 loft(scene,body,'hull',hull,paint);
 // The bed: floor, sides, front wall, tailgate, rear bumper.
 const bedLen=bedFront-bedEnd,bedZ=(bedFront+bedEnd)/2,lo=single?.5:.56,hi=single?1.3:1.42;
 box(scene,body,'bed-floor',0,lo+.36,bedZ,hw*2-.2,.08,bedLen,'#3a424a');box(scene,body,'bed-under',0,lo+.15,bedZ,hw*2-.1,.3,bedLen,dark);
 for(const s of [-1,1]){box(scene,body,'bed-side',s*(hw-.07),(lo+hi)/2+.08,bedZ,.14,hi-lo-.1,bedLen,paint);box(scene,body,'bed-rail',s*(hw-.07),hi+.02,bedZ,.2,.06,bedLen,single?paint:chrome);}
 box(scene,body,'bed-front-wall',0,(lo+hi)/2+.08,bedFront-.04,hw*2-.2,hi-lo-.1,.08,paint);
 box(scene,body,'tailgate',0,(lo+hi)/2+.06,bedEnd+.06,hw*2-.06,hi-lo-.12,.12,paint);box(scene,body,'tailgate-handle',0,hi-.12,bedEnd-.01,.34,.08,.05,dark);
 for(let i=-2;i<=2;i++)box(scene,body,'bed-ridge',i*.38,lo+.42,bedZ,.06,.04,bedLen-.2,'#59626b');
 for(const s of [-1,1])lamp(scene,body,'tail-light',s*(hw-.06),hi-.26,bedEnd-.01,.22,'#ee414c',new Vector3(.8,2.1,.3));
 box(scene,body,'rear-bumper',0,lo-.02,bedEnd-.04,hw*2+.02,.2,.22,single?dark:chrome);
 // Front: Hilux = tall chrome grille with three bars; S-10 = slim split grille with the gold cross.
 if(single){box(scene,body,'grille',0,.96,front,1.3,.28,.04,dark);box(scene,body,'grille-bar',0,.96,front+.02,1.34,.07,.04,paint);box(scene,body,'grille-badge-h',0,.96,front+.05,.3,.08,.03,'#e6b941');box(scene,body,'grille-badge-v',0,.96,front+.05,.1,.16,.03,'#e6b941');
  for(const s of [-1,1]){box(scene,body,'headlight-dark',s*.74,.98,front-.01,.44,.22,.06,dark);const h=box(scene,body,'headlight',s*.74,.98,front+.02,.38,.15,.04,'#fff0bd');h.material=material(scene,'#fff0bd',true);lamp(scene,body,'turn-signal',s*.99,.98,front-.1,.14,'#ff9f35',new Vector3(.6,1,1.4));}}
 else{box(scene,body,'grille',0,1.06,front,1.32,.42,.05,dark);for(const y of [.94,1.06,1.18])box(scene,body,'grille-bar',0,y,front+.03,1.34,.05,.03,chrome);box(scene,body,'grille-surround',0,1.28,front+.02,1.38,.05,.04,chrome);box(scene,body,'grille-badge',0,1.06,front+.06,.24,.16,.03,chrome);
  for(const s of [-1,1]){box(scene,body,'headlight-dark',s*.84,1.1,front-.01,.3,.3,.06,dark);const h=box(scene,body,'headlight',s*.84,1.11,front+.02,.24,.22,.04,'#fff0bd');h.material=material(scene,'#fff0bd',true);lamp(scene,body,'turn-signal',s*.84,.9,front,.16,'#ff9f35',new Vector3(1.4,.6,.5));}}
 box(scene,body,'front-bumper',0,single?.62:.7,front+.06,hw*2+.04,.24,.24,single?dark:chrome);box(scene,body,'front-valance',0,single?.5:.56,front-.02,hw*2-.2,.12,.2,dark);
 cabin(scene,body,{S,belt,yt,hw,wsBase,roofFront,frame:paint});
 // Roof over the rear seats (double cab) or just the back of the single cab; see-through rear glass.
 box(scene,body,'rear-roof',0,yt+.06,(roofFront+cabBack-.02)/2,hw*2-.04,.12,roofFront-cabBack+.06,paint);
 for(const s of [-1,1]){bar(scene,body,'c-pillar',[s*(hw-.04),belt,cabBack+.04],[s*(hw-.08),yt+.02,cabBack+.04],.16,.12,paint);box(scene,body,'door-handle',s*(hw+.01),belt-.16,single?.3:.5,.04,.05,.2,chrome);
  box(scene,body,'door-line',s*(hw+.002),1.0,roofFront-.04,.02,.8,.03,trim);if(!single)box(scene,body,'rear-door-handle',s*(hw+.01),belt-.16,-.6,.04,.05,.18,chrome);}
 if(!single)sideGlass(scene,body,hw-.02,belt+.06,yt-.06,roofFront-.12,cabBack+.12);
 quad(scene,body,'cab-rear-glass',[[-(hw-.12),belt+.02,cabBack-.02],[hw-.12,belt+.02,cabBack-.02],[hw-.14,yt,cabBack-.02],[-(hw-.14),yt,cabBack-.02]],glass,.5);
 mirrors(scene,body,hw,belt+.2,wsBase-.15,dark);
 // Hilux 4x4: running boards, black over-fenders and a front-door seam so all four doors read.
 if(!single)for(const s of [-1,1]){box(scene,body,'running-board',s*(hw+.08),.58,(wsBase+cabBack)/2-.1,.18,.08,1.5,dark);box(scene,body,'door-line',s*(hw+.002),1.0,wsBase-.06,.02,.8,.03,trim);box(scene,body,'door-line',s*(hw+.002),1.0,cabBack+.1,.02,.8,.03,trim);
  for(const z of [1.62,-1.62]){const pts:number[][]=[];for(let i=0;i<=10;i++){const a=Math.PI*(.06+.088*i);pts.push([s*(hw+.16),.53+Math.sin(a)*.66,z+Math.cos(a)*.66]);}tube(scene,body,'over-fender',pts,.1,'#2b3036');}}
 return{S,...wheels(scene,body,single?{radius:.5,width:.38,z:[1.6,-1.55],x:hw,rim:'#e8ecef',style:'cap',lip:trim}:{radius:.55,width:.44,z:[1.62,-1.62],x:hw+.04,rim:'#aab4bc',style:'steel'})};
}
/** Volkswagen Golf IV: soft rounded nose, twin round lamps under clear covers, thick C-pillar hatch. */
function golf(scene:Scene,body:TransformNode,paint:string){
 const dark='#2a3038',chrome='#d6dfe6',trim='#3b434c',S=-.07,belt=1.32,yt=2.06,hw=1.04,roofFront=-.39;
 loft(scene,body,'hull',[{z:2.12,w:.92,y0:.5,y1:1.06,r:.2,rb:.16},{z:2.04,w:1.0,y0:.46,y1:1.16,r:.22},{z:1.7,w:1.03,y0:.44,y1:1.24,r:.24},{z:.95,w:hw,y0:.44,y1:belt,r:.24},{z:-1.62,w:hw,y0:.44,y1:1.38,r:.24},{z:-2.0,w:.98,y0:.5,y1:1.34,r:.22},{z:-2.08,w:.9,y0:.56,y1:1.22,r:.2}],paint);
 // Slim grille with the round badge between teardrop clear covers, two round lamps in each.
 box(scene,body,'grille',0,.98,2.12,.86,.14,.04,dark);torus(scene,body,'badge-ring',0,.99,2.15,.2,.035,chrome).rotation.x=Math.PI/2;cylinder(scene,body,'badge',0,.99,2.145,.02,.18,'#1d3f8a').rotation.x=Math.PI/2;
 for(const s of [-1,1]){const cover=sphere(scene,body,'headlight-cover',s*.62,1.0,2.06,.62,'#c8dce6',new Vector3(1.05,.46,.34));cover.material=material(scene,'#c8dce6',false,.55);
  lamp(scene,body,'headlight',s*.5,1.0,2.1,.21,'#fff1b7');lamp(scene,body,'headlight',s*.75,1.0,2.07,.19,'#fff1b7');lamp(scene,body,'turn-signal',s*.89,.94,2.0,.12,'#ff9f35');}
 box(scene,body,'front-bumper',0,.7,2.08,2.02,.24,.2,paint);box(scene,body,'front-intake',0,.62,2.17,1.1,.12,.04,dark);for(const s of [-1,1])lamp(scene,body,'fog-lamp',s*.72,.62,2.17,.13,'#fff6d0');
 for(const s of [-1,1]){box(scene,body,'side-rubbing-strip',s*1.045,.92,0,.03,.08,3.0,trim);box(scene,body,'door-handle',s*1.06,1.2,.05,.04,.05,.18,trim);box(scene,body,'door-handle',s*1.06,1.22,-.7,.04,.05,.18,trim);box(scene,body,'door-line',s*1.045,.95,roofFront-.04,.02,.74,.03,trim);}
 cabin(scene,body,{S,belt,yt,hw,wsBase:.95,roofFront,frame:paint,bpillar:dark});
 // Rear doors, the Golf IV signature (a wide, solid C-pillar) and the steep hatch.
 box(scene,body,'rear-roof',0,yt+.04,(roofFront-1.62)/2,hw*2-.14,.12,1.62+roofFront,paint);sideGlass(scene,body,hw-.03,belt+.06,yt-.05,roofFront-.1,-1.0);
 for(const s of [-1,1])quad(scene,body,'c-pillar',[[s*(hw-.02),belt+.04,-1.0],[s*(hw-.04),belt+.08,-1.98],[s*(hw-.12),yt-.02,-1.58],[s*(hw-.1),yt+.02,-1.0]],paint);
 box(scene,body,'hatch-panel',0,1.41,-2.0,1.8,.16,.06,paint);quad(scene,body,'hatch-glass',[[-.84,1.48,-1.99],[.84,1.48,-1.99],[.8,yt-.04,-1.6],[-.8,yt-.04,-1.6]],glass,.55);box(scene,body,'hatch-lip',0,yt+.02,-1.62,1.66,.06,.16,paint);box(scene,body,'rear-wiper',.1,1.62,-1.95,.5,.03,.03,dark);
 // Wide two-tone tail lamps, round badge, bumper and plate recess.
 for(const s of [-1,1]){box(scene,body,'tail-light',s*.68,1.16,-2.08,.5,.2,.05,'#d72f3c').material=material(scene,'#d72f3c',true);box(scene,body,'tail-light-inner',s*.47,1.16,-2.11,.14,.18,.04,'#ff9fa5');}
 torus(scene,body,'rear-badge',0,1.18,-2.11,.18,.03,chrome).rotation.x=Math.PI/2;box(scene,body,'rear-bumper',0,.7,-2.06,2.0,.24,.2,paint);box(scene,body,'plate-recess',0,.92,-2.09,.6,.2,.03,dark);
 cylinder(scene,body,'exhaust',-.6,.52,-2.1,.25,.12,chrome).rotation.x=Math.PI/2;
 mirrors(scene,body,hw,belt+.18,.8,paint);
 return{S,...wheels(scene,body,{radius:.48,width:.36,z:[1.36,-1.32],x:1.04,rim:'#c9d2d9',style:'alloy',lip:trim})};
}
/** Mazda 3 hatchback (1st gen): low wedge nose, five-point grille, swept lamps, raked glass, spoiler, round tail lamps. */
function mazda(scene:Scene,body:TransformNode,paint:string){
 const dark='#242a31',chrome='#d6dfe6',S=-.07,belt=1.28,yt=1.98,hw=1.05,roofFront=-.39;
 loft(scene,body,'hull',[{z:2.14,w:.92,y0:.45,y1:.82,r:.16,rb:.14},{z:2.0,w:1.0,y0:.42,y1:.98,r:.18},{z:1.6,w:1.04,y0:.4,y1:1.1,r:.2},{z:1.15,w:hw,y0:.4,y1:belt-.04,r:.22},{z:.6,w:hw,y0:.4,y1:belt+.02,r:.24},{z:-1.58,w:hw,y0:.42,y1:1.46,r:.24},{z:-2.04,w:.98,y0:.48,y1:1.42,r:.22}],paint);
 // Five-point grille, wide lower mouth, long swept-back lamps climbing the fenders.
 box(scene,body,'grille',0,.8,2.11,.5,.14,.05,dark);box(scene,body,'grille-chrome',0,.89,2.08,.6,.04,.04,chrome);box(scene,body,'grille-point',0,.71,2.11,.2,.08,.05,dark);box(scene,body,'badge',0,.82,2.14,.12,.1,.03,chrome);
 box(scene,body,'lower-mouth',0,.58,2.12,1.3,.16,.05,dark);for(const s of [-1,1])lamp(scene,body,'fog-lamp',s*.7,.58,2.14,.13,'#fff6d0');
 for(const s of [-1,1]){const h=box(scene,body,'headlight-dark',s*.68,.95,1.86,.46,.15,.56,'#1f2830');h.rotation.y=s*.62;h.rotation.x=-.22;const c=box(scene,body,'headlight-cover',s*.68,.97,1.87,.48,.1,.58,'#c8dce6');c.rotation.y=s*.62;c.rotation.x=-.22;c.material=material(scene,'#c8dce6',false,.5);lamp(scene,body,'headlight',s*.6,.97,1.98,.19,'#fff1b7');lamp(scene,body,'headlight',s*.78,1.01,1.86,.15,'#fff1b7');}
 for(const s of [-1,1]){bar(scene,body,'character-line',[s*1.05,1.0,1.6],[s*1.06,1.24,-1.7],.03,.04,'#c55a18');box(scene,body,'door-handle',s*1.07,1.16,.05,.04,.05,.18,chrome);box(scene,body,'door-handle',s*1.07,1.24,-.75,.04,.05,.18,chrome);box(scene,body,'door-line',s*1.05,.95,roofFront-.04,.02,.8,.03,dark);}
 cabin(scene,body,{S,belt:belt-.04,yt,hw,wsBase:1.15,roofFront,frame:dark});
 // Sloping roof, blacked-out pillars, rising window line, steep hatch with spoiler.
 const roof=box(scene,body,'rear-roof',0,yt,(roofFront-1.64)/2,hw*2-.16,.12,1.64+roofFront,paint);roof.rotation.x=-.07;
 sideGlass(scene,body,hw-.03,1.4,yt-.05,roofFront-.1,-1.3,yt-.12);
 for(const s of [-1,1])quad(scene,body,'c-pillar',[[s*(hw-.02),1.44,-1.3],[s*(hw-.04),1.48,-2.02],[s*(hw-.14),yt-.1,-1.66],[s*(hw-.12),yt-.08,-1.32]],paint);
 box(scene,body,'hatch-panel',0,1.46,-2.02,1.8,.1,.06,paint);quad(scene,body,'hatch-glass',[[-.82,1.5,-2.03],[.82,1.5,-2.03],[.78,yt-.08,-1.66],[-.78,yt-.08,-1.66]],glass,.55);
 const spoiler=box(scene,body,'rear-spoiler',0,yt+.01,-1.72,1.6,.06,.3,paint);spoiler.rotation.x=.1;box(scene,body,'spoiler-brake-light',0,yt-.01,-1.95,.5,.04,.03,'#ff3b46');
 for(const s of [-1,1]){const housing=sphere(scene,body,'tail-housing',s*.68,1.24,-2.03,.5,'#f2f2f2',new Vector3(1.2,.75,.3));housing.material=material(scene,'#f2f2f2',false,.45);lamp(scene,body,'tail-light',s*.58,1.24,-2.08,.22,'#ee414c',new Vector3(1,1,.3));lamp(scene,body,'tail-light',s*.8,1.24,-2.06,.19,'#ee414c',new Vector3(1,1,.3));
  cylinder(scene,body,'exhaust',s*.5,.5,-2.08,.22,.13,chrome).rotation.x=Math.PI/2;}
 box(scene,body,'rear-bumper',0,.66,-2.04,1.98,.22,.18,paint);box(scene,body,'rear-diffuser',0,.52,-2.1,1.3,.1,.08,dark);
 mirrors(scene,body,hw,belt+.16,1.0,paint);
 return{S,...wheels(scene,body,{radius:.49,width:.38,z:[1.38,-1.3],x:1.05,rim:'#2e3238',style:'sport',lip:dark})};
}
/** Daewoo Matiz: tiny and tall, short nose, big bug-eye lamps on the hood corners, tall roof, upright tail. */
function matiz(scene:Scene,body:TransformNode,paint:string){
 const dark='#1b2228',chrome='#c9d2d9',S=-.24,belt=1.4,yt=2.14,hw=.95,roofFront=-.56;
 loft(scene,body,'hull',[{z:1.72,w:.82,y0:.52,y1:.98,r:.26,rb:.18},{z:1.62,w:.9,y0:.46,y1:1.12,r:.3},{z:1.28,w:.94,y0:.44,y1:1.3,r:.32},{z:.78,w:hw,y0:.44,y1:belt,r:.32},{z:-1.52,w:hw,y0:.44,y1:1.43,r:.3},{z:-1.72,w:.88,y0:.5,y1:1.4,r:.28}],paint);
 // The bug eyes wrap onto the hood; a small smiling grille below.
 for(const s of [-1,1]){const eye=sphere(scene,body,'headlight-cover',s*.54,1.2,1.42,.62,'#dbe9f0',new Vector3(1,.72,.92));eye.material=material(scene,'#dbe9f0',false,.6);lamp(scene,body,'headlight',s*.54,1.2,1.52,.34,'#fff1b7',new Vector3(1,.8,.6));lamp(scene,body,'turn-signal',s*.8,1.08,1.4,.14,'#ff9f35');}
 tube(scene,body,'grille-smile',[[-.32,.86,1.72],[0,.8,1.76],[.32,.86,1.72]],.05,dark);box(scene,body,'badge',0,.98,1.74,.14,.1,.03,chrome);
 box(scene,body,'front-bumper',0,.66,1.72,1.82,.2,.16,paint);box(scene,body,'front-intake',0,.6,1.8,.9,.1,.04,dark);
 for(const s of [-1,1]){box(scene,body,'door-handle',s*.97,1.28,-.1,.04,.05,.16,chrome);box(scene,body,'door-line',s*.95,.98,roofFront-.04,.02,.82,.03,dark);}
 cabin(scene,body,{S,belt,yt,hw,wsBase:.78,roofFront,frame:paint,bpillar:dark});
 // Tall roof, rear door glass, thick D-pillar and the near-vertical hatch.
 box(scene,body,'rear-roof',0,yt+.05,(roofFront-1.6)/2,hw*2-.12,.12,1.6+roofFront,paint);sideGlass(scene,body,hw-.03,belt+.06,yt-.06,roofFront-.1,-1.3);
 for(const s of [-1,1])quad(scene,body,'d-pillar',[[s*(hw-.02),belt+.04,-1.3],[s*(hw-.04),belt+.04,-1.7],[s*(hw-.1),yt,-1.56],[s*(hw-.08),yt,-1.3]],paint);
 box(scene,body,'hatch-panel',0,1.49,-1.7,1.6,.16,.06,paint);quad(scene,body,'hatch-glass',[[-.74,1.56,-1.71],[.74,1.56,-1.71],[.72,yt-.06,-1.57],[-.72,yt-.06,-1.57]],glass,.55);box(scene,body,'rear-spoiler',0,yt+.02,-1.56,1.5,.06,.24,dark);
 // Tall tail lamps up the D-pillars.
 for(const s of [-1,1]){box(scene,body,'tail-light',s*.8,1.56,-1.71,.16,.5,.06,'#ee414c').material=material(scene,'#ee414c',true);box(scene,body,'tail-amber',s*.8,1.24,-1.73,.15,.12,.05,'#ff9f35');}
 box(scene,body,'rear-bumper',0,.68,-1.72,1.8,.2,.16,paint);box(scene,body,'plate-recess',0,.9,-1.735,.56,.2,.03,dark);
 mirrors(scene,body,hw,belt+.18,.64,paint);
 return{S,...wheels(scene,body,{radius:.44,width:.32,z:[1.12,-1.1],x:.96,rim:'#9aa6b0',style:'cap',lip:dark})};
}
/** ALF plush, built in parts (body, head, two arms) so he can wave, look back and cheer. */
export function buildAlf(scene:Scene,parent:TransformNode){
 const root=new TransformNode('ALF-plush',scene);root.parent=parent;root.position.set(.47,1.16,.3);root.scaling.setAll(1.12);
 const fur='#b98350',light='#d0a471',dark='#5f3d2b';
 const torso=new TransformNode('alf-torso',scene);torso.parent=root;sphere(scene,torso,'alf-body',0,.26,0,.82,fur,new Vector3(.83,1.08,.76));sphere(scene,torso,'alf-belly',0,.22,.22,.5,light,new Vector3(.9,1.1,.5));
 const head=new TransformNode('alf-head-pivot',scene);head.parent=root;head.position.set(0,.62,0);
 sphere(scene,head,'alf-head',0,.36,0,.8,fur,new Vector3(.98,1.02,.91));sphere(scene,head,'alf-snout',0,.27,.44,.66,light,new Vector3(.84,.66,1.4));sphere(scene,head,'alf-nose',0,.3,.84,.24,dark,new Vector3(.8,.7,.65));
 for(const x of [-1,1]){const ear=sphere(scene,head,'alf-ear',x*.36,.61,-.01,.39,fur,new Vector3(.65,1.32,.42));ear.rotation.z=x*-.36;sphere(scene,head,'alf-ear-inner',x*.38,.64,.065,.24,light,new Vector3(.5,1.3,.3));sphere(scene,head,'alf-eye-white',x*.165,.5,.318,.15,'#fff4df');sphere(scene,head,'alf-eye',x*.165,.5,.38,.09,'#171e27');}
 tube(scene,head,'alf-mouth',[[-.2,.15,.61],[0,.11,.68],[.2,.15,.61]],.03,dark);
 for(let i=0;i<4;i++){const tuft=cylinder(scene,head,'alf-tuft',(i-1.5)*.11,.85,-.07,.39,.17,dark,.025);tuft.rotation.z=(i-1.5)*-.12;}
 for(let i=0;i<3;i++)torus(scene,head,'alf-nose-ridge',0,.27,.5+i*.07,.39-i*.025,.025,fur).rotation.x=Math.PI/2;
 const arms:TransformNode[]=[];
 for(const x of [-1,1]){const arm=new TransformNode(x<0?'alf-arm-left':'alf-arm-right',scene);arm.parent=root;arm.position.set(x*.3,.5,.05);tube(scene,arm,'alf-arm',[[0,0,0],[x*.08,-.3,.17],[0,-.32,.33]],.13,fur);sphere(scene,arm,'alf-hand',0,-.34,.35,.27,light);arms.push(arm);mergeParts(arm);}
 mergeParts(torso);mergeParts(head);
 const parts:AlfParts={head,armL:arms[0],armR:arms[1]};return{root,parts};
}

export function buildVehicle(scene:Scene,id:string,characterId?:string):VehicleModel{
 const v=vehicle(id),root=new TransformNode('vehicle-'+id,scene),body=new TransformNode('body',scene);body.parent=root;const paint=v.color;
 const built=v.kind==='suv'?jimny(scene,body,paint):v.kind==='pickup-double'?pickup(scene,body,paint,false):v.kind==='pickup-single'?pickup(scene,body,paint,true):v.kind==='golf'?golf(scene,body,paint):v.kind==='mazda'?mazda(scene,body,paint):matiz(scene,body,paint);
 const driverSocket=new TransformNode('driver-socket',scene);driverSocket.parent=body;driverSocket.position.z=built.S;
 const passengerSocket=new TransformNode('passenger-socket',scene);passengerSocket.parent=body;passengerSocket.position.set(.48,1.04,built.S+.22);
 let alf:TransformNode|undefined,alfParts:AlfParts|undefined;if(v.kind==='golf'){const a=buildAlf(scene,body);alf=a.root;alfParts=a.parts;alf.position.z=built.S+.3;}
 mergeParts(body,false);addVehicleDecals(scene,body,id);const driver=characterId?buildCharacter(scene,characterId,driverSocket):undefined;
 return{root,body,driverSocket,passengerSocket,alf,alfParts,wheels:built.wheels,frontWheels:built.frontWheels,driver};
}
