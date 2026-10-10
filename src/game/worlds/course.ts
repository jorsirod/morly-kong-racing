import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { sample, sampleLane, type Route } from '../../../shared/track';
import { rampHeight, type CRamp, type Lane } from '../../../shared/course';
import { material, textLabel } from '../models';
import { Kit, rng, surfaceTexture } from './kit';
import '@babylonjs/core/Meshes/Builders/ribbonBuilder';

/*
 * Visual layer for shared/course.ts: every ramp, pad, gap and open edge drawn here is exactly
 * where the physics puts it. Static pieces are merged by material in buildWorld.
 */
type Frame={x:number;y:number;z:number;yaw:number};
export interface TrackStyle { road:string; rough:string; barrier:{body:string;top:string;stripe?:string;h:number;post?:boolean}; skirt:'grass'|'rock'|'dirt'|'sand'; skirtColor:string; shelf:number; ramp:'stripes'|'wood'|'neon'|'rock'; lane:Record<string,{kind:'court'|'dirt'|'concrete'|'neon'|'rock'|'planks';color:string}>; night?:boolean }
const SIDE=[-1,1] as const;
const at=(f:Frame,offset:number,lift=0)=>new Vector3(f.x+Math.cos(f.yaw)*offset,f.y+lift,f.z-Math.sin(f.yaw)*offset);
const within=(s:number,a:number,b:number)=>s>=a&&s<=b;

/** Cached canvas textures for course pieces (stripes, chevrons, planks, lava, water, court). */
function canvasMaterial(scene:Scene,key:string,paint:(ctx:CanvasRenderingContext2D,size:number)=>void,opts:{emissive?:string;alpha?:boolean;size?:number;wrap?:boolean}={}){
 const name='course-'+key,cached=scene.getMaterialByName(name) as StandardMaterial|null;if(cached)return cached;
 const m=new StandardMaterial(name,scene);m.specularColor=new Color3(.08,.08,.08);
 if(typeof document!=='undefined'){const size=opts.size??128,tex=new DynamicTexture(name,{width:size,height:size},scene,true),ctx=tex.getContext() as CanvasRenderingContext2D;paint(ctx,size);tex.update();if(opts.wrap!==false){tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;}tex.hasAlpha=!!opts.alpha;m.diffuseTexture=tex;if(opts.alpha)m.useAlphaFromDiffuseTexture=true;}
 if(opts.emissive){m.emissiveColor=Color3.FromHexString(opts.emissive);}
 return m;
}
export const stripesMat=(scene:Scene,a='#ffd33d',b='#13234d')=>canvasMaterial(scene,'stripes'+a+b,(c,s)=>{c.fillStyle=b;c.fillRect(0,0,s,s);c.fillStyle=a;for(let i=-s;i<s*2;i+=s/2){c.beginPath();c.moveTo(i,0);c.lineTo(i+s/4,0);c.lineTo(i+s/4-s,s);c.lineTo(i-s,s);c.fill();}},{emissive:'#2a2410'});
const chevronMat=(scene:Scene,color:string,glow:string)=>canvasMaterial(scene,'chevron'+color,(c,s)=>{c.fillStyle='rgba(10,20,50,.55)';c.fillRect(0,0,s,s);c.strokeStyle=color;c.lineWidth=s*.14;c.lineJoin='round';for(const y of [s*.3,s*.78]){c.beginPath();c.moveTo(s*.16,y);c.lineTo(s*.5,y-s*.24);c.lineTo(s*.84,y);c.stroke();}},{emissive:glow,alpha:true});
const plankMat=(scene:Scene,base:string)=>canvasMaterial(scene,'planks'+base,(c,s)=>{const r=rng(base.length*31);c.fillStyle=base;c.fillRect(0,0,s,s);for(let i=0;i<8;i++){c.fillStyle=`rgba(${60+r()*40},${40+r()*25},20,${.18+r()*.2})`;c.fillRect(0,i*s/8,s,s/8-2);c.fillStyle='rgba(40,25,10,.6)';c.fillRect(0,i*s/8+s/8-2,s,2);c.fillRect(r()*s,i*s/8,2,s/8);}});
export const lavaMat=(scene:Scene)=>canvasMaterial(scene,'lava',(c,s)=>{const r=rng(77);c.fillStyle='#ff6a1f';c.fillRect(0,0,s,s);for(let i=0;i<40;i++){c.fillStyle=r()<.5?'rgba(255,214,90,.75)':'rgba(140,30,10,.55)';c.beginPath();c.ellipse(r()*s,r()*s,4+r()*14,3+r()*8,r()*3,0,Math.PI*2);c.fill();}},{emissive:'#ff5a14'});
export const waterMat=(scene:Scene,color='#3f9fc4')=>{const m=canvasMaterial(scene,'water'+color,(c,s)=>{const r=rng(5);c.fillStyle=color;c.fillRect(0,0,s,s);c.strokeStyle='rgba(255,255,255,.35)';c.lineWidth=2;for(let i=0;i<14;i++){const x=r()*s,y=r()*s;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+8,y-4,x+16,y);c.stroke();}},{emissive:'#0d3346'});m.alpha=.92;return m;};
const mudMat=(scene:Scene)=>canvasMaterial(scene,'mud',(c,s)=>{const r=rng(9);c.fillStyle='#5c4630';c.fillRect(0,0,s,s);for(let i=0;i<50;i++){c.fillStyle=r()<.5?'rgba(40,28,16,.6)':'rgba(130,100,60,.4)';c.beginPath();c.ellipse(r()*s,r()*s,3+r()*10,2+r()*6,r()*3,0,Math.PI*2);c.fill();}});
const courtMat=(scene:Scene)=>canvasMaterial(scene,'court',(c,s)=>{c.fillStyle='#d98852';c.fillRect(0,0,s,s);c.strokeStyle='#fff2ce';c.lineWidth=4;c.strokeRect(6,6,s-12,s-12);c.beginPath();c.moveTo(s/2,6);c.lineTo(s/2,s-6);c.stroke();c.beginPath();c.arc(s/2,s/2,s*.16,0,Math.PI*2);c.stroke();});
const neonFloor=(scene:Scene)=>canvasMaterial(scene,'neonfloor',(c,s)=>{const cols=['#ff5fb0','#45e0ff','#ffd33d','#8bff6a'];for(let i=0;i<4;i++)for(let j=0;j<4;j++){c.fillStyle=cols[(i+j*3)%4];c.fillRect(i*s/4+2,j*s/4+2,s/4-4,s/4-4);}},{emissive:'#3a2a4a'});
function laneSurface(scene:Scene,kind:TrackStyle['lane'][string]['kind'],color:string){
 if(kind==='court')return courtMat(scene);if(kind==='neon')return neonFloor(scene);if(kind==='planks')return plankMat(scene,color);
 return surfaceTexture(scene,kind==='dirt'?'dirt':kind==='rock'?'rock':'asphalt',color);
}
/** Ribbon between two polylines (left/right) with UVs tiled every `tile` metres along the road. */
function strip(scene:Scene,root:TransformNode,name:string,left:Vector3[],right:Vector3[],mat:StandardMaterial,tile=14,across=1){
 if(left.length<2)return null;
 const positions:number[]=[],uvs:number[]=[],indices:number[]=[];let run=0;
 for(let i=0;i<left.length;i++){if(i)run+=Vector3.Distance(left[i],left[i-1]);positions.push(left[i].x,left[i].y,left[i].z,right[i].x,right[i].y,right[i].z);uvs.push(run/tile,0,run/tile,across);}
 for(let i=0;i<left.length-1;i++){const a=i*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
 let normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);
 // Ground-like strips must face up (lit from the sky); flip the winding when they came out upside down.
 let up=0;for(let i=1;i<normals.length;i+=3)up+=normals[i];
 if(up<0){for(let i=0;i<indices.length;i+=3){const t=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=t;}normals=[];VertexData.ComputeNormals(positions,indices,normals);}
 const mesh=new Mesh(name,scene),data=new VertexData();Object.assign(data,{positions,indices,uvs,normals});data.applyToMesh(mesh);mesh.parent=root;mesh.material=mat;mesh.isPickable=false;
 // Visible from below too (bridges, gaps) without a second mesh.
 mat.backFaceCulling=false;return mesh;
}
/** Splits [0,L) into the ranges not covered by `holes` (each [a,b]). */
function ranges(length:number,holes:[number,number][]){const sorted=[...holes].sort((a,b)=>a[0]-b[0]);const out:[number,number][]=[];let cur=0;for(const [a,b] of sorted){if(a>cur)out.push([cur,a]);cur=Math.max(cur,b);}if(cur<length)out.push([cur,length]);return out;}
function frames(get:(d:number)=>Frame,from:number,to:number,step=2.5){const out:Frame[]=[];for(let d=from;d<to;d+=step)out.push(get(d));out.push(get(to));return out;}

export function buildCourse(kit:Kit,route:Route,trackId:string,style:TrackStyle){
 const scene=kit.scene,root=kit.root,c=route.course,L=route.length,w=route.width,half=w/2,mainAt=(d:number)=>sample(route,d) as Frame;
 const gapsMain=c.gaps.filter(g=>g.lane==='').map(g=>[g.from,g.to] as [number,number]);
 const roadMat=surfaceTexture(scene,'asphalt',style.road),roughMat=surfaceTexture(scene,'dirt',style.rough);
 const rt=roadMat.diffuseTexture as Texture|null;if(rt){rt.vScale=1.2;}
 // ── Main road, broken at the gaps ──
 for(const [a,b] of ranges(L,gapsMain)){
  const f=frames(mainAt,a,b);strip(scene,root,'road',f.map(p=>at(p,-half,.035)),f.map(p=>at(p,half,.035)),roadMat);
  for(const [ra,rb] of c.rough){const lo=Math.max(a,ra),hi=Math.min(b,rb);if(hi-lo<2)continue;const g=frames(mainAt,lo,hi);strip(scene,root,'rough-road',g.map(p=>at(p,-half,.05)),g.map(p=>at(p,half,.05)),roughMat);}
 }
 // Centre dashes and kerbs, skipped over gaps and ramps.
 const busy=(d:number)=>gapsMain.some(([a,b])=>within(d,a-3,b+3))||c.ramps.some(r=>r.lane===''&&within(d,r.at-2,r.at+r.len+2));
 const open=(lane:string,s:number,side:number)=>c.edges.some(e=>e.lane===lane&&within(s,e.from,e.to)&&(e.side===0||e.side===side));
 for(let d=0;d<L;d+=12){if(busy(d))continue;const p=mainAt(d);const stripe=kit.box('lane',p.x,p.y+.065,p.z,.24,.035,4,'#f4e3ba',p.yaw);stripe.rotation.y=p.yaw;
  for(const side of SIDE){if(open('',d,side))continue;const q=at(p,(half+.2)*side,.2);kit.box('curb',q.x,q.y,q.z,.45,.35,5.6,Math.floor(d/12)%2?'#fff0c9':'#ed604d',p.yaw);}}
 // ── Alternative lanes ──
 for(const lane of route.lanes){
  const look=style.lane[lane.id]??{kind:'dirt',color:style.rough},mat=laneSurface(scene,look.kind,look.color),lh=lane.width/2,laneAt=(s:number)=>sampleLane(lane,s) as Frame;
  const holes=c.gaps.filter(g=>g.lane===lane.id).map(g=>[g.from,g.to] as [number,number]);
  for(const [a,b] of ranges(lane.length,holes)){const f=frames(laneAt,a,b,2);strip(scene,root,'lane-road',f.map(p=>at(p,-lh,.06)),f.map(p=>at(p,lh,.06)),mat,look.kind==='court'?20:10);}
  // Edge lines so the lane reads as a road, and a tall entry sign with the risk.
  for(let s=4;s<lane.length-4;s+=3){if(holes.some(([a,b])=>within(s,a-1,b+1)))continue;const p=laneAt(s);for(const side of SIDE){if(open(lane.id,s,side))continue;const q=at(p,(lh-.25)*side,.08);kit.box('lane-edge',q.x,q.y,q.z,.22,.03,2.4,'#fff4d2',p.yaw);}}
  const entry=laneAt(Math.min(14,lane.length*.1)),sign=at(entry,(lh+2.4)*(entry.yaw>0?1:-1));
  kit.sign(lane.sign,sign.x,sign.z,entry.yaw+Math.PI,7.5,1.4,entry.y+3.2,'#13234d','#ffd33d');
  skirts(kit,(s)=>laneAt(s),lane.length,lane.width,holes,(s,side)=>open(lane.id,s,side),style,lane.id);
 }
 // ── Embankments under raised road, cliffs at open edges, pillars under bridges ──
 skirts(kit,mainAt,L,w,[...gapsMain,...c.bridges,...c.tunnels.map(([a,b])=>[a-2,b+2] as [number,number])],(s,side)=>open('',s,side),style,'');
 for(const [a,b] of c.bridges)bridge(kit,mainAt,a,b,w);
 // ── Gaps: cliff faces and what you fall into ──
 for(const g of c.gaps){
  const get=g.lane?(s:number)=>sampleLane(route.lanes.find(l=>l.id===g.lane)!,s) as Frame:mainAt,width=g.lane?route.lanes.find(l=>l.id===g.lane)!.width:w,a=get(g.from),b=get(g.to);
  const floorY=Math.min(a.y,b.y)-(g.kind==='lava'||g.kind==='water'?Math.min(3.4,Math.max(1,Math.min(a.y,b.y)+.1)):Math.min(6,Math.max(1.2,Math.min(a.y,b.y)+.2)));
  const span=width+(g.lane?2:style.shelf*2),mid=get((g.from+g.to)/2),len=g.to-g.from+6;
  const floor=MeshBuilder.CreateGround('gap-floor',{width:span,height:len},scene);floor.parent=root;floor.position.set(mid.x,floorY,mid.z);floor.rotation.y=mid.yaw;floor.isPickable=false;
  floor.material=g.kind==='lava'?lavaMat(scene):g.kind==='water'?waterMat(scene):mudMat(scene);
  for(const [edge,dir] of [[a,1],[b,-1]] as const){const top=edge.y,h=Math.max(.6,top-floorY+.2);const face=kit.box('gap-cliff',edge.x-Math.sin(edge.yaw)*dir*.4,top-h/2,edge.z-Math.cos(edge.yaw)*dir*.4,span,h,.8,style.skirt==='rock'?'#4a403a':'#7b6248',edge.yaw);face.rotation.y=edge.yaw;face.material=surfaceTexture(scene,style.skirt==='rock'?'rock':'dirt',style.skirt==='rock'?'#6a5d55':'#a0805c');
   const warn=kit.box('gap-edge',edge.x-Math.sin(edge.yaw)*dir*.15,top+.04,edge.z-Math.cos(edge.yaw)*dir*.15,width,.08,.5,'#ffd33d',edge.yaw);warn.material=stripesMat(scene,'#ffd33d','#c8321f');
   // Broken asphalt chunks and rebar at the far lip read as «calle rota».
   const r=rng(Math.round(edge.x*13+edge.z));for(let i=0;i<5;i++){const o=(r()-.5)*width*.9,q=at(edge,o,-.2);const chunk=kit.box('rubble',q.x-Math.sin(edge.yaw)*dir*(1+r()),q.y-.4-r(),q.z-Math.cos(edge.yaw)*dir*(1+r()),1+r()*1.6,.4,1+r(),'#3d4652',edge.yaw+r());chunk.rotation.set(r()*.6,edge.yaw+r(),r()*.5);}
  }
 }
 // ── Ramps: kickers with stripes, big ones with rails, lights and a sign ──
 for(const r of c.ramps)ramp(kit,route,r,style);
 // ── Boost pads: scrolling chevrons (super pads are orange and longer) ──
 const padNode=new TransformNode('pads',scene);padNode.parent=root;padNode.metadata={animate:true};
 const normalPad=chevronMat(scene,'#5ff1ff','#1d7fa0'),superPad=chevronMat(scene,'#ffb23d','#c4520f');
 for(const p of c.pads){
  const lane=p.lane?route.lanes.find(l=>l.id===p.lane):undefined,get=lane?(s:number)=>sampleLane(lane,s) as Frame:mainAt,f=frames(get,p.at,p.at+p.len,.8);
  const m=strip(scene,root,'boost-pad',f.map(q=>at(q,p.offset-p.width/2,.09)),f.map(q=>at(q,p.offset+p.width/2,.09)),p.super?superPad:normalPad,2.6);if(m)m.material!.zOffset=-2;
  const head=get(p.at-3);for(const side of SIDE){const q=at(head,p.offset+side*(p.width/2+.3),.5);const post=kit.glow('pad-post',q.x,q.y,q.z,.25,1,.25,p.super?'#ffb23d':'#5ff1ff');post.rotation.y=head.yaw;}
 }
 kit.anims.push({node:padNode,update:t=>{for(const m of [normalPad,superPad]){const tex=m.diffuseTexture as Texture|null;if(tex)tex.uOffset=-(t*1.6%1);}const beat=trackId==='hipa-hipa'?Math.pow(Math.max(0,Math.cos(t*Math.PI*128/60)),4):0;normalPad.emissiveColor=Color3.FromHexString('#1d7fa0').scale(1+beat*1.4);superPad.emissiveColor=Color3.FromHexString('#c4520f').scale(1.1+Math.sin(t*9)*.25+beat);}});
 // ── Barriers: none over gaps, on open edges or where a lane forks off ──
 const laneNear=(x:number,z:number,margin:number)=>route.lanes.some(l=>{for(let i=0;i<l.points.length;i+=2){const p=l.points[i];if(Math.hypot(p.x-x,p.z-z)<l.width/2+margin)return true;}return false;});
 const mainNear=(x:number,z:number,margin:number)=>{for(let i=0;i<route.points.length;i+=2){const p=route.points[i];if(Math.hypot(p.x-x,p.z-z)<half+margin)return true;}return false;};
 barrier(kit,mainAt,L,w*.72+.25,style.barrier,(d,side)=>{if(gapsMain.some(([a,b])=>within(d,a-1,b+1))||open('',d,side))return true;const p=at(mainAt(d),(w*.72+.25)*side);return laneNear(p.x,p.z,1.5);});
 for(const lane of route.lanes){const holes=c.gaps.filter(g=>g.lane===lane.id);barrier(kit,s=>sampleLane(lane,s) as Frame,lane.length,lane.width*.72+.25,{...style.barrier,h:style.barrier.h*.8},(s,side)=>{if(s<6||s>lane.length-6||holes.some(g=>within(s,g.from-1,g.to+1))||open(lane.id,s,side))return true;const p=at(sampleLane(lane,s),(lane.width*.72+.25)*side);return mainNear(p.x,p.z,1.2);},false);}
 // Open edges get hazard paint on the lip and a sign before them.
 for(const e of c.edges){const lane=e.lane?route.lanes.find(l=>l.id===e.lane):undefined,get=lane?(s:number)=>sampleLane(lane,s) as Frame:mainAt,hw=(lane?lane.width:w)/2;
  for(const side of SIDE){if(e.side!==0&&e.side!==side)continue;const f=frames(get,e.from,e.to,2);strip(scene,root,'open-edge',f.map(q=>at(q,side*(hw+.1),.07)),f.map(q=>at(q,side*(hw+1.1),.07)),stripesMat(scene,'#ffffff','#d6402f'),3);}}
 // Tunnels (Masaya).
 for(const [a,b] of c.tunnels)tunnelShell(kit,mainAt,a,b,w,c.edges.find(e=>e.lane===''&&e.from<b&&e.to>a)?.side??0);
 // Warning signs ahead of each big jump.
 for(const r of c.ramps.filter(v=>v.big&&v.lane==='')){const p=mainAt(r.at-55),q=at(p,half+3.2);kit.sign('¡SALTO! ACELERA DERECHO',q.x,q.z,p.yaw+Math.PI,8,1.5,p.y+3,'#13234d','#ffd33d');const p2=mainAt(r.at-30),q2=at(p2,-(half+3.2));kit.sign('SÚPER TURBO',q2.x,q2.z,p2.yaw+Math.PI,6.5,1.4,p2.y+3,'#fff4d2','#c4520f');}
}
/** Low wall along a path. `skip(d,side)` removes pieces (gaps, open edges, forks). */
function barrier(kit:Kit,get:(d:number)=>Frame,length:number,off:number,style:TrackStyle['barrier'],skip:(d:number,side:number)=>boolean,loop=true){
 const step=6;for(let d=0;d<length-(loop?0:1);d+=step){const e=loop?d+step:Math.min(length,d+step);const a=get(d),b=get(e);
  for(const side of SIDE){if(skip(d,side)||skip(Math.min(e,length-.01),side))continue;const pa=at(a,off*side),pb=at(b,off*side),len=Math.hypot(pb.x-pa.x,pb.z-pa.z)+.15,yaw=Math.atan2(pb.x-pa.x,pb.z-pa.z),y=(pa.y+pb.y)/2;
   kit.box('barrier',(pa.x+pb.x)/2,y+style.h/2,(pa.z+pb.z)/2,.55,style.h,len,style.body,yaw);kit.box('barrier-top',(pa.x+pb.x)/2,y+style.h+.06,(pa.z+pb.z)/2,.7,.14,len,Math.floor(d/step)%2&&style.stripe?style.stripe:style.top,yaw);
   if(style.post)kit.cyl('barrier-post',pa.x,y+style.h/2+.2,pa.z,style.h+.4,.32,style.top);}}
}
/** Shelf + slope under raised road; a straight cliff (with what lies below) on open edges. */
function skirts(kit:Kit,get:(d:number)=>Frame,length:number,width:number,holes:[number,number][],isOpen:(d:number,side:number)=>boolean,style:TrackStyle,lane:string){
 const scene=kit.scene,half=width/2,shelf=lane?2.5:style.shelf,step=3;
 const mat=surfaceTexture(scene,style.skirt==='rock'?'rock':style.skirt==='sand'?'sand':style.skirt==='dirt'?'dirt':'grass',style.skirtColor),cliff=surfaceTexture(scene,'rock','#5a4f47');
 for(const side of SIDE){
  let run:{f:Frame;open:boolean}[]=[];
  const flush=()=>{if(run.length>1){const open=run[0].open;
   if(open){strip(scene,kit.root,'cliff',run.map(r=>at(r.f,side*(half+1.2),.04)),run.map(r=>at(r.f,side*(half+1.4),-Math.max(4,r.f.y+.3))),cliff,8);}
   else{strip(scene,kit.root,'shelf',run.map(r=>at(r.f,side*half,.02)),run.map(r=>at(r.f,side*(half+shelf),-.03)),mat,10);
    strip(scene,kit.root,'slope',run.map(r=>at(r.f,side*(half+shelf),-.03)),run.map(r=>{const p=at(r.f,side*(half+shelf+Math.max(0,r.f.y)*1.35+.5),0);p.y=-.18;return p;}),mat,10);}}run=[];};
  for(let d=0;d<=length;d+=step){const f=get(Math.min(d,length-.01)),raised=f.y>.35,hole=holes.some(([a,b])=>within(d,a,b)),open=isOpen(d,side);
   if(!raised&&!open||hole){flush();continue;}if(run.length&&run[0].open!==open)flush();run.push({f,open});}
  flush();
 }
}
/** Concrete deck edges and pillars for overpasses and bridges. */
function bridge(kit:Kit,get:(d:number)=>Frame,a:number,b:number,width:number){
 for(let d=a;d<=b;d+=8){const p=get(d);if(p.y<1.2)continue;for(const side of [-1,0,1]){const q=at(p,side*width*.42);kit.box('bridge-pillar',q.x,(q.y-.6)/2-.1,q.z,1.4,Math.max(.5,q.y-.6),1.4,'#b9b4a6',p.yaw);}
  kit.box('bridge-beam',p.x,p.y-.55,p.z,width+1.6,.9,8.2,'#cfc9b9',p.yaw);}
}
/** Volcanic tunnel: arched rock shell with windows to the magma, glowing veins, lava channel. */
function tunnelShell(kit:Kit,get:(d:number)=>Frame,a:number,b:number,width:number,lavaSide:number){
 const scene=kit.scene,R=width/2+(lavaSide?6.5:3),H=10,rock=canvasMaterial(scene,'tunnel-rock',(c,s)=>{const r=rng(3);c.fillStyle='#2f2724';c.fillRect(0,0,s,s);for(let i=0;i<60;i++){c.fillStyle=r()<.6?'rgba(20,14,12,.7)':'rgba(90,70,60,.45)';c.beginPath();c.ellipse(r()*s,r()*s,3+r()*12,2+r()*8,r()*3,0,Math.PI*2);c.fill();}c.strokeStyle='rgba(255,110,30,.85)';c.lineWidth=2.4;for(let i=0;i<7;i++){let x=r()*s,y=r()*s;c.beginPath();c.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-.5)*30;y+=(r()-.3)*24;c.lineTo(x,y);}c.stroke();}},{emissive:'#3b1a0a'});
 const arcs:Vector3[][]=[],steps=14;let window=0;
 const flush=()=>{if(arcs.length>1){for(let k=0;k<steps;k++){strip(scene,kit.root,'tunnel-shell',arcs.map(arc=>arc[k]),arcs.map(arc=>arc[k+1]),rock,6);}}arcs.length=0;};
 const center=lavaSide*(width/2+3)*.5;
 for(let d=a;d<=b;d+=3){const p=get(d);window=(window+1)%9;
  // Windows: every few metres the shell opens on the lava side to show the magma outside.
  if(window>=7&&d>a+8&&d<b-8){flush();continue;}
  const arc:Vector3[]=[];for(let k=0;k<=steps;k++){const t=Math.PI*k/steps,off=center+Math.cos(t)*R;arc.push(at(p,off,Math.sin(t)*H-(k===0||k===steps?4:0)));}arcs.push(arc);}
 flush();
 // Glowing crystals on the ceiling and the lava channel below the open side.
 for(let d=a+4;d<b;d+=9){const p=get(d),q=at(p,center,H-.6);const crystal=kit.glow('magma-crystal',q.x,q.y,q.z,.8,1.4,.8,'#ff8a3a',p.yaw);crystal.rotation.z=.5;}
 if(lavaSide){const f=frames(get,a,b,3);strip(scene,kit.root,'lava-channel',f.map(p=>at(p,lavaSide*(width/2+1.3),-3.6)),f.map(p=>at(p,lavaSide*(width/2+R-1),-3.6)),lavaMat(scene),10);
  strip(scene,kit.root,'lava-wall',f.map(p=>at(p,lavaSide*(width/2+R-.8),-3.8)),f.map(p=>at(p,lavaSide*(width/2+R-.8),3)),scene.getMaterialByName('course-tunnel-rock') as StandardMaterial,6);}
 // Portals with the name and, at the exit, the jump warning.
 for(const [d,text] of [[a,'TÚNEL DE MAGMA'],[b,'¡SALIDA: SALTO!']] as const){const p=get(d);for(const side of SIDE){const q=at(p,center+side*(R+.6),H*.5);kit.box('portal-pillar',q.x,p.y+H*.5-2,q.z,2.4,H+4,2.4,'#3a2e2a',p.yaw);}const top=at(p,center,H+1.2);kit.box('portal-lintel',top.x,top.y,top.z,R*2+3,2.4,2.4,'#3a2e2a',p.yaw);kit.label(text,top.x-Math.sin(p.yaw)*1.25,top.y,top.z-Math.cos(p.yaw)*1.25,R*1.6,1.5,p.yaw+Math.PI,'#ffe2a8','#7a1e0c');}
}
/** Ramp wedge following the shared profile. Big ramps: stripes, rails, lights and arrows. */
function ramp(kit:Kit,route:Route,r:CRamp,style:TrackStyle){
 const scene=kit.scene,lane:Lane|undefined=r.lane?route.lanes.find(l=>l.id===r.lane):undefined,get=(s:number)=>(lane?sampleLane(lane,s):sample(route,s)) as Frame,width=r.width||(lane?lane.width:route.width)-(r.big?0:1),hw=width/2;
 const top:Vector3[][]=[[],[]],sides:Vector3[][]=[[],[]];
 for(let i=0;i<=12;i++){const s=r.at+r.len*i/12,f=get(s),h=rampHeight(r,s)+.04;top[0].push(at(f,r.offset-hw,h));top[1].push(at(f,r.offset+hw,h));sides[0].push(at(f,r.offset-hw,0));sides[1].push(at(f,r.offset+hw,0));}
 const mat=style.ramp==='wood'?plankMat(scene,'#b07a45'):style.ramp==='neon'?stripesMat(scene,'#ff5fb0','#1b1530'):style.ramp==='rock'?stripesMat(scene,'#ff8a3a','#2c2220'):stripesMat(scene);
 strip(scene,kit.root,r.big?'big-ramp':'ramp',top[0],top[1],mat,r.big?3:1.5,r.big?4:2);
 for(const k of [0,1])strip(scene,kit.root,'ramp-side',sides[k],top[k],material(scene,r.big?'#2c3e66':'#6b5a45'),4);
 const lip=get(r.at+r.len);strip(scene,kit.root,'ramp-lip',[top[0].at(-1)!,sides[0].at(-1)!],[top[1].at(-1)!,sides[1].at(-1)!],material(scene,'#1b2440'),2);
 if(!r.big)return;
 for(const k of [0,1]){const rail=top[k].map(v=>v.add(new Vector3(0,.55,0)));for(let i=0;i<rail.length-1;i++){const a=rail[i],b=rail[i+1],len=Vector3.Distance(a,b);const m=kit.box('ramp-rail',(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,.18,.18,len+.05,'#ffd33d',lip.yaw);m.rotation.set(-Math.atan2(b.y-a.y,Math.hypot(b.x-a.x,b.z-a.z)),Math.atan2(b.x-a.x,b.z-a.z),0);}
  const post=top[k].at(-1)!;kit.glow('ramp-light',post.x,post.y+1.3,post.z,.5,.5,.5,'#fff2a8');kit.cyl('ramp-light-post',post.x,post.y+.6,post.z,1.2,.16,'#2c3e66');}
 // «¡VUELA!» painted on the slope: readable on approach, never in front of the camera.
 const mid=get(r.at+r.len*.45),paint=kit.label('¡VUELA!',mid.x,mid.y+rampHeight(r,r.at+r.len*.45)+.12,mid.z,Math.min(7,width*.6),1.8,mid.yaw+Math.PI,'#13234d','#ffd33d');if(paint){paint.rotation.x=Math.PI/2-Math.atan2(r.height,r.len);}
}
export {textLabel};
