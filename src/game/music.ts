/*
 * Original dynamic soundtrack, one piece per world. Every melody, riff and progression here was written for this game.
 * Each world borrows the *style* (instruments, groove, production tricks) of music the gang grew up with — never a
 * melody: La Salle in a sixties Liverpool piano-pop mood, the Mercado as a boom-bap minor-piano rap beat that drops into
 * a scratchy nu-metal chug, Managua as eighties Argentine new wave with chorus guitars, Hipa Hipa as DJ-scratched funk
 * rock, Masaya as heavy grunge riffing, San Juan as a bouncy 8-bit platformer that turns into an 8-bit adventure march.
 *
 * Notation: a melody is 8 bars separated by '|'. Each bar has tokens "degree.length" in
 * sixteenths (16 per bar). Degrees index the score's mode (0 = tonic, 7 = octave up, -1 = the
 * note below the tonic); a trailing '#' raises a semitone; '-' is a rest.
 *
 * Layers react to the race: calm (countdown) → full band (racing) → final lap (faster, a whole
 * tone up, arpeggios and doubled lead). Tension adds a pulsing bass and risers; speed opens the
 * hats; voices duck the whole band.
 */
export type Inst='square'|'brass'|'accordion'|'marimba'|'steel'|'synth'|'pad'|'bass'|'pluck'|'piano'|'organ'|'dist'|'clean'|'sub'|'chip';
export type Drum='kick'|'snare'|'hat'|'openhat'|'clap'|'tom'|'lowtom'|'guiro'|'rim'|'shaker'|'cowbell'|'riser'|'scratch'|'crash'|'tamb'|'boom';
export type Groove='march'|'cumbia'|'drive'|'disco'|'tribal'|'reggae'|'britpop'|'hiphop'|'numetal'|'newwave'|'funkrock'|'grunge'|'chipplat'|'chipadv';
interface Section{chords:number[];melody:string;
 /** Optional groove for this section only (a song can drop into another style). */ groove?:Groove;
 /** Optional riff/ostinato, degrees relative to the bar's chord, played by the score's riff instrument. */ riff?:string; }
export interface Score{
 title:string;bpm:number;swing:number;root:number;mode:number[];groove:Groove;lead:Inst;color:Inst;
 /** Lead instrument for section B (defaults to lead) and the instrument of the riffs. */ leadB?:Inst;riffInst?:Inst;
 sections:Record<'A'|'B',Section>;form:('A'|'B')[];
}
const MAJOR=[0,2,4,5,7,9,11],MINOR=[0,2,3,5,7,8,10],MIXO=[0,2,4,5,7,9,10],DORIAN=[0,2,3,5,7,9,10],HARMONIC=[0,2,3,5,7,8,11];

export const SCORES:Record<string,Score>={
 // «Recreo en Liverpool»: sixties piano-pop for the schoolyard — bouncy piano, organ, tambourine, walking bass. G major.
 'la-salle':{title:'Recreo en Liverpool',bpm:128,swing:.08,root:196,mode:MAJOR,groove:'britpop',lead:'piano',leadB:'organ',color:'organ',form:['A','A','B','A'],sections:{
  A:{chords:[0,4,5,3,0,4,3,4],melody:'4.2 4.2 4.2 5.2 7.4 4.4|6.2 6.2 6.2 5.2 4.4 2.4|5.2 5.2 5.2 4.2 2.4 0.4|1.4 2.4 3.4 4.4|4.2 4.2 4.2 5.2 7.4 9.4|8.2 7.2 6.2 5.2 4.8|3.2 4.2 5.2 6.2 7.2 6.2 5.2 3.2|4.12 -.4'},
  B:{chords:[3,4,0,5,3,4,1,4],melody:'7.4 9.4 7.4 5.4|8.4 7.4 6.8|4.2 5.2 7.4 7.2 9.2 7.4|9.6 8.2 7.8|10.4 9.4 7.4 5.4|8.4 7.4 6.4 4.4|5.2 6.2 7.2 8.2 9.4 8.4|7.16'}}},
 // «Rap del Mercado»: a boom-bap minor-piano rap beat through the stalls that drops into a scratchy nu-metal chug. E minor.
 oriental:{title:'Rap del Mercado',bpm:96,swing:.1,root:164.81,mode:HARMONIC,groove:'hiphop',lead:'piano',leadB:'synth',color:'piano',riffInst:'piano',form:['A','B','A','B'],sections:{
  A:{chords:[0,0,5,5,3,3,4,4],melody:'7.2 -.2 7.2 8.2 7.4 -.4|5.2 -.2 5.2 7.2 4.4 -.4|7.2 -.2 7.2 8.2 10.4 8.4|7.12 -.4|11.2 -.2 11.2 10.2 8.4 7.4|8.2 7.2 5.2 4.2 5.8|4.2 5.2 7.2 8.2 7.2 5.2 4.2 2.2|6.8 -.8',riff:'0.2 0.2 4.2 0.2 3.2 0.2 2.2 1.2|0.2 0.2 4.2 0.2 3.2 0.2 2.2 1.2|0.2 0.2 4.2 0.2 3.2 0.2 2.2 1.2|0.2 0.2 4.2 0.2 3.2 0.2 2.2 1.2|0.2 0.2 4.2 0.2 3.2 0.2 2.2 1.2|0.2 0.2 4.2 0.2 3.2 0.2 2.2 1.2|0.2 0.2 4.2 0.2 3.2 0.2 2.2 1.2|0.2 0.2 4.2 0.2 3.2 0.2 2.2 1.2'},
  B:{chords:[0,0,1,1,5,5,4,4],groove:'numetal',melody:'7.4 7.2 8.2 7.4 5.4|7.4 7.2 8.2 10.8|8.4 8.2 7.2 8.4 10.4|11.8 10.8|7.4 7.2 8.2 7.4 5.4|4.4 5.2 7.2 8.8|10.2 8.2 7.2 5.2 7.2 8.2 10.2 11.2|14.8 -.8',riff:'0.1 -.1 0.1 0.1 -.2 0.2 3.2 -.2 0.1 0.1 2.2|0.1 -.1 0.1 0.1 -.2 0.2 3.2 -.2 0.1 0.1 2.2|0.1 -.1 0.1 0.1 -.2 0.2 3.2 -.2 0.1 0.1 2.2|0.1 -.1 0.1 0.1 -.2 0.2 3.2 -.2 0.1 0.1 2.2|0.1 -.1 0.1 0.1 -.2 0.2 3.2 -.2 0.1 0.1 2.2|0.1 -.1 0.1 0.1 -.2 0.2 3.2 -.2 0.1 0.1 2.2|0.1 -.1 0.1 0.1 -.2 0.2 3.2 -.2 0.1 0.1 2.2|0.1 -.1 0.1 0.1 -.2 0.2 3.2 -.2 0.1 0.1 2.2'}}},
 // «Luces de Managua»: eighties new wave for the city at night — chorus guitar arpeggios, driving eighth bass. B minor.
 managua:{title:'Luces de Managua',bpm:132,swing:0,root:123.47,mode:MINOR,groove:'newwave',lead:'clean',leadB:'synth',color:'clean',form:['A','A','B','A'],sections:{
  A:{chords:[0,5,2,6,0,5,3,4],melody:'7.4 9.4 10.6 9.2|7.4 5.4 4.8|7.4 9.4 10.4 12.4|11.12 -.4|12.4 11.4 10.6 9.2|10.4 9.4 7.8|9.4 10.4 11.4 12.4|14.8 12.8'},
  B:{chords:[3,4,5,5,3,4,6,6],melody:'14.6 12.2 10.8|11.6 10.2 9.8|12.4 11.4 10.4 9.4|7.12 -.4|14.6 12.2 10.8|15.6 14.2 12.8|13.4 12.4 11.4 13.4|14.16'}}},
 // «Scratch en la terraza»: DJ-scratched funk rock under the club lights — slap bass, clean chord stabs. E dorian.
 'hipa-hipa':{title:'Scratch en la terraza',bpm:100,swing:.05,root:164.81,mode:DORIAN,groove:'funkrock',lead:'clean',leadB:'synth',color:'clean',riffInst:'bass',form:['A','B','A','B'],sections:{
  A:{chords:[0,0,3,3,0,0,6,4],melody:'7.3 9.3 7.2 -.2 10.2 9.2 7.2|5.4 7.2 5.2 4.8|7.3 9.3 7.2 -.2 10.2 12.2 10.2|9.12 -.4|11.3 10.3 9.2 7.4 9.4|10.2 9.2 7.2 5.2 7.8|4.2 5.2 7.2 9.2 10.2 9.2 7.2 5.2|7.8 -.8',riff:'0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2'},
  B:{chords:[3,4,0,0,3,4,6,6],melody:'10.8 12.8|11.4 10.4 9.8|7.2 9.2 10.4 12.4 14.4|13.8 11.8|10.8 12.8|14.4 13.4 12.8|11.2 12.2 13.2 14.2 15.4 14.4|14.16',riff:'0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2'}}},
 // «Lava en drop D»: heavy grunge at the crater's edge — a big distorted riff, crash cymbals, a soaring lead. D minor.
 masaya:{title:'Lava en drop D',bpm:88,swing:0,root:146.83,mode:MINOR,groove:'grunge',lead:'synth',leadB:'brass',color:'pad',riffInst:'dist',form:['A','B','A','B'],sections:{
  A:{chords:[0,0,5,6,0,0,3,4],melody:'7.8 8.4 7.4|10.12 8.4|7.8 5.4 4.4|7.16|9.8 10.4 9.4|12.12 10.4|11.4 10.4 9.4 8.4|7.12 -.4',riff:'0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2'},
  B:{chords:[3,3,6,6,5,5,4,4],melody:'14.8 12.8|13.8 11.8|12.4 13.4 14.8|15.16|14.8 12.8|13.6 12.2 10.8|11.4 12.4 13.4 14.4|14.12 -.4',riff:'0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2|0.4 0.2 3.2 -.2 4.2 3.2 1.2'}}},
 // «Isla de 8 bits»: a bouncy 8-bit platformer on the beach that turns into an 8-bit adventure march. C major.
 'san-juan':{title:'Isla de 8 bits',bpm:150,swing:.12,root:130.81,mode:MAJOR,groove:'chipplat',lead:'chip',color:'chip',form:['A','A','B','A'],sections:{
  A:{chords:[0,0,3,4,0,0,3,4],melody:'7.2 -.2 9.2 7.2 -.2 11.2 9.2 7.2|12.4 11.2 9.2 7.8|8.2 -.2 10.2 8.2 -.2 12.2 10.2 8.2|11.4 9.2 8.2 7.8|7.2 -.2 9.2 7.2 -.2 11.2 9.2 7.2|14.4 12.2 11.2 9.8|10.2 9.2 8.2 7.2 8.2 9.2 10.2 11.2|14.4 7.4 -.8'},
  B:{chords:[0,3,5,4,0,3,1,4],groove:'chipadv',melody:'7.6 4.2 7.2 7.2 9.2 11.2|12.12 -.4|12.4 13.2 12.2 11.4 9.4|11.12 -.4|10.6 9.2 10.2 11.2 12.4|14.8 12.8|11.4 12.4 13.4 11.4|14.16'}}},
};

export interface NoteEvent{inst:Inst;freq:number;len:number;vol:number;pan:number;offset:number}
export interface DrumEvent{drum:Drum;vol:number;pan:number;offset:number}
type Parsed={degree:number;sharp:boolean;start:number;len:number}[][];
const cache=new Map<string,Parsed>();
/** Melody string → per bar list of notes with start (in sixteenths) and length. */
export function parseMelody(text:string):Parsed{
 const hit=cache.get(text);if(hit)return hit;
 const bars=text.split('|').map(bar=>{let t=0;const notes:Parsed[number]=[];for(const token of bar.trim().split(/\s+/)){const [head,lenText]=token.split('.');const len=Number(lenText);if(head!=='-'){const sharp=head.endsWith('#');notes.push({degree:Number(sharp?head.slice(0,-1):head),sharp,start:t,len});}t+=len;}return notes;});
 cache.set(text,bars);return bars;
}
export function barLengths(text:string){return text.split('|').map(bar=>bar.trim().split(/\s+/).reduce((s,token)=>s+Number(token.split('.')[1]),0));}
/** Frequency of a scale degree (any octave), optionally raised a semitone, then transposed. */
export function degreeFreq(score:Score,degree:number,sharp=false,transpose=0){
 const octave=Math.floor(degree/7),step=((degree%7)+7)%7;return score.root*2**((score.mode[step]+12*octave+(sharp?1:0)+transpose)/12);
}
export interface MusicState{level:number;tension:number;speed:number;boost:boolean}
/**
 * Everything that sounds on one sixteenth. `beat` counts sixteenths from the start of the piece.
 * Level 0 = calm, 1 = racing, 2 = final lap.
 */
export function musicStep(score:Score,beat:number,st:MusicState){
 const notes:NoteEvent[]=[],drums:DrumEvent[]=[];
 const barIndex=Math.floor(beat/16),s16=beat%16,form=score.form,sectionName=form[Math.floor(barIndex/8)%form.length],section=score.sections[sectionName],bar=barIndex%8;
 const groove=section.groove??score.groove,lead=sectionName==='B'?score.leadB??score.lead:score.lead;
 const transpose=st.level>=2?2:0,chord=section.chords[bar],f=(d:number,sharp=false)=>degreeFreq(score,d,sharp,transpose);
 const n=(inst:Inst,freq:number,len:number,vol:number,pan=0)=>notes.push({inst,freq,len,vol,pan,offset:0});
 const d=(drum:Drum,vol:number,pan=0)=>drums.push({drum,vol,pan,offset:0});
 const calm=st.level<1,last=st.level>=2,downbeat=s16===0,chip=groove==='chipplat'||groove==='chipadv';
 const heavy=groove==='numetal'||groove==='grunge';
 // ——— Lead melody (and its final-lap octave double). The reprise of A answers an octave up.
 const occurrence=Math.floor(barIndex/8)%form.length,reprise=sectionName==='A'&&occurrence===form.lastIndexOf('A')&&occurrence!==form.indexOf('A')&&!calm;
 if(!calm||bar%2===0){
  for(const note of parseMelody(section.melody)[bar]??[])if(note.start===s16){
   const high=f(note.degree+7,note.sharp),freq=reprise&&high<1400?high:f(note.degree,note.sharp);
   const len=note.len*.9,vol=(calm?.05:.085-st.tension*.02)*(heavy?1.1:1);
   n(lead,freq,len,vol,.1);
   // 8-bit adventure: a second pulse a third below; sixties pop: the organ doubles the piano.
   if(groove==='chipadv'&&!calm)n('chip',f(note.degree-2,note.sharp),len,vol*.45,-.3);
   if(groove==='britpop'&&lead==='piano'&&!calm)n('organ',freq/2,len,vol*.3,-.2);
   if(last&&freq*2<2600)n(lead,freq*2,len,vol*.4,-.15);
  }
 }
 // ——— Riff / ostinato relative to the chord. Heavy sections play it as distorted power chords an octave down.
 if(section.riff&&(!calm||bar%2===0)){
  const riffInst:Inst=heavy?'dist':score.riffInst??'piano';
  for(const note of parseMelody(section.riff)[bar]??[])if(note.start===s16){
   const low=heavy||riffInst==='bass'||riffInst==='sub';
   const freq=f(chord+note.degree-(low?7:0),note.sharp);
   const vol=riffInst==='dist'?(calm?.05:.075):riffInst==='bass'?(calm?.12:.17):calm?.04:.06;
   n(riffInst,freq,note.len*(riffInst==='dist'&&note.len<2?.7:.9),vol,riffInst==='dist'?-.35:-.2);
   if(riffInst==='dist'&&!calm)n('dist',freq*1.003,note.len*.7,vol*.7,.35); // double-tracked: one guitar per side
   if(heavy)n('bass',freq,note.len*.9,calm?.1:.15);
  }
 }
 // ——— Harmony: pads on the bar, or rhythmic stabs depending on the groove.
 const triad=[chord,chord+2,chord+4];
 switch(groove){
  case 'reggae':if(s16===4||s16===12)triad.forEach((t,i)=>n('pluck',f(t+7),1.2,.045,(i-1)*.3));break;
  case 'cumbia':if(s16%4===2)triad.forEach((t,i)=>n('pluck',f(t+7),1,.035,(i-1)*.3));break;
  case 'disco':if(downbeat||s16===8)triad.forEach((t,i)=>n('pad',f(t+7),8,.03,(i-1)*.35));break;
  // Piano pounding quarter-note chords, organ holding the bar.
  case 'britpop':if(s16%4===0&&(!calm||s16%8===0))triad.forEach((t,i)=>n('piano',f(t+7),2,calm?.025:.035,(i-1)*.3));if(downbeat&&!calm)triad.forEach((t,i)=>n('organ',f(t),16,.014,(i-1)*.4));break;
  // Boom-bap: a dark sustained pad, the piano riff carries the rest.
  case 'hiphop':if(downbeat)[chord,chord+2].forEach((t,i)=>n('pad',f(t),16,.02,(i-.5)*.5));break;
  case 'numetal':case 'grunge':if(downbeat&&bar%2===0)triad.forEach((t,i)=>n('pad',f(t+7),32,.016,(i-1)*.4));break;
  // New wave: the chorus guitar picks the chord in sixteenths (root, fifth, octave, tenth…), synth pad behind.
  case 'newwave':{const arp=[0,4,7,9,7,4,7,11][(s16>>1)%8];if(s16%2===0&&(!calm||s16%4===0))n('clean',f(chord+arp),1.8,calm?.03:.042,s16%4?.35:-.35);if(downbeat)triad.forEach((t,i)=>n('pad',f(t+7),16,.018,(i-1)*.4));break;}
  // Funk: choppy clean-guitar stabs on the offbeats.
  case 'funkrock':if(!calm&&[3,6,10,14].includes(s16)||calm&&s16===6)triad.forEach((t,i)=>n('clean',f(t+7),.8,.03,(i-1)*.35));break;
  // 8-bit: an arpeggio on the second channel.
  case 'chipplat':if(s16%2===0)n('chip',f(triad[(s16>>1)%3]+7),1,calm?.02:.03,-.3);break;
  case 'chipadv':if(s16%4===0)n('chip',f(triad[(s16>>2)%3]),3,calm?.02:.028,-.3);break;
  default:if(downbeat)triad.forEach((t,i)=>n('pad',f(t+7),16,calm?.03:.025,(i-1)*.35));
 }
 // ——— Bass: one pattern per groove, always on the chord root (fifth/octave for movement).
 const root=f(chord-7),fifth=f(chord-3),oct=f(chord);
 const bassVol=calm?.12:.17;
 switch(groove){
  case 'march':if(s16===0)n('bass',root,3.5,bassVol);if(s16===8)n('bass',fifth,3.5,bassVol);if(bar%2===1&&s16===12)n('bass',f(chord-6),2,bassVol*.8);if(bar%2===1&&s16===14)n('bass',f(chord-5),2,bassVol*.8);break;
  case 'cumbia':if(s16===0||s16===8)n('bass',root,3,bassVol);if(s16===6||s16===14)n('bass',fifth,2,bassVol*.85);break;
  case 'drive':if(s16%2===0)n('bass',s16%8===6?oct:root,1.7,bassVol*(s16%4===0?1:.75));break;
  case 'disco':if(s16%4===0)n('bass',root,1.6,bassVol);if(s16%4===2)n('bass',oct,1.4,bassVol*.8);break;
  case 'tribal':if(s16===0)n('bass',root,6,bassVol*1.1);if(s16===8||s16===10)n('bass',root,1.6,bassVol*.8);if(s16===14)n('bass',fifth,2,bassVol*.7);break;
  case 'reggae':if(s16===0)n('bass',root,4,bassVol);if(s16===6)n('bass',f(chord-5),2,bassVol*.8);if(s16===8)n('bass',fifth,3,bassVol*.9);if(s16===12)n('bass',root,2,bassVol*.8);break;
  // Walking bass on the quarters: root, third, fifth, then a chromatic approach to the next chord.
  case 'britpop':{if(s16%4===0){const next=section.chords[(bar+1)%8],walk=[root,f(chord-5),fifth,f(next-7,true)][s16/4];n('bass',s16===12?f(next-8):walk,3.4,bassVol);}break;}
  // 808: a long sub on the one, a pickup before the three.
  case 'hiphop':if(s16===0)n('sub',root,7,calm?.16:.22);if(s16===10)n('sub',root,4,calm?.12:.18);if(!calm&&s16===14&&bar%2===1)n('sub',fifth,2,.14);break;
  case 'newwave':if(s16%2===0)n('bass',s16===14?oct:root,1.6,bassVol*(s16%4===0?1:.8));break;
  // Funk: the riff above is the slap bass; when calm a simple root on the one.
  case 'funkrock':if(!section.riff&&s16===0)n('bass',root,4,bassVol);break;
  case 'chipplat':if(s16%4===0)n('chip',[root,fifth,oct,fifth][s16/4],1.6,calm?.05:.07,.1);break;
  case 'chipadv':if(s16%2===0)n('chip',s16%8===6?fifth:root,1.4,calm?.05:.065,.1);break;
 }
 // ——— Colour layer: marimba ostinato (or plucked arps on the final lap) on eighths.
 if(!calm&&s16%2===0&&(score.color==='marimba'||last)&&!chip&&groove!=='newwave'){
  const step=[0,2,4,7,4,2,4,7][(s16/2)%8];
  n(score.color==='marimba'?'marimba':'pluck',f(chord+7+step),1.6,last?.05:.035,-.25);
 }
 // ——— Final lap: sixteenth arpeggios over the chord, panned against the lead.
 if(last&&s16%2===1)n(chip?'chip':'pluck',f(triad[(s16>>1)%3]+7),.8,.03,.35);
 // ——— Tension: a pulsing low line and a riser every two bars.
 if(st.tension>.2){if(s16%2===0)n('bass',root*2,.9,.06*st.tension,0);if(s16===0&&bar%2===0)d('riser',.05+.05*st.tension);}
 // ——— Drums.
 const hats=calm?.03:.05+st.speed*.03;
 switch(groove){
  case 'march':
   if(s16===0||s16===8)d('kick',calm?.2:.3);if(!calm&&(s16===4||s16===12))d('snare',.16);if(s16%2===0)d('hat',hats);
   if(!calm&&bar%4===3&&s16>=12)d('snare',.07+(s16-12)*.02);break;
  case 'cumbia':
   if(s16===0||s16===8)d('kick',calm?.18:.28);if(s16%4===0)d('guiro',.06);if(s16%4===2||s16%4===3)d('guiro',.035);if(!calm&&(s16===6||s16===14))d('rim',.08);if(!calm&&s16%8===4)d('cowbell',.04);break;
  case 'drive':
   if(s16===0||s16===6||s16===8)d('kick',calm?.2:.3);if(!calm&&(s16===4||s16===12))d('snare',.17);if(s16%2===0)d('hat',hats);if(!calm&&s16%4===2)d('openhat',.04);break;
  case 'disco':
   if(s16%4===0)d('kick',calm?.2:.32);if(!calm&&(s16===4||s16===12))d('clap',.14);if(s16%4===2)d('openhat',calm?.03:.06);if(!calm&&st.speed>.6&&s16%2===1)d('hat',.03);break;
  case 'tribal':
   if(s16===0||s16===3)d('lowtom',calm?.18:.28);if(!calm&&(s16===6||s16===10))d('tom',.2,-.2);if(!calm&&(s16===12||s16===14))d('tom',.16,.2);if(s16%4===0)d('shaker',.04);if(!calm&&bar%4===3&&s16>=8&&s16%2===0)d('tom',.12+(s16-8)*.015,(s16%4?-.3:.3));break;
  case 'reggae':
   if(s16===8)d('kick',calm?.2:.3);if(s16===8)d('rim',.1);if(s16%2===0)d('hat',hats*.9);if(!calm&&s16%4===3)d('shaker',.03);break;
  case 'britpop':
   if(s16===0||s16===8||(!calm&&s16===10))d('kick',calm?.18:.27);if(!calm&&(s16===4||s16===12))d('snare',.15);if(s16%2===0)d('hat',hats*.9);if(!calm&&(s16===4||s16===12))d('tamb',.07);if(last&&s16%2===1)d('tamb',.04);
   if(!calm&&bar===7&&s16>=8&&s16%2===0)d('tom',.1+(s16-8)*.012,(s16-11)*.1);break;
  case 'hiphop':
   if(s16===0||s16===7||s16===10)d(calm?'kick':'boom',calm?.18:.26);if(s16===4||s16===12)d('snare',calm?.1:.19);if(!calm&&(s16===4||s16===12))d('clap',.06);
   if(s16%2===0)d('hat',hats*(s16%4===2?.7:1));if(!calm&&s16===15&&bar%2===1)d('openhat',.04);
   if(!calm&&bar%4===3&&(s16===12||s16===14))d('scratch',.09,(s16===12?-.3:.3));break;
  case 'numetal':
   if(s16===0||s16===2||s16===5||s16===8||s16===10)d('kick',calm?.2:.3);if(!calm&&(s16===4||s16===12))d('snare',.2);if(s16%2===0)d('hat',hats);
   if(!calm&&downbeat&&bar%4===0)d('crash',.08);if(!calm&&bar%2===1&&(s16===6||s16===14))d('scratch',.1,s16===6?-.4:.4);break;
  case 'newwave':
   if(s16===0||s16===8||(!calm&&s16===6))d('kick',calm?.18:.27);if(!calm&&(s16===4||s16===12)){d('snare',.15);d('clap',.07);}if(s16%2===0||(!calm&&st.speed>.5))d('hat',hats*(s16%2?.5:1));if(!calm&&downbeat&&bar%8===0)d('crash',.06);break;
  case 'funkrock':
   if(s16===0||s16===3||s16===10)d('kick',calm?.18:.28);if(!calm&&(s16===4||s16===12))d('snare',.17);if(!calm&&(s16===7||s16===9||s16===15))d('snare',.04);d('hat',(s16%2?hats*.55:hats));if(!calm&&s16===14&&bar%2===0)d('openhat',.05);
   if(!calm&&bar%4===1&&(s16===12||s16===13||s16===14))d('scratch',.08,(s16-13)*.4);break;
  case 'grunge':
   if(s16===0||s16===2||s16===8||s16===11)d('kick',calm?.2:.32);if(!calm&&(s16===4||s16===12))d('snare',.21);if(s16%2===0)d(calm?'hat':'openhat',calm?hats:.035);
   if(!calm&&downbeat&&bar%2===0)d('crash',.09);if(!calm&&bar%4===3&&s16>=8)d(s16<12?'tom':'lowtom',.14+(s16-8)*.012,s16<12?-.3:.3);break;
  case 'chipplat':
   if(s16===0||s16===8)d('kick',calm?.14:.2);if(!calm&&(s16===4||s16===12))d('rim',.12);if(s16%2===0)d('hat',hats*.8);break;
  case 'chipadv':
   if(s16===0||s16===8||s16===11)d('kick',calm?.14:.2);if(!calm&&(s16===4||s16===12||s16===14))d('snare',.1);if(!calm&&bar%2===1&&s16>=12)d('snare',.05+(s16-12)*.015);if(s16%2===0)d('hat',hats*.8);break;
 }
 // Faster = busier: from 3/4 of top speed every groove gets a sixteenth shaker.
 if(!calm&&st.speed>.75&&s16%2===1&&groove!=='disco'&&!heavy&&groove!=='funkrock')d('shaker',.025);
 if(last&&downbeat&&bar%4===0)d(heavy||groove==='newwave'?'crash':'openhat',.07);
 return{notes,drums,bar,section:sectionName};
}
