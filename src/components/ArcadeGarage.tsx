import { lazy,Suspense,type CSSProperties } from 'react';
import { CHARACTERS,VEHICLES,character,vehicle } from '../../shared/content';
import {AssetBoundary} from './AssetBoundary';
import { Portrait,VehicleIcon } from './Portrait';
import {WeaponIcon} from './WeaponIcon';
import {DELIVERY_LABEL,EFFECT_LABEL,SPECIAL_INFO,TAGLINES,pilotStats} from './pilotInfo';
const Preview=lazy(()=>import('./Preview'));
const labels=['Velocidad','Aceleración','Manejo','Estabilidad','Terreno'];
const Pips=({value,label}:{value:number;label:string})=><span className="pips" role="img" aria-label={label+': '+value+' de 5'}>{Array.from({length:5},(_,k)=><i key={k} className={k<value?'full':''}/>)}</span>;
export function ArcadeGarage({step,characterId,vehicleId,onCharacter,onVehicle}:{step:number;characterId:string;vehicleId:string;onCharacter:(id:string)=>void;onVehicle:(id:string)=>void}){
 const c=character(characterId),v=vehicle(vehicleId);
 return <div className="arcade-garage"><section className="arcade-preview"><div className="preview-player-tag"><b>1P</b><span>{c.name}</span></div><AssetBoundary fallback={<div className="preview-loading"><VehicleIcon v={v}/><span>Sin vista 3D. El carro sigue aquí.</span></div>}><Suspense fallback={<div className="preview-loading"><VehicleIcon v={v}/><span>Inflando las llantas y el ego…</span></div>}><Preview vehicleId={v.id} characterId={c.id}/></Suspense></AssetBoundary><div className="arcade-preview-name"><span>{v.model}</span><strong>{v.name}</strong><small>ARRASTRA PARA GIRAR EL CARRO</small></div></section>
 <section className="arcade-selection arcade-panel"><div className="panel-strip">{step===1?'ELIGE TU PILOTO':'ELIGE TU CARRO'}<span>{c.name} × {v.name}</span></div>
 {step===1?<div className="pilot-pick">
  <div className="pilot-roster" role="group" aria-label="Pilotos">{CHARACTERS.map(ch=>{const on=ch.id===c.id;return <button className={'pilot-card'+(on?' selected':'')} style={{'--pc':ch.color} as CSSProperties} key={ch.id} onClick={()=>onCharacter(ch.id)} aria-pressed={on}>
   <Portrait c={ch} pose={on}/><span className="pilot-card-text"><strong>{ch.name}</strong><small>{on?'Maneja '+v.name:ch.special.name}</small></span>{on&&<b className="pilot-badge">1P</b>}</button>;})}</div>
  <div className="pilot-sheet" aria-live="polite">
   <p className="pilot-tagline"><strong>{c.name}</strong> {TAGLINES[c.id]}</p>
   <div className="pilot-special"><WeaponIcon object={c.special.object}/><div><span>ESPECIAL · 5 CARGAS</span><strong>«{c.special.name}»</strong><p>{SPECIAL_INFO[c.id]}</p></div></div>
   <div className="pilot-attacks">{c.basics.map(a=><span key={a.name}><WeaponIcon object={a.object} count={a.count}/><b>{a.name}</b><i>{EFFECT_LABEL[a.effect]} · {DELIVERY_LABEL[a.delivery]}</i></span>)}</div>
   <div className="pilot-stats">{pilotStats(c).map(s=><div key={s.label}><span>{s.label}</span><Pips value={s.value} label={s.label}/></div>)}</div>
  </div>
 </div>:<><div className="arcade-cars">{VEHICLES.map(car=><button className={'arcade-car '+(car.id===v.id?'selected':'')} key={car.id} onClick={()=>onVehicle(car.id)} aria-pressed={car.id===v.id}><VehicleIcon v={car}/><strong>{car.name}</strong><small>{car.model.split(' · ')[0]}</small>{car.id===v.id&&<b>✓</b>}</button>)}</div><p className="car-banter">{v.description}</p><div className="arcade-stats">{labels.map((label,i)=><div key={label}><span>{label}</span><Pips value={v.stats[i]} label={label}/></div>)}</div></>}
 </section></div>;
}
