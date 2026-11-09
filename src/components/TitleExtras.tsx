import { useEffect,useState } from 'react';
import { CHARACTERS } from '../../shared/content';
import { audioSettings } from '../game/audio';
import { MENU_SONG } from '../game/menuAudio';

/** «Now playing» pill on the title: the menu theme's name with an equalizer, tap to mute or unmute everything. */
export function NowPlaying(){
 const [muted,setMuted]=useState(audioSettings.muted);
 useEffect(()=>{const sync=(e:StorageEvent)=>{if(e.key==='morly-muted')setMuted(e.newValue==='yes');};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 return <button className={'now-playing'+(muted?' muted':'')} onClick={()=>{const next=!muted;setMuted(next);audioSettings.set('morly-muted',next?'yes':'no');}} aria-pressed={!muted} aria-label={muted?'Activar sonido':'Silenciar'}>
  <span className="eq" aria-hidden="true"><i/><i/><i/><i/></span><span className="np-text"><small>{muted?'SONIDO APAGADO':'SONANDO'}</small><b>{MENU_SONG}</b></span>
 </button>;
}

/** The gang, marching along the bottom of the title: painted portraits on a loop. */
export function GangStrip(){
 const list=[...CHARACTERS,...CHARACTERS];
 return <div className="gang-strip" aria-hidden="true"><div className="gang-track">{list.map((c,i)=><span key={c.id+i} style={{backgroundColor:c.color}}><img src={`/art/pilot-${c.id}.webp`} alt="" loading="lazy" decoding="async"/><em>{c.name}</em></span>)}</div></div>;
}

const ICONS:Record<string,string>={
 controles:'M7 9h4M9 7v4M15 9.5h.01M18 11.5h.01M6.5 5h11a4.5 4.5 0 0 1 4.4 5.4l-.9 4.6a3 3 0 0 1-5.3 1.3L14 14h-4l-1.7 2.3A3 3 0 0 1 3 15l-.9-4.6A4.5 4.5 0 0 1 6.5 5z',
 ajustes:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
 sala:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
 instalar:'M12 3v12M7 10l5 5 5-5M5 21h14',
};
/** Small line icon for the title chips. */
export function ChipIcon({name}:{name:keyof typeof ICONS}){return <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[name]}/></svg>;}
