/*
 * Original dynamic soundtrack, one piece per world. Everything here was composed for this game:
 * the melodies, the progressions and the arrangements. Adventurous in spirit (big melodies,
 * bright brass, a hero on a road trip), local in colour: chicheros brass for La Salle, cumbia for
 * the Mercado, marimba ostinatos for Masaya, a beach skank for San Juan.
 *
 * Notation: a melody is 8 bars separated by '|'. Each bar has tokens "degree.length" in
 * sixteenths (16 per bar). Degrees index the score's mode (0 = tonic, 7 = octave up, -1 = the
 * note below the tonic); a trailing '#' raises a semitone; '-' is a rest.
 *
 * Layers react to the race: calm (countdown) → full band (racing) → final lap (faster, a whole
 * tone up, arpeggios and doubled lead). Tension adds a pulsing bass and risers; speed opens the
 * hats; voices duck the whole band.
 */
export type Inst='square'|'brass'|'accordion'|'marimba'|'steel'|'synth'|'pad'|'bass'|'pluck';
export type Drum='kick'|'snare'|'hat'|'openhat'|'clap'|'tom'|'lowtom'|'guiro'|'rim'|'shaker'|'cowbell'|'riser';
export type Groove='march'|'cumbia'|'drive'|'disco'|'tribal'|'reggae';
interface Section{chords:number[];melody:string}
export interface Score{
 title:string;bpm:number;swing:number;root:number;mode:number[];groove:Groove;lead:Inst;color:Inst;
 sections:Record<'A'|'B',Section>;form:('A'|'B')[];
}
const MAJOR=[0,2,4,5,7,9,11],MINOR=[0,2,3,5,7,8,10],MIXO=[0,2,4,5,7,9,10],DORIAN=[0,2,3,5,7,9,10],HARMONIC=[0,2,3,5,7,8,11];

export const SCORES:Record<string,Score>={
 // «Recreo con banda»: a schoolyard march for chicheros brass. Bb major.
 'la-salle':{title:'Recreo con banda',bpm:132,swing:0,root:233.08,mode:MAJOR,groove:'march',lead:'brass',color:'marimba',form:['A','A','B','A'],sections:{
  A:{chords:[0,0,3,4,0,5,3,4],melody:'4.4 4.2 5.2 4.2 2.2 0.4|2.2 4.2 7.4 6.4 4.4|5.4 5.2 6.2 5.2 3.2 1.4|4.6 -.2 1.2 2.2 3.4|4.4 4.2 5.2 4.2 2.2 0.4|5.2 7.2 9.4 7.4 5.4|8.2 7.2 5.2 3.2 5.4 7.4|6.4 5.2 4.2 8.8'},
  B:{chords:[5,3,0,4,1,4,0,0],melody:'9.6 8.2 7.4 5.4|8.6 7.2 5.4 3.4|4.2 7.2 9.4 11.4 9.4|8.8 -.4 6.2 7.2|8.6 9.2 8.4 6.4|4.4 6.4 8.4 11.4|9.4 7.4 4.4 2.4|7.8 -.8'}}},
 // «Chinamos al trote»: cumbia through the stalls, accordion lead. A minor.
 oriental:{title:'Chinamos al trote',bpm:112,swing:.06,root:220,mode:MINOR,groove:'cumbia',lead:'accordion',color:'marimba',form:['A','B','A','B'],sections:{
  A:{chords:[0,0,3,3,6,6,0,4],melody:'4.2 4.2 -.2 4.2 5.2 4.2 2.2 0.2|1.2 2.2 1.2 0.2 -1#.4 0.4|3.2 3.2 -.2 3.2 5.2 3.2 2.2 3.2|4.4 3.2 2.2 1.8|6.2 6.2 -.2 6.2 8.2 6.2 5.2 4.2|5.2 6.2 5.2 4.2 3.4 2.4|4.2 7.2 4.2 2.2 4.2 7.2 9.2 7.2|6#.4 4.4 1.4 -1#.4'},
  B:{chords:[5,6,0,0,5,6,4,4],melody:'7.4 9.4 7.2 5.2 3.4|6.4 8.4 10.4 8.4|9.6 7.2 4.4 2.4|4.8 -.8|7.4 9.4 12.4 9.4|10.4 8.4 6.4 8.4|6#.4 8.4 11.4 8.4|11.8 -.8'}}},
 // «Rotonda en mayor»: the city tour, heroic and bright. D mixolydian.
 managua:{title:'Rotonda en mayor',bpm:140,swing:0,root:146.83,mode:MIXO,groove:'drive',lead:'square',color:'pluck',form:['A','A','B','A'],sections:{
  A:{chords:[0,6,3,0,0,6,3,4],melody:'7.2 9.2 11.4 11.2 12.2 11.4|13.4 12.2 11.2 10.4 -.4|10.2 12.2 14.4 14.2 15.2 14.4|11.8 -.4 11.2 12.2|14.2 16.2 18.4 16.4 14.4|17.4 15.2 13.2 15.8|17.2 16.2 15.2 14.2 15.4 12.4|11.6 13.2 15.8'},
  B:{chords:[5,3,0,4,5,3,6,4],melody:'12.4 14.4 16.6 -.2|17.4 16.4 14.8|14.2 16.2 18.4 18.4 16.4|15.12 -.4|19.4 18.4 16.4 14.4|17.6 16.2 14.8|13.4 15.4 17.4 20.4|18.8 11.2 13.2 15.2 18.2'}}},
 // «Luces de la terraza»: four on the floor under the club lights. F dorian.
 'hipa-hipa':{title:'Luces de la terraza',bpm:124,swing:0,root:174.61,mode:DORIAN,groove:'disco',lead:'synth',color:'pad',form:['A','B','A','B'],sections:{
  A:{chords:[0,0,3,3,0,0,6,6],melody:'7.3 7.3 7.2 6.2 7.2 -.4|9.3 7.3 4.2 -.8|8.3 8.3 8.2 7.2 8.2 -.4|10.3 8.3 5.2 -.8|7.3 7.3 7.2 6.2 7.2 -.4|9.3 7.3 11.2 -.8|6.4 8.4 10.4 8.4|13.4 12.4 10.4 -.4'},
  B:{chords:[3,6,0,0,3,6,4,4],melody:'10.8 12.8|13.8 10.8|11.4 9.4 7.8|7.4 9.4 11.4 14.4|10.8 12.8|13.6 12.2 10.8|11.8 8.8|11.4 13.4 11.8'}}},
 // «El cráter despierta»: marimba ostinato and war drums at the crater's edge. D harmonic minor.
 masaya:{title:'El cráter despierta',bpm:116,swing:0,root:146.83,mode:HARMONIC,groove:'tribal',lead:'brass',color:'marimba',form:['A','B','A','B'],sections:{
  A:{chords:[0,0,5,5,3,3,4,4],melody:'7.2 11.2 14.6 13.2 14.4|15.4 14.2 13.2 14.8|16.4 15.2 14.2 12.8|11.4 12.4 14.8|10.2 12.2 14.4 17.4 16.4|15.4 14.4 12.4 10.4|11.4 13.4 15.4 18.4|20.8 18.8'},
  B:{chords:[5,3,0,4,5,3,4,4],melody:'19.6 18.2 16.8|17.6 16.2 14.8|14.4 16.4 18.4 21.4|20.8 18.8|12.4 14.4 16.4 14.4|17.4 15.4 14.4 12.4|13.4 15.4 18.4 20.4|18.16'}}},
 // «Bajando al malecón»: a beach skank with steel-drum lead. G major.
 'san-juan':{title:'Bajando al malecón',bpm:112,swing:.1,root:196,mode:MAJOR,groove:'reggae',lead:'steel',color:'marimba',form:['A','A','B','A'],sections:{
  A:{chords:[0,3,0,4,0,3,4,0],melody:'4.3 4.3 5.2 4.4 2.4|5.3 5.3 7.2 5.4 3.4|4.3 2.3 0.2 2.4 4.4|6.6 5.2 4.8|7.3 7.3 9.2 7.4 4.4|8.3 8.3 10.2 8.4 5.4|6.3 4.3 6.2 8.4 11.4|7.8 -.8'},
  B:{chords:[5,2,3,0,1,4,0,0],melody:'9.6 7.2 5.8|6.6 4.2 2.8|7.4 5.4 3.4 5.4|4.12 -.4|8.4 5.4 3.4 1.4|4.4 6.4 8.4 11.4|9.4 7.4 4.4 2.4|7.8 -.8'}}},
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
 const transpose=st.level>=2?2:0,chord=section.chords[bar],f=(d:number,sharp=false)=>degreeFreq(score,d,sharp,transpose);
 const n=(inst:Inst,freq:number,len:number,vol:number,pan=0)=>notes.push({inst,freq,len,vol,pan,offset:0});
 const d=(drum:Drum,vol:number,pan=0)=>drums.push({drum,vol,pan,offset:0});
 const calm=st.level<1,last=st.level>=2,downbeat=s16===0;
 // ——— Lead melody (and its final-lap octave double). The reprise of A answers an octave up.
 const occurrence=Math.floor(barIndex/8)%form.length,reprise=sectionName==='A'&&occurrence===form.lastIndexOf('A')&&occurrence!==form.indexOf('A')&&!calm;
 if(!calm||bar%2===0){
  for(const note of parseMelody(section.melody)[bar]??[])if(note.start===s16){
   const high=f(note.degree+7,note.sharp),freq=reprise&&high<1400?high:f(note.degree,note.sharp);
   const len=note.len*.9,vol=calm?.05:.085-st.tension*.02;
   n(score.lead,freq,len,vol,.1);
   if(last&&freq*2<2600)n(score.lead,freq*2,len,vol*.4,-.15);
  }
 }
 // ——— Harmony: pads on the bar, or rhythmic stabs depending on the groove.
 const triad=[chord,chord+2,chord+4];
 if(score.groove==='reggae'){if(s16===4||s16===12)triad.forEach((t,i)=>n('pluck',f(t+7),1.2,.045,(i-1)*.3));}
 else if(score.groove==='cumbia'){if(s16%4===2)triad.forEach((t,i)=>n('pluck',f(t+7),1,.035,(i-1)*.3));}
 else if(score.groove==='disco'){if(downbeat||s16===8)triad.forEach((t,i)=>n('pad',f(t+7),8,.03,(i-1)*.35));}
 else if(downbeat)triad.forEach((t,i)=>n('pad',f(t+7),16,calm?.03:.025,(i-1)*.35));
 // ——— Bass: one pattern per groove, always on the chord root (fifth/octave for movement).
 const root=f(chord-7),fifth=f(chord-3),oct=f(chord);
 const bassVol=calm?.12:.17;
 switch(score.groove){
  case 'march':if(s16===0)n('bass',root,3.5,bassVol);if(s16===8)n('bass',fifth,3.5,bassVol);if(bar%2===1&&s16===12)n('bass',f(chord-6),2,bassVol*.8);if(bar%2===1&&s16===14)n('bass',f(chord-5),2,bassVol*.8);break;
  case 'cumbia':if(s16===0||s16===8)n('bass',root,3,bassVol);if(s16===6||s16===14)n('bass',fifth,2,bassVol*.85);break;
  case 'drive':if(s16%2===0)n('bass',s16%8===6?oct:root,1.7,bassVol*(s16%4===0?1:.75));break;
  case 'disco':if(s16%4===0)n('bass',root,1.6,bassVol);if(s16%4===2)n('bass',oct,1.4,bassVol*.8);break;
  case 'tribal':if(s16===0)n('bass',root,6,bassVol*1.1);if(s16===8||s16===10)n('bass',root,1.6,bassVol*.8);if(s16===14)n('bass',fifth,2,bassVol*.7);break;
  case 'reggae':if(s16===0)n('bass',root,4,bassVol);if(s16===6)n('bass',f(chord-5),2,bassVol*.8);if(s16===8)n('bass',fifth,3,bassVol*.9);if(s16===12)n('bass',root,2,bassVol*.8);break;
 }
 // ——— Colour layer: the local instrument. Marimba ostinato on eighths from the racing level up.
 if(!calm&&s16%2===0&&(score.color==='marimba'||last)){
  const step=[0,2,4,7,4,2,4,7][(s16/2)%8];
  n(score.color==='marimba'?'marimba':'pluck',f(chord+7+step),1.6,last?.05:.035,-.25);
 }
 // ——— Final lap: sixteenth arpeggios over the chord, panned against the lead.
 if(last&&s16%2===1)n('pluck',f(triad[(s16>>1)%3]+7),.8,.03,.35);
 // ——— Tension: a pulsing low line and a riser every two bars.
 if(st.tension>.2){if(s16%2===0)n('bass',root*2,.9,.06*st.tension,0);if(s16===0&&bar%2===0)d('riser',.05+.05*st.tension);}
 // ——— Drums.
 const hats=calm?.03:.05+st.speed*.03;
 switch(score.groove){
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
 }
 // Faster = busier: from 3/4 of top speed every groove gets a sixteenth shaker.
 if(!calm&&st.speed>.75&&s16%2===1&&score.groove!=='disco')d('shaker',.025);
 if(last&&downbeat&&bar%4===0)d('openhat',.07);
 return{notes,drums,bar,section:sectionName};
}
