import { track } from '../../shared/content';
/**
 * Start-of-race curtain: two checkered-flag halves cover the first frames (shaders warming up, canvas settling), the
 * world's name slams in, then the flags split open like a garage door and the countdown takes over. Pure CSS, ~1.9 s.
 */
export function RaceIntro({trackId}:{trackId:string}){
 return <div className="race-intro" aria-hidden="true">
  <div className="race-intro-flag left"/><div className="race-intro-flag right"/>
  <div className="race-intro-flash"/>
  <div className="race-intro-badge"><small>PRÓXIMA PARADA</small><b>{track(trackId).name}</b><span>¡ARRANCA, CHAVALO!</span></div>
 </div>;
}
