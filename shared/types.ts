export type Mode = 'race' | 'practice' | 'battle' | 'championship';
export type Phase = 'lobby' | 'countdown' | 'running' | 'results' | 'cup-results';
export type Effect = 'spin' | 'smoke' | 'slip' | 'slow' | 'stun' | 'paint';
export interface AttackDefinition { name: string; object: string; icon: string; count: number; effect: Effect; delivery: 'projectile' | 'rear' | 'area' | 'boomerang' | 'bounce' | 'homing'; }
export interface CharacterDefinition { id: string; name: string; color: string; shirt: string; initials: string; cap?: string; beard?: boolean; glasses?: boolean; basics: AttackDefinition[]; special: AttackDefinition; }
export interface VehicleDefinition { id: string; name: string; model: string; color: string; kind: 'suv' | 'pickup-double' | 'golf' | 'mazda' | 'matiz' | 'pickup-single'; description: string; stats: [number, number, number, number, number]; }
export interface Point { x: number; y: number; z: number; }
export interface TrackDefinition { id: string; name: string; subtitle: string; color: string; sky: string; ground: string; width: number; points: Point[]; landmarks: string[]; }
export interface PlayerInput { seq: number; steer: number; brake: boolean; drift: boolean; attack: number; actionSeq: number; assist: boolean; }
export interface PlayerState extends Point { id: string; nickname: string; characterId: string; vehicleId: string; bot: boolean; connected: boolean; ready: boolean; color: number; yaw: number; speed: number; steerAngle: number; turnRate: number; lateralSpeed: number; impact: number; vy: number; pushX: number; pushZ: number; progress: number; gate: number; lap: number; charges: number; score: number; cupPoints: number; cupTime: number; finishTime: number; stun: number; immune: number; cooldown: number; boost: number; driftCharge: number; sliding: number; haze: number; paint: number; ack: number; actionSeq: number; draft: number;
 /** Drift direction locked at entry: -1 left, 1 right, 0 none. */ driftDir: number;
 /** Yaw velocity from impacts, decays according to stability. */ yawKick: number;
 /** 0 asphalt, 1 rough/dirt, 2 off-road verge. */ surface: number;
 /** Seconds of stronger acceleration after a stun. */ recover: number;
 /** Limited catch-up factor 0..1 for racers far behind the leader. */ aid: number;
 /** Current boost source: 0 none, 1 mini (draft/landing/shortcut), 2 drift blue, 3 drift orange. */ boostLevel: number;
 /** Seconds airborne in the current jump. */ air: number;
 /** Start launch: 1 timed well, -1 pressed too early, 0 nothing. */ launch: number;
 /** Race stats for the awards screen. */ hitsGiven: number; hitsTaken: number; turbos: number; bumps: number; tows: number; lapStart: number; bestLap: number;
 /** Item slot ('' empty, see shared/items.ts) and remaining uses (triple coffee). */ item: string; itemUses: number;
 /** Seconds of item roulette; the item can be used when it reaches 0. */ roulette: number;
 /** Helmet: blocks the next hit while > 0 (seconds). */ shield: number;
 /** Fireworks glare on screen (seconds). */ flash: number;
 /** Bong hangover: lower top speed while > 0 (seconds). */ slow: number;
 /** Seconds until the Bong Cachinflín arrives (0 = none chasing you). */ bongWarn: number;
 /** Fall sequence: seconds left before the respawn (0 = not falling) and what you fell into. */ fall: number; fallKind: string;
 /** Last safe progress on the main road: the respawn point. */ safe: number;
 /** Seconds of the respawn blink (visual and grace). */ respawn: number;
 /** Vertical speed while grounded, so crests and ramp lips launch the car naturally. */ gvy: number; }
export interface Shot extends Point { id: number; cast: number; owner: string; object: string; effect: Effect; special: boolean; vx: number; vz: number; radius: number; life: number; age: number; delivery: AttackDefinition['delivery']; hit: string[];
 /** Soft aim: the rival this projectile gently curves toward ('' none). */ target: string;
 /** Track progress for objects that follow the road (the Bong). */ progress: number; }
/** kind 0: gold charge box (+3 charges). kind 1: surprise box (one item). */
export interface Pickup extends Point { id: number; availableAt: number; kind: number; }
export interface GameEvent { id: number; type: 'attack' | 'hit' | 'pickup' | 'finish' | 'boost' | 'collision' | 'land' | 'draft' | 'drift' | 'warn' | 'fall' | 'respawn' | 'item' | 'shield' | 'flash' | 'bong'; playerId: string; targetId?: string; text?: string; object?: string; special?: boolean; x?: number; y?: number; z?: number; intensity?: number; }
export interface GameState { version: number; phase: Phase; mode: Mode; trackId: string; /** Championship tracks, comma separated, in order. */ cup: string; time: number; tick: number; round: number; countdown: number; players: PlayerState[]; shots: Shot[]; pickups: Pickup[]; events: GameEvent[]; hostId: string; }
export const FIXED_DT = 1 / 60;
export const MAX_PLAYERS = 12;
export const EMPTY_INPUT: PlayerInput = { seq: 0, steer: 0, brake: false, drift: false, attack: 0, actionSeq: 0, assist: true };
