import {useEffect,useMemo,useRef,useState} from 'react';
import {character,track,vehicle} from '../../shared/content';
import {DRIVE,INTRO,ranking} from '../../shared/simulation';
import {routeFor} from '../../shared/track';
import type {GameEvent,GameState,PlayerState} from '../../shared/types';
import {Portrait} from '../components/Portrait';
import {ControlIcon,WeaponIcon} from '../components/WeaponIcon';
import {InputController} from './input';
import {keyLabel} from './keys';
export type FeedbackCue={id:number;text:string;kind:'attack'|'hit'|'boost'|'pickup'|'collision'|'warn'|'good'};

const HOLD_MS=170;
/** Radial positions (px from the attack button centre) for the three basics, thumb-reachable. */
const WHEEL=[{x:-104,y:-34},{x:-74,y:-92},{x:-14,y:-118}];

/** Projectiles coming at you from behind or the side, in your car's frame. */
function threat(state:GameState,me:PlayerState){
 const fx=Math.sin(me.yaw),fz=Math.cos(me.yaw);let best:{side:number;distance:number}|null=null;
 for(const s of state.shots){
  if(s.owner===me.id||s.hit.includes(me.id)||s.delivery==='area'||s.delivery==='rear')continue;
  const dx=s.x-me.x,dz=s.z-me.z,distance=Math.hypot(dx,dz);if(distance>30||distance<1.5)continue;
  const along=dx*fx+dz*fz,across=dx*fz-dz*fx,closing=-(dx*s.vx+dz*s.vz)/distance;
  if(along<2&&closing>4&&(!best||distance<best.distance))best={side:Math.abs(across)<4?0:Math.sign(across),distance};
 }
 return best;
}

export function HUD({state,id,input,banner,cue,fps,rtt,muted,onMute,onMenu,stats,calm}:{calm?:boolean;state:GameState;id:string;input:InputController;banner:GameEvent|null;cue:FeedbackCue|null;fps:number;rtt:number;muted:boolean;onMute:()=>void;onMenu:()=>void;stats?:boolean}){
 const me=state.players.find(p=>p.id===id)??state.players[0],c=character(me?.characterId??'semilla');
 const [stick,setStick]=useState(0),[choosing,setChoosing]=useState(false),[,refresh]=useState(0);
 const joy=useRef<{x:number;id:number}|null>(null),fire=useRef<{x:number;y:number;at:number;timer:ReturnType<typeof setTimeout>;moved:boolean}|null>(null);
 useEffect(()=>()=>{if(fire.current)clearTimeout(fire.current.timer);},[]);
 const map=useMemo(()=>{const r=routeFor(state.trackId),xs=r.points.map(p=>p.x),zs=r.points.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),size=Math.max(maxX-minX,maxZ-minZ)*1.12,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const at=(x:number,z:number)=>({x:50+(x-cx)/size*100,y:50+(z-cz)/size*100});return{at,path:r.points.map((p,i)=>{const q=at(p.x,p.z);return(i?'L':'M')+q.x.toFixed(1)+','+q.y.toFixed(1);}).join(' ')+'Z'};},[state.trackId]);
 if(!me)return null;
 const battle=state.mode==='battle',order=ranking(state),place=order.findIndex(p=>p.id===id)+1,total=state.players.length;
 const secs=Math.max(0,state.time),time=Math.floor(secs/60)+':'+String(Math.floor(secs%60)).padStart(2,'0')+'.'+String(Math.floor(secs*10%10));
 const selected=Math.max(1,Math.min(3,input.selected)),basic=c.basics[selected-1],touch=input.device==='touch',pad=input.device==='pad';
 const caster=state.players.find(p=>p.id===banner?.playerId),casterChar=character(caster?.characterId??me.characterId);
 const charge=me.driftCharge,tier=charge>=DRIVE.driftTier2?2:charge>=DRIVE.driftTier1?1:0,danger=state.phase==='running'?threat(state,me):null;
 const lap=Math.min(3,me.lap+1);
 const intro=state.phase==='countdown'&&state.countdown>3,count=state.phase==='countdown'&&!intro?Math.max(1,Math.ceil(state.countdown)):0,go=state.phase==='running'&&state.time<.75;
 const releaseStick=()=>{joy.current=null;input.steer=0;setStick(0);};
 const select=(i:number)=>{if(input.selected!==i){input.selected=i;refresh(n=>n+1);if(navigator.vibrate)navigator.vibrate(8);}};
 const closeWheel=()=>{const f=fire.current;if(f)clearTimeout(f.timer);fire.current=null;setChoosing(false);};
 return <div className={'hx '+(touch?'hx-touch':'hx-desk')+(me.haze>0?' hx-hazed':'')+(calm?' hx-calm':'')}>
  <div className="hx-place" aria-live="polite">
   {battle?<><strong>{me.score}</strong><span className="hx-unit">PTS</span><small>{place}º DE {total}</small></>:<><strong className={'p'+Math.min(place,4)}>{place}</strong><span className="hx-unit">º</span><small>DE {total}</small></>}
  </div>
  <div className="hx-lap">{battle?<><b>{Math.max(0,Math.ceil(180-state.time))}</b><span>SEG · QUE ARDA LA CANCHA</span></>:<><b>VUELTA {lap}<i>/3</i></b><span className="hx-pips">{[1,2,3].map(n=><i key={n} className={n<lap?'done':n===lap?'now':''}/>)}</span></>}</div>
  <div className="hx-map"><svg viewBox="0 0 100 100" aria-label="Mapa de la pista">{battle?<rect x="18" y="24" width="64" height="52" rx="3" fill="none" stroke="#fff0c1" strokeWidth="3"/>:<><path d={map.path} fill="none" stroke="#0d1a3a" strokeWidth="9" strokeLinejoin="round"/><path d={map.path} fill="none" stroke="#fff0c1" strokeWidth="3.5" strokeLinejoin="round"/></>}{state.players.filter(p=>p.id!==id).map(p=>{const q=battle?{x:50+p.x/160*64,y:50+p.z/130*52}:map.at(p.x,p.z);return <circle key={p.id} cx={q.x} cy={q.y} r="3.2" fill={character(p.characterId).color} stroke="#0d1a3a" strokeWidth="1.2"/>;})}{(()=>{const q=battle?{x:50+me.x/160*64,y:50+me.z/130*52}:map.at(me.x,me.z);return <circle cx={q.x} cy={q.y} r="5" fill="#ffd33d" stroke="#0d1a3a" strokeWidth="1.6"/>;})()}</svg></div>
  <div className="hx-clock"><strong>{time}</strong>{state.mode==='championship'&&<span>MANGA {state.round}/3</span>}</div>
  <div className="hx-buttons"><button className="hx-icon" onClick={onMute} aria-label={muted?'Activar sonido':'Silenciar'}><ControlIcon kind={muted?'mute':'sound'}/></button><button className="hx-icon" onClick={onMenu} aria-label="Pausa y ajustes"><ControlIcon kind="menu"/></button></div>
  <div className="hx-speed"><b>{Math.round(Math.max(0,me.speed)*3.6)}</b><span>KM/H</span></div>
  {stats&&<small className="hx-stats">{fps} FPS{rtt>0?' · '+rtt+' ms':''}</small>}

  {intro&&<div className="hx-intro" key="intro"><span>{state.mode==='championship'?'COPA · MANGA '+state.round:state.mode==='battle'?'BATALLA':state.mode==='practice'?'PRÁCTICA':'CARRERA · 3 VUELTAS'}</span><strong>{track(state.trackId).name}</strong><em>{track(state.trackId).subtitle}</em><small>{c.name} × {vehicle(me.vehicleId).name}</small></div>}
  {(count>0||go)&&<div className={'hx-count'+(go?' go':'')} key={go?'go':count}><div className="hx-lights">{[3,2,1].map(n=><i key={n} className={go?'green':count<=n?'red':''}/>)}</div><strong>{go?'¡DALE!':count}</strong>{count>0&&count<=1&&!battle&&<span>{touch?'TOCA DERRAPE':pad?'RB':'ESPACIO'} AHORA = SALIDA CON TURBO</span>}</div>}

  {banner&&caster&&<div className="hx-banner" key={banner.id} style={{'--hero':casterChar.color} as React.CSSProperties}><div className="hx-lines"/><Portrait c={casterChar}/><div className="hx-banner-text"><span>{caster.nickname.toUpperCase()} · ESPECIAL</span><strong>{banner.text}</strong></div><WeaponIcon object={casterChar.special.object}/></div>}
  {cue&&<div className={'hx-cue '+cue.kind} key={cue.id}>{cue.text}</div>}
  {danger&&<div className={'hx-danger'+(danger.side<0?' left':danger.side>0?' right':'')} aria-live="assertive"><i/><i/><b>¡CUIDADO ATRÁS!</b></div>}

  <div className={'hx-drift t'+tier+(me.driftDir?' on':'')+(me.boost>0?' boosting b'+me.boostLevel:'')} aria-hidden="true">
   {me.boost>0?<b>{me.boostLevel>=3?'¡TURBO NARANJA!':me.boostLevel===2?'¡TURBO AZUL!':'¡EMPUJÓN!'}</b>:me.driftDir?<b>{tier===2?'¡SUELTA YA!':tier===1?'TURBO AZUL · SIGUE':'DERRAPANDO'}</b>:null}
   {(me.driftDir!==0||me.boost>0)&&<div className="hx-bar"><i style={{width:(me.boost>0?Math.min(1,me.boost/DRIVE.tier2Boost):Math.min(1,charge/DRIVE.driftTier2))*100+'%'}}/><u style={{left:DRIVE.driftTier1/DRIVE.driftTier2*100+'%'}}/></div>}
  </div>
  {me.draft>.15&&me.boost<=0&&<div className="hx-draft"><span>REBUFO</span><div className="hx-bar"><i style={{width:Math.min(1,me.draft/DRIVE.draftTime)*100+'%'}}/></div></div>}
  {me.immune>0&&me.stun<=0&&<div className="hx-shield">PROTEGIDO</div>}

  <div className={'hx-speedlines'+(me.boost>0?' boost':me.speed>21?' fast':'')}/>
  <div className={'screen-haze '+(me.haze>0?'visible':'')}/><div className={'screen-paint '+(me.paint>0?'visible':'')}/>

  <div className="hx-arsenal">
   <div className="hx-charges" aria-label={me.charges+' cargas de seis'}>{Array.from({length:6},(_,i)=><i key={i} className={(i<me.charges?'full':'')+(i===4?' sp':'')}/>)}<span>{me.charges===0?'BUSCA UNA CAJA':me.charges>=5?'ESPECIAL LISTA':me.charges+'/6'}</span></div>
   <div className="hx-special-wrap">
    <button className={'hx-special'+(me.charges>=5?' ready':'')} aria-label={'Especial: '+c.special.name+(me.charges<5?'. Necesitas cinco cargas.':'')} disabled={me.charges<5} onPointerDown={e=>{if(e.pointerType!=='mouse'){e.preventDefault();input.fire(4);}}} onClick={e=>{if(e.detail===0||!touch)input.fire(4);}}><WeaponIcon object={c.special.object}/><small>{touch?'ESPECIAL':pad?'B · ESPECIAL':keyLabel(input.keys,'special')+' · ESPECIAL'}</small></button>
   </div>
   <div className={'hx-attack-wrap'+(choosing?' open':'')}>
    {choosing&&<div className="hx-wheel" aria-hidden="true">{c.basics.map((a,i)=><span key={i} className={selected===i+1?'active':''} style={{transform:`translate(${WHEEL[i].x}px,${WHEEL[i].y}px)`}}><WeaponIcon object={a.object} count={a.count}/><small>{a.name}</small></span>)}</div>}
    <button className={'hx-attack'+(me.charges?'':' empty')} aria-label={'Básico: '+basic.name+'. Toca para lanzar; mantén para elegir entre los tres.'} disabled={!me.charges}
     onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const f={x:e.clientX,y:e.clientY,at:performance.now(),moved:false,timer:setTimeout(()=>{setChoosing(true);if(navigator.vibrate)navigator.vibrate(10);},HOLD_MS)};if(fire.current)clearTimeout(fire.current.timer);fire.current=f;}}
     onPointerMove={e=>{const f=fire.current;if(!f)return;const dx=e.clientX-f.x,dy=e.clientY-f.y;if(Math.hypot(dx,dy)<22)return;f.moved=true;clearTimeout(f.timer);setChoosing(true);let best=0,bestD=Infinity;WHEEL.forEach((w,i)=>{const d=Math.hypot(w.x-dx,w.y-dy);if(d<bestD){bestD=d;best=i;}});select(best+1);}}
     onPointerUp={e=>{const f=fire.current;if(!f)return;const dy=e.clientY-f.y;closeWheel();if(dy>60)return;/* dragging down past the button cancels */input.fire(input.selected);}}
     onPointerCancel={closeWheel} onClick={e=>{if(e.detail===0)input.fire(input.selected);}}>
     <WeaponIcon object={basic.object} count={basic.count}/>
     <small>{touch?(choosing?'SUELTA PARA LANZAR':'LANZAR'):pad?'A · LANZAR':keyLabel(input.keys,'fire')+' · LANZAR'}</small>
     <span className="hx-dots">{[1,2,3].map(n=><i key={n} className={n===selected?'on':''}/>)}</span>
    </button>
    <span className="hx-basic-name">{basic.name}</span>
    {!touch&&<div className="hx-basics-strip">{c.basics.map((a,i)=><button key={i} className={selected===i+1?'active':''} aria-label={'Elegir y lanzar '+a.name} disabled={!me.charges} onClick={()=>{select(i+1);input.fire(i+1);}}><b>{pad?'':keyLabel(input.keys,(['basic1','basic2','basic3'] as const)[i])}</b><WeaponIcon object={a.object} count={a.count}/></button>)}{pad&&<em>X/Y CAMBIA</em>}</div>}
   </div>
  </div>

  {touch&&<div className="hx-touch-controls">
   <button className="hx-stick" aria-label="Dirección: arrastra a izquierda o derecha" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);const r=e.currentTarget.getBoundingClientRect();joy.current={x:r.left+r.width/2,id:e.pointerId};const dx=Math.max(-44,Math.min(44,e.clientX-joy.current.x));input.steer=shape(dx/44);setStick(dx);}} onPointerMove={e=>{const j=joy.current;if(!j||j.id!==e.pointerId)return;const dx=Math.max(-44,Math.min(44,e.clientX-j.x));input.steer=shape(dx/44);setStick(dx);}} onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}><span className="hx-arrows"><i/><i/></span><i className="hx-knob" style={{transform:'translateX('+stick+'px)'}}/></button>
   <button className={'hx-drift-btn'+(me.driftDir?' active t'+tier:'')} aria-label="Derrape: mantén en las curvas y suelta para el turbo" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.drift=true;}} onPointerUp={()=>input.drift=false} onPointerCancel={()=>input.drift=false} onLostPointerCapture={()=>input.drift=false}><ControlIcon kind="drift"/><small>DERRAPE</small></button>
   <button className="hx-brake" aria-label="Freno" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);input.brake=true;}} onPointerUp={()=>input.brake=false} onPointerCancel={()=>input.brake=false} onLostPointerCapture={()=>input.brake=false}><ControlIcon kind="brake"/><small>FRENO</small></button>
  </div>}
  {!touch&&(state.phase==='countdown'||state.time<14)&&state.phase!=='results'&&<div className="hx-keys">{pad?'PALANCA · DIRECCIÓN   RB · DERRAPE   A · BÁSICO   X/Y · CAMBIAR   B · ESPECIAL   LT · FRENO':`${keyLabel(input.keys,'left')} ${keyLabel(input.keys,'right')} · DIRECCIÓN   ${keyLabel(input.keys,'drift')} · DERRAPE   ${keyLabel(input.keys,'fire')} · LANZAR   ${keyLabel(input.keys,'cycle')} · CAMBIAR   ${keyLabel(input.keys,'special')} · ESPECIAL   ${keyLabel(input.keys,'brake')} · FRENO   ${keyLabel(input.keys,'pause')} · PAUSA`}</div>}
 </div>;
}
/** Small stick moves give gentle turns; the outer third is a full turn. */
function shape(v:number){const a=Math.abs(v);if(a<.08)return 0;const t=(a-.08)/.92;return Math.sign(v)*Math.min(1,t*(.5+.5*t)*1.15);}
