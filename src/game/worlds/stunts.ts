import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import '@babylonjs/core/Meshes/Builders/tubeBuilder';
import '@babylonjs/core/Meshes/Builders/torusBuilder';
import type { Route } from '../../../shared/track';
import { stuntPose } from '../../../shared/stunts';
import type { Kit } from './kit';

/*
 * Loops, corkscrews and tubes, drawn exactly on the path the cars follow (shared/stunts.ts): a chevron ribbon with glowing
 * rails, and for tubes a see-through pipe with rings. Bright hot-pink and gold so they read from far away.
 */
const HALF=4.3;
function stuntMat(scene:Scene,night:boolean){
 const name='stunt-ribbon'+(night?'-n':''),cached=scene.getMaterialByName(name) as StandardMaterial|null;if(cached)return cached;
 const m=new StandardMaterial(name,scene);m.backFaceCulling=false;m.specularColor=new Color3(.15,.15,.15);
 if(typeof document!=='undefined'){const tex=new DynamicTexture(name,{width:128,height:128},scene,true),c=tex.getContext() as CanvasRenderingContext2D;
  c.fillStyle='#e8346d';c.fillRect(0,0,128,128);c.fillStyle='#ffffff';c.fillRect(0,0,10,128);c.fillRect(118,0,10,128);
  c.strokeStyle='#ffd33d';c.lineWidth=16;c.lineJoin='round';for(const y of [40,100]){c.beginPath();c.moveTo(26,y);c.lineTo(64,y-30);c.lineTo(102,y);c.stroke();}
  tex.update();tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;m.diffuseTexture=tex;}
 m.emissiveColor=night?new Color3(.45,.12,.3):new Color3(.18,.05,.1);return m;
}
function plain(scene:Scene,name:string,hex:string,emissive=0,alpha=1){const cached=scene.getMaterialByName(name) as StandardMaterial|null;if(cached)return cached;const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(hex);m.emissiveColor=Color3.FromHexString(hex).scale(emissive);m.specularColor=new Color3(.2,.2,.2);m.alpha=alpha;m.backFaceCulling=alpha>=1;return m;}

export function buildStunts(kit:Kit,route:Route,night:boolean){
 const scene=kit.scene,root=kit.root;
 for(const st of route.course.stunts){
  const L=st.to-st.from,steps=Math.max(48,Math.round(L*2.2)),left:Vector3[]=[],right:Vector3[]=[],railL:Vector3[]=[],railR:Vector3[]=[],axis:Vector3[]=[];
  for(let i=0;i<=steps;i++){
   const ps=stuntPose(route,st,st.from+L*i/steps),pos=new Vector3(ps.x,ps.y-.06,ps.z),up=new Vector3(...ps.up),fwd=new Vector3(...ps.fwd);
   const side=Vector3.Cross(up,fwd).normalize();// left-handed: up × forward points right
   left.push(pos.subtract(side.scale(HALF)));right.push(pos.add(side.scale(HALF)));
   railL.push(pos.subtract(side.scale(HALF)).add(up.scale(.55)));railR.push(pos.add(side.scale(HALF)).add(up.scale(.55)));
   axis.push(pos.add(up.scale(st.radius)));
  }
  // Driving surface.
  const positions:number[]=[],uvs:number[]=[],indices:number[]=[];let run=0;
  for(let i=0;i<left.length;i++){if(i)run+=Vector3.Distance(left[i],left[i-1]);positions.push(left[i].x,left[i].y,left[i].z,right[i].x,right[i].y,right[i].z);uvs.push(0,run/9,1,run/9);}
  for(let i=0;i<left.length-1;i++){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const normals:number[]=[];VertexData.ComputeNormals(positions,indices,normals);
  const ribbon=new Mesh('stunt-'+st.kind,scene),data=new VertexData();Object.assign(data,{positions,indices,uvs,normals});data.applyToMesh(ribbon);ribbon.parent=root;ribbon.material=stuntMat(scene,night);ribbon.isPickable=false;
  // Rails.
  for(const [n,path] of [['l',railL],['r',railR]] as const){const rail=MeshBuilder.CreateTube('stunt-rail-'+n,{path,radius:.16,tessellation:6},scene);rail.parent=root;rail.material=plain(scene,'stunt-rail','#ffd33d',night?.8:.35);rail.isPickable=false;}
  if(st.kind==='tube'){
   // See-through pipe with hot rings every few metres.
   const pipe=MeshBuilder.CreateTube('stunt-pipe',{path:axis,radius:st.radius+.4,tessellation:28,sideOrientation:Mesh.DOUBLESIDE},scene);pipe.parent=root;pipe.material=plain(scene,'stunt-pipe','#ff4f8a',.25,.22);pipe.isPickable=false;
   for(let i=0;i<=steps;i+=Math.max(2,Math.round(steps/14))){const ps=stuntPose(route,st,st.from+L*i/steps);const ring=MeshBuilder.CreateTorus('stunt-ring',{diameter:(st.radius+.4)*2,thickness:.35,tessellation:28},scene);ring.parent=root;ring.position.copyFrom(axis[i]);ring.rotation.set(Math.PI/2,ps.yaw,0);ring.material=plain(scene,i%2?'stunt-ring-a':'stunt-ring-b',i%2?'#ffd33d':'#ff3d7a',night?.7:.3);ring.isPickable=false;}
  }
  if(st.kind==='loop'){
   // Two pylons holding the top of the loop.
   const top=stuntPose(route,st,st.from+L/2);for(const s of [-1,1]){const rx=Math.cos(top.yaw),rz=-Math.sin(top.yaw);kit.box('stunt-pylon',top.x+rx*s*(HALF+1.2),top.y-st.radius,top.z+rz*s*(HALF+1.2),.6,2*st.radius+.6,.6,'#2a1660',top.yaw);}
  }
  // A big «LOOP» / «TUBO» / «TIRABUZÓN» arch at the entrance.
  const gate=stuntPose(route,st,st.from-6),label=st.kind==='loop'?'¡LOOP!':st.kind==='tube'?'¡TUBO!':'¡TIRABUZÓN!';
  for(const s of [-1,1]){const rx=Math.cos(gate.yaw),rz=-Math.sin(gate.yaw);kit.box('stunt-gate',gate.x+rx*s*(HALF+.8),gate.y+3,gate.z+rz*s*(HALF+.8),.5,6,.5,'#ffd33d',gate.yaw);}
  kit.box('stunt-gate-top',gate.x,gate.y+6.2,gate.z,HALF*2+2.2,1.3,.4,'#e8346d',gate.yaw);
  const rx=Math.cos(gate.yaw),rz=-Math.sin(gate.yaw),fx=Math.sin(gate.yaw),fz=Math.cos(gate.yaw);kit.label(label,gate.x-fx*.25,gate.y+6.2,gate.z-fz*.25,HALF*2,1.2,gate.yaw+Math.PI,'#fff6dc','#e8346d');void rx;void rz;
 }
}
