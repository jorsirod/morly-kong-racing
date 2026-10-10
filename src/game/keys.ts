/** Remappable keyboard controls, saved per browser. Two keys per action. */
export type KeyAction='left'|'right'|'brake'|'drift'|'fire'|'basic1'|'basic2'|'basic3'|'cycle'|'special'|'pause';
export const KEY_ACTIONS:{id:KeyAction;label:string}[]=[
 {id:'left',label:'Girar a la izquierda'},{id:'right',label:'Girar a la derecha'},{id:'brake',label:'Frenar'},{id:'drift',label:'Derrapar'},
 {id:'fire',label:'Lanzar el básico elegido'},{id:'basic1',label:'Básico 1 (elige y lanza)'},{id:'basic2',label:'Básico 2 (elige y lanza)'},{id:'basic3',label:'Básico 3 (elige y lanza)'},
 {id:'cycle',label:'Cambiar básico'},{id:'special',label:'Especial'},{id:'pause',label:'Pausa'},
];
export const DEFAULT_KEYS:Record<KeyAction,string[]>={left:['a','arrowleft'],right:['d','arrowright'],brake:['s','arrowdown'],drift:[' ','shift'],fire:['w','arrowup'],basic1:['1',''],basic2:['2',''],basic3:['3',''],cycle:['q',''],special:['e',''],pause:['escape','p']};
const STORE='morly-keys';
export function loadKeys():Record<KeyAction,string[]>{
 const keys=structuredClone(DEFAULT_KEYS);
 try{const saved=JSON.parse(localStorage.getItem(STORE)??'null') as Partial<Record<KeyAction,string[]>>|null;if(saved)for(const a of KEY_ACTIONS){const v=saved[a.id];if(Array.isArray(v)&&v.length===2&&v.every(k=>typeof k==='string'&&k.length<20))keys[a.id]=v;}}catch{/* corrupt or private: defaults */}
 return keys;
}
export function saveKeys(keys:Record<KeyAction,string[]>){try{localStorage.setItem(STORE,JSON.stringify(keys));window.dispatchEvent(new StorageEvent('storage',{key:STORE}));}catch{/* private mode */}}
/** Assigns a key to one slot and removes it from any other action, so a key never does two things. */
export function bindKey(keys:Record<KeyAction,string[]>,action:KeyAction,slot:0|1,key:string){
 const next=structuredClone(keys);if(key)for(const a of KEY_ACTIONS)next[a.id]=next[a.id].map(k=>k===key?'':k);next[action][slot]=key;return next;
}
const NAMES:Record<string,string>={' ':'ESPACIO',arrowleft:'←',arrowright:'→',arrowup:'↑',arrowdown:'↓',escape:'ESC',shift:'SHIFT',control:'CTRL',alt:'ALT',enter:'ENTER',tab:'TAB',backspace:'BORRAR',meta:'CMD'};
export function keyName(key:string){return key?NAMES[key]??key.toUpperCase():'—';}
export function keyLabel(keys:Record<KeyAction,string[]>,action:KeyAction){return keys[action].filter(Boolean).map(keyName).join(' / ')||'—';}
