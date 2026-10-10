import { useEffect,useRef,useState } from 'react';
import type { GameEvent } from '../../shared/types';
import { FIXED_DT } from '../../shared/types';
import { DRIVE } from '../../shared/simulation';
import { RaceRenderer,savedQuality,type Quality } from './renderer';
import { InputController } from './input';
import { GameAudio,audioSettings } from './audio';
import { LocalSession,OnlineSession,type Session } from './session';
import {useDialogTrap} from '../components/useDialogTrap';
import {KeyBindings} from '../components/KeyBindings';
import {HUD,type FeedbackCue} from './HUD';
import {vehicleDynamics} from '../../shared/dynamics';
const vehicleMass=(id:string)=>id?vehicleDynamics(id).mass:1;
import { Results } from './Results';
const showStats=(()=>{try{return new URLSearchParams(location.search).has('qa')||localStorage.getItem('morly-stats')==='yes';}catch{return false;}})();
export default function GameView({session,onExit}:{session:Session;onExit:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),input=useRef<InputController|null>(null),audio=useRef<GameAudio|null>(null),renderer=useRef<RaceRenderer|null>(null),paused=useRef(false);
 const [,refresh]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[menu,setMenu]=useState(false),[muted,setMuted]=useState(()=>localStorage.getItem('morly-muted')==='yes'),[banner,setBanner]=useState<GameEvent|null>(null),[cue,setCue]=useState<FeedbackCue|null>(null),[tutorial,setTutorial]=useState(()=>localStorage.getItem('morly-tutorial')!=='done');
 useDialogTrap(!loading&&(menu||tutorial||['results','cup-results'].includes(session.state.phase)));
 useEffect(()=>{let cancelled=false,frame=0,timer:ReturnType<typeof setTimeout>|undefined,cueTimer:ReturnType<typeof setTimeout>|undefined;const controls=new InputController(),sound=new GameAudio(session.state.trackId);input.current=controls;audio.current=sound;controls.resequence(session.state.players.find(p=>p.id===session.id)?.ack??0);sound.start();let last=performance.now(),acc=0,uiTime=0,eventId=0,lastLap=0,lastBeat=-1,lastTrack=session.state.trackId;
  try{const view=new RaceRenderer(canvas.current!,session.state);renderer.current=view;if(new URLSearchParams(location.search).has('qa')){
    // QA-only hook: advances the local simulation deterministically for captures and checks.
    let qaSeq=1e6;const run=(seconds:number,opts:{steer?:number|'auto';drift?:boolean;brake?:boolean;attack?:number}={})=>{if(!(session instanceof LocalSession))return;const sim=session.sim;if(sim.state.phase==='countdown'){sim.state.countdown=0;sim.tick();}for(let i=0;i<seconds*60;i++){const me=sim.state.players.find(p=>p.id===session.id)!;const bot=sim.botInput(me);session.update({seq:++qaSeq,steer:opts.steer==='auto'||opts.steer===undefined?bot.steer:opts.steer,drift:opts.drift??false,brake:opts.brake??false,attack:i===0?opts.attack??0:0,actionSeq:i===0&&opts.attack?qaSeq:me.actionSeq,assist:true});}};
    (window as unknown as {__race:unknown}).__race={renderer:view,session,controls,run};}view.preload(session.state).then(()=>{if(cancelled){view.dispose();return;}setLoading(false);
   const loop=(now:number)=>{if(cancelled)return;if(now-last<1000/60-.5){frame=requestAnimationFrame(loop);return;}const dt=Math.min(.1,(now-last)/1000);last=now;
    if(!(paused.current&&session instanceof LocalSession)){acc+=dt;let steps=0;while(acc>=FIXED_DT&&steps++<6){session.update(controls.sample());acc-=FIXED_DT;}}
    const state=session instanceof OnlineSession?session.view():session.state;view.render(state,session.id,dt);const me=state.players.find(p=>p.id===session.id);sound.update(me?.speed??0,me?.vehicleId,!!me&&me.driftDir!==0,me?.boost??0,me?.surface??0,me?(me.driftCharge>=DRIVE.driftTier2?2:me.driftCharge>=DRIVE.driftTier1?1:0):0);sound.setIntensity(state.phase!=='running'?0:me&&me.lap>=2&&state.mode!=='battle'?2:1);
    if(state.trackId!==lastTrack){lastTrack=state.trackId;sound.setTrack(state.trackId);}
    const beat=state.phase==='countdown'&&state.countdown<=3?Math.ceil(state.countdown):state.phase==='running'&&state.time<.2?0:-1;if(beat!==lastBeat&&beat>=0){sound.effect('count',0,undefined,beat===0?1:0);}lastBeat=beat;
    for(const event of state.events){if(event.id<=eventId)continue;eventId=event.id;
     if(event.playerId===session.id||event.targetId===session.id){const cueFor=(text:string,kind:FeedbackCue['kind'],ms=850)=>{setCue({id:event.id,text,kind});clearTimeout(cueTimer);cueTimer=setTimeout(()=>setCue(null),ms);};
      const mine=event.playerId===session.id,target=state.players.find(p=>p.id===event.targetId);
      if(event.type==='attack'&&!event.special&&mine)cueFor(event.text??'¡Va el regalito!','attack',700);
      if(event.type==='pickup'&&mine)cueFor('+3 CARGAS','pickup',700);
      if(event.type==='boost'&&mine){if(event.text==='launch')cueFor('¡SALIDA PERFECTA!','good',1100);else if(event.text==='early')cueFor('MUY TEMPRANO. AHOGASTE EL CARRO','warn',1100);else if((event.intensity??0)>=3)cueFor('¡TURBO NARANJA!','boost',650);}
      if(event.type==='draft'&&mine)cueFor('¡REBUFO!','boost',600);
      if(event.type==='hit'){if(event.object==='obstacle')cueFor('EL OBSTÁCULO NO SE IBA A QUITAR','warn');else if(mine){cueFor('¡LE DISTE A '+(target?.nickname??'ALGUIEN').toUpperCase()+'!','hit',1000);if(navigator.vibrate)navigator.vibrate([10,30,10]);}else{cueFor('TE COBRARON LA CUENTA','warn',1000);if(navigator.vibrate)navigator.vibrate(40);}}
      if(event.type==='collision'&&(event.intensity??0)>.35&&event.object!=='curb')cueFor(mine&&target&&vehicleMass(target.vehicleId)<vehicleMass(me?.vehicleId??'')?'¡QUÍTATE!':'¡PUM! PERMISO, DIJO EL BUMPER','attack',650);
     }
     const source=state.players.find(p=>p.id===event.playerId);if(me&&source&&(event.playerId===session.id||event.targetId===session.id||Math.hypot(source.x-me.x,source.z-me.z)<30)){const pan=((source.x-me.x)*Math.cos(me.yaw)-(source.z-me.z)*Math.sin(me.yaw))/25;sound.effect(event.special?'special':event.type,pan,event.object,event.intensity,event.playerId===session.id);}
     if(event.type==='attack'&&event.special){const p=state.players.find(p=>p.id===event.playerId);if(p&&me&&(event.playerId===session.id||event.targetId===session.id||Math.hypot(p.x-me.x,p.z-me.z)<60)){setBanner(event);clearTimeout(timer);timer=setTimeout(()=>setBanner(null),760);}}}
    if(me&&me.lap!==lastLap){if(me.lap===2&&lastLap===1&&state.mode!=='battle'){setCue({id:-me.lap,text:'¡ÚLTIMA VUELTA!',kind:'good'});clearTimeout(cueTimer);cueTimer=setTimeout(()=>setCue(null),1300);sound.effect('lap',0);}lastLap=me.lap;}
    if(now-uiTime>100){refresh(n=>n+1);uiTime=now;}frame=requestAnimationFrame(loop);};frame=requestAnimationFrame(loop);
  }).catch(()=>{if(!cancelled)setError('No pudimos preparar esta pista. Vuelve al garaje e inténtalo otra vez.');});}catch{setError('Tu navegador no pudo iniciar los gráficos 3D. Prueba con Chrome o Safari actualizado.');}
  const key=(e:KeyboardEvent)=>{if(controls.capturing)return;if((e.key==='Escape'||(controls.isPause(e)&&!(e.target as HTMLElement)?.closest('input,select,textarea')))&&localStorage.getItem('morly-tutorial')==='done'&&!['results','cup-results'].includes(session.state.phase))setMenu(v=>!v);};const visibility=()=>controls.reset();window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{cancelled=true;cancelAnimationFrame(frame);clearTimeout(timer);clearTimeout(cueTimer);controls.dispose();sound.dispose();renderer.current?.dispose();window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[session]);
 useEffect(()=>{paused.current=menu||tutorial;if(menu||tutorial)input.current?.reset();},[menu,tutorial]);
 const state=session.state,me=state.players.find(p=>p.id===session.id);
 return <div className="game-view"><canvas ref={canvas} className="race-canvas" aria-label="Pista 3D de Morly Kong Racing"/>{loading&&!error&&<div className="full-loading"><b>PREPARANDO LA SALIDA</b><span>Inflando las llantas. El ego ya venía inflado.</span></div>}{error&&<div className="full-loading"><p role="alert">{error}</p><button className="button yellow" onClick={onExit}>Volver al garaje</button></div>}
 {!loading&&input.current&&<HUD state={state} id={session.id} input={input.current} banner={banner} cue={cue} fps={renderer.current?.fps??60} rtt={session.rtt} stats={showStats} calm={renderer.current?.reduced} muted={muted} onMute={()=>{audio.current?.toggle();setMuted(v=>!v);}} onMenu={()=>setMenu(true)}/>}
 {!loading&&!session.connected&&session.online&&<div className="network-notice" role="status">Reconectando… Un bot está cuidando tu carro.</div>}
 {!loading&&me?.finishTime!==-1&&state.phase==='running'&&state.mode!=='battle'&&<div className="network-notice">¡Llegaste! Esperamos a la pandilla para el podio.</div>}
 {!loading&&tutorial&&<div className="modal-backdrop"><section className="dialog tutorial" role="dialog" aria-modal="true" aria-labelledby="tutorial-title"><span className="eyebrow">UN MINUTO Y YA ESTÁS CORRIENDO</span><h2 id="tutorial-title">El carro acelera.<br/>No hay excusa.</h2><div className="tutorial-steps"><p><b>01</b><span>Gira con el pulgar izquierdo. En teclado, A y D.</span></p><p><b>02</b><span>Mantén derrape en las curvas. Suéltalo para el turbo.</span></p><p><b>03</b><span>Recoge cajas doradas. Toca para lanzar; mantén para elegir uno de los tres básicos.</span></p><p><b>04</b><span>Con cinco cargas, dispara tu especial.</span></p></div><button autoFocus className="button yellow" onClick={()=>{localStorage.setItem('morly-tutorial','done');setTutorial(false);}}>¡Ya, antes de que me arrepienta! →</button></section></div>}
 {!loading&&menu&&<div className="modal-backdrop"><section className="dialog pause-dialog" role="dialog" aria-modal="true" aria-labelledby="menu-title"><span className="eyebrow">PAUSA · AJUSTES</span><h2 id="menu-title">Recalculando la dignidad.</h2>{session.online&&<p className="pause-note">La carrera online sigue mientras estás aquí. Un bot no te cuida en pausa.</p>}
  <div className="pause-grid">
   <label className="toggle"><input type="checkbox" defaultChecked={input.current?.assist} onChange={e=>{if(input.current)input.current.assist=e.target.checked;try{localStorage.setItem('morly-assist',e.target.checked?'yes':'no');}catch{/* private mode */}}}/> Ayuda suave para conducir</label>
   <label className="toggle"><input type="checkbox" defaultChecked={renderer.current?.reduced} onChange={e=>{if(renderer.current)renderer.current.reduced=e.target.checked;try{localStorage.setItem('morly-motion',e.target.checked?'reduced':'full');}catch{/* private mode */}}}/> Menos movimiento de cámara</label>
   <label className="pause-range">Música<input type="range" min="0" max="1" step=".05" defaultValue={audioSettings.music} onChange={e=>audioSettings.set('morly-music',e.target.value)}/></label>
   <label className="pause-range">Efectos<input type="range" min="0" max="1" step=".05" defaultValue={audioSettings.sfx} onChange={e=>audioSettings.set('morly-sfx',e.target.value)}/></label>
   <label className="pause-select">Calidad gráfica<select defaultValue={savedQuality()} onChange={e=>{const q=e.target.value as Quality;try{localStorage.setItem('morly-quality',q);}catch{/* private mode */}if(q!=='auto')renderer.current?.setQuality(q);}}><option value="auto">Automática</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja (celulares viejos)</option></select></label>
  </div>
  <details className="pause-keys"><summary>Teclado de la computadora</summary><KeyBindings onCapture={capturing=>{if(input.current)input.current.capturing=capturing;}}/></details>
  <button autoFocus className="button yellow" onClick={()=>setMenu(false)}>Seguir corriendo →</button>
  {!session.online&&<button className="button outline" onClick={()=>{if(session instanceof LocalSession){session.sim.start();input.current?.reset();setMenu(false);}}}>Reiniciar desde la salida ↺</button>}
  <button className="button outline" onClick={onExit}>Volver al garaje</button></section></div>}
 {!loading&&(state.phase==='results'||state.phase==='cup-results')&&<Results state={state} id={session.id} canNext={!session.online||state.hostId===session.id} onNext={()=>{session.next();input.current?.reset();}} onExit={onExit}/>}
 <div className="rotate-notice"><span>↻</span><strong>Gira el celular para correr.</strong><p>Así cabe el carro. Y tu ego.</p></div></div>;
}
