/** Full-screen helpers. Android and desktop browsers support the Fullscreen API; iPhone Safari does not
 *  (only iPad does), so there the only way to lose the browser bars is to add the game to the home screen. */
import { useEffect,useState } from 'react';

type FsDocument=Document&{webkitFullscreenElement?:Element|null;webkitFullscreenEnabled?:boolean;webkitExitFullscreen?:()=>Promise<void>|void};
type FsElement=HTMLElement&{webkitRequestFullscreen?:()=>Promise<void>|void};
type LockableOrientation=ScreenOrientation&{lock?:(orientation:'landscape')=>Promise<void>;unlock?:()=>void};

const doc=()=>document as FsDocument;

/** True when this browser can really enter full screen on request. */
export function fullscreenSupported():boolean{
 if(typeof document==='undefined')return false;
 const d=doc(),e=document.documentElement as FsElement;
 return !!(d.fullscreenEnabled||d.webkitFullscreenEnabled)&&!!(e.requestFullscreen||e.webkitRequestFullscreen);
}

/** Already running as an installed app (home-screen icon): no browser bars to hide. */
export function isStandalone():boolean{
 try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;}catch{return false;}
}

export function isFullscreen():boolean{const d=doc();return !!(d.fullscreenElement||d.webkitFullscreenElement);}

/** Must be called from a tap or click. Resolves to the resulting state. */
export async function setFullscreen(on:boolean):Promise<boolean>{
 const d=doc(),e=document.documentElement as FsElement,orientation=screen.orientation as LockableOrientation|undefined;
 try{
  if(on){
   if(e.requestFullscreen)await e.requestFullscreen({navigationUI:'hide'});else await e.webkitRequestFullscreen?.();
   // Racing is played sideways. Android allows the lock only while in full screen; elsewhere it just rejects.
   if(matchMedia('(pointer: coarse)').matches)await orientation?.lock?.('landscape').catch(()=>{});
  }else{
   try{orientation?.unlock?.();}catch{/* not locked */}
   if(d.exitFullscreen)await d.exitFullscreen();else await d.webkitExitFullscreen?.();
  }
 }catch{/* refused by the browser: leave things as they are */}
 return isFullscreen();
}

export const toggleFullscreen=()=>setFullscreen(!isFullscreen());

/** Reacts to entering or leaving full screen, including the browser's own exit gesture. */
export function useFullscreen():boolean{
 const [active,setActive]=useState(isFullscreen);
 useEffect(()=>{
  const sync=()=>setActive(isFullscreen());
  document.addEventListener('fullscreenchange',sync);document.addEventListener('webkitfullscreenchange',sync);
  return()=>{document.removeEventListener('fullscreenchange',sync);document.removeEventListener('webkitfullscreenchange',sync);};
 },[]);
 return active;
}
