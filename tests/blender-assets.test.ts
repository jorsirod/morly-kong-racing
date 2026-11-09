import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../shared/content';
import { BLENDER_EXPORTS, checkVehicleContract, readGlb, type GLTF } from '../scripts/glb-contract';

const load = (id: string) => readGlb(readFileSync(`public/models/${id}.glb`));
const clone = (g: GLTF): GLTF => JSON.parse(JSON.stringify(g));
const node = (g: GLTF, name: string) => g.nodes.find(n => n.name === name)!;

describe('contrato GLB compartido con npm run assets', () => {
  it('acepta los GLB actuales de los carros', () => {
    for (const v of VEHICLES) expect(checkVehicleContract(v.id, load(v.id)), v.id).toEqual([]);
  });

  it('explica los errores típicos de un GLB exportado desde Blender', () => {
    const base = load('silver-surfer');
    const expectProblem = (g: GLTF, pattern: RegExp, id = 'silver-surfer') => expect(checkVehicleContract(id, g).join('\n')).toMatch(pattern);

    const suffixed = clone(base); node(suffixed, 'wheel-spin-rear-right').name = 'wheel-spin-rear-right.001';
    expectProblem(suffixed, /quita el sufijo de Blender/);

    const mirrored = clone(base);
    for (const n of mirrored.nodes) if (n.name?.startsWith('wheel-pivot-') && n.translation) n.translation[0] *= -1;
    expectProblem(mirrored, /espejado/);

    const backwards = clone(base);
    for (const n of backwards.nodes) if (n.name?.startsWith('wheel-pivot-') && n.translation) n.translation[2] *= -1;
    expectProblem(backwards, /al revés/);

    const rotated = clone(base); node(rotated, 'wheel-spin-front-left').rotation = [0, 0, 0.7071, 0.7071];
    expectProblem(rotated, /tiene rotación/);

    const draco = clone(base); draco.extensionsRequired = ['KHR_draco_mesh_compression'];
    expectProblem(draco, /sin Draco/);

    expectProblem(load('hola-willy'), /ALF solo viaja en Hola Willy/, 'silver-surfer');
  });

  it('rechaza archivos que no son GLB', () => {
    expect(() => readGlb(new TextEncoder().encode('esto no es un modelo 3D'))).toThrow(/no es un GLB/);
  });

  it('cada carro exportado desde Blender corresponde a un carro y cumple el contrato', () => {
    if (!existsSync(BLENDER_EXPORTS)) return;
    for (const file of readdirSync(BLENDER_EXPORTS).filter(f => f.endsWith('.glb'))) {
      const id = file.replace(/\.glb$/, '');
      expect(VEHICLES.some(v => v.id === id), `${file}: no hay carro con id «${id}»`).toBe(true);
      expect(checkVehicleContract(id, readGlb(readFileSync(`${BLENDER_EXPORTS}/${file}`))), file).toEqual([]);
    }
  });
});
