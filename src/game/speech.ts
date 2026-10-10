/*
 * The browser's own speech (speechSynthesis) is the provisional voice until the gang's recordings exist. It is much
 * pickier on phones than on a computer, so everything about it lives here:
 *
 *  - iPhone and Android only let a page speak after a tap. Speaking a silent line from the first tap unlocks it for
 *    the rest of the visit (armSpeechUnlock, called once at startup).
 *  - iPhone Safari often lists no voices at all and never says when they arrive, so "no voice found" must not mean
 *    "cannot speak": we still speak with lang es-MX and let the system choose.
 *  - Calling cancel() and speak() back to back makes iOS drop the new line. We cancel only when something is being
 *    said, then wait a moment before speaking.
 */
export const SPEECH_LANGS=['es-419','es-MX','es-US','es-NI','es-CO','es-ES'] as const;

let spanishVoice:SpeechSynthesisVoice|null|undefined;
let unlocked=false,armed=false,attempts=0,lastAttempt=-1e9;

const api=()=>typeof speechSynthesis!=='undefined'&&typeof SpeechSynthesisUtterance!=='undefined';

/** Picks the most Latin-American Spanish voice installed, or null when the list is empty or has none. */
export function pickVoice():SpeechSynthesisVoice|null{
 if(!api())return null;if(spanishVoice)return spanishVoice;
 const voices=speechSynthesis.getVoices();if(!voices.length)return null;
 for(const lang of SPEECH_LANGS)for(const v of voices)if(v.lang.replace('_','-').toLowerCase()===lang.toLowerCase())return spanishVoice=v;
 return spanishVoice=voices.find(v=>v.lang.toLowerCase().startsWith('es'))??null;
}
export function forgetVoice(){spanishVoice=undefined;}

/** Can this browser speak at all? A missing voice list does not count against it (see above). */
export function speechAvailable(){return api();}

export interface SpeechStatus{supported:boolean;unlocked:boolean;voices:number;voice:string|null}
export function speechStatus():SpeechStatus{
 if(!api())return{supported:false,unlocked,voices:0,voice:null};
 const v=pickVoice();return{supported:true,unlocked,voices:speechSynthesis.getVoices().length,voice:v?v.name+' ('+v.lang+')':null};
}

/** Speaks a silent line from a tap, which is what permits later speech from timers and game events. */
export function armSpeechUnlock(){
 if(armed||typeof window==='undefined'||!api())return;armed=true;
 const events=['touchend','pointerup','click','keydown'] as const;
 const stop=()=>{for(const e of events)window.removeEventListener(e,unlock,true);};
 function unlock(){
  if(unlocked||attempts>=12){stop();return;}
  // A tap fires several events at once (touchend, pointerup, click): one silent line per tap is enough.
  if(performance.now()-lastAttempt<500)return;lastAttempt=performance.now();attempts++;
  try{
   speechSynthesis.getVoices();
   const u=new SpeechSynthesisUtterance(' ');u.volume=0;u.lang='es-MX';
   u.onstart=()=>{unlocked=true;stop();};
   if(speechSynthesis.paused)speechSynthesis.resume();
   speechSynthesis.speak(u);
  }catch{/* try again on the next tap */}
 }
 for(const e of events)window.addEventListener(e,unlock,{capture:true,passive:true});
 // Voices arrive late on Chrome and Android; forget what we knew so the best one is picked next time.
 try{speechSynthesis.addEventListener?.('voiceschanged',forgetVoice);}catch{/* old browsers */}
}

/** Says `text`; resolves with the seconds it lasted (0 when it could not speak). Never rejects. */
export function speakText(text:string,{pitch=1,rate=1,volume=.9}:{pitch?:number;rate?:number;volume?:number}={}):Promise<number>{
 return new Promise(resolve=>{
  if(!api()){resolve(0);return;}
  let done=false;const start=performance.now(),finish=()=>{if(done)return;done=true;clearTimeout(guard);resolve((performance.now()-start)/1000);};
  // A line that never starts must not hold the voice system up.
  const guard=setTimeout(finish,9000);
  try{
   const u=new SpeechSynthesisUtterance(text.replace(/!!/g,'!')),voice=pickVoice();
   if(voice){u.voice=voice;u.lang=voice.lang;}else u.lang='es-MX';
   u.pitch=pitch;u.rate=rate;u.volume=Math.max(0,Math.min(1,volume));u.onend=u.onerror=finish;
   const go=()=>{try{if(speechSynthesis.paused)speechSynthesis.resume();speechSynthesis.speak(u);}catch{finish();}};
   if(speechSynthesis.speaking||speechSynthesis.pending){speechSynthesis.cancel();setTimeout(go,90);}else go();
  }catch{finish();}
 });
}
export function cancelSpeech(){try{if(api())speechSynthesis.cancel();}catch{/* nothing to cancel */}}
