import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader';
import type { AssetContainer } from '@babylonjs/core/assetContainer';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Material } from '@babylonjs/core/Materials/material';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import '@babylonjs/loaders/glTF';
import type { Scene } from '@babylonjs/core/scene';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Kit } from './kit';
import { surfaceMaterial } from './textures';

/**
 * Scenery modelled in Blender (art/blender/scenery.blend → public/models/scenery/<file>.glb).
 *
 * The world is always built first from code, so the track is playable straight away and offline without the files.
 * Every piece that has a Blender model is placed with `kit.prop(type, …)`: its code version is drawn inside a group
 * per type. When the GLB arrives, each type becomes one mesh per material drawn as thin instances at every spot
 * (one draw call per material, however many palms a track has) and the code group is removed.
 *
 * GLB contract (tests/scenery.test.ts): one root node per type named exactly like the type, without rotation or
 * scale; everything under it is in game coordinates relative to the spot (y up, +z = the prop's front).
 */
export { PROP_FILES } from './propFiles';
import { PROP_FILES } from './propFiles';
/** tint: brightness (1 = as modelled) or a hex colour for pieces modelled in white (tarps, Árboles de la Vida, rocks). */
export type PropSpot={type:string;x:number;y:number;z:number;yaw:number;scale:number|[number,number,number];tint?:number|string;parent?:TransformNode};

/**
 * The rest of the world uses StandardMaterial with the colours as written (see models.ts material()), so props get the
 * same: the exporter stored base = 0.62 × linear colour and emissive = 0.55 × colour (scripts/blender/mklib.py).
 */
const standard=new WeakMap<Material,StandardMaterial>();
function toStandard(scene:Scene,src:Material|null){
 if(!src)return null;const hit=standard.get(src);if(hit&&!hit.getScene().isDisposed)return hit;
 const pbr=src as PBRMaterial,base=pbr.albedoColor??Color3.White(),color=new Color3(base.r/.62,base.g/.62,base.b/.62).toGammaSpace();
 // «tex-<kind>-…»: the piece carries UVs in metres and takes the game's own surface texture (textures.ts).
 const tex=/^tex-(rock|dirt|grass|sand|asphalt|tile)/.exec(src.name);
 if(tex){const t=surfaceMaterial(scene,tex[1] as 'rock',color.toHexString(),1,1);standard.set(src,t);return t;}
 const m=new StandardMaterial('prop-'+src.name,scene);m.diffuseColor=color;
 const e=pbr.emissiveColor;if(e&&(e.r||e.g||e.b))m.emissiveColor=new Color3(Math.min(1,e.r/.55),Math.min(1,e.g/.55),Math.min(1,e.b/.55));
 m.specularColor=new Color3(.08,.08,.08);m.specularPower=24;
 if(!src.backFaceCulling){m.backFaceCulling=false;m.twoSidedLighting=true;}
 if(pbr.alpha<1)m.alpha=pbr.alpha;
 standard.set(src,m);return m;
}
const containers=new WeakMap<Scene,Map<string,Promise<AssetContainer|null>>>();
function load(scene:Scene,file:string){
 let files=containers.get(scene);if(!files){files=new Map();containers.set(scene,files);}
 let p=files.get(file);if(!p){p=LoadAssetContainerAsync('/models/scenery/'+file+'.glb',scene).catch(()=>null);files.set(file,p);}
 return p;
}

/** One baked mesh per material for `type`, positioned relative to its root node, or null if the file lacks it. */
function template(scene:Scene,asset:AssetContainer,type:string):Mesh[]|null{
 const node=[...asset.transformNodes,...asset.meshes].find(n=>n.name===type);if(!node)return null;
 node.computeWorldMatrix(true);
 // glTF is right-handed: the loader's __root__ mirrors X. Keep the mirror, drop the node's own offset.
 const toGame=node.getWorldMatrix().clone().invert().multiply(Matrix.Scaling(-1,1,1));
 const byMaterial=new Map<Material|null,Mesh[]>();
 for(const src of node.getChildMeshes(false) as Mesh[]){
  if(!src.getTotalVertices())continue;
  const m=src.clone(type+'-part',null,true,false);if(!m)continue;m.makeGeometryUnique();
  const world=src.computeWorldMatrix(true).multiply(toGame);m.bakeTransformIntoVertices(world);if(world.determinant()<0)m.flipFaces(false);
  m.position.setAll(0);m.rotationQuaternion=null;m.rotation.setAll(0);m.scaling.setAll(1);
  const list=byMaterial.get(src.material)??[];list.push(m);byMaterial.set(src.material,list);
 }
 const out:Mesh[]=[];
 for(const [mat,list] of byMaterial){const m=list.length>1?Mesh.MergeMeshes(list,true,true,undefined,false,false):list[0];if(!m)continue;m.name='prop-'+type+'-'+(mat?.name??'mat');m.material=toStandard(scene,mat);out.push(m);}
 return out.length?out:null;
}

/** Swap every prop type that has a Blender model for thin instances of it; types without one keep their code. */
export function upgradeProps(kit:Kit){
 const scene=kit.scene,byType=new Map<string,PropSpot[]>();
 for(const s of kit.props){const l=byType.get(s.type)??[];l.push(s);byType.set(s.type,l);}
 for(const [type,spots] of byType){
  const file=PROP_FILES[type];if(!file)continue;
  load(scene,file).then(asset=>{
   if(!asset||kit.root.isDisposed()||scene.isDisposed)return;
   const parts=template(scene,asset,type);if(!parts)return;
   const matrices=new Float32Array(spots.length*16),colors=new Float32Array(spots.length*4),m=new Matrix();
   spots.forEach((s,i)=>{const k=typeof s.scale==='number'?new Vector3(s.scale,s.scale,s.scale):new Vector3(...s.scale);Matrix.ComposeToRef(k,Quaternion.RotationYawPitchRoll(s.yaw,0,0),new Vector3(s.x,s.y,s.z),m);m.copyToArray(matrices,i*16);
    const t=s.tint??1,c=typeof t==='string'?Color3.FromHexString(t):new Color3(t,t,t);colors.set([c.r,c.g,c.b,1],i*4);});
   const tinted=spots.some(s=>s.tint!==undefined&&s.tint!==1);
   // Pieces hung from an animated node (the swaying crown of the giant palm) follow it: matrices are relative to it.
   const parent=spots[0].parent;
   for(const p of parts){p.parent=parent??kit.root;p.isPickable=false;p.receiveShadows=true;p.thinInstanceSetBuffer('matrix',matrices,16,true);if(tinted)p.thinInstanceSetBuffer('color',colors,4,true);p.thinInstanceRefreshBoundingInfo(false);if(!parent)p.freezeWorldMatrix();p.metadata={keep:true};}
   for(const n of kit.propGroups.get(type)??[])n.dispose(false,false);kit.propGroups.delete(type);
  });
 }
}
