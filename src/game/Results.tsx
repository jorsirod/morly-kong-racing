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
 return <div className="results-backdrop rx-backdrop"><div className="rx-confetti" aria-hidden="true">{Array.from({length:28},(_,i)=><i key={i} style={{left:(i*37%100)+'%',animationDelay:(i%7)*.18+'s',background:['#ffd33d','#ec4351','#4cc8ff','#7dffa0','#ff8fc8'][i%5]}}/>)}</div>
  <section className="results-dialog rx" role="dialog" aria-modal="true" aria-labelledby="results-title">
   <span className="eyebrow">{cup?'LA COPA TIENE DUEÑO':state.mode==='championship'?'MANGA '+state.round+' DE 3 · '+track(state.trackId).name.toUpperCase():state.mode==='battle'?'SE ACABÓ LA BATALLA':track(state.trackId).name.toUpperCase()+' · SE ACABARON LAS EXCUSAS'}</span>
   <h1 id="results-title" tabIndex={-1} data-dialog-focus>{headline}</h1>
   <div className="rx-podium">{[1,0,2].map(i=>rows[i]&&<div key={rows[i].id} className={'rx-step s'+i+(rows[i].id===id?' you':'')} style={{animationDelay:(i===0?.5:i===1?.25:0)+'s'}}><Portrait c={character(rows[i].characterId)}/><strong>{rows[i].nickname}</strong><small>{vehicle(rows[i].vehicleId).name}</small><div className="rx-block"><b>{i+1}º</b><span>{value(rows[i])}</span></div></div>)}</div>
   {prizes.length>0&&<div className="rx-awards">{prizes.map(a=><div key={a.title} className={'rx-award'+(a.who.id===id?' you':'')}><span>{a.title}</span><strong>{a.who.nickname}</strong><small>{a.detail}</small></div>)}</div>}
   <ol className="results-list">{rows.map((p,i)=><li key={p.id} className={p.id===id?'you':''}><b>{i+1}</b><div><strong>{p.nickname}{p.id===id?' · tú':''}</strong><span>{character(p.characterId).name} × {vehicle(p.vehicleId).name}{!cup&&state.mode!=='battle'&&p.bestLap>0?' · mejor vuelta '+clock(p.bestLap):''}</span></div><strong>{value(p)}</strong></li>)}</ol>
   {me&&!cup&&<p className="rx-mine">Tu carrera: {me.hitsGiven} impactos dados · {me.hitsTaken} recibidos · {me.turbos} turbos de derrape · {me.tows} rebufos</p>}
   <div className="results-actions">{canNext?<button className="button yellow" autoFocus onClick={onNext}>{state.mode==='championship'&&!cup?'Siguiente manga →':'La revancha. Ahora sí →'}</button>:<p>El anfitrión elegirá la siguiente salida.</p>}<button className="button outline" onClick={onExit}>Volver al garaje</button></div>
  </section></div>;
}
