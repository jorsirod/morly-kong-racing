import { useEffect,useRef,useState } from 'react';
import { garagePreview } from '../game/renderer';
import { vehicle } from '../../shared/content';
import { VehicleIcon } from './Portrait';
export default function Preview({vehicleId,characterId}:{vehicleId:string;characterId:string}){const ref=useRef<HTMLCanvasElement>(null),[error,setError]=useState(false);useEffect(()=>{setError(false);try{return garagePreview(ref.current!,vehicleId,characterId);}catch{setError(true);}},[vehicleId,characterId]);return error?<div className="preview-loading"><VehicleIcon v={vehicle(vehicleId)}/><span>Vista del vehículo</span></div>:<canvas ref={ref} className="garage-canvas" aria-label={'Vista 3D de '+vehicle(vehicleId).name}/>;}
