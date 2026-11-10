/*
 * Original dynamic soundtrack: every world rotates through two or three songs, one per race. Every melody, riff and
 * progression here was written for this game. Each song borrows the *style* of music the gang grew up with — tempo, key
 * and metre, groove, kind of riff, instruments and production tricks — never a melody: 8-bit platformer and adventure
 * marches, sneaky West-Coast and bitter boom-bap rap beats, rap-rock chugs with DJ scratches, eighties Argentine new wave
 * and its jazz-club side, early-2000s nu-rock, slow wah-guitar hard rock, dreamy delay-guitar alt-rock, sixties Liverpool
 * piano-pop and a son nica in 6/8 with marimba de arco.
 */
export type Inst='square'|'brass'|'accordion'|'marimba'|'steel'|'synth'|'pad'|'bass'|'pluck'|'piano'|'organ'|'dist'|'clean'|'sub'|'chip'|'rhodes'|'vibes'|'upright'|'wah'|'nylon'|'strings';
export type Drum='kick'|'snare'|'hat'|'openhat'|'clap'|'tom'|'lowtom'|'guiro'|'rim'|'shaker'|'cowbell'|'riser'|'scratch'|'crash'|'tamb'|'boom'|'ride'|'brush';
export type Groove='march'|'cumbia'|'drive'|'disco'|'tribal'|'reggae'|'britpop'|'hiphop'|'numetal'|'newwave'|'funkrock'|'grunge'|'chipplat'|'chipadv'|'sonnica'|'jazz'|'lounge'|'dream'|'nurock'|'slowrock'|'soadverse'|'soadheavy';
interface Section{chords:number[];melody:string;
 /** Optional groove for this section only (a song can drop into another style). */ groove?:Groove;
 /** Optional riff/ostinato, degrees relative to the bar's chord, played by the score's riff instrument. */ riff?:string; }
export interface Score{
 title:string;bpm:number;swing:number;root:number;mode:number[];groove:Groove;lead:Inst;color:Inst;
 /** Lead instrument for section B (defaults to lead) and the instrument of the riffs. */ leadB?:Inst;riffInst?:Inst;
 /** Steps per bar: 16 (4/4 in sixteenths, default) or 12 (two bars of 6/8 in eighths). */ steps?:number;
 /** Dotted-eighth delay on the lead and riff (dreamy guitars). */ echo?:boolean;
 sections:Record<'A'|'B',Section>;form:('A'|'B')[];
}
const PHRYGDOM=[0,1,4,5,7,8,10],MAJOR=[0,2,4,5,7,9,11],MINOR=[0,2,3,5,7,8,10],MIXO=[0,2,4,5,7,9,10],DORIAN=[0,2,3,5,7,9,10],HARMONIC=[0,2,3,5,7,8,11];

// «Recreo en Liverpool»: sixties piano-pop for the schoolyard — bouncy piano, organ, tambourine, walking bass. G major.
const ls_liverpool:Score={title:'Recreo en Liverpool',bpm:128,swing:.08,root:196,mode:MAJOR,groove:'britpop',lead:'piano',leadB:'organ',color:'organ',form:['A','A','B','A'],sections:{
  A:{chords:[0,4,5,3,0,4,3,4],melody:'4.2 4.2 4.2 5.2 7.4 4.4|6.2 6.2 6.2 5.2 4.4 2.4|5.2 5.2 5.2 4.2 2.4 0.4|1.4 2.4 3.4 4.4|4.2 4.2 4.2 5.2 7.4 9.4|8.2 7.2 6.2 5.2 4.8|3.2 4.2 5.2 6.2 7.2 6.2 5.2 3.2|4.12 -.4'},
  B:{chords:[3,4,0,5,3,4,1,4],melody:'7.4 9.4 7.4 5.4|8.4 7.4 6.8|4.2 5.2 7.4 7.2 9.2 7.4|9.6 8.2 7.8|10.4 9.4 7.4 5.4|8.4 7.4 6.4 4.4|5.2 6.2 7.2 8.2 9.4 8.4|7.16'}}};
// «Recreo de 8 bits»: a bouncy calypso-swung platformer in pulse waves — the classic side-scrolling overworld feel. C major.
const ls_8bit:Score={title: 'Recreo de 8 bits', bpm: 150, swing: 0.12, root: 130.81, mode: MAJOR, groove: 'chipplat', lead: 'chip', color: 'chip', form: ['A', 'A', 'B', 'A'], sections: {A: {chords: [0, 0, 3, 4, 0, 0, 3, 4], melody: '7.2 -.2 9.2 7.2 -.2 11.2 9.2 7.2|12.4 11.2 9.2 7.8|8.2 -.2 10.2 8.2 -.2 12.2 10.2 8.2|11.4 9.2 8.2 7.8|7.2 -.2 9.2 7.2 -.2 11.2 9.2 7.2|14.4 12.2 11.2 9.8|10.2 9.2 8.2 7.2 8.2 9.2 10.2 11.2|14.4 7.4 -.8'}, B: {chords: [3, 3, 0, 0, 1, 4, 0, 4], melody: '10.2 -.2 10.2 12.2 -.2 10.2 9.4|8.2 9.2 10.2 -.2 9.8|11.2 -.2 11.2 12.2 -.2 11.2 9.4|7.12 -.4|8.2 -.2 8.2 9.2 -.2 10.2 11.4|11.2 -.2 11.2 12.2 -.2 13.2 14.4|14.2 12.2 11.2 9.2 7.2 9.2 11.2 12.2|14.4 -.4 7.4 -.4'}}};
// «Conciencia del recreo»: a sneaky, cinematic West-Coast rap beat — a creeping bass-guitar loop, an angel on clean guitar answering a devil on synth. A minor.
const ls_conciencia:Score={title: 'Conciencia del recreo', bpm: 92, swing: 0.1, root: 220, mode: MINOR, groove: 'hiphop', lead: 'clean', leadB: 'synth', color: 'piano', riffInst: 'bass', form: ['A', 'B', 'A', 'B'], sections: {A: {chords: [0, 0, 3, 3, 0, 0, 4, 4], melody: '7.4 9.4 10.4 -.4|9.2 7.2 6.4 4.8|-.4 10.4 12.4 10.4|9.12 -.4|7.4 9.4 10.4 12.4|14.6 12.2 10.8|9.4 8.4 7.4 6#.4|7.12 -.4', riff: '0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2'}, B: {chords: [5, 5, 3, 3, 0, 0, 4, 4], melody: '12.2 12.2 -.2 12.2 10.2 -.2 9.4|10.2 10.2 -.2 10.2 9.2 -.2 7.4|12.2 12.2 -.2 12.2 14.4 12.4|11.8 -.8|12.2 12.2 -.2 12.2 10.2 -.2 9.4|10.2 10.2 -.2 10.2 12.2 -.2 14.4|13.4 12.4 11.4 10.4|11.12 -.4', riff: '0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2|0.3 0.1 -.2 7.2 -.2 6.2 4.2 3.2'}}};
// «Son del Mercado»: a son nica in 6/8 — marimba de arco ostinato, strummed guitar, festive and patronal. G major.
const or_son:Score={title: 'Son del Mercado', bpm: 96, swing: 0, root: 196, mode: MAJOR, groove: 'sonnica', lead: 'marimba', color: 'marimba', steps: 12, form: ['A', 'A', 'B', 'A'], sections: {A: {chords: [0, 0, 4, 4, 0, 0, 4, 0], melody: '4.2 5.1 4.2 2.1 0.3 2.3|4.2 5.1 7.2 5.1 4.6|4.2 3.1 1.2 3.1 4.3 3.3|1.3 3.3 4.6|7.2 7.1 9.2 7.1 4.3 2.3|5.2 4.1 2.2 4.1 5.6|4.2 3.1 1.2 3.1 4.3 6.3|7.9 -.3'}, B: {chords: [3, 3, 0, 0, 4, 4, 0, 0], melody: '10.3 9.3 8.3 7.3|8.2 9.1 10.2 9.1 8.6|9.2 8.1 7.2 8.1 9.3 7.3|11.6 9.6|8.2 9.1 8.2 6.1 4.6|11.2 10.1 8.2 6.1 4.6|4.2 5.1 7.2 9.1 11.3 9.3|7.9 -.3'}}};
// «Limpiando el tramo»: a slow, heavy, bitter rap beat — a melancholic nylon-guitar loop, hard boom-bap drums, strings that swell into a piano hook. E minor.
const or_closet:Score={title: 'Limpiando el tramo', bpm: 80, swing: 0.06, root: 164.81, mode: HARMONIC, groove: 'hiphop', lead: 'strings', leadB: 'piano', color: 'strings', riffInst: 'nylon', form: ['A', 'B', 'A', 'B'], sections: {A: {chords: [0, 0, 5, 5, 3, 3, 4, 4], melody: '7.8 8.4 7.4|5.16|7.8 8.4 10.4|11.12 -.4|12.8 11.4 10.4|10.8 9.4 8.4|9.4 8.4 7.4 6.4|7.12 -.4', riff: '0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2'}, B: {chords: [5, 5, 3, 3, 0, 0, 4, 4], melody: '12.3 12.3 11.2 10.4 -.4|10.3 10.3 9.2 7.4 -.4|12.3 12.3 11.2 10.4 12.4|14.8 -.8|12.3 12.3 11.2 10.4 -.4|10.3 10.3 9.2 8.4 7.4|8.4 7.4 6.4 4.4|7.12 -.4', riff: '0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2|0.2 4.2 7.2 9.2 7.2 4.2 2.2 4.2'}}};
// «Rodando por el Oriental»: rap-rock for the traffic jam — drop-tuned staccato stabs and DJ scratches, a chanted hook, then the full chug. E minor.
const or_rollin:Score={title: 'Rodando por el Oriental', bpm: 96, swing: 0, root: 164.81, mode: MINOR, groove: 'numetal', lead: 'synth', leadB: 'brass', color: 'pad', form: ['A', 'B', 'A', 'B'], sections: {A: {chords: [0, 0, 0, 0, 5, 5, 6, 6], melody: '7.2 7.2 -.2 7.2 7.2 -.2 9.2 7.2|10.4 9.4 7.8|7.2 7.2 -.2 7.2 7.2 -.2 9.2 10.2|12.8 10.8|7.2 7.2 -.2 7.2 7.2 -.2 9.2 7.2|10.4 9.4 7.8|13.4 12.4 10.4 9.4|7.12 -.4', riff: '0.2 -.6 0.2 -.2 3.2 -.2|0.2 -.6 0.2 -.2 3.2 -.2|0.2 -.6 0.2 -.2 3.2 -.2|0.2 -.6 0.2 -.2 3.2 -.2|0.2 -.6 0.2 -.2 3.2 -.2|0.2 -.6 0.2 -.2 3.2 -.2|0.2 -.6 0.2 -.2 3.2 -.2|0.2 -.6 0.2 -.2 3.2 -.2'}, B: {chords: [0, 0, 5, 5, 6, 6, 4, 4], melody: '14.4 14.4 12.4 10.4|12.8 10.8|14.4 14.4 12.4 15.4|14.16|14.4 14.4 12.4 10.4|11.8 13.8|14.2 13.2 12.2 11.2 10.2 9.2 8.2 7.2|7.12 -.4', riff: '0.1 0.1 -.2 0.1 0.1 -.2 0.2 1.2 0.2 -.2|0.1 0.1 -.2 0.1 0.1 -.2 0.2 1.2 0.2 -.2|0.1 0.1 -.2 0.1 0.1 -.2 0.2 1.2 0.2 -.2|0.1 0.1 -.2 0.1 0.1 -.2 0.2 1.2 0.2 -.2|0.1 0.1 -.2 0.1 0.1 -.2 0.2 1.2 0.2 -.2|0.1 0.1 -.2 0.1 0.1 -.2 0.2 1.2 0.2 -.2|0.1 0.1 -.2 0.1 0.1 -.2 0.2 1.2 0.2 -.2|0.1 0.1 -.2 0.1 0.1 -.2 0.2 1.2 0.2 -.2'}}};
// «Primavera en la rotonda»: fast eighties Argentine new wave — chorus-guitar arpeggios in sixteenths, a driving eighth-note bass, punchy gated snare. B minor.
const mg_primavera:Score={title: 'Primavera en la rotonda', bpm: 152, swing: 0, root: 123.47, mode: MINOR, groove: 'newwave', lead: 'clean', leadB: 'synth', color: 'clean', form: ['A', 'A', 'B', 'A'], sections: {A: {chords: [0, 5, 2, 6, 0, 5, 3, 4], melody: '7.4 9.4 10.6 9.2|7.4 5.4 4.8|7.4 9.4 10.4 12.4|11.12 -.4|12.4 11.4 10.6 9.2|10.4 9.4 7.8|9.4 10.4 11.4 12.4|14.8 12.8'}, B: {chords: [3, 4, 5, 5, 3, 4, 6, 6], melody: '14.6 12.2 10.8|11.6 10.2 9.8|12.4 11.4 10.4 9.4|7.12 -.4|14.6 12.2 10.8|15.6 14.2 12.8|13.4 12.4 11.4 13.4|14.16'}}};
// «Arrastrado en la Norte»: early-2000s nu-rock — an ominous piano riff over an electronic breakbeat, then a wall of distorted guitars with a soaring lead. C# minor.
const mg_crawl:Score={title: 'Arrastrado en la Norte', bpm: 105, swing: 0, root: 138.59, mode: MINOR, groove: 'nurock', lead: 'synth', leadB: 'synth', color: 'pad', riffInst: 'piano', form: ['A', 'B', 'A', 'B'], sections: {A: {chords: [0, 0, 5, 5, 2, 2, 6, 6], melody: '9.6 7.2 9.8|10.6 9.2 7.8|9.6 7.2 9.4 11.4|8.16|9.6 7.2 9.8|10.6 11.2 12.8|13.4 12.4 11.4 10.4|9.12 -.4', riff: '7.2 4.2 2.2 4.2 7.2 4.2 2.2 0.2|7.2 4.2 2.2 4.2 7.2 4.2 2.2 0.2|7.2 4.2 2.2 4.2 7.2 4.2 2.2 0.2|7.2 4.2 2.2 4.2 7.2 4.2 2.2 0.2|7.2 4.2 2.2 4.2 7.2 4.2 2.2 0.2|7.2 4.2 2.2 4.2 7.2 4.2 2.2 0.2|7.2 4.2 2.2 4.2 7.2 4.2 2.2 0.2|7.2 4.2 2.2 4.2 7.2 4.2 2.2 0.2'}, B: {chords: [0, 0, 5, 5, 2, 2, 6, 6], groove: 'grunge', melody: '14.8 12.8|14.4 15.4 14.8|16.8 14.8|13.12 12.4|14.8 12.8|14.4 15.4 16.8|17.6 16.2 14.8|14.16', riff: '0.4 0.2 0.2 0.4 0.2 0.2|0.4 0.2 0.2 0.4 0.2 0.2|0.4 0.2 0.2 0.4 0.2 0.2|0.4 0.2 0.2 0.4 0.2 0.2|0.4 0.2 0.2 0.4 0.2 0.2|0.4 0.2 0.2 0.4 0.2 0.2|0.4 0.2 0.2 0.4 0.2 0.2|0.4 0.2 0.2 0.4 0.2 0.2'}}};
// «Romance de terraza»: laid-back jazzy alt-rock lounge — swung brushed groove, Rhodes minor sevenths, upright bass, vibraphone, a DJ scratching between phrases. F# dorian.
const hp_romance:Score={title: 'Romance de terraza', bpm: 90, swing: 0.18, root: 185, mode: DORIAN, groove: 'lounge', lead: 'vibes', leadB: 'clean', color: 'rhodes', form: ['A', 'A', 'B', 'A'], sections: {A: {chords: [0, 0, 3, 3, 0, 0, 3, 4], melody: '-.2 7.2 9.3 10.3 9.2 7.4|-.4 5.2 7.2 9.8|-.2 7.2 9.3 10.3 12.2 10.4|9.12 -.4|-.2 11.2 12.3 11.3 9.2 7.4|-.4 9.2 10.2 12.8|11.3 10.3 9.2 7.4 5.4|7.12 -.4'}, B: {chords: [2, 2, 3, 3, 0, 0, 4, 4], melody: '12.6 11.2 9.8|10.6 9.2 7.8|12.4 14.4 12.4 11.4|9.16|12.6 11.2 9.8|10.6 12.2 14.8|13.4 12.4 11.4 9.4|11.16'}}};
// «Medio azulado»: Argentine rock gone full jazz club — swing ride, walking upright bass, Rhodes comping on ii–V–I, vibes and a jazz guitar. Eb major.
const hp_azulado:Score={title: 'Medio azulado', bpm: 132, swing: 0.22, root: 155.56, mode: MAJOR, groove: 'jazz', lead: 'vibes', leadB: 'clean', color: 'rhodes', form: ['A', 'A', 'B', 'A'], sections: {A: {chords: [1, 4, 0, 5, 1, 4, 0, 0], melody: '8.2 9.2 10.2 11.2 12.4 10.4|11.2 10.2 8.2 6.2 4.8|7.6 9.2 11.8|12.4 11.4 9.4 7.4|8.2 9.2 10.2 11.2 12.4 13.4|12.2 11.2 10.2 8.2 6.8|7.12 -.4|-.4 4.2 5.2 6.2 7.2 8.4'}, B: {chords: [3, 3, 2, 5, 1, 4, 0, 4], melody: '10.6 12.2 10.8|9.2 10.2 12.4 14.8|13.6 11.2 9.8|12.4 11.4 12.8|8.2 9.2 10.2 11.2 12.4 10.4|11.2 10.2 8.2 6.2 4.8|7.16|-.4 11.4 10.4 8.4'}}};
// «Scratch en la terraza»: DJ-scratched funk rock under the club lights — slap bass riff, clean chord stabs. E dorian.
const hp_scratch:Score={title: 'Scratch en la terraza', bpm: 100, swing: 0.05, root: 164.81, mode: DORIAN, groove: 'funkrock', lead: 'clean', leadB: 'synth', color: 'clean', riffInst: 'bass', form: ['A', 'B', 'A', 'B'], sections: {A: {chords: [0, 0, 3, 3, 0, 0, 6, 4], melody: '7.3 9.3 7.2 -.2 10.2 9.2 7.2|5.4 7.2 5.2 4.8|7.3 9.3 7.2 -.2 10.2 12.2 10.2|9.12 -.4|11.3 10.3 9.2 7.4 9.4|10.2 9.2 7.2 5.2 7.8|4.2 5.2 7.2 9.2 10.2 9.2 7.2 5.2|7.8 -.8', riff: '0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2'}, B: {chords: [3, 4, 0, 0, 3, 4, 6, 6], melody: '10.8 12.8|11.4 10.4 9.8|7.2 9.2 10.4 12.4 14.4|13.8 11.8|10.8 12.8|14.4 13.4 12.8|11.2 12.2 13.2 14.2 15.4 14.4|14.16', riff: '0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2|0.2 -.1 0.1 -.2 0.2 3.2 -.2 4.1 3.1 0.2'}}};
// «Piedra de lava»: slow, heavy, soulful hard rock — a half-time groove, a lazy wah-guitar riff, then a big distorted chorus with a soaring lead. G minor.
const ms_piedra:Score={title: 'Piedra de lava', bpm: 108, swing: 0, root: 196, mode: MINOR, groove: 'slowrock', lead: 'clean', leadB: 'synth', color: 'pad', riffInst: 'wah', form: ['A', 'B', 'A', 'B'], sections: {A: {chords: [0, 0, 3, 3, 0, 0, 5, 4], melody: '7.6 9.2 10.8|10.6 9.2 7.8|7.6 9.2 10.4 12.4|12.16|14.6 12.2 9.8|10.6 9.2 7.8|12.4 10.4 9.4 7.4|11.12 -.4', riff: '0.4 2.2 3.2 4.4 3.2 2.2|0.4 2.2 3.2 4.4 3.2 2.2|0.4 2.2 3.2 4.4 3.2 2.2|0.4 2.2 3.2 4.4 3.2 2.2|0.4 2.2 3.2 4.4 3.2 2.2|0.4 2.2 3.2 4.4 3.2 2.2|0.4 2.2 3.2 4.4 3.2 2.2|0.4 2.2 3.2 4.4 3.2 2.2'}, B: {chords: [5, 5, 3, 3, 0, 0, 4, 4], groove: 'grunge', melody: '14.8 12.8|14.4 15.4 14.8|12.8 10.8|12.4 13.4 12.8|14.8 16.8|17.6 16.2 14.8|15.6 13#.2 11.8|15.16', riff: '0.6 0.2 3.4 2.4|0.6 0.2 3.4 2.4|0.6 0.2 3.4 2.4|0.6 0.2 3.4 2.4|0.6 0.2 3.4 2.4|0.6 0.2 3.4 2.4|0.6 0.2 3.4 2.4|0.6 0.2 3.4 2.4'}}};
// «El elegido del cráter»: rap-metal power ballad — a clean, melodic guitar figure over a hip-hop beat, exploding into a drop-tuned chug. D minor.
const ms_elegido:Score={title: 'El elegido del cráter', bpm: 100, swing: 0, root: 146.83, mode: MINOR, groove: 'hiphop', lead: 'synth', leadB: 'brass', color: 'pad', riffInst: 'clean', form: ['A', 'B', 'A', 'B'], sections: {A: {chords: [0, 0, 3, 3, 5, 5, 4, 4], melody: '7.4 -.2 7.2 8.4 9.4|7.12 -.4|10.4 -.2 10.2 9.4 8.4|7.12 -.4|12.4 -.2 12.2 11.4 10.4|9.12 -.4|11.4 10.4 9.4 8.4|11.12 -.4', riff: '0.2 7.2 4.2 7.2 0.2 7.2 5.2 4.2|0.2 7.2 4.2 7.2 0.2 7.2 5.2 4.2|0.2 7.2 4.2 7.2 0.2 7.2 5.2 4.2|0.2 7.2 4.2 7.2 0.2 7.2 5.2 4.2|0.2 7.2 4.2 7.2 0.2 7.2 5.2 4.2|0.2 7.2 4.2 7.2 0.2 7.2 5.2 4.2|0.2 7.2 4.2 7.2 0.2 7.2 5.2 4.2|0.2 7.2 4.2 7.2 0.2 7.2 5.2 4.2'}, B: {chords: [0, 0, 3, 3, 5, 5, 6, 6], groove: 'numetal', melody: '14.4 14.4 12.4 11.4|9.8 11.8|14.4 14.4 15.4 17.4|17.16|16.4 16.4 14.4 12.4|14.8 12.8|13.4 12.4 11.4 10.4|13.12 -.4', riff: '0.2 0.1 0.1 -.2 0.2 3.2 0.1 0.1 -.2 2.2|0.2 0.1 0.1 -.2 0.2 3.2 0.1 0.1 -.2 2.2|0.2 0.1 0.1 -.2 0.2 3.2 0.1 0.1 -.2 2.2|0.2 0.1 0.1 -.2 0.2 3.2 0.1 0.1 -.2 2.2|0.2 0.1 0.1 -.2 0.2 3.2 0.1 0.1 -.2 2.2|0.2 0.1 0.1 -.2 0.2 3.2 0.1 0.1 -.2 2.2|0.2 0.1 0.1 -.2 0.2 3.2 0.1 0.1 -.2 2.2|0.2 0.1 0.1 -.2 0.2 3.2 0.1 0.1 -.2 2.2'}}};
// «Bahía estelar»: dreamy, spacey alt-rock — clean guitars through a dotted-eighth delay, airy pads, a soft groove that blooms in the chorus. D major.
const sj_estelar:Score={title: 'Bahía estelar', bpm: 84, swing: 0, root: 146.83, mode: MAJOR, groove: 'dream', lead: 'clean', color: 'pad', riffInst: 'clean', echo: true, form: ['A', 'A', 'B', 'A'], sections: {A: {chords: [0, 0, 3, 3, 5, 5, 4, 4], melody: '9.8 7.4 9.4|11.12 9.4|10.8 12.4 10.4|9.16|12.8 11.4 9.4|11.12 -.4|11.4 12.4 13.4 11.4|11.16', riff: '0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2'}, B: {chords: [3, 3, 0, 0, 5, 5, 4, 4], melody: '14.8 12.4 10.4|12.12 11.4|14.8 16.8|16.12 14.4|15.8 14.4 12.4|13.12 12.4|11.6 12.2 13.8|14.16', riff: '0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2|0.3 4.3 7.2 9.3 7.3 4.2'}}};
// «Héroe de la bahía»: a heroic 8-bit adventure march — brass fanfare lead over pulse-wave harmony, rolling march snare, galloping bass. Bb major.
const sj_heroe:Score={title: 'Héroe de la bahía', bpm: 130, swing: 0, root: 233.08, mode: MAJOR, groove: 'chipadv', lead: 'brass', leadB: 'chip', color: 'chip', form: ['A', 'A', 'B', 'A'], sections: {A: {chords: [0, 0, 3, 3, 0, 0, 4, 4], melody: '4.8 0.6 0.1 0.1|0.2 1.2 2.2 3.2 4.8|5.8 3.4 5.4|7.12 -.2 7.1 7.1|7.6 8.2 9.8|9.4 8.4 7.4 6.4|4.6 5.2 6.8|4.12 -.4'}, B: {chords: [5, 5, 3, 3, 1, 1, 4, 4], melody: '9.8 7.4 9.4|10.12 9.4|10.8 12.4 10.4|9.16|8.8 7.4 8.4|10.12 8.4|11.6 10.2 9.4 8.4|11.16'}}};

// «Tóxico de Managua» (menus): original alt-metal in a rolling triple feel with an Armenian-flavoured phrygian-dominant
// colour — a mysterious clean-guitar arpeggio verse that explodes into a drop-tuned chug, snare rolls and crashes. D.
const menu_toxico:Score={title:'Tóxico de Managua',bpm:117,swing:0,root:146.83,mode:PHRYGDOM,groove:'soadverse',lead:'synth',leadB:'brass',color:'pad',riffInst:'clean',steps:12,form:['A','B','A','B'],sections:{
 A:{chords:[0,0,5,5,1,1,0,0],melody:'7.3 8.3 9.3 8.3|7.6 4.6|10.3 9.3 8.3 9.3|7.9 -.3|8.2 9.1 10.3 9.2 8.1 9.3|8.6 7.6|7.3 8.3 9.3 11.3|11.9 -.3',riff:'0.1 4.1 7.1 8.1 7.1 4.1 0.1 4.1 7.1 9.1 7.1 4.1|0.1 4.1 7.1 8.1 7.1 4.1 0.1 4.1 7.1 9.1 7.1 4.1|0.1 4.1 7.1 8.1 7.1 4.1 0.1 4.1 7.1 9.1 7.1 4.1|0.1 4.1 7.1 8.1 7.1 4.1 0.1 4.1 7.1 9.1 7.1 4.1|0.1 4.1 7.1 8.1 7.1 4.1 0.1 4.1 7.1 9.1 7.1 4.1|0.1 4.1 7.1 8.1 7.1 4.1 0.1 4.1 7.1 9.1 7.1 4.1|0.1 4.1 7.1 8.1 7.1 4.1 0.1 4.1 7.1 9.1 7.1 4.1|0.1 4.1 7.1 8.1 7.1 4.1 0.1 4.1 7.1 9.1 7.1 4.1'},
 B:{chords:[0,0,1,1,5,5,6,0],groove:'soadheavy',melody:'14.3 14.3 13.3 14.3|15.6 14.6|15.3 15.3 14.3 12.3|11.12|14.3 14.3 13.3 12.3|13.6 12.6|13.3 12.3 11.3 9.3|7.12',riff:'0.1 0.1 1.1 0.1 3.1 2.1 0.1 0.1 1.1 0.1 4.2|0.1 0.1 1.1 0.1 3.1 2.1 0.1 0.1 1.1 0.1 4.2|0.1 0.1 1.1 0.1 3.1 2.1 0.1 0.1 1.1 0.1 4.2|0.1 0.1 1.1 0.1 3.1 2.1 0.1 0.1 1.1 0.1 4.2|0.1 0.1 1.1 0.1 3.1 2.1 0.1 0.1 1.1 0.1 4.2|0.1 0.1 1.1 0.1 3.1 2.1 0.1 0.1 1.1 0.1 4.2|0.1 0.1 1.1 0.1 3.1 2.1 0.1 0.1 1.1 0.1 4.2|0.1 0.1 1.1 0.1 3.1 2.1 0.1 0.1 1.1 0.1 4.2'}}};

// «Pandilla al rescate» (menus): an original, bright adventure fanfare — brass calling in rising fourths and fifths
// over a galloping march, answered by a singing string theme. Heroic overworld spirit, its own melody. C major.
const menu_aventura:Score={title:'Pandilla al rescate',bpm:132,swing:0,root:261.63,mode:MAJOR,groove:'chipadv',lead:'brass',leadB:'strings',color:'strings',form:['A','A','B','A'],sections:{
 A:{chords:[0,0,3,4,0,5,3,4],melody:'4.4 7.6 4.2 7.2 8.2|9.8 8.2 7.2 5.4|5.4 7.4 10.6 9.2|8.6 6.2 8.4 -.4|4.4 7.6 4.2 7.2 9.2|11.8 10.2 9.2 7.4|10.3 9.3 7.2 8.3 7.3 5.2|8.4 8.2 8.2 11.8'},
 B:{chords:[3,0,3,4,5,2,3,4],melody:'12.6 10.2 7.4 10.4|11.6 9.2 7.8|12.4 10.4 12.4 14.4|13.8 11.4 8.4|12.6 11.2 9.4 7.4|11.6 9.2 6.8|10.2 9.2 7.2 5.2 7.2 9.2 10.2 12.2|11.4 11.2 11.2 15.8'}}};

/** Every world rotates through its songs, one per race. */
export const PLAYLISTS:Record<string,Score[]>={
 'la-salle':[ls_8bit,ls_conciencia,ls_liverpool],
 'oriental':[or_son,or_closet,or_rollin],
 'managua':[mg_primavera,mg_crawl,menu_toxico],
 'hipa-hipa':[hp_romance,hp_azulado,hp_scratch],
 'masaya':[ms_piedra,ms_elegido],
 'san-juan':[sj_estelar,sj_heroe],
 menu:[menu_aventura]
};
/** The first song of each world (kept for callers that only need one). */
export const SCORES:Record<string,Score>=Object.fromEntries(Object.entries(PLAYLISTS).map(([id,list])=>[id,list[0]]));

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
 const steps=score.steps??16,barIndex=Math.floor(beat/steps),s16=beat%steps,form=score.form,sectionName=form[Math.floor(barIndex/8)%form.length],section=score.sections[sectionName],bar=barIndex%8;
 const groove=section.groove??score.groove,lead=sectionName==='B'?score.leadB??score.lead:score.lead;
 const transpose=st.level>=2?2:0,chord=section.chords[bar],f=(d:number,sharp=false)=>degreeFreq(score,d,sharp,transpose);
 const n=(inst:Inst,freq:number,len:number,vol:number,pan=0,offset=0)=>notes.push({inst,freq,len,vol,pan,offset});
 // Dotted-eighth delay: two quieter repeats, bouncing between the sides.
 const echo=(inst:Inst,freq:number,len:number,vol:number,pan:number)=>{n(inst,freq,len,vol,pan);if(score.echo){n(inst,freq,Math.min(len,3),vol*.38,-pan-.3,3);n(inst,freq,Math.min(len,3),vol*.16,pan+.3,6);}};
 const d=(drum:Drum,vol:number,pan=0)=>drums.push({drum,vol,pan,offset:0});
 const calm=st.level<1,last=st.level>=2,downbeat=s16===0,chip=groove==='chipplat'||groove==='chipadv';
 const heavy=groove==='numetal'||groove==='grunge'||groove==='soadheavy';
 // ——— Lead melody (and its final-lap octave double). The reprise of A answers an octave up.
 const occurrence=Math.floor(barIndex/8)%form.length,reprise=sectionName==='A'&&occurrence===form.lastIndexOf('A')&&occurrence!==form.indexOf('A')&&!calm;
 if(!calm||bar%2===0){
  for(const note of parseMelody(section.melody)[bar]??[])if(note.start===s16){
   const high=f(note.degree+7,note.sharp),freq=reprise&&high<1400?high:f(note.degree,note.sharp);
   const len=note.len*.9,vol=(calm?.05:.085-st.tension*.02)*(heavy?1.1:1);
   echo(lead,freq,len,vol,.1);
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
   const vol=riffInst==='dist'?(calm?.05:.075):riffInst==='bass'?(calm?.12:.17):riffInst==='wah'?(calm?.05:.07):calm?.04:.06;
   echo(riffInst,freq,note.len*(riffInst==='dist'&&note.len<2?.7:.9),vol,riffInst==='dist'?-.35:-.2);
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
  // Son nica: guitar strums on the dotted quarters, marimba de arco ostinato in hemiola on every eighth.
  case 'sonnica':{if(s16%3===0)triad.forEach((t,i)=>n('nylon',f(t+7),2,calm?.025:.033,(i-1)*.3));if(!calm&&(s16===5||s16===11))triad.forEach((t,i)=>n('nylon',f(t+7),1,.014,(i-1)*.3));
   if(!calm||s16%2===0)n('marimba',f(chord+[0,2,4,7,4,2,7,4,2,4,7,9][s16]),1,calm?.03:.04,-.25);break;}
  // Jazz: Rhodes sevenths on a Charleston rhythm.
  case 'jazz':{const seventh=[...triad,chord+6];if(s16===0||s16===(bar%2?10:6))seventh.forEach((t,i)=>n('rhodes',f(t+7),s16?3:5,calm?.022:.03,(i-1.5)*.25));break;}
  case 'lounge':{const seventh=[...triad,chord+6];if(s16===0||(!calm&&s16===10))seventh.forEach((t,i)=>n('rhodes',f(t+7),s16?4:6,calm?.022:.028,(i-1.5)*.25));break;}
  case 'dream':if(downbeat&&bar%2===0)triad.forEach((t,i)=>n('pad',f(t+7),32,calm?.024:.03,(i-1)*.45));break;
  case 'nurock':if(downbeat&&bar%2===0)[chord,chord+4].forEach((t,i)=>n('strings',f(t+7),32,.02,(i-.5)*.6));break;
  case 'slowrock':if(downbeat&&bar%2===0)triad.forEach((t,i)=>n('pad',f(t+7),32,.018,(i-1)*.4));break;
  case 'soadverse':case 'soadheavy':if(downbeat)[chord,chord+4].forEach((t,i)=>n('strings',f(t+7),12,groove==='soadheavy'?.022:.016,(i-.5)*.6));break;
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
  case 'hiphop':if(score.riffInst==='bass'&&section.riff)break;if(s16===0)n('sub',root,7,calm?.16:.22);if(s16===10)n('sub',root,4,calm?.12:.18);if(!calm&&s16===14&&bar%2===1)n('sub',fifth,2,.14);break;
  case 'newwave':if(s16%2===0)n('bass',s16===14?oct:root,1.6,bassVol*(s16%4===0?1:.8));break;
  // Funk: the riff above is the slap bass; when calm a simple root on the one.
  case 'funkrock':if(!section.riff&&s16===0)n('bass',root,4,bassVol);break;
  case 'chipplat':if(s16%4===0)n('chip',[root,fifth,oct,fifth][s16/4],1.6,calm?.05:.07,.1);break;
  case 'chipadv':if(s16%2===0)n('chip',s16%8===6?fifth:root,1.4,calm?.05:.065,.1);break;
  case 'sonnica':if(s16===0)n('upright',root,3,bassVol);if(s16===6)n('upright',fifth,3,bassVol*.9);if(!calm&&s16===9)n('upright',oct,2,bassVol*.6);break;
  case 'jazz':{if(s16%4===0){const next=section.chords[(bar+1)%8];n('upright',s16===12?f(next-8,true):[root,f(chord-5),fifth][s16/4],3.6,bassVol);}break;}
  case 'lounge':if(s16===0)n('upright',root,5,bassVol);if(s16===6)n('upright',fifth,2,bassVol*.8);if(s16===10)n('upright',oct,3,bassVol*.75);if(!calm&&s16===14)n('upright',f(chord-6),2,bassVol*.7);break;
  case 'dream':if(s16===0)n('bass',root,7,bassVol*.9);if(s16===8)n('bass',bar%2?fifth:root,6,bassVol*.8);break;
  case 'nurock':if(s16%2===0)n('bass',s16===14?oct:root,1.6,bassVol*(s16%4===0?1:.75));break;
  case 'soadverse':if(s16===0)n('bass',root,5,bassVol*.9);if(s16===6)n('bass',bar%2?fifth:root,5,bassVol*.8);break;
  case 'slowrock':if(s16===0)n('bass',root,6,bassVol);if(s16===6)n('bass',root,2,bassVol*.8);if(s16===10)n('bass',f(chord-5),4,bassVol*.85);break;
 }
 // ——— Colour layer: marimba ostinato (or plucked arps on the final lap) on eighths.
 if(!calm&&s16%2===0&&(score.color==='marimba'||last)&&!chip&&groove!=='newwave'&&groove!=='sonnica'&&steps===16){
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
  case 'sonnica':
   if(s16===0)d('kick',calm?.16:.24);if(s16===6)d('kick',calm?.1:.16);if(!calm&&(s16===3||s16===9))d('tamb',.06);if(!calm||s16%3===0)d('shaker',.02+(s16%3===0?.015:0));
   if(!calm&&bar%4===3&&s16>=8)d(s16%2?'tom':'lowtom',.1+(s16-8)*.015,(s16-9.5)*.15);break;
  case 'jazz':
   if(s16%4===0||s16===6||s16===14)d('ride',calm?.04:.06);if(s16===4||s16===12)d('hat',calm?.03:.045);if(!calm)d('brush',s16%4===0?.035:.018);if(!calm&&s16===0&&bar%2===0)d('kick',.1);
   if(!calm&&bar===7&&(s16===10||s16===14))d('snare',.07);break;
  case 'lounge':
   if(s16===0||s16===9)d('kick',calm?.14:.22);if(s16===4||s16===12){d('rim',calm?.06:.08);if(!calm)d('brush',.05);}if(s16%2===0)d('hat',hats*.75);
   if(!calm&&bar%4===3&&(s16===12||s16===14))d('scratch',.07,s16===12?-.35:.35);break;
  case 'dream':
   if(s16===0||(sectionName==='B'&&s16===10))d('kick',calm?.12:.2);if(s16===4||s16===12)d(sectionName==='B'&&!calm?'snare':'rim',sectionName==='B'?.13:.06);if(s16%2===0)d('ride',calm?.025:.04);
   if(!calm&&downbeat&&bar%4===0&&sectionName==='B')d('crash',.05);break;
  case 'nurock':
   if(s16===0||s16===7||s16===10)d('kick',calm?.16:.26);if(s16===4||s16===12){d('snare',calm?.09:.15);if(!calm)d('clap',.06);}d('hat',s16%2?hats*.5:hats);
   if(!calm&&bar%4===3&&(s16===13||s16===14))d('scratch',.08,s16===13?-.4:.4);break;
  // Triple-feel alt-metal: a tight verse groove, then double kicks, crashes and a snare-and-tom roll into every fourth bar.
  case 'soadverse':
   if(s16===0||s16===7)d('kick',calm?.14:.22);if(s16===3||s16===9)d(calm?'rim':'snare',calm?.06:.12);if(s16%2===0)d('hat',hats*.9);if(!calm&&bar%4===3&&s16>=8)d('snare',.05+(s16-8)*.03);break;
  case 'soadheavy':
   if(s16===0||s16===1||s16===6||s16===7||(!calm&&s16===10))d('kick',calm?.18:.3);if(s16===3||s16===9)d('snare',calm?.12:.21);if(s16%2===0)d(calm?'hat':'openhat',calm?hats:.035);
   if(downbeat&&bar%2===0)d('crash',.08);if(!calm&&bar%4===3&&s16>=6)d(s16<9?'tom':'lowtom',.13+(s16-6)*.015,s16<9?-.3:.3);break;
  case 'slowrock':
   if(s16===0||s16===3||(!calm&&s16===11))d('kick',calm?.18:.28);if(s16===8)d('snare',calm?.12:.2);if(s16%2===0)d('hat',hats*.9);if(!calm&&downbeat&&bar%4===0)d('crash',.06);
   if(!calm&&bar%4===3&&s16>=12)d('tom',.12+(s16-12)*.02,(s16-13.5)*.2);break;
 }
 // Faster = busier: from 3/4 of top speed every groove gets a sixteenth shaker.
 if(!calm&&st.speed>.75&&s16%2===1&&!['disco','funkrock','jazz','lounge','dream','sonnica','slowrock','soadverse'].includes(groove)&&!heavy)d('shaker',.025);
 if(last&&downbeat&&bar%4===0)d(heavy||groove==='newwave'?'crash':'openhat',.07);
 return{notes,drums,bar,section:sectionName};
}
