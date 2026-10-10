import { useState } from 'react';
import {audioSettings} from '../game/audio';
import {speakText,speechStatus} from '../game/speech';
import {savedQuality} from '../game/renderer-settings';
import {VoiceStudio} from './VoiceStudio';
const store=(key:string,value:string)=>{try{localStorage.setItem(key,value);}catch{/* private mode */}};
const read=(key:string,fallback:string)=>{try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
/** Plays a sample line from a tap and says plainly what the phone did, since voices work very differently on phones. */
function VoiceTest(){
 const [note,setNote]=useState('');const [busy,setBusy]=useState(false);
 const test=async()=>{
  const before=speechStatus();
  if(!before.supported){setNote('Este navegador no puede hablar. Verás solo los subtítulos.');return;}
  setBusy(true);setNote('Hablando…');
  const seconds=await speakText('Ármate uno. ¿Me escuchas?',{volume:audioSettings.voice,pitch:.9});
  const now=speechStatus(),who=now.voice?'Voz: '+now.voice+'.':'No encontré una voz en español; uso la que traiga tu celular.';
  setNote(seconds<.35?'No sonó nada. Sube el volumen, quita el modo silencio del celular y prueba otra vez. '+who:'Debió sonar. Si no la oíste, revisa el volumen y el modo silencio. '+who);setBusy(false);
 };
 return <div className="voice-test"><button type="button" className="button outline" onClick={()=>void test()} disabled={busy}>Probar voz</button>{note&&<p role="status">{note}</p>}</div>;
}
/** Menu settings, also reachable from the pause menu during a race. */
export function Settings({studio=true}:{studio?:boolean}){
 return <div className="settings-grid pause-grid">
  <label className="toggle"><input type="checkbox" defaultChecked={read('morly-assist','yes')==='yes'} onChange={e=>store('morly-assist',e.target.checked?'yes':'no')}/> Ayuda suave para conducir</label>
  <label className="toggle"><input type="checkbox" defaultChecked={read('morly-motion','full')==='reduced'} onChange={e=>store('morly-motion',e.target.checked?'reduced':'full')}/> Menos movimiento de cámara y efectos</label>
  <label className="toggle"><input type="checkbox" defaultChecked={read('morly-stats','no')==='yes'} onChange={e=>store('morly-stats',e.target.checked?'yes':'no')}/> Mostrar rendimiento (FPS)</label>
  <label className="pause-range">Música<input type="range" min="0" max="1" step=".05" defaultValue={audioSettings.music} onChange={e=>audioSettings.set('morly-music',e.target.value)}/></label>
  <label className="pause-range">Efectos<input type="range" min="0" max="1" step=".05" defaultValue={audioSettings.sfx} onChange={e=>audioSettings.set('morly-sfx',e.target.value)}/></label>
  <label className="pause-range">Voces<input type="range" min="0" max="1" step=".05" defaultValue={audioSettings.voice} onChange={e=>audioSettings.set('morly-voice',e.target.value)}/></label>
  <label className="toggle"><input type="checkbox" defaultChecked={audioSettings.subtitles} onChange={e=>audioSettings.set('morly-subtitles',e.target.checked?'yes':'no')}/> Subtítulos de las voces</label>
  <label className="toggle"><input type="checkbox" defaultChecked={audioSettings.tts} onChange={e=>audioSettings.set('morly-tts',e.target.checked?'yes':'no')}/> Voz sintética provisional donde falte la grabación real</label>
  <VoiceTest/>
  <label className="pause-select">Calidad gráfica<select defaultValue={savedQuality()} onChange={e=>store('morly-quality',e.target.value)}><option value="auto">Automática</option><option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja (celulares viejos)</option></select></label>
  {studio&&<details className="voice-studio-box"><summary>Estudio de voces · graba las frases de la pandilla</summary><VoiceStudio/></details>}
 </div>;
}
