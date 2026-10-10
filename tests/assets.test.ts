import { readFileSync } from 'node:fs';
import { describe,it,expect } from 'vitest';
import { VEHICLES } from '../shared/content';

type GLTFNode={name?:string;children?:number[];mesh?:number;translation?:number[]};
type GLTF={asset:{version:string};scene?:number;scenes:{nodes:number[]}[];nodes:GLTFNode[];meshes:{primitives:{attributes:{POSITION:number};indices?:number}[]}[];accessors:{count:number;min?:number[];max?:number[]}[]};
function readModel(id:string):GLTF{
 const data=readFileSync('public/models/'+id+'.glb');expect(data.readUInt32LE(0),id+' magic').toBe(0x46546c67);expect(data.readUInt32LE(4),id+' container version').toBe(2);expect(data.readUInt32LE(8),id+' complete file').toBe(data.length);const length=data.readUInt32LE(12);expect(data.readUInt32LE(16)).toBe(0x4e4f534a);return JSON.parse(data.subarray(20,20+length).toString());
}
function descendants(g:GLTF,roots:number[]){const ids=new Set<number>(),visit=(id:number)=>{if(ids.has(id))return;ids.add(id);for(const child of g.nodes[id].children??[])visit(child);};roots.forEach(visit);return ids;}
function named(g:GLTF,name:string){const matches=g.nodes.map((n,i)=>({n,i})).filter(v=>v.n.name===name);expect(matches.length,'single '+name).toBe(1);return matches[0];}
const models=new Map(VEHICLES.map(v=>[v.id,readModel(v.id)]));

describe('contratos visuales de los seis vehículos GLB',()=>{
 it('contienen geometría válida y anclajes activos que se mueven con la carrocería',()=>{
  for(const [id,g] of models){expect(g.asset.version,id).toBe('2.0');const active=descendants(g,g.scenes[g.scene??0].nodes),body=named(g,'body'),driver=named(g,'driver-socket'),passenger=named(g,'passenger-socket'),bodyTree=descendants(g,[body.i]);
   expect(active.has(body.i),id+' active body').toBe(true);expect(bodyTree.has(driver.i),id+' attached driver').toBe(true);expect(bodyTree.has(passenger.i),id+' attached passenger').toBe(true);expect(driver.i).not.toBe(passenger.i);
   let triangles=0;for(const mesh of g.meshes)for(const primitive of mesh.primitives){const positions=g.accessors[primitive.attributes.POSITION];expect(positions.count,id+' vertices').toBeGreaterThan(2);expect(positions.min?.every(Number.isFinite),id+' finite minimum').toBe(true);expect(positions.max?.every(Number.isFinite),id+' finite maximum').toBe(true);expect(positions.max?.some((n,i)=>n>(positions.min?.[i]??n)),id+' nonempty geometry').toBe(true);triangles+=(primitive.indices===undefined?positions.count:g.accessors[primitive.indices].count)/3;}
   // A missing body or an accidental unbounded high-detail export fails the mobile budget.
   expect(triangles,id+' usable geometry').toBeGreaterThan(1000);expect(triangles,id+' model detail budget').toBeLessThan(30000);
  }
 });
 it('preservan cuatro ruedas independientes para dirección y rodadura después de exportar',()=>{
  for(const [id,g] of models){const bodyTree=descendants(g,[named(g,'body').i]),pivots=g.nodes.filter(n=>n.name?.startsWith('wheel-pivot-')),spins=g.nodes.filter(n=>n.name?.startsWith('wheel-spin-'));expect(pivots.length,id).toBe(4);expect(spins.length,id).toBe(4);
   for(const axle of ['front','rear']){const left=named(g,'wheel-pivot-'+axle+'-left'),right=named(g,'wheel-pivot-'+axle+'-right');expect(left.n.translation?.[0],id+' distinct wheel sides').not.toBe(right.n.translation?.[0]);
    for(const side of ['left','right']){const pivot=named(g,'wheel-pivot-'+axle+'-'+side),spin=named(g,'wheel-spin-'+axle+'-'+side);expect(bodyTree.has(pivot.i),id+' suspension parent').toBe(true);expect(pivot.n.children,id+' steering contains spin').toContain(spin.i);expect([...descendants(g,[spin.i])].some(i=>g.nodes[i].mesh!==undefined),id+' wheel contains render geometry').toBe(true);}
   }
   expect(named(g,'wheel-pivot-front-left').n.translation?.[2],id+' distinct axles').not.toBe(named(g,'wheel-pivot-rear-left').n.translation?.[2]);
  }
 });
 it('Hola Willy conserva a ALF como pasajero permanente con geometría propia',()=>{
  const g=models.get('hola-willy')!,alf=named(g,'ALF-plush'),bodyTree=descendants(g,[named(g,'body').i]);expect(bodyTree.has(alf.i)).toBe(true);expect([...descendants(g,[alf.i])].some(i=>g.nodes[i].mesh!==undefined)).toBe(true);expect(alf.n.translation?.[0]).not.toBe(0);
  for(const [id,model] of models)if(id!=='hola-willy')expect(model.nodes.some(n=>n.name==='ALF-plush'),id+' passenger stays specific to Golf').toBe(false);
 });
});
