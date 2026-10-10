import { describe, expect, it } from 'vitest';
import { vehicleContact, vehicleDynamics, vehicleVelocity } from '../shared/dynamics';
import { makePlayer, Simulation } from '../shared/simulation';
import { EMPTY_INPUT, FIXED_DT, type GameState, type PlayerInput } from '../shared/types';
import { RacePrediction } from '../src/game/prediction';

const input = (seq: number): PlayerInput => ({ ...EMPTY_INPUT, seq, assist: false });
function snapshot(withPeer = true): GameState {
 const sim = new Simulation('battle');
 const own = sim.addPlayer(makePlayer('you', 'Piloto', 'semilla', 'white-empanade', 0));
 Object.assign(own, { x: 0, y: 0, z: 0, yaw: 0, speed: 16, ack: 0 });
 if (withPeer) {
  const peer = sim.addPlayer(makePlayer('other', 'Rival', 'morly', 'black-diamond', 1));
  Object.assign(peer, { x: 0, y: 0, z: vehicleDynamics(own.vehicleId).halfLength + vehicleDynamics(peer.vehicleId).halfLength + .1, yaw: 0, speed: 0 });
 }
 sim.state.phase = 'running';
 return structuredClone(sim.state);
}

describe('predicción y reconciliación de contactos', () => {
 it('siente el contacto pesado contra ligero antes del siguiente paquete del servidor', () => {
  const state = snapshot(), predictor = new RacePrediction('you');
  predictor.receive(state);
  predictor.update(input(1));
  const own = predictor.player!, peer = predictor.view(state).players[1];
  expect(own.impact).toBeGreaterThan(0);
  expect(peer.impact).toBeGreaterThan(own.impact);
  // A bump from behind pushes the light car along its own heading.
  expect(peer.speed).toBeGreaterThan(Math.max(0, 16.3 - own.speed) * 2);
  expect(vehicleContact(own, peer)).toBeNull();
  expect(vehicleVelocity(own).z).toBeGreaterThan(0);
 });

 it('predice y presenta copias sin alterar los rivales autoritativos', () => {
  const state = snapshot(), original = structuredClone(state), predictor = new RacePrediction('you');
  predictor.receive(state);
  for (let i = 1; i <= 4; i++) predictor.update(input(i));
  expect(state).toEqual(original);
  const view = predictor.view(state);
  view.players[1].x = 900;
  expect(state.players[1].x).toBe(original.players[1].x);
  expect(predictor.view(state).players[1].x).not.toBe(900);
 });

 it('reproduce sólo inputs pendientes después de una corrección con contacto', () => {
  const first = snapshot(), predictor = new RacePrediction('you');
  predictor.receive(first);
  for (let seq = 1; seq <= 3; seq++) predictor.update(input(seq));
  const correction = snapshot();
  correction.tick = 3;
  correction.players[0].ack = 1;
  correction.players[0].z += .05;
  correction.players[1].z += .04;
  const expected = new RacePrediction('you');
  expected.receive(correction);
  expected.update(input(2));
  expected.update(input(3));
  predictor.receive(correction);
  expect(predictor.pendingCount).toBe(2);
  expect(predictor.acknowledgement).toBe(1);
  expect(predictor.player).toEqual(expected.player);
  expect(predictor.view(correction).players[1]).toEqual(expected.view(correction).players[1]);
  // Receiving the same baseline again cannot stack its impulse.
  const after = structuredClone(predictor.player);
  predictor.receive(structuredClone(correction));
  expect(predictor.player).toEqual(after);
 });

 it('reconcilia impactos externos aunque la última secuencia confirmada no cambie', () => {
  const state = snapshot(false), predictor = new RacePrediction('you');
  predictor.receive(state);
  const correction = structuredClone(state);
  correction.tick++;
  Object.assign(correction.players[0], { x: 1, z: .4, stun: 1.5, pushX: 4, impact: .5 });
  predictor.receive(correction);
  expect(predictor.player).toEqual(correction.players[0]);
  expect(predictor.view(correction).players[0].x).toBe(1);
 });

 it('limita la extrapolación de rivales sin inventar segundos de movimiento', () => {
  const state = snapshot(), predictor = new RacePrediction('you');
  Object.assign(state.players[0], { x: -30, speed: 0 });
  Object.assign(state.players[1], { x: 30, z: 0, speed: 20 });
  predictor.receive(state);
  for (let seq = 1; seq <= 60; seq++) predictor.update(input(seq));
  expect(predictor.view(state).players[1].z).toBeCloseTo(20 * .15, 6);
  expect(state.players[1].z).toBe(0);
 });

 it('descarta inputs previos al reconectar y admite secuencias nuevas', () => {
  const state = snapshot(false), predictor = new RacePrediction('you');
  predictor.receive(state);
  predictor.update(input(120));
  predictor.update(input(121));
  predictor.reset();
  const reconnect = structuredClone(state);
  reconnect.tick = 40;
  reconnect.players[0].ack = 121;
  reconnect.players[0].z = 12;
  predictor.receive(reconnect);
  expect(predictor.pendingCount).toBe(0);
  expect(predictor.player).toEqual(reconnect.players[0]);
  predictor.update(input(122));
  expect(predictor.pendingCount).toBe(1);
  expect(predictor.player!.z).toBeGreaterThan(12);
 });

 it('la recuperación se presenta inmediatamente y las correcciones libres quedan acotadas', () => {
  const state = snapshot(false), predictor = new RacePrediction('you');
  predictor.receive(state);
  const small = structuredClone(state);
  small.tick++;
  small.players[0].x = 2;
  predictor.receive(small);
  expect(Math.abs(predictor.view(small).players[0].x - predictor.player!.x)).toBeLessThanOrEqual(.75);
  const jump = structuredClone(small);
  jump.tick++;
  jump.players[0].x = 50;
  predictor.receive(jump);
  expect(predictor.view(jump).players[0].x).toBe(50);
 });

 it('comenzar otra manga limpia la cola de inputs y la pose anterior', () => {
  const state = snapshot(false), predictor = new RacePrediction('you');
  predictor.receive(state);
  predictor.update(input(1));
  const next = structuredClone(state);
  next.tick++;
  next.round++;
  next.players[0].x = 40;
  predictor.receive(next);
  expect(predictor.pendingCount).toBe(0);
  expect(predictor.view(next).players[0]).toEqual(next.players[0]);
 });

 it('los finalistas siguen sólidos y la vuelta de enfriamiento ignora inputs humanos', () => {
  const state = snapshot(), predictor = new RacePrediction('you');
  state.players[1].finishTime = 100;
  predictor.receive(state);
  predictor.update(input(1));
  expect(predictor.player!.impact).toBeGreaterThan(0);
  expect(vehicleContact(predictor.player!, predictor.view(state).players[1])).toBeNull();
  const finished = snapshot(false);
  finished.tick++;
  finished.players[0].finishTime = 105;
  finished.players[0].speed = 12;
  predictor.receive(finished);
  predictor.update({ ...input(2), steer: 1, brake: true, attack: 4 });
  expect(predictor.pendingCount).toBe(0);
  expect(predictor.player!.z).toBeCloseTo(12 * FIXED_DT, 6);
  expect(predictor.player!.yaw).toBe(0);
  expect(predictor.player!.charges).toBe(finished.players[0].charges);
 });
});
