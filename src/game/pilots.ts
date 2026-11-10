import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import '@babylonjs/loaders/glTF';
import type { Scene } from '@babylonjs/core/scene';
import { toStandard } from './worlds/props';

/*
 * Pilots modelled in Blender (art/blender/pilots.py -> public/models/pilots/<id>.glb).
 *
 * buildCharacter() still draws every pilot from code at once: that version is what you see while the file loads and
 * what stays if it is missing (offline with a cold cache). When the GLB is there, its meshes replace the code's inside
 * the very same nodes (root, head-root, arm-left, arm-right), so the animation code does not change. The text labels
 * (name on the back, «LAKERS») and the steering wheel are kept.
 *
 * GLB contract (tests/pilots.test.ts): a root «pilot-<id>» without rotation or scale, with the empties head-root (and
 * eyes inside it), arm-left and arm-right. Geometry is in game coordinates relative to each node.
 *
 * Each node becomes ONE mesh: the material colours are multiplied into the baked ambient occlusion (vertex colours),
 * so a pilot costs five draw calls however many colours it wears.
 */
const NODES=['root','head-root','eyes','arm-left','arm-right'] as const;
type NodeName=typeof NODES[number];
type Template=Partial<Record<NodeName,Mesh>>;
/** Head pivot: the code hangs the head from a node at belly height; the Blender head turns and nods from the neck. */
const NECK=.86;
interface Entry{promise:Promise<Template|null>;ready?:Template|null}
const cache=new WeakMap<Scene,Map<string,Entry>>();

function skin(scene:Scene){
 const hit=scene.getMaterialByName('pilot-blender') as StandardMaterial|null;if(hit)return hit;
 const m=new StandardMaterial('pilot-blender',scene);m.diffuseColor=Color3.White();m.specularColor=new Color3(.1,.1,.1);m.specularPower=28;return m;
}
function template(scene:Scene,id:string,nodes:TransformNode[]):Template|null{
 const out:Template={};
 for(const name of NODES){
  const node=nodes.find(n=>n.name===(name==='root'?'pilot-'+id:name));if(!node){console.warn('pilot model',id,'missing node',name,nodes.map(n=>n.name).join(','));return null;}
  const parts:Mesh[]=[];
  for(const src of node.getChildren(n=>n instanceof Mesh&&(n as Mesh).getTotalVertices()>0,true) as Mesh[]){
   const m=src.clone('pilot-part',null,true,false);if(!m)continue;m.makeGeometryUnique();
   // glTF geometry is mirrored in x with respect to the game (see unmirror() in renderer.ts).
   const local=src.computeWorldMatrix(true).multiply(node.computeWorldMatrix(true).clone().invert()).multiply(Matrix.Scaling(-1,1,1));
   m.bakeTransformIntoVertices(local); // a mirroring bake flips the faces itself
   m.position.setAll(0);m.rotationQuaternion=null;m.rotation.setAll(0);m.scaling.setAll(1);
   // Colour = material colour × baked occlusion, as vertex colours.
   const mat=toStandard(scene,src.material),c=mat?.diffuseColor??Color3.White(),count=m.getTotalVertices(),ao=m.getVerticesData(VertexBuffer.ColorKind),colors=new Float32Array(count*4);
   for(let i=0;i<count;i++){const k=ao?ao[i*4]:1;colors[i*4]=c.r*k;colors[i*4+1]=c.g*k;colors[i*4+2]=c.b*k;colors[i*4+3]=1;}
   m.setVerticesData(VertexBuffer.ColorKind,colors);
   for(const kind of m.getVerticesDataKinds())if(kind!==VertexBuffer.PositionKind&&kind!==VertexBuffer.NormalKind&&kind!==VertexBuffer.ColorKind)m.removeVerticesData(kind);
   parts.push(m);
  }
  if(!parts.length){console.warn('pilot model',id,'empty node',name,node.getChildren().map(n=>n.name+':'+n.getClassName()).join(','));return null;}
  const merged=parts.length>1?Mesh.MergeMeshes(parts,true,true,undefined,false,false):parts[0];if(!merged)return null;
  merged.name='pilot-template-'+id+'-'+name;merged.material=skin(scene);merged.isPickable=false;merged.setEnabled(false);out[name]=merged;
 }
 return out;
}
function entry(scene:Scene,id:string):Entry{
 let files=cache.get(scene);if(!files){files=new Map();cache.set(scene,files);}
 let e=files.get(id);
 if(!e){
  const made:Entry={promise:LoadAssetContainerAsync('/models/pilots/'+id+'.glb',scene).then(asset=>{const t=scene.isDisposed?null:template(scene,id,asset.transformNodes);asset.dispose();return t;}).catch(e=>{console.warn('pilot model',id,String(e));return null;})};
  made.promise.then(t=>{made.ready=t;});files.set(id,made);e=made;
 }
 return e;
}
/** Loads the Blender models of these pilots so the next buildCharacter() uses them straight away. */
export function preloadPilots(scene:Scene,ids:string[]){return Promise.all([...new Set(ids)].map(id=>entry(scene,id).promise));}

function swap(scene:Scene,root:TransformNode,t:Template){
 const nodes=root.getChildTransformNodes(false),head=nodes.find(n=>n.name==='head-root'),armL=nodes.find(n=>n.name==='arm-left'),armR=nodes.find(n=>n.name==='arm-right'),wheel=nodes.find(n=>n.name==='steering-wheel');
 if(!head||!armL||!armR)return;
 for(const m of root.getChildMeshes(false)){if(m.name.startsWith('label')||(wheel&&m.isDescendantOf(wheel)))continue;m.dispose(false,false);}
 head.position.y+=NECK;
 const eyes=new TransformNode('eyes',scene);eyes.parent=head;eyes.position.y=1.3-NECK;
 const place=(name:NodeName,parent:TransformNode,y=0)=>{const src=t[name];if(!src)return;const m=src.clone('pilot-'+name,parent);m.setEnabled(true);m.position.set(0,y,0);m.isPickable=false;};
 place('root',root);place('head-root',head,-NECK);place('eyes',eyes);place('arm-left',armL);place('arm-right',armR);
 root.metadata={...(root.metadata??{}),blender:true};
}
/** Replaces the code-built pilot under `root` with its Blender model: now if it is loaded, otherwise when it arrives. */
export function dressPilot(scene:Scene,id:string,root:TransformNode){
 if(typeof document==='undefined')return;
 const e=entry(scene,id);
 if(e.ready){swap(scene,root,e.ready);return;}
 if(e.ready===null)return;
 e.promise.then(t=>{if(t&&!scene.isDisposed&&!root.isDisposed())swap(scene,root,t);});
}
