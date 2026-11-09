import {useEffect,useState} from 'react';
import type { CharacterDefinition, VehicleDefinition } from '../../shared/types';
/** Head portrait; `pose` uses the expressive special-move bust (falls back to the head). */
/** Painted portrait (Qwen Image, generated locally) first; if it can't load, the 3D caricature rendered in the browser. */
export function Portrait({c,pose=false}:{c:CharacterDefinition;pose?:boolean}){const [painted,setPainted]=useState(true);const [url,setUrl]=useState<string>();useEffect(()=>{if(painted)return;let live=true;import('../game/portraits').then(m=>pose?m.characterPoses():m.characterPortraits()).then(images=>{if(live)setUrl(images[c.id]);}).catch(()=>{});return()=>{live=false;};},[c.id,pose,painted]);
 return <span className={'driver-portrait'+(pose?' posed':'')+(painted?' painted':'')} style={{backgroundColor:c.color}} aria-hidden="true">{painted?<img src={`/art/pilot-${c.id}.webp`} alt="" loading="lazy" decoding="async" onError={()=>setPainted(false)}/>:url?<img src={url} alt=""/>:<b>{c.initials}</b>}</span>;}
/** Real 3D render of the car. While it is being drawn we show a neutral shimmer, never a stand-in car: a generic
 *  silhouette used to flash here and looked like the pre-revision models. */
export function VehicleIcon({v}:{v:VehicleDefinition}){const [state,setState]=useState<string>('');useEffect(()=>{let live=true;setState('');import('../game/portraits').then(m=>m.vehiclePortraits()).then(images=>{if(live)setState(images[v.id]??'none');}).catch(()=>{if(live)setState('none');});return()=>{live=false;};},[v.id]);const url=state&&state!=='none'?state:undefined;return <span className={'vehicle-portrait '+(url?'ready':state==='none'?'missing':'pending')} aria-hidden="true">{url&&<img src={url} alt=""/>}</span>;}
