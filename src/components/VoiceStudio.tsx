import { useEffect,useRef,useState } from 'react';
import { CHARACTERS,character } from '../../shared/content';
import { KIND_LABEL,allLines,deleteRecording,loadRecordings,saveRecording,shippedVoices,speakProvisional,ttsAvailable,type LineRef } from '../game/voices';

const MAX_SECONDS=4;
const extension=(type:string)=>type.includes('mp4')?'.m4a':type.includes('ogg')?'.ogg':type.includes('mpeg')?'.mp3':'.webm';
/**
 * Voice studio: each friend records his own lines (his own voice, or one he authorised). The
 * recording stays on this device and the game uses it at once; "Descargar" gives the file to drop
 * into public/voices/<pilot>/ so everyone hears it once the game is published.
 */
export function VoiceStudio(){
 const [pilot,setPilot]=useState(CHARACTERS[0].id),[recs,setRecs]=useState<Map<string,Blob>>(new Map()),[shipped,setShipped]=useState<Map<string,string>>(new Map()),[recording,setRecording]=useState<{file:string;left:number}|null>(null),[error,setError]=useState('');
 const recorder=useRef<MediaRecorder|null>(null),timer=useRef<ReturnType<typeof setInterval>|undefined>(undefined);
 useEffect(()=>{loadRecordings().then(setRecs);shippedVoices().then(setShipped);return()=>{clearInterval(timer.current);recorder.current?.state==='recording'&&recorder.current.stop();};},[]);
 const lines=allLines().filter(l=>l.characterId===pilot),canRecord=typeof MediaRecorder!=='undefined'&&!!navigator.mediaDevices?.getUserMedia;
 const play=(l:LineRef)=>{const blob=recs.get(l.file);if(blob){const url=URL.createObjectURL(blob),a=new Audio(url);a.onended=()=>URL.revokeObjectURL(url);void a.play();return;}const path=shipped.get(l.file);if(path){void new Audio('/voices/'+path).play();return;}if(ttsAvailable())void speakProvisional(l.characterId,l.text);else setError('Este navegador no tiene voz sintética. Grábala para escucharla.');};
 const record=async(l:LineRef)=>{
  setError('');if(recorder.current?.state==='recording'){recorder.current.stop();return;}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}),mr=new MediaRecorder(stream),chunks:Blob[]=[];recorder.current=mr;
   mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   mr.onstop=async()=>{clearInterval(timer.current);stream.getTracks().forEach(t=>t.stop());setRecording(null);if(!chunks.length)return;await saveRecording(l.file,new Blob(chunks,{type:mr.mimeType||'audio/webm'}));setRecs(await loadRecordings());};
   mr.start();let left=MAX_SECONDS;setRecording({file:l.file,left});timer.current=setInterval(()=>{left-=1;setRecording({file:l.file,left});if(left<=0&&mr.state==='recording')mr.stop();},1000);
  }catch{setError('Sin permiso para el micrófono. Actívalo en el navegador para grabar.');}
 };
 const remove=async(l:LineRef)=>{await deleteRecording(l.file);setRecs(await loadRecordings());};
 const download=(l:LineRef)=>{const blob=recs.get(l.file);if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=l.file.replace('/','__')+extension(blob.type);a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const done=lines.filter(l=>recs.has(l.file)||shipped.has(l.file)).length;
 return <div className="voice-studio">
  <p className="voice-note">Cada uno graba <b>su propia voz</b> (o la de alguien que le dé permiso). Se guarda en este equipo y el juego la usa al instante. Para que todos la escuchen, descárgala y ponla en <code>public/voices/</code> con el nombre que indica cada línea.</p>
  <div className="voice-pilots" role="group" aria-label="Piloto">{CHARACTERS.map(c=><button key={c.id} className={c.id===pilot?'selected':''} aria-pressed={c.id===pilot} onClick={()=>setPilot(c.id)} style={{borderColor:c.color}}>{c.name}</button>)}</div>
  <p className="voice-progress">{character(pilot).name}: {done} de {lines.length} líneas con voz real{done<lines.length?' · las demás suenan con voz provisional':''}</p>
  <ul className="voice-lines">{lines.map(l=>{const mine=recs.has(l.file),file=shipped.has(l.file),live=recording?.file===l.file;return <li key={l.file} className={l.kind==='special'?'special':''}>
   <span className="voice-kind">{KIND_LABEL[l.kind]}</span><span className="voice-text">«{l.text}»<small>{l.file}.mp3</small></span>
   <span className={'voice-state '+(mine||file?'ok':'missing')}>{mine?'GRABADA AQUÍ':file?'INCLUIDA':'FALTA'}</span>
   <span className="voice-actions"><button onClick={()=>play(l)} aria-label={'Escuchar «'+l.text+'»'}>▶</button>{canRecord&&<button className={live?'rec live':'rec'} onClick={()=>record(l)} disabled={!!recording&&!live}>{live?'■ '+recording!.left+' s':'● Grabar'}</button>}{mine&&<button onClick={()=>download(l)} aria-label="Descargar grabación">⬇</button>}{mine&&<button onClick={()=>remove(l)} aria-label="Borrar grabación">✕</button>}</span>
  </li>;})}</ul>
  {error&&<p className="notice" role="alert">{error}</p>}
 </div>;
}
