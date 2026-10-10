import {useEffect,useState} from 'react';
import {KEY_ACTIONS,DEFAULT_KEYS,bindKey,keyName,loadKeys,saveKeys,type KeyAction} from '../game/keys';
/** Keyboard remapping: click a slot, press a key. Esc cancels, Backspace clears the slot. */
export function KeyBindings({onCapture}:{onCapture?:(capturing:boolean)=>void}){
 const [keys,setKeys]=useState(loadKeys),[waiting,setWaiting]=useState<{action:KeyAction;slot:0|1}|null>(null);
 useEffect(()=>{onCapture?.(!!waiting);if(!waiting)return;
  const capture=(e:KeyboardEvent)=>{e.preventDefault();e.stopPropagation();const k=e.key.toLowerCase();
   if(k==='escape'&&waiting.action!=='pause'){setWaiting(null);return;}
   const next=bindKey(keys,waiting.action,waiting.slot,k==='backspace'?'':k);setKeys(next);saveKeys(next);setWaiting(null);};
  window.addEventListener('keydown',capture,true);return()=>window.removeEventListener('keydown',capture,true);},[waiting,keys,onCapture]);
 useEffect(()=>()=>onCapture?.(false),[onCapture]);
 return <div className="keymap" role="group" aria-label="Teclas de la computadora">
  <p className="keymap-help">Toca una casilla y presiona la tecla nueva. <b>Esc</b> cancela, <b>Borrar</b> la deja vacía. Una tecla solo puede hacer una cosa.</p>
  <div className="keymap-rows">{KEY_ACTIONS.map(a=><div className="keymap-row" key={a.id}><span>{a.label}</span>{([0,1] as const).map(slot=>{const active=waiting?.action===a.id&&waiting.slot===slot;return <button key={slot} type="button" className={'keycap'+(active?' listening':'')+(keys[a.id][slot]?'':' empty')} aria-label={a.label+', tecla '+(slot+1)+': '+keyName(keys[a.id][slot])} onClick={()=>setWaiting(active?null:{action:a.id,slot})}>{active?'PRESIONA…':keyName(keys[a.id][slot])}</button>;})}</div>)}</div>
  <button type="button" className="text-button keymap-reset" onClick={()=>{const d=structuredClone(DEFAULT_KEYS);setKeys(d);saveKeys(d);setWaiting(null);}}>Restablecer teclas originales</button>
 </div>;
}
