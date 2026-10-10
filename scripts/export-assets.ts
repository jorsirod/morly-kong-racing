import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { GLTF2Export } from '@babylonjs/serializers/glTF/2.0/glTFSerializer';
import { mkdir,writeFile } from 'node:fs/promises';
import { VEHICLES } from '../shared/content';
import { buildVehicle } from '../src/game/models';
await mkdir('public/models',{recursive:true});
for(const v of VEHICLES){const engine=new NullEngine({renderWidth:64,renderHeight:64,textureSize:64,deterministicLockstep:true,lockstepMaxSteps:1});const scene=new Scene(engine);buildVehicle(scene,v.id);scene.meshes.forEach(m=>m.computeWorldMatrix(true));const out=await GLTF2Export.GLBAsync(scene,v.id,{exportWithoutWaitingForScene:true});for(const [name,blob] of Object.entries(out.glTFFiles)){await writeFile('public/models/'+name,Buffer.from(await (blob as Blob).arrayBuffer()));}console.log(v.name+' → public/models/'+v.id+'.glb');scene.dispose();engine.dispose();}
