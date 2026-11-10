import { character,track,vehicle } from '../../shared/content';
import { ranking,cupRanking } from '../../shared/simulation';
import {Portrait} from '../components/Portrait';
import type { GameState,PlayerState } from '../../shared/types';

const clock=(t:number)=>t<0?'—':Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0')+'.'+String(Math.floor(t*10%10));
/** Fun awards between friends. Only awarded when someone clearly earned it. */
export function awards(state:GameState){
 const ps=state.players,list:{title:string;who:PlayerState;detail:string}[]=[];
 const top=(key:'hitsGiven'|'hitsTaken'|'turbos'|'bumps'|'tows',min:number)=>{const best=[...ps].sort((a,b)=>b[key]-a[key]||a.id.localeCompare(b.id))[0];return best&&best[key]>=min?best:null;};
 const sniper=top('hitsGiven',2);if(sniper)list.push({title:'Puntería de cantina',who:sniper,detail:sniper.hitsGiven+' impactos'});
 const victim=top('hitsTaken',2);if(victim)list.push({title:'El más golpeado',who:victim,detail:victim.hitsTaken+' veces'});
 const drifter=top('turbos',2);if(drifter)list.push({title:'El rey del derrape',who:drifter,detail:drifter.turbos+' turbos'});
 const tank=top('bumps',4);if(tank)list.push({title:'Licencia en trámite',who:tank,detail:tank.bumps+' choques'});
 const tow=top('tows',2);if(tow)list.push({title:'Vive del rebufo',who:tow,detail:tow.tows+' rebufos'});
 if(state.mode!=='battle'){const laps=ps.filter(p=>p.bestLap>0).sort((a,b)=>a.bestLap-b.bestLap);if(laps[0])list.push({title:'Vuelta más rápida',who:laps[0],detail:clock(laps[0].bestLap)});
  const last=ranking(state).at(-1);if(last&&ps.length>2)list.push({title:'El que vino a pasear',who:last,detail:last.finishTime>=0?clock(last.finishTime):'ruta turística'});}
 return list.slice(0,5);
}
export function Results({state,id,onNext,onExit,canNext}:{state:GameState;id:string;onNext:()=>void;onExit:()=>void;canNext:boolean}){
 const cup=state.phase==='cup-results',rows=cup?cupRanking(state):ranking(state),mine=rows.findIndex(p=>p.id===id),me=rows[mine],winner=rows[0];
 const headline=mine===0?'¡GANASTE! Ahora aguántalos.':mine===1?'Segundo. Casi, mi rey.':mine===rows.length-1&&rows.length>2?'Último. El carro no tiene la culpa.':(winner?.nickname??'Alguien')+' ganó. Qué insoportable.';
 const value=(p:PlayerState)=>cup?p.cupPoints+' pts':state.mode==='battle'?p.score+' pts':p.finishTime>=0?clock(p.finishTime):'Ruta turística';
 const prizes=cup?[]:awards(state);
 // How far behind the winner: seconds in a race, points in a battle or a cup.
 const gap=(p:PlayerState,i:number)=>{if(i===0||!winner)return '';if(cup)return '−'+(winner.cupPoints-p.cupPoints)+' pts';if(state.mode==='battle')return '−'+(winner.score-p.score)+' pts';return p.finishTime>=0&&winner.finishTime>=0?'+'+(p.finishTime-winner.finishTime).toFixed(1)+' s':'';};
 const medal=['oro','plata','bronce'];
 return <div className="results-backdrop rx-backdrop rx2-backdrop"><div className="rx-confetti" aria-hidden="true">{Array.from({length:28},(_,i)=><i key={i} style={{left:(i*37%100)+'%',animationDelay:(i%7)*.18+'s',background:['#ffd33d','#ec4351','#4cc8ff','#7dffa0','#ff8fc8'][i%5]}}/>)}</div>
  <section className="results-dialog rx rx2" role="dialog" aria-modal="true" aria-labelledby="results-title">
   <header className="rx2-head"><span className="eyebrow">{cup?'LA COPA TIENE DUEÑO':state.mode==='championship'?'MANGA '+state.round+' DE 3 · '+track(state.trackId).name.toUpperCase():state.mode==='battle'?'SE ACABÓ LA BATALLA':track(state.trackId).name.toUpperCase()+' · SE ACABARON LAS EXCUSAS'}</span>
    <h1 id="results-title" tabIndex={-1} data-dialog-focus>{headline}</h1></header>
   <div className="rx2-body">
    <div className="rx2-left">
     <div className="rx-podium">{[1,0,2].map(i=>rows[i]&&<div key={rows[i].id} className={'rx-step s'+i+' '+medal[i]+(rows[i].id===id?' you':'')} style={{animationDelay:(i===0?.5:i===1?.25:0)+'s'}}>
      {i===0&&<svg className="rx2-crown" viewBox="0 0 48 30" aria-hidden="true"><path d="M3 27 1 7l11 9L24 2l12 14 11-9-2 20Z" fill="#ffd33d" stroke="#7a4a00" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="24" cy="19" r="3.4" fill="#ec4351"/></svg>}
      <Portrait c={character(rows[i].characterId)}/><strong>{rows[i].nickname}</strong><small>{vehicle(rows[i].vehicleId).name}</small><div className="rx-block"><b>{i+1}º</b><span>{value(rows[i])}</span></div></div>)}</div>
     {prizes.length>0&&<div className="rx-awards">{prizes.map(a=><div key={a.title} className={'rx-award'+(a.who.id===id?' you':'')}><span>{a.title}</span><strong>{a.who.nickname}</strong><small>{a.detail}</small></div>)}</div>}
     {me&&!cup&&<div className="rx2-stats" aria-label="Tu carrera">{([[me.hitsGiven,'impactos dados'],[me.hitsTaken,'recibidos'],[me.turbos,'turbos de derrape'],[me.tows,'rebufos']] as [number,string][]).map(([n,label])=><div key={label}><b>{n}</b><span>{label}</span></div>)}</div>}
    </div>
    <ol className="results-list rx2-list">{rows.map((p,i)=><li key={p.id} ref={p.id===id?el=>{el?.scrollIntoView({block:'nearest'});}:undefined} className={(p.id===id?'you ':'')+(i<3?medal[i]:'')} style={{animationDelay:(.35+i*.06)+'s'}}>
     <b>{i+1}</b><Portrait c={character(p.characterId)}/>
     <div className="rx2-who"><strong>{p.nickname}{p.id===id&&<em>TÚ</em>}</strong><span>{character(p.characterId).name} · {vehicle(p.vehicleId).name}</span></div>
     {!cup&&state.mode!=='battle'&&p.bestLap>0&&<small className="rx2-lap">mejor vuelta<b>{clock(p.bestLap)}</b></small>}
     <div className="rx2-time"><strong>{value(p)}</strong>{gap(p,i)&&<span>{gap(p,i)}</span>}</div></li>)}</ol>
   </div>
   <div className="results-actions">{canNext?<button className="button yellow" autoFocus onClick={onNext}>{state.mode==='championship'&&!cup?'Siguiente manga →':'La revancha. Ahora sí →'}</button>:<p>El anfitrión elegirá la siguiente salida.</p>}<button className="button outline" onClick={onExit}>Volver al garaje</button></div>
  </section></div>;
}
