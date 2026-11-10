import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { CHARACTERS } from '../shared/content';

type Node={name?:string;children?:number[];mesh?:number;rotation?:number[];scale?:number[]};
type GLTF={scene?:number;scenes:{nodes:number[]}[];nodes:Node[];meshes:{primitives:{attributes:Record<string,number>;indices?:number}[]}[];accessors:{count:number}[];extensionsRequired?:string[]};
const path=(id:string)=>'public/models/pilots/'+id+'.glb';
function read(id:string):GLTF{const data=readFileSync(path(id));expect(data.readUInt32LE(0),id+' magic').toBe(0x46546c67);expect(data.readUInt32LE(8),id+' complete').toBe(data.length);return JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());}

describe('pilotos de Blender (public/models/pilots)',()=>{
 it('hay un modelo por piloto, sin extensiones obligatorias',()=>{for(const c of CHARACTERS){expect(existsSync(path(c.id)),c.id).toBe(true);expect(read(c.id).extensionsRequired??[],c.id).toEqual([]);}});
 it('cada modelo cumple el contrato: raíz, cabeza, ojos y brazos, con oclusión horneada y dentro del presupuesto',()=>{
  for(const c of CHARACTERS){
   const g=read(c.id),roots=g.scenes[g.scene??0].nodes.filter(i=>g.nodes[i].name==='pilot-'+c.id);expect(roots.length,c.id+' raíz').toBe(1);
   const root=g.nodes[roots[0]];expect(root.rotation??[0,0,0,1],c.id+' sin rotación').toEqual([0,0,0,1]);expect(root.scale??[1,1,1],c.id+' sin escala').toEqual([1,1,1]);
   const child=(n:Node,name:string)=>(n.children??[]).map(i=>g.nodes[i]).find(k=>k.name===name);
   const head=child(root,'head-root');expect(head,c.id+' head-root').toBeDefined();expect(child(head!,'eyes'),c.id+' eyes').toBeDefined();
   for(const part of [root,head!,child(head!,'eyes')!,child(root,'arm-left'),child(root,'arm-right')]){expect(part,c.id+' nodo').toBeDefined();expect((part!.children??[]).some(i=>g.nodes[i].mesh!==undefined),c.id+' '+part!.name+' con malla').toBe(true);}
   let tris=0;for(const m of g.meshes)for(const p of m.primitives){expect(p.attributes.COLOR_0,c.id+' oclusión ambiental').toBeDefined();tris+=(p.indices===undefined?g.accessors[p.attributes.POSITION].count:g.accessors[p.indices].count)/3;}
   expect(tris,c.id+' triángulos').toBeGreaterThan(1500);expect(tris,c.id+' presupuesto').toBeLessThanOrEqual(10000);
  }
 });
});
