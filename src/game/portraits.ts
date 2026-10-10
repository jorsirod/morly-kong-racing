import {Engine} from '@babylonjs/core/Engines/engine';
import {Scene} from '@babylonjs/core/scene';
import {FreeCamera} from '@babylonjs/core/Cameras/freeCamera';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {Color4} from '@babylonjs/core/Maths/math.color';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode';
import {CHARACTERS,VEHICLES} from '../../shared/content';
import {Vector3 as V3} from '@babylonjs/core/Maths/math.vector';
import {aimArm,buildCharacter,buildVehicle,headCenter,pilotArms} from './models';
let portraits:Promise<Record<string,string>>|undefined,vehicles:Promise<Record<string,string>>|undefined;
export function characterPortraits():Promise<Record<string,string>>{return portraits??=generate().catch(()=>({}));}
export function vehiclePortraits():Promise<Record<string,string>>{return vehicles??=generateVehicles().catch(()=>({}));}
let poses:Promise<Record<string,string>>|undefined;
/** Busts in the special-move pose (arms up, bigger grin) for cards and the special banner. */
export function characterPoses():Promise<Record<string,string>>{return poses??=characterPortraits().then(()=>generatePoses()).catch(()=>({}));}
async function generatePoses():Promise<Record<string,string>>{
 if(typeof document==='undefined'||!Engine.IsSupported)return {};
 let engine:Engine|undefined,scene:Scene|undefined;
 try{
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;engine=new Engine(canvas,true,{preserveDrawingBuffer:true,powerPreference:'low-power'},false);engine.setSize(192,192);
  scene=new Scene(engine);scene.clearColor=new Color4(0,0,0,0);const camera=new FreeCamera('pose',new Vector3(-.43,2.5,5),scene);camera.mode=1;camera.orthoLeft=-1;camera.orthoRight=1;camera.orthoTop=1;camera.orthoBottom=-1;
  const sky=new HemisphericLight('pose-fill',new Vector3(0,1,1),scene);sky.intensity=1.1;const sun=new DirectionalLight('pose-key',new Vector3(-.4,-1,-.5),scene);sun.intensity=1.25;
  const root=new TransformNode('pose-root',scene),models=CHARACTERS.map(c=>buildCharacter(scene!,c.id,root)),output:Record<string,string>={};
  // Arms up in a V, body leaning back a touch: the "here comes my special" pose.
  for(const model of models){const arms=pilotArms(model);aimArm(arms.l,new V3(-.6,.8,.12));aimArm(arms.r,new V3(.6,.8,.12));model.rotation.x=-.08;model.rotation.z=.06;model.getChildTransformNodes(true).find(n=>n.name==='steering-wheel')?.setEnabled(false);}
  await scene.whenReadyAsync();
  for(let i=0;i<models.length;i++){models.forEach((model,k)=>model.setEnabled(k===i));const y=headCenter(CHARACTERS[i].id)-.25;camera.position.set(-.33,y+.5,5);camera.setTarget(new Vector3(-.43,y,.2));scene.render();output[CHARACTERS[i].id]=canvas.toDataURL('image/png');}
  return output;
 }finally{scene?.dispose();engine?.dispose();}
}
async function generate():Promise<Record<string,string>>{
 if(typeof document==='undefined'||!Engine.IsSupported)return {};
 let engine:Engine|undefined,scene:Scene|undefined;
 try{
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=192;engine=new Engine(canvas,true,{preserveDrawingBuffer:true,powerPreference:'low-power'},false);engine.setSize(192,192);
  scene=new Scene(engine);scene.clearColor=new Color4(0,0,0,0);const camera=new FreeCamera('portrait',new Vector3(-.43,2.5,5),scene);camera.setTarget(new Vector3(-.43,2.12,.2));camera.mode=1;camera.orthoLeft=-.75;camera.orthoRight=.75;camera.orthoTop=.85;camera.orthoBottom=-.85;
  const sky=new HemisphericLight('portrait-fill',new Vector3(0,1,1),scene);sky.intensity=1.1;const sun=new DirectionalLight('portrait-key',new Vector3(-.4,-1,-.5),scene);sun.intensity=1.2;
  const root=new TransformNode('portrait-root',scene),models=CHARACTERS.map(c=>buildCharacter(scene!,c.id,root));const output:Record<string,string>={};
  await scene.whenReadyAsync();for(let i=0;i<models.length;i++){models.forEach((model,k)=>model.setEnabled(k===i));const y=headCenter(CHARACTERS[i].id)-.07;camera.position.set(-.43,y+.38,5);camera.setTarget(new Vector3(-.43,y,.2));scene.render();output[CHARACTERS[i].id]=canvas.toDataURL('image/png');}return output;
 }finally{scene?.dispose();engine?.dispose();}
}
async function generateVehicles():Promise<Record<string,string>>{
 // The character batch releases its offscreen engine before this batch begins.
 await characterPortraits();if(typeof document==='undefined'||!Engine.IsSupported)return {};
 let engine:Engine|undefined,scene:Scene|undefined;
 try{
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=144;engine=new Engine(canvas,true,{preserveDrawingBuffer:true,powerPreference:'low-power'},false);engine.setSize(256,144);
  scene=new Scene(engine);scene.clearColor=new Color4(0,0,0,0);scene.imageProcessingConfiguration.exposure=1.05;scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=1;
  const camera=new FreeCamera('vehicle-portrait',new Vector3(6.2,4.4,8.2),scene);camera.setTarget(new Vector3(0,1.25,0));camera.mode=1;camera.orthoLeft=-3.65;camera.orthoRight=3.65;camera.orthoTop=2.053;camera.orthoBottom=-2.053;camera.minZ=.1;
  const sky=new HemisphericLight('vehicle-portrait-fill',new Vector3(0,1,1),scene);sky.intensity=1.1;const sun=new DirectionalLight('vehicle-portrait-key',new Vector3(-.5,-.8,-1),scene);sun.intensity=1.4;
  const models=VEHICLES.map(v=>buildVehicle(scene!,v.id)),output:Record<string,string>={};await scene.whenReadyAsync();
  for(let i=0;i<models.length;i++){models.forEach((model,k)=>model.root.setEnabled(k===i));scene.render();output[VEHICLES[i].id]=canvas.toDataURL('image/png');}return output;
 }finally{scene?.dispose();engine?.dispose();}
}
