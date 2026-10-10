import { resolveVehicleCollision, vehicleDynamics } from '../../shared/dynamics';
import { stepPlayer } from '../../shared/simulation';
import { angle, closest, routeFor } from '../../shared/track';
import { FIXED_DT, type GameState, type PlayerInput, type PlayerState } from '../../shared/types';

const MAX_PENDING = 240;
const PEER_HORIZON = .15;
const MAX_VIEW_CORRECTION = .75;

/** A disposable client simulation. Authoritative snapshots are never mutated. */
export class RacePrediction {
 player: PlayerState | null = null;
 private peers = new Map<string, PlayerState>();
 private pending: PlayerInput[] = [];
 private state: GameState | null = null;
 private elapsed = 0;
 private lastTick = -1;
 private lastAck = -1;
 private correction = { x: 0, z: 0 };
 private touching = false;

 constructor(readonly playerId: string) {}
 get pendingCount() { return this.pending.length; }
 get acknowledgement() { return this.lastAck; }

 reset() {
  this.player = null;
  this.state = null;
  this.peers.clear();
  this.pending = [];
  this.lastTick = this.lastAck = -1;
  this.elapsed = 0;
  this.correction = { x: 0, z: 0 };
  this.touching = false;
 }

 receive(state: GameState) {
  const priorState = this.state;
  this.state = state;
  const own = state.players.find(p => p.id === this.playerId);
  if (!own) { this.player = null; this.peers.clear(); return; }
  // A rematch resets acknowledgements and time. Old race inputs must not replay.
  const newRace = priorState && (priorState.trackId !== state.trackId || priorState.round !== state.round || (priorState.phase !== 'running' && state.phase === 'running'));
  if (newRace || state.phase !== 'running' || own.finishTime >= 0) this.pending = [];
  if (state.phase === 'running' && !newRace && state.tick === this.lastTick && own.ack === this.lastAck) return;
  const previousView = this.player ? { x: this.player.x + this.correction.x, y: this.player.y, z: this.player.z + this.correction.z } : null;
  this.pending = this.pending.filter(input => input.seq > own.ack);
  this.player = { ...own };
  this.peers = new Map(state.players.filter(p => p.id !== this.playerId).map(p => [p.id, { ...p }]));
  this.elapsed = 0;
  this.touching = false;
  this.lastTick = state.tick;
  this.lastAck = own.ack;
  if (state.phase === 'running') {
   for (const input of this.pending) this.simulate(input);
   // Even without unacknowledged input, resolve tiny snapshot overlaps for display.
   this.contacts();
  }
  this.correction = { x: 0, z: 0 };
  if (previousView && state.phase === 'running' && !newRace && !this.nearContact()) {
   const dx = previousView.x - this.player.x, dz = previousView.z - this.player.z;
   const distance = Math.hypot(dx, dz);
   // Recoveries / teleports snap immediately; a small free-space correction fades.
   if (distance < 6 && Math.abs(previousView.y - this.player.y) < 2) {
    const scale = distance > MAX_VIEW_CORRECTION ? MAX_VIEW_CORRECTION / distance : 1;
    this.correction = { x: dx * scale, z: dz * scale };
   }
  }
 }

 update(input: PlayerInput) {
  if (!this.player || this.state?.phase !== 'running') return;
  // Finished drivers are server bots; no human inputs replay during the cooldown lap.
  if (this.player.finishTime < 0) {
   this.pending.push({ ...input });
   if (this.pending.length > MAX_PENDING) this.pending.shift();
  }
  const before = { x: this.player.x, y: this.player.y, z: this.player.z };
  this.simulate(input);
  if (this.nearContact() || Math.hypot(this.player.x - before.x, this.player.z - before.z) > 6 || Math.abs(this.player.y - before.y) > 2) this.correction = { x: 0, z: 0 };
  else {
   const decay = Math.exp(-14 * FIXED_DT);
   this.correction.x *= decay;
   this.correction.z *= decay;
  }
 }

 private simulate(input: PlayerInput) {
  if (!this.player || !this.state) return;
  const route = routeFor(this.state.trackId);
  // Peer input is unknown. Extrapolate its last velocity briefly, then stop.
  // These copies also absorb our predicted impact, keeping visual contacts solid.
  const dt = Math.max(0, Math.min(FIXED_DT, PEER_HORIZON - this.elapsed));
  if (dt > 0) for (const peer of this.peers.values()) {
   const sin = Math.sin(peer.yaw), cos = Math.cos(peer.yaw);
   peer.x += (sin * peer.speed + cos * peer.lateralSpeed + peer.pushX) * dt;
   peer.z += (cos * peer.speed - sin * peer.lateralSpeed + peer.pushZ) * dt;
   peer.yaw = angle(peer.yaw + peer.turnRate * dt);
   peer.y = this.state.mode === 'battle' ? 0 : peer.vy !== 0 || peer.fall > 0 || peer.air > 0 ? peer.y + peer.vy * dt : closest(route, peer.x, peer.z, { y: peer.y, hint: peer.progress, lap: peer.lap }).y;
  }
  if (this.player.finishTime >= 0 && dt > 0) {
   const p = this.player, sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
   p.x += (sin * p.speed + cos * p.lateralSpeed + p.pushX) * dt;
   p.z += (cos * p.speed - sin * p.lateralSpeed + p.pushZ) * dt;
   p.yaw = angle(p.yaw + p.turnRate * dt);
   p.y = this.state.mode === 'battle' ? 0 : p.vy !== 0 || p.air > 0 ? p.y + p.vy * dt : closest(route, p.x, p.z, { y: p.y, hint: p.progress, lap: p.lap }).y;
  }
  this.elapsed += FIXED_DT;
  if (this.player.finishTime < 0) stepPlayer(this.player, input, route, this.state.mode, FIXED_DT);
  this.contacts();
 }

 private contacts() {
  if (!this.player) return;
  for (let pass = 0; pass < 3; pass++) for (const peer of this.peers.values()) {
   if (resolveVehicleCollision(this.player, peer).collided) this.touching = true;
  }
 }

 private nearContact() {
  if (!this.player) return false;
  if (this.touching || this.player.impact > .08) return true;
  const own = vehicleDynamics(this.player.vehicleId);
  const ownRadius = Math.hypot(own.halfWidth, own.halfLength);
  return [...this.peers.values()].some(peer => {
   const other = vehicleDynamics(peer.vehicleId);
   return Math.abs(peer.y - this.player!.y) < 2 && Math.hypot(peer.x - this.player!.x, peer.z - this.player!.z) < ownRadius + Math.hypot(other.halfWidth, other.halfLength) + .5;
  });
 }

 view(state: GameState): GameState {
  if (!this.player || state.phase !== 'running') return state;
  return { ...state, players: state.players.map(p => p.id === this.playerId ? { ...this.player!, x: this.player!.x + this.correction.x, z: this.player!.z + this.correction.z } : this.peers.has(p.id) ? { ...this.peers.get(p.id)! } : p) };
 }
}
