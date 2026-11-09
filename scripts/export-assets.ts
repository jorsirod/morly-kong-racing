/**
 * `npm run assets`: escribe los GLB de los carros en public/models/.
 *
 * Para cada carro de VEHICLES:
 * - si existe art/blender/exports/<id>.glb (exportado desde Blender), se revisa
 *   contra el contrato y se copia tal cual;
 * - si no, se genera desde el código (src/game/vehicles.ts) como siempre.
 *
 * Un GLB de Blender que no cumple el contrato NO se copia: el archivo anterior de
 * public/models/ queda intacto y el comando termina con error.
 *
 * Opciones:
 *   npm run assets -- silver-surfer hola-willy   solo esos carros
 *   npm run assets -- --codigo                    ignora Blender y genera todo desde el código
 */
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { GLTF2Export } from '@babylonjs/serializers/glTF/2.0/glTFSerializer';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { VEHICLES } from '../shared/content';
import { buildVehicle } from '../src/game/models';
import { BLENDER_EXPORTS, checkVehicleContract, readGlb } from './glb-contract';

const OUT = 'public/models';

const args = process.argv.slice(2);
const forceCode = args.includes('--codigo') || args.includes('--code');
const only = args.filter(a => !a.startsWith('--'));
const unknown = only.filter(id => !VEHICLES.some(v => v.id === id));
if (unknown.length) {
  console.error(`Carros desconocidos: ${unknown.join(', ')}. Ids válidos: ${VEHICLES.map(v => v.id).join(', ')}`);
  process.exit(1);
}

async function fromCode(id: string) {
  const engine = new NullEngine({ renderWidth: 64, renderHeight: 64, textureSize: 64, deterministicLockstep: true, lockstepMaxSteps: 1 });
  const scene = new Scene(engine);
  buildVehicle(scene, id);
  scene.meshes.forEach(m => m.computeWorldMatrix(true));
  const out = await GLTF2Export.GLBAsync(scene, id, { exportWithoutWaitingForScene: true });
  for (const [name, blob] of Object.entries(out.glTFFiles)) await writeFile(`${OUT}/${name}`, Buffer.from(await (blob as Blob).arrayBuffer()));
  scene.dispose();
  engine.dispose();
}

await mkdir(OUT, { recursive: true });
let failed = 0;
for (const v of VEHICLES) {
  if (only.length && !only.includes(v.id)) continue;
  const blenderFile = `${BLENDER_EXPORTS}/${v.id}.glb`;
  if (!forceCode && existsSync(blenderFile)) {
    const data = await readFile(blenderFile);
    let problems: string[];
    try { problems = checkVehicleContract(v.id, readGlb(data)); } catch (error) { problems = [(error as Error).message]; }
    if (problems.length) {
      failed++;
      console.error(`✗ ${v.name}: ${blenderFile} no cumple el contrato; public/models/${v.id}.glb no se tocó.`);
      for (const p of problems) console.error(`    - ${p}`);
      continue;
    }
    await writeFile(`${OUT}/${v.id}.glb`, data);
    console.log(`${v.name} → ${OUT}/${v.id}.glb (desde Blender)`);
  } else {
    await fromCode(v.id);
    console.log(`${v.name} → ${OUT}/${v.id}.glb (desde el código)`);
  }
}
if (failed) process.exitCode = 1;
