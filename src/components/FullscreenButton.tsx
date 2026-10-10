import { useState } from 'react';
import { fullscreenSupported,isStandalone,toggleFullscreen,useFullscreen } from '../game/fullscreen';

const Corners=({on}:{on:boolean})=><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{on?<path d="M12 4v8H4M20 4v8h8M12 28v-8H4M20 28v-8h8"/>:<path d="M4 12V4h8M28 12V4h-8M4 20v8h8M28 20v8h-8"/>}</svg>;

/** Full-screen toggle. Where the browser cannot do it (iPhone Safari), it explains the home-screen route instead. */
export function FullscreenButton({variant='icon',className='',onUnsupported,hideIfUnsupported=false}:{variant?:'icon'|'text';className?:string;onUnsupported?:()=>void;hideIfUnsupported?:boolean}){
 const active=useFullscreen(),[hint,setHint]=useState(false);
 if(isStandalone()||(hideIfUnsupported&&!fullscreenSupported()))return null;
 const label=active?'Salir de pantalla completa':'Pantalla completa';
 const press=()=>{
  if(!fullscreenSupported()){if(onUnsupported)onUnsupported();else{setHint(true);window.setTimeout(()=>setHint(false),7000);}return;}
  void toggleFullscreen();
 };
 return <>
  <button type="button" className={'fs-button '+variant+' '+className} onClick={press} aria-label={label} aria-pressed={active} title={label}>
   <Corners on={active}/>{variant==='text'&&<span>{active?'SALIR DE PANTALLA COMPLETA':'PANTALLA COMPLETA'}</span>}
  </button>
  {hint&&<span className="fs-hint" role="status">En iPhone: Compartir → Añadir a pantalla de inicio. Así abre sin las barras de Safari.</span>}
 </>;
}
