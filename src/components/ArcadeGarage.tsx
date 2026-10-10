import { lazy,Suspense } from 'react';
import { CHARACTERS,VEHICLES,character,vehicle } from '../../shared/content';
import {AssetBoundary} from './AssetBoundary';
import { Portrait,VehicleIcon } from './Portrait';
import {WeaponIcon} from './WeaponIcon';
const Preview=lazy(()=>import('./Preview'));
const labels=['Velocidad','Aceleración','Manejo','Estabilidad','Terreno'];
export function ArcadeGarage({step,characterId,vehicleId,onCharacter,onVehicle}:{step:number;characterId:string;vehicleId:string;onCharacter:(id:string)=>void;onVehicle:(id:string)=>void}){
 const c=character(characterId),v=vehicle(vehicleId);
 return <div className="arcade-garage"><section className="arcade-preview"><div className="preview-player-tag"><b>1P</b><span>{c.name}</span></div><AssetBoundary fallback={<div className="preview-loading"><VehicleIcon v={v}/><span>Sin vista 3D. El carro sigue aquí.</span></div>}><Suspense fallback={<div className="preview-loading"><VehicleIcon v={v}/><span>Inflando las llantas y el ego…</span></div>}><Preview vehicleId={v.id} characterId={c.id}/></Suspense></AssetBoundary><div className="arcade-preview-name"><span>{v.model}</span><strong>{v.name}</strong><small>ARRASTRA PARA GIRAR EL CARRO</small></div></section>
 <section className="arcade-selection arcade-panel"><div className="panel-strip">{step===1?'ELIGE TU PILOTO':'ELIGE TU CARRO'}<span>LIBRE ELECCIÓN</span></div>
 {step===1?<><div className="arcade-roster">{CHARACTERS.map(ch=><button className={'arcade-character '+(ch.id===c.id?'selected':'')} key={ch.id} onClick={()=>onCharacter(ch.id)} aria-pressed={ch.id===c.id}><Portrait c={ch}/><strong>{ch.name}</strong>{ch.id===c.id&&<b>1P</b>}</button>)}</div><div className="arcade-special"><span>ESPECIAL</span><strong><WeaponIcon object={c.special.object}/>{c.special.name}</strong></div></>:<><div className="arcade-cars">{VEHICLES.map(car=><button className={'arcade-car '+(car.id===v.id?'selected':'')} key={car.id} onClick={()=>onVehicle(car.id)} aria-pressed={car.id===v.id}><VehicleIcon v={car}/><strong>{car.name}</strong>{car.id===v.id&&<b>✓</b>}</button>)}</div><p className="car-banter">{v.description}</p><div className="arcade-stats">{labels.map((label,i)=><div key={label}><span>{label}</span><span aria-label={v.stats[i]+' de 5'}>{Array.from({length:5},(_,k)=><i key={k} className={k<v.stats[i]?'full':''}/>)}</span></div>)}</div></>}
 </section></div>;
}
