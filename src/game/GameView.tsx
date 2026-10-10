import { useEffect,useRef,useState } from 'react';
import type { GameEvent } from '../../shared/types';
import { FIXED_DT } from '../../shared/types';
import { DRIVE,ranking } from '../../shared/simulation';
import { sample,sampleLane } from '../../shared/track';
import { RaceRenderer,savedQuality,type Quality } from './renderer';
import { InputController } from './input';
import { GameAudio,audioSettings } from './audio';
import { VoiceSystem } from './voices';
import { LocalSession,OnlineSession,type Session } from './session';
import {useDialogTrap} from '../components/useDialogTrap';
import {KeyBindings} from '../components/KeyBindings';
import {FullscreenButton} from '../components/FullscreenButton';
import {HUD,type FeedbackCue,type Subtitle} from './HUD';
import {ITEMS,type ItemId} from '../../shared/items';
import {character} from '../../shared/content';
import {vehicleDynamics} from '../../shared/dynamics';
const vehicleMass=(id:string)=>id?vehicleDynamics(id).mass:1;
import { Results } from './Results';
const showStats=(()=>{try{return new URLSearchParams(location.search).has('qa')||localStorage.getItem('morly-stats')==='yes';}catch{return false;}})();
export default function GameView({session,onExit}:{session:Session;onExit:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),input=useRef<InputController|null>(null),audio=useRef<GameAudio|null>(null),renderer=useRef<RaceRenderer|null>(null),paused=useRef(false);
 const [,refresh]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState(''),[menu,setMenu]=useState(false),[muted,setMuted]=useState(()=>localStorage.getItem('morly-muted')==='yes'),[banner,setBanner]=useState<GameEvent|null>(null),[cue,setCue]=useState<FeedbackCue|null>(null),[subtitle,setSubtitle]=useState<Subtitle|null>(null),[tutorial,setTutorial]=useState(()=>localStorage.getItem('morly-tutorial')!=='done');
 useDialogTrap(!loading&&(menu||tutorial||['results','cup-results'].includes(session.state.phase)));
 useEffect(()=>{let cancelled=false,frame=0,timer:ReturnType<typeof setTimeout>|undefined,cueTimer:ReturnType<typeof setTimeout>|undefined;const controls=new InputController(),sound=new GameAudio(session.state.trackId);input.current=controls;audio.current=sound;controls.resequence(session.state.players.find(p=>p.id===session.id)?.ack??0);sound.start();let last=performance.now(),acc=0,uiTime=0,eventId=0,lastLap=0,lastBeat=-1,lastTrack=session.state.trackId,lastBirds=-1,lastRoulette=0,lastAir=0,lastRank=-1,lastFinish=-1,rankCheck=0,subId=0,subTimer:ReturnType<typeof setTimeout>|undefined;
  // Voices: exact special phrases and rate-limited reactions, with subtitles and music ducking.
  const voices=new VoiceSystem(sound,line=>{setSubtitle({id:++subId,who:line.who,text:line.text,color:line.color,special:line.special,provisional:line.provisional});clearTimeout(subTimer);subTimer=setTimeout(()=>setSubtitle(null),(line.seconds+.5)*1000);});
  void voices.init([...new Set(session.state.players.map(p=>p.characterId))]);
  try{const view=new RaceRenderer(canvas.current!,session.state);renderer.current=view;if(new URLSearchParams(location.search).has('qa')){
    // QA-only hook: advances the local simulation deterministically for captures and checks.
    let qaSeq=1e6;const run=(seconds:number,opts:{steer?:number|'auto';drift?:boolean;brake?:boolean;attack?:number}={})=>{if(!(session instanceof LocalSession))return;const sim=session.sim;if(sim.state.phase==='countdown'){sim.state.countdown=0;sim.tick();}for(let i=0;i<seconds*60;i++){const me=sim.state.players.find(p=>p.id===session.id)!;const bot=sim.botInput(me);session.update({seq:++qaSeq,steer:opts.steer==='auto'||opts.steer===undefined?bot.steer:opts.steer,drift:opts.drift??false,brake:opts.brake??false,attack:i===0?opts.attack??0:0,actionSeq:i===0&&opts.attack?qaSeq:me.actionSeq,assist:true});}};
    // QA-only: drop your car at a fraction of the lap (or of an alternative lane) to inspect a section.
    const place=(f:number,lane='',offset=0,speed=18,lap=0)=>{if(!(session instanceof LocalSession))return;const sim=session.sim,me=sim.state.players.find(p=>p.id===session.id)!,r=sim.route,l=r.lanes.find(v=>v.id===lane);const q=l?sampleLane(l,f*l.length):sample(r,f*r.length),prog=l?l.from+(l.to-l.from)*f:f*r.length+lap*r.length;Object.assign(me,{x:q.x+Math.cos(q.yaw)*offset,z:q.z-Math.sin(q.yaw)*offset,y:q.y,yaw:q.yaw,speed,progress:prog,safe:prog,lap,gate:Math.floor(prog/(r.length/8))+1,vy:0,air:0,fall:0,stun:0,immune:0});};
    (window as unknown as {__race:unknown}).__race={renderer:view,session,controls,run,place};}view.preload(session.state).then(()=>{if(cancelled){view.dispose();return;}setLoading(false);
   const loop=(now:number)=>{if(cancelled)return;if(now-last<1000/60-.5){frame=requestAnimationFrame(loop);return;}const dt=Math.min(.1,(now-last)/1000);last=now;
    if(!(paused.current&&session instanceof LocalSession)){acc+=dt;let steps=0;while(acc>=FIXED_DT&&steps++<6){session.update(controls.sample());acc-=FIXED_DT;}}
    const state=session instanceof OnlineSession?session.view():session.state;view.render(state,session.id,dt);const me=state.players.find(p=>p.id===session.id);sound.update(me?.speed??0,me?.vehicleId,!!me&&me.driftDir!==0,me?.boost??0,me?.surface??0,me?(me.driftCharge>=DRIVE.driftTier2?2:me.driftCharge>=DRIVE.driftTier1?1:0):0);sound.setIntensity(state.phase!=='running'?0:me&&me.lap>=2&&state.mode!=='battle'?2:1);
    if(me){
     // Music follows the race: speed opens the hats, danger brings the tension layer in.
     let near=99;if(me.lap>=2&&state.phase==='running')for(const p of state.players)if(p.id!==me.id&&p.finishTime<0)near=Math.min(near,Math.hypot(p.x-me.x,p.z-me.z));
     sound.setSpeed(me.speed/(DRIVE.topSpeed*1.25),me.boost>0);sound.setTension(me.bongWarn>0?1:near<12?.55:0);
     if(state.phase==='running'){
      if(me.air>.05&&lastAir<=.05&&me.vy>5.5&&me.fall<=0)voices.say(me.characterId,'jump');
      if(state.mode!=='battle'&&(rankCheck+=dt)>.25){rankCheck=0;const rank=ranking(state).findIndex(p=>p.id===me.id);if(lastRank>=0&&rank>=0&&rank<lastRank&&state.time>4)voices.say(me.characterId,'overtake');lastRank=rank;}
     }
     if(me.finishTime>=0&&lastFinish<0&&state.mode!=='battle'&&ranking(state)[0]?.id===me.id)voices.say(me.characterId,'win',{force:true});
     lastAir=me.air;lastFinish=me.finishTime;
    }
    if(state.trackId!==lastTrack){lastTrack=state.trackId;sound.setTrack(state.trackId);}
    const beat=state.phase==='countdown'&&state.countdown<=3?Math.ceil(state.countdown):state.phase==='running'&&state.time<.2?0:-1;if(beat!==lastBeat&&beat>=0){sound.effect('count',0,undefined,beat===0?1:0);}lastBeat=beat;
    for(const event of state.events){if(event.id<=eventId)continue;eventId=event.id;
     if(event.playerId===session.id||event.targetId===session.id){const cueFor=(text:string,kind:FeedbackCue['kind'],ms=850)=>{setCue({id:event.id,text,kind});clearTimeout(cueTimer);cueTimer=setTimeout(()=>setCue(null),ms);};
      const mine=event.playerId===session.id,target=state.players.find(p=>p.id===event.targetId);
      if(event.type==='attack'&&!event.special&&mine)cueFor(event.text??'¡Va el regalito!','attack',700);
      if(event.type==='pickup'&&mine)cueFor('+3 CARGAS','pickup',700);
      if(event.type==='boost'&&mine){if(event.text==='launch')cueFor('¡SALIDA PERFECTA!','good',1100);else if(event.text==='early')cueFor('MUY TEMPRANO. AHOGASTE EL CARRO','warn',1100);else if((event.intensity??0)>=3)cueFor('¡TURBO NARANJA!','boost',650);}
      if(event.type==='draft'&&mine)cueFor('¡REBUFO!','boost',600);
      const HAZARD_CUE:Record<string,string>={pedestrian:'¡PERMISO! LA SEÑORA NI SE INMUTÓ',dancer:'¡TE SACARON A BAILAR!',crab:'¡UN CANGREJO! QUÉ PENA',cart:'¡LA CARRETILLA TENÍA PRIORIDAD!',crate:'¡CAJAS DE TOMATE POR TODOS LADOS!',ball:'¡BALONAZO!',hoop:'¡LA CANASTA NO SE MUEVE!',slipper:'¡CHINELA EN LA PISTA!',geyser:'¡LA FUMAROLA TE MANDÓ A VOLAR!',rock:'¡PIEDRA VOLCÁNICA!',wave:'¡OLA! TODO MOJADO',bus:'¡EL BUS NO FRENA PA NADIE!'};
      if(event.type==='hit'&&me&&!event.special){if(event.playerId===session.id&&event.targetId!==session.id)voices.say(me.characterId,'hit');else if(event.targetId===session.id)voices.say(me.characterId,'hurt');}
      if(event.type==='hit'&&me&&event.special&&event.targetId===session.id)setTimeout(()=>voices.say(me.characterId,'hurt'),1600);
      if(event.type==='fall'&&event.playerId===session.id&&me)voices.say(me.characterId,'fall');
      if(event.type==='hit'){const special=event.special,caster=state.players.find(p=>p.id===event.playerId),spec=caster?character(caster.characterId).special.name.toUpperCase():'';
       if(event.text==='hazard')cueFor(HAZARD_CUE[event.object??'']??'EL OBSTÁCULO NO SE IBA A QUITAR','warn',1100);
       else if(event.object==='bong'&&event.targetId===session.id)cueFor('¡EL BONG CACHINFLÍN TE MAREÓ!','warn',1600);
       else if(mine&&event.targetId!==session.id){cueFor(special?'¡'+spec+' A '+(target?.nickname??'ALGUIEN').toUpperCase()+'!':'¡LE DISTE A '+(target?.nickname??'ALGUIEN').toUpperCase()+'!','hit',special?1600:1000);if(navigator.vibrate)navigator.vibrate([10,30,10]);}
       else if(event.targetId===session.id){cueFor(special?(caster?.nickname??'ALGUIEN').toUpperCase()+' TE DIO CON '+spec:'TE COBRARON LA CUENTA','warn',special?1700:1000);if(navigator.vibrate)navigator.vibrate(special?[30,40,60]:40);}}
      if(event.type==='item'&&mine&&event.text==='roll')cueFor('CAJA SORPRESA…','pickup',600);
      if(event.type==='item'&&mine&&event.text==='use'&&event.object)cueFor('¡'+ITEMS[event.object as ItemId].name.toUpperCase()+'!','boost',800);
      if(event.type==='shield'&&event.targetId===session.id)cueFor('¡EL CASCO TE SALVÓ!','good',1000);
      if(event.type==='flash'&&event.targetId===session.id)cueFor('¡COHETES DE LA PURÍSIMA! NO VES NI PITO','warn',1300);
      if(event.type==='bong'&&mine)cueFor('¡AHÍ VA EL BONG CACHINFLÍN!','attack',1200);
      if(event.type==='fall'&&mine&&navigator.vibrate)navigator.vibrate([20,60,20]);
      if(event.type==='boost'&&mine&&(event.intensity??0)>=4)cueFor('¡SÚPER TURBO!','boost',700);
      if(event.type==='collision'&&(event.intensity??0)>.35&&event.object!=='curb')cueFor(mine&&target&&vehicleMass(target.vehicleId)<vehicleMass(me?.vehicleId??'')?'¡QUÍTATE!':'¡PUM! PERMISO, DIJO EL BUMPER','attack',650);
     }
     const source=state.players.find(p=>p.id===event.playerId);if(me&&source&&(event.playerId===session.id||event.targetId===session.id||Math.hypot(source.x-me.x,source.z-me.z)<30)){const pan=((source.x-me.x)*Math.cos(me.yaw)-(source.z-me.z)*Math.sin(me.yaw))/25;if(event.type==='warn'&&event.targetId!==session.id)continue;sound.effect(event.special&&event.type==='attack'?'special':event.type,pan,event.object??event.text,event.intensity,event.playerId===session.id);}
     if(event.type==='attack'&&event.special){const p=state.players.find(p=>p.id===event.playerId);if(p&&me&&(event.playerId===session.id||event.targetId===session.id||Math.hypot(p.x-me.x,p.z-me.z)<60)){voices.say(p.characterId,'special',{pan:((p.x-me.x)*Math.cos(me.yaw)-(p.z-me.z)*Math.sin(me.yaw))/40});setBanner(event);clearTimeout(timer);timer=setTimeout(()=>setBanner(null),event.playerId===session.id?2100:1800);}}}
    if(me&&me.roulette<=0&&lastRoulette>0&&me.item){setCue({id:-1000-state.tick,text:'TE TOCÓ: '+ITEMS[me.item as ItemId].name.toUpperCase(),kind:me.item==='bong'?'warn':'pickup'});clearTimeout(cueTimer);cueTimer=setTimeout(()=>setCue(null),1200);sound.effect('item',0,me.item);}lastRoulette=me?.roulette??0;
    const birdCall=view.screen.birdCall??-1;if(birdCall!==lastBirds){lastBirds=birdCall;if(birdCall>=0)sound.effect('birds',0);}
    if(me&&me.lap!==lastLap){if(me.lap===2&&lastLap===1&&state.mode!=='battle'){setCue({id:-me.lap,text:'¡ÚLTIMA VUELTA!',kind:'good'});clearTimeout(cueTimer);cueTimer=setTimeout(()=>setCue(null),1300);sound.effect('lap',0);}lastLap=me.lap;}
    if(now-uiTime>100){refresh(n=>n+1);uiTime=now;}frame=requestAnimationFrame(loop);};frame=requestAnimationFrame(loop);
  }).catch(()=>{if(!cancelled)setError('No pudimos preparar esta pista. Vuelve al garaje e inténtalo otra vez.');});}catch{setError('Tu navegador no pudo iniciar los gráficos 3D. Prueba con Chrome o Safari actualizado.');}
  const key=(e:KeyboardEvent)=>{if(controls.capturing)return;if((e.key==='Escape'||(controls.isPause(e)&&!(e.target as HTMLElement)?.closest('input,select,textarea')))&&localStorage.getItem('morly-tutorial')==='done'&&!['results','cup-results'].includes(session.state.phase))setMenu(v=>!v);};const visibility=()=>controls.reset();window.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
  return()=>{cancelled=true;cancelAnimationFrame(frame);clearTimeout(timer);clearTimeout(cueTimer);controls.dispose();voices.dispose();clearTimeout(subTimer);sound.dispose();renderer.current?.dispose();window.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);};
 },[session]);
 useEffect(()=>{paused.current=menu||tutorial;if(menu||tutorial)input.current?.reset();},[menu,tutorial]);
 const state=session.state,me=state.players.find(p=>p.id===session.id);
 return <div className="game-view"><canvas ref={canvas} className="race-canvas" aria-label="Pista 3D de Morly Kong Racing"/>{loading&&!error&&<div className="full-loading"><b>PREPARANDO LA SALIDA</b><span>Inflando las llantas. El ego ya venía inflado.</span></div>}{error&&<div className="full-loading"><p role="alert">{error}</p><button className="button yellow" onClick={onExit}>Volver al garaje</button></div>}
 {!loading&&input.current&&<HUD state={state} id={session.id} input={input.current} banner={banner} cue={cue} subtitle={subtitle} screen={renderer.current?.screen} fps={renderer.current?.fps??60} rtt={session.rtt} stats={showStats} calm={renderer.current?.reduced} muted={muted} onMute={()=>{audio.current?.toggle();setMuted(v=>!v);}} onMenu={()=>setMenu(true)}/>}
 {!loading&&!session.connected&&session.online&&<div className="network-notice" role="status">Reconectando… Un bot está cuidando tu carro.</div>}
 {!loading&&me?.finishTime!==-1&&state.phase==='running'&&state.mode!=='battle'&&<div className="network-notice">¡Llegaste! Esperamos a la pandilla para el podio.</div>}
 {!loading&&tutorial&&<div className="modal-backdrop"><section className="dialog tutorial" role="dialog" aria-modal="true" aria-labelledby="tutorial-title"><span className="eyebrow">UN MINUTO Y YA ESTÁS CORRIENDO</span><h2 id="tutorial-title">El carro acelera.<br/>No hay excusa.</h2><div className="tutorial-steps"><p><b>01</b><span>Gira con el pulgar izquierdo. En teclado, A y D.</span></p><p><b>02</b><span>Mantén derrape en las curvas. Suéltalo para el turbo.</span></p><p><b>03</b><span>Recoge cajas doradas. Toca para lanzar; mantén para elegir uno de los tres básicos.</span></p><p><b>04</b><span>Con cinco cargas, dispara tu especial.</span></p></div><button autoFocus className="button yellow" onClick={()=>{localStorage.setItem('morly-tutorial','done');setTutorial(false);}}>¡Ya, antes de que me arrepienta! →</button></section></div>}
 {!loading&&menu&&<div className="modal-backdrop"><section className="dialog pause-dialog" role="dialog" aria-modal="true" aria-labelledby="menu-title"><span className="eyebrow">PAUSA · AJUSTES</span><h2 id="menu-title">Recalculando la dignidad.</h2>{session.online&&<p className="pause-note">La carrera online sigue mientras estás aquí. Un bot no te cuida en pausa.</p>}
  <div className="pause-grid">
   <label className="toggle"><input type="checkbox" defaultChecked={input.current?.assist} onChange={e=>{if(input.current)input.current.assist=e.target.checked;try{localStorage.setItem('morly-assist',e.target.checked?'yes':'no');}catch{/* private mode */}}}/> Ayuda suave para conducir</label>
   <label className="toggle"><input type="checkbox" defaultChecked={renderer.current?.reduced} onChange={e=>{if(renderer.current)renderer.current.reduced=e.target.checked;try{localStorage.setItem('morly-motion',e.target.checked?'reduced':'full');}catch{/* private mode */}}}/> Menos movimiento de cámara</label>
   <label className="pause-range">Música<input type="range" min="0" max="1" step=".05" defaultValue={audioSettings.music} onChange={e=>audioSettings.set('morly-music',e.target.value)}/></label>
   <label className="pause-range">Efectos<input type="range" min="0" max="1" step=".05" defaultValue={audioSettings.sfx} onChange={e=>audioSettings.set('morly-sfx',e.target.value)}/></label>
   <label className="pause-range">Voces<input type="range" min="0" max="1" step=".05" defaultValue={audioSettings.voice} onChange={e=>audioSettings.set('morly-voice',e.target.value)}/></label>
   <label className="toggle"><input type="checkbox" defaultChecked={audioSettings.subtitles} onChange={e=>audioSettings.set('morly-subtitles',e.target.checked?'yes':'no')}/> Subtítulos de las voces</label>
   <label className="pause-select">Calidad gráfica<select defaultValue={savedQuality()} onChange={e=>{const q=e.target.value as Quality;try{localStorage.setItem('morly-quality',q);}catch{/* private mode */}if(q!=='auto')renderer.current?.setQuality(q);}}><option value="auto">Automática</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja (celulares viejos)</option></select></label>
  </div>
  <details className="pause-keys"><summary>Teclado de la computadora</summary><KeyBindings onCapture={capturing=>{if(input.current)input.current.capturing=capturing;}}/></details>
  <button autoFocus className="button yellow" onClick={()=>setMenu(false)}>Seguir corriendo →</button>
  <FullscreenButton variant="text" className="button outline" hideIfUnsupported/>
  {!session.online&&<button className="button outline" onClick={()=>{if(session instanceof LocalSession){session.sim.start();input.current?.reset();setMenu(false);}}}>Reiniciar desde la salida ↺</button>}
  <button className="button outline" onClick={onExit}>Volver al garaje</button></section></div>}
 {!loading&&(state.phase==='results'||state.phase==='cup-results')&&<Results state={state} id={session.id} canNext={!session.online||state.hostId===session.id} onNext={()=>{session.next();input.current?.reset();}} onExit={onExit}/>}
 <div className="rotate-notice"><span>↻</span><strong>Gira el celular para correr.</strong><p>Así cabe el carro. Y tu ego.</p></div></div>;
}
