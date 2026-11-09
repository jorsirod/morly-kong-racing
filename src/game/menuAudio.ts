import { GameAudio } from './audio';
import { PLAYLISTS } from './music';

/** Title of the menu theme, for the «now playing» pill. */
export const MENU_SONG=PLAYLISTS.menu?.[0]?.title??'';

/**
 * Menus: the theme song plus clean interface sounds. The audio context starts on the first tap or key (browser rule);
 * the music fades with the shared mute and music-volume settings. Returns the cleanup for useEffect.
 */
export function menuAudio(){
 const audio=new GameAudio('menu');let started=false,lastHover=0;
 const start=()=>{if(started){return;}started=true;audio.start();audio.setIntensity(1);audio.setSpeed(.45);};
 const kindOf=(el:HTMLElement):'confirm'|'back'|'select'|'toggle'=>{
  if(el.matches('.press-start,.next-button,.arcade-primary,.button.yellow'))return 'confirm';
  if(el.matches('.back-button,.arcade-back')||/^\s*(◀\s*)?ATRÁS/i.test(el.textContent??''))return 'back';
  if(el.matches('input[type=checkbox],input[type=range],.toggle'))return 'toggle';
  return 'select';
 };
 const click=(e:Event)=>{start();const el=(e.target as HTMLElement)?.closest?.('.arcade-app button,.arcade-dialog button,.lobby-page button,.arcade-app input,.arcade-dialog input') as HTMLElement|null;if(el)audio.ui(kindOf(el));};
 const hover=(e:PointerEvent)=>{if(e.pointerType!=='mouse')return;const el=(e.target as HTMLElement)?.closest?.('.arcade-app button,.lobby-page button');if(!el||el.contains(e.relatedTarget as Node))return;const now=performance.now();if(now-lastHover<45)return;lastHover=now;if(started)audio.ui('hover');};
 const key=(e:KeyboardEvent)=>{start();if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)&&started)audio.ui('hover');};
 document.addEventListener('click',click,true);document.addEventListener('pointerover',hover);document.addEventListener('keydown',key);
 // Returning from a race the browser already allows sound: start right away.
 if(navigator.userActivation?.hasBeenActive)start();
 return()=>{document.removeEventListener('click',click,true);document.removeEventListener('pointerover',hover);document.removeEventListener('keydown',key);audio.dispose();};
}
