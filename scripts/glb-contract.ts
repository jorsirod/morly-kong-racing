/**
 * Contrato de los GLB de carros, compartido por `npm run assets` y las pruebas.
 *
 * Sirve para los GLB que genera el código (exportador de Babylon) y para los que
 * se exportan desde Blender (`art/blender/exports/<id>.glb`). Devuelve una lista
 * de problemas en español; una lista vacía significa que el GLB cumple.
 *
 * Coordenadas en el archivo glTF: +Y arriba, frente del carro en +Z y lado
 * izquierdo (el del conductor) en +X. En Blender eso es frente hacia −Y,
 * izquierda hacia +X y arriba +Z, exportando con `export_yup=True`.
 */

export type GLTFNode = { name?: string; children?: number[]; mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[] };
export type GLTF = {
  asset: { version: string; generator?: string };
  scene?: number;
  scenes: { nodes: number[] }[];
  nodes: GLTFNode[];
  meshes: { primitives: { attributes: { POSITION: number }; indices?: number }[] }[];
  accessors: { count: number; min?: number[]; max?: number[] }[];
  extensionsRequired?: string[];
};

/** Carpeta donde Blender deja los carros listos (`<id>.glb`). */
export const BLENDER_EXPORTS = 'art/blender/exports';
export const TRIANGLES_MIN = 1000;
export const TRIANGLES_MAX = 30000;
const AXLES = ['front', 'rear'] as const;
const SIDES = ['left', 'right'] as const;

/** Lee el JSON de un GLB (glTF binario 2.0). Lanza un error si el contenedor está dañado. */
export function readGlb(data: Uint8Array): GLTF {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.byteLength < 20) throw new Error('archivo demasiado corto para ser GLB');
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('no es un GLB (firma «glTF» ausente)');
  if (view.getUint32(4, true) !== 2) throw new Error('versión de contenedor GLB distinta de 2');
  if (view.getUint32(8, true) !== data.byteLength) throw new Error('GLB incompleto: el tamaño declarado no coincide');
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a) throw new Error('el primer bloque del GLB no es JSON');
  return JSON.parse(new TextDecoder().decode(data.subarray(20, 20 + length))) as GLTF;
}

function descendants(g: GLTF, roots: number[]) {
  const ids = new Set<number>();
  const visit = (id: number) => {
    if (ids.has(id) || !g.nodes[id]) return;
    ids.add(id);
    for (const child of g.nodes[id].children ?? []) visit(child);
  };
  roots.forEach(visit);
  return ids;
}

const isIdentityRotation = (r?: number[]) => !r || (Math.abs(r[0]) < 1e-4 && Math.abs(r[1]) < 1e-4 && Math.abs(r[2]) < 1e-4 && Math.abs(Math.abs(r[3]) - 1) < 1e-4);
const isIdentityScale = (s?: number[]) => !s || s.every(v => Math.abs(v - 1) < 1e-4);

/** Revisa el contrato visual de un carro. `id` es el id de `VEHICLES` (por ejemplo `hola-willy`). */
export function checkVehicleContract(id: string, g: GLTF): string[] {
  const problems: string[] = [];
  const named = (name: string) => {
    const matches = g.nodes.map((n, i) => ({ n, i })).filter(v => v.n.name === name);
    if (matches.length !== 1) {
      const similar = g.nodes.filter(n => n.name?.startsWith(name + '.')).map(n => n.name);
      problems.push(matches.length === 0
        ? `falta el nodo «${name}»` + (similar.length ? ` (hay ${similar.join(', ')}: quita el sufijo de Blender)` : '')
        : `hay ${matches.length} nodos llamados «${name}»; debe haber uno solo`);
      return undefined;
    }
    return matches[0];
  };

  if (g.asset?.version !== '2.0') problems.push('asset.version debe ser 2.0');
  if (g.extensionsRequired?.length) problems.push(`usa extensiones obligatorias (${g.extensionsRequired.join(', ')}); el juego carga sin internet, exporta sin Draco ni meshopt`);

  const active = descendants(g, g.scenes?.[g.scene ?? 0]?.nodes ?? []);
  const body = named('body');
  const bodyTree = body ? descendants(g, [body.i]) : new Set<number>();
  if (body && !active.has(body.i)) problems.push('«body» no está en la escena activa');

  const driver = named('driver-socket');
  const passenger = named('passenger-socket');
  if (driver && !bodyTree.has(driver.i)) problems.push('«driver-socket» debe colgar de «body»');
  if (passenger && !bodyTree.has(passenger.i)) problems.push('«passenger-socket» debe colgar de «body»');

  let triangles = 0;
  for (const mesh of g.meshes ?? []) for (const primitive of mesh.primitives) {
    const positions = g.accessors[primitive.attributes.POSITION];
    if (!positions || positions.count <= 2) { problems.push('hay una malla sin vértices suficientes'); continue; }
    if (!positions.min?.every(Number.isFinite) || !positions.max?.every(Number.isFinite)) problems.push('hay una malla con límites no finitos');
    else if (!positions.max.some((n, i) => n > (positions.min?.[i] ?? n))) problems.push('hay una malla vacía (todos los vértices en el mismo punto)');
    triangles += (primitive.indices === undefined ? positions.count : g.accessors[primitive.indices].count) / 3;
  }
  if (triangles < TRIANGLES_MIN) problems.push(`tiene ${Math.round(triangles)} triángulos; el mínimo es ${TRIANGLES_MIN} (¿falta la carrocería?)`);
  if (triangles > TRIANGLES_MAX) problems.push(`tiene ${Math.round(triangles)} triángulos; el máximo para celular es ${TRIANGLES_MAX}`);

  const pivots = g.nodes.filter(n => n.name?.startsWith('wheel-pivot-')).length;
  const spins = g.nodes.filter(n => n.name?.startsWith('wheel-spin-')).length;
  if (pivots !== 4) problems.push(`hay ${pivots} nodos wheel-pivot-*; deben ser 4`);
  if (spins !== 4) problems.push(`hay ${spins} nodos wheel-spin-*; deben ser 4`);

  const pivotAt: Record<string, number[] | undefined> = {};
  for (const axle of AXLES) for (const side of SIDES) {
    const pivot = named(`wheel-pivot-${axle}-${side}`);
    const spin = named(`wheel-spin-${axle}-${side}`);
    if (!pivot || !spin) continue;
    pivotAt[`${axle}-${side}`] = pivot.n.translation;
    if (!bodyTree.has(pivot.i)) problems.push(`«${pivot.n.name}» debe colgar de «body»`);
    if (!pivot.n.children?.includes(spin.i)) problems.push(`«${spin.n.name}» debe ser hijo directo de «${pivot.n.name}»`);
    if (![...descendants(g, [spin.i])].some(i => g.nodes[i].mesh !== undefined)) problems.push(`«${spin.n.name}» no contiene geometría de llanta`);
    for (const node of [pivot.n, spin.n]) {
      if (!isIdentityRotation(node.rotation)) problems.push(`«${node.name}» tiene rotación; déjala en cero o la rueda girará sobre otro eje`);
      if (!isIdentityScale(node.scale)) problems.push(`«${node.name}» tiene escala; aplícala a la malla, no al empty`);
    }
  }

  const fl = pivotAt['front-left'], fr = pivotAt['front-right'], rl = pivotAt['rear-left'], rr = pivotAt['rear-right'];
  if (fl && fr && rl && rr) {
    if (!(fl[0] > fr[0] && rl[0] > rr[0])) problems.push('las ruedas izquierdas deben estar en +X del glTF (en Blender, +X): el carro está espejado o las ruedas tienen los nombres cambiados');
    if (!(fl[2] > rl[2] && fr[2] > rr[2])) problems.push('las ruedas delanteras deben estar en +Z del glTF (en Blender, el frente mira a −Y): el carro está al revés');
  } else if (Object.keys(pivotAt).length === 4) {
    problems.push('los wheel-pivot-* deben estar en el centro de cada rueda, no en el origen');
  }

  const alfNodes = g.nodes.map((n, i) => ({ n, i })).filter(v => v.n.name === 'ALF-plush');
  if (id === 'hola-willy') {
    const alf = named('ALF-plush');
    if (alf) {
      if (!bodyTree.has(alf.i)) problems.push('«ALF-plush» debe colgar de «body»');
      if (![...descendants(g, [alf.i])].some(i => g.nodes[i].mesh !== undefined)) problems.push('«ALF-plush» no tiene geometría');
      if (!alf.n.translation?.[0]) problems.push('«ALF-plush» debe ir en el asiento del pasajero (X distinta de 0)');
    }
  } else if (alfNodes.length) {
    problems.push('ALF solo viaja en Hola Willy');
  }

  return problems;
}
