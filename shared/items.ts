/*
 * Surprise-box items. Charges (gold boxes) still power each pilot's own attacks; the
 * multicolour boxes give one of these, weighted by your real position in the race.
 */
export type ItemId='cafe'|'cafe3'|'casco'|'coco'|'chilero'|'cohetes'|'bong';
export interface ItemDef { id:ItemId; name:string; role:'MOVILIDAD'|'DEFENSA'|'ATAQUE'|'TRAMPA'|'INTERFERENCIA'|'REMONTADA'; desc:string; color:string }
export const ITEMS:Record<ItemId,ItemDef>={
 cafe:{id:'cafe',name:'Cafecito Presto',role:'MOVILIDAD',desc:'Súper turbo de un solo trago.',color:'#c97b3a'},
 cafe3:{id:'cafe3',name:'Tres cafecitos',role:'MOVILIDAD',desc:'Tres súper turbos. Para los que van atrás.',color:'#e09b4a'},
 casco:{id:'casco',name:'Casco de motorizado',role:'DEFENSA',desc:'Bloquea el próximo golpe durante 10 s.',color:'#4fb5ff'},
 coco:{id:'coco',name:'Coco loco',role:'ATAQUE',desc:'Rebota en los muros y tumba al primero que toca.',color:'#8a5a2b'},
 chilero:{id:'chilero',name:'Chilero',role:'TRAMPA',desc:'Charco picante atrás: el que lo pisa patina.',color:'#e8442c'},
 cohetes:{id:'cohetes',name:'Cohetes de La Purísima',role:'INTERFERENCIA',desc:'Encandila 1,8 s a todos los que van adelante.',color:'#ffd33d'},
 bong:{id:'bong',name:'El Bong Cachinflín',role:'REMONTADA',desc:'Persigue al líder escapado. Lo marea y lo frena.',color:'#9be35a'},
};
/**
 * Balance knobs for «El Bong Cachinflín». Lead is measured in metres of real track progress
 * (laps and checkpoints included), never in straight-line distance.
 */
export const BONG={
 /** Minimum lead of the leader over second place, in metres of progress (≈5–6 s). */ lead:110,
 /** Chance per surprise box for the last place; second place gets 40 % of it. */ chance:.45,
 /** Flight speed along the road (faster than any boosted car); it flies faster while far away. */ speed:52,
 /** Seconds of spin, of reduced top speed, and the top-speed factor during the hangover. */ stun:1.05, slow:2.4, slowFactor:.72,
 /** Seconds after a launch during which nobody can get or throw another one. */ cooldown:32,
 /** Seconds of warning the leader gets before the impact (minimum). */ warn:2.2,
 life:16,
};
/** Weighted table by position: 0 = leader, 1 = last. Deterministic with the given random numbers. */
export function rollItem(fraction:number,players:number,bongAllowed:boolean,r1:number,r2:number):ItemId{
 const f=Math.max(0,Math.min(1,fraction));
 if(bongAllowed&&f>0&&r2<BONG.chance*(.4+.6*f))return 'bong';
 const table:[ItemId,number][]=players<=1?[['cafe',30],['coco',25],['chilero',20],['casco',25]]
  :f<.2?[['coco',30],['chilero',30],['casco',26],['cafe',14]]
  :f<.6?[['cafe',24],['coco',20],['chilero',12],['casco',16],['cohetes',20],['cafe3',8]]
  :[['cafe3',32],['cafe',18],['cohetes',22],['casco',14],['coco',14]];
 const total=table.reduce((a,[,w])=>a+w,0);let pick=r1*total;for(const [id,w] of table){if(pick<w)return id;pick-=w;}return table[0][0];
}
/** Small deterministic hash → [0,1) shared by server, tests and replays. */
export function hash01(...values:number[]){let h=2166136261>>>0;for(const v of values){h^=Math.floor(v*1000)&0xffffffff;h=Math.imul(h,16777619)>>>0;h^=h>>>13;}h=Math.imul(h,2246822519)>>>0;h^=h>>>16;return (h>>>0)/4294967296;}
