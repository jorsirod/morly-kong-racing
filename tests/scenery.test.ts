import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PROP_FILES, PROP_TRIANGLES, LANDMARK_TRIANGLES } from '../src/game/worlds/propFiles';

type Node={name?:string;children?:number[];mesh?:number;rotation?:number[];scale?:number[];translation?:number[]};
type GLTF={scene?:number;scenes:{nodes:number[]}[];nodes:Node[];meshes:{primitives:{attributes:Record<string,number>;indices?:number}[]}[];accessors:{count:number}[];extensionsRequired?:string[]};
function read(file:string):GLTF{
 const data=readFileSync('public/models/scenery/'+file+'.glb');
 expect(data.readUInt32LE(0),file+' magic').toBe(0x46546c67);expect(data.readUInt32LE(8),file+' complete').toBe(data.length);
 return JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
}
function below(g:GLTF,i:number):number[]{return [i,...(g.nodes[i].children??[]).flatMap(c=>below(g,c))];}
function triangles(g:GLTF,nodes:number[]){let t=0;for(const i of nodes){const m=g.nodes[i].mesh;if(m===undefined)continue;for(const p of g.meshes[m].primitives)t+=(p.indices===undefined?g.accessors[p.attributes.POSITION].count:g.accessors[p.indices].count)/3;}return t;}

describe('escenarios de Blender (public/models/scenery)',()=>{
 const files=[...new Set(Object.values(PROP_FILES))];
 it('cada archivo existe, sin extensiones obligatorias',()=>{for(const f of files){expect(existsSync('public/models/scenery/'+f+'.glb'),f).toBe(true);expect(read(f).extensionsRequired??[],f).toEqual([]);}});
 it('cada tipo tiene un único nodo raíz con su nombre, sin rotación ni escala, con geometría dentro del presupuesto',()=>{
  for(const [type,file] of Object.entries(PROP_FILES)){
   const g=read(file),roots=g.scenes[g.scene??0].nodes.filter(i=>g.nodes[i].name===type);
   expect(roots.length,type+' en '+file).toBe(1);const root=g.nodes[roots[0]];
   expect(root.rotation??[0,0,0,1],type+' sin rotación').toEqual([0,0,0,1]);expect(root.scale??[1,1,1],type+' sin escala').toEqual([1,1,1]);
   const t=triangles(g,below(g,roots[0]));expect(t,type+' tiene geometría').toBeGreaterThan(50);expect(t,type+' presupuesto').toBeLessThanOrEqual(PROP_TRIANGLES[type]??LANDMARK_TRIANGLES);
   // AO horneada: el juego la multiplica por el color.
   for(const i of below(g,roots[0])){const m=g.nodes[i].mesh;if(m!==undefined)for(const p of g.meshes[m].primitives)expect(p.attributes.COLOR_0,type+' oclusión ambiental').toBeDefined();}
  }
 });
});
