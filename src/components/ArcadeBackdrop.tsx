import { useEffect,useRef } from 'react';
import { arcadeBackdrop } from '../game/renderer';
export default function ArcadeBackdrop({worldId='la-salle',overview=false}:{worldId?:string;overview?:boolean}){const ref=useRef<HTMLCanvasElement>(null);useEffect(()=>{try{return arcadeBackdrop(ref.current!,worldId,overview);}catch{}},[worldId,overview]);return <canvas className="arcade-backdrop-canvas" ref={ref} aria-hidden="true"/>;}
