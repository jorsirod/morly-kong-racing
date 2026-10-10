import { lazy,Suspense } from 'react';
import { CHARACTERS,VEHICLES,character,vehicle } from '../../shared/content';
import { Portrait,VehicleIcon } from './Portrait';
const Preview=lazy(()=>import('./Preview'));
interface Props {characterId:string;vehicleId:string;onCharacter:(id:string)=>void;onVehicle:(id:string)=>void;}
const labels=['Velocidad','Aceleración','Manejo','Estabilidad','Terreno'];
export function Garage(p:Props){const c=character(p.characterId),v=vehicle(p.vehicleId);return <section className="garage" aria-label="Tu personaje y vehículo">
 <div className="garage-stage"><div className="stage-number">01 / EL GARAJE</div><div className="stage-ring"/><Suspense fallback={<div className="preview-loading"><VehicleIcon v={v}/><span>Abriendo el garaje…</span></div>}><Preview vehicleId={v.id} characterId={c.id}/></Suspense><div className="stage-caption"><span>ARRASTRA PARA VERLO</span><span>{v.model}</span></div></div>
 <div className="garage-details"><div className="section-heading"><span className="eyebrow">TU COMBINACIÓN</span><span className="tiny">Cualquier personaje. Cualquier carro.</span></div><h2>{c.name} <span>×</span> {v.name}</h2><p className="vehicle-description">{v.description}</p>
 <div className="character-list" role="group" aria-label="Elige personaje">{CHARACTERS.map(ch=><button key={ch.id} className={'character-choice '+(c.id===ch.id?'selected':'')} aria-pressed={c.id===ch.id} onClick={()=>p.onCharacter(ch.id)} title={ch.name}><Portrait c={ch}/><span>{ch.name}</span></button>)}</div>
 <div className="vehicle-list" role="group" aria-label="Elige vehículo">{VEHICLES.map(car=><button key={car.id} className={'vehicle-choice '+(v.id===car.id?'selected':'')} aria-pressed={v.id===car.id} onClick={()=>p.onVehicle(car.id)}><VehicleIcon v={car}/><span>{car.name}</span></button>)}</div>
 <div className="stats">{labels.map((label,i)=><div key={label} className="stat"><span>{label}</span><div aria-label={v.stats[i]+' de 5'}>{Array.from({length:5},(_,k)=><i key={k} className={k<v.stats[i]?'filled':''}/>)}</div></div>)}</div>
 <div className="skill-preview"><span className="skill-label">SU ESPECIAL</span><strong>{c.special.icon} {c.special.name}</strong></div></div></section>;}
