interface Voice { source: AudioScheduledSourceNode; nodes: AudioNode[]; released: boolean; music: boolean; }
const bounded = (value:number,min:number,max:number,fallback=min) => Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
const read = (key:string,fallback:string) => {try{return localStorage.getItem(key)??fallback;}catch{return fallback;}};
export const audioSettings = {
 get muted(){return read('morly-muted','no')==='yes';},
 get music(){return bounded(Number(read('morly-music','.55')),0,1,.55);},
 get sfx(){return bounded(Number(read('morly-sfx','.9')),0,1,.9);},
 set(key:'morly-music'|'morly-sfx'|'morly-muted',value:string){try{localStorage.setItem(key,value);window.dispatchEvent(new StorageEvent('storage',{key,newValue:value}));}catch{/* private mode */}},
};

/** Engine character per car: tanks growl low, light hatchbacks buzz high. */
const ENGINES:Record<string,{base:number;range:number;filter:number;wave:OscillatorType;gears:number}> = {
 'white-empanade':{base:30,range:40,filter:150,wave:'sawtooth',gears:4},
 'la-raulina':{base:34,range:44,filter:170,wave:'sawtooth',gears:4},
 'silver-surfer':{base:44,range:52,filter:230,wave:'sawtooth',gears:5},
 'hola-willy':{base:48,range:56,filter:250,wave:'sawtooth',gears:5},
 'orange-seed':{base:56,range:66,filter:300,wave:'square',gears:5},
 'black-diamond':{base:64,range:78,filter:340,wave:'square',gears:5},
};
/** Original, short loops per world: tempo, scale (Hz), bass line and lead pattern. */
const SONGS:Record<string,{bpm:number;scale:number[];bass:number[];lead:number[];swing:number}> = {
 'la-salle':{bpm:132,scale:[262,294,330,392,440,523,587,659],bass:[0,0,3,3,4,4,3,1],lead:[4,6,5,4,2,4,3,1,4,6,7,6,5,3,4,-1],swing:0},
 oriental:{bpm:140,scale:[220,247,262,294,330,349,392,440],bass:[0,0,4,4,5,5,4,3],lead:[0,2,4,5,4,2,0,-1,5,4,2,4,5,7,5,-1],swing:.08},
 managua:{bpm:124,scale:[196,220,247,294,330,392,440,494],bass:[0,0,5,5,3,3,4,4],lead:[4,5,4,2,1,2,4,-1,5,6,5,4,2,1,0,-1],swing:0},
 'hipa-hipa':{bpm:128,scale:[174,196,220,262,294,349,392,440],bass:[0,0,0,0,5,5,3,4],lead:[7,-1,5,-1,7,6,5,4,3,-1,4,5,4,3,1,-1],swing:0},
 masaya:{bpm:118,scale:[147,165,175,196,220,233,262,294],bass:[0,0,2,2,5,5,4,4],lead:[4,3,2,-1,4,5,6,5,4,-1,2,3,4,2,0,-1],swing:0},
 'san-juan':{bpm:116,scale:[247,277,311,330,370,415,440,494],bass:[0,0,3,3,4,4,0,0],lead:[2,4,5,4,2,-1,4,5,7,5,4,-1,2,1,0,-1],swing:.12},
};

/** Original arcade soundtrack and material sounds, synthesized on device. No files, no licences. */
export class GameAudio {
 context:AudioContext|null=null;
 muted=audioSettings.muted;
 private master:GainNode|null=null;private musicBus:GainNode|null=null;private sfxBus:GainNode|null=null;
 private engineA:OscillatorNode|null=null;private engineB:OscillatorNode|null=null;private engineGain:GainNode|null=null;private engineFilter:BiquadFilterNode|null=null;
 private skidGain:GainNode|null=null;private skidFilter:BiquadFilterNode|null=null;private rumbleGain:GainNode|null=null;
 private compressor:DynamicsCompressorNode|null=null;
 private voices=new Set<Voice>();
 private noiseBuffer:AudioBuffer|null=null;
 private scheduler:ReturnType<typeof setInterval>|undefined;private nextBeat=0;private beat=0;private song=SONGS['la-salle'];private intensity=0;
 private disposed=false;
 private unlock=()=>{if(this.context?.state==='suspended')this.context.resume().catch(()=>{});};
 private storage=(event:StorageEvent)=>{if(event.key==='morly-muted')this.muted=event.newValue==='yes';this.applyLevels();};
 private visibility=()=>this.applyLevels();
 constructor(private trackId='la-salle'){this.song=SONGS[trackId]??SONGS['la-salle'];}

 start(){
  if(this.disposed)return;
  if(this.context){this.unlock();return;}
  const C=window.AudioContext??(window as unknown as {webkitAudioContext:typeof AudioContext}).webkitAudioContext;
  if(!C)return;
  try{this.context=new C();}catch{return;}
  const c=this.context;
  this.master=c.createGain();this.musicBus=c.createGain();this.sfxBus=c.createGain();
  this.compressor=c.createDynamicsCompressor();
  this.compressor.threshold.value=-14;this.compressor.knee.value=10;this.compressor.ratio.value=4;this.compressor.attack.value=.004;this.compressor.release.value=.14;
  this.musicBus.connect(this.master);this.sfxBus.connect(this.master);this.master.connect(this.compressor);this.compressor.connect(c.destination);
  this.noiseBuffer=c.createBuffer(1,c.sampleRate,c.sampleRate);
  const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  // Engine: two detuned oscillators through a low-pass, pitch follows simulated gears.
  this.engineA=c.createOscillator();this.engineB=c.createOscillator();this.engineB.type='square';
  this.engineGain=c.createGain();this.engineGain.gain.value=0;
  this.engineFilter=c.createBiquadFilter();this.engineFilter.type='lowpass';this.engineFilter.frequency.value=240;this.engineFilter.Q.value=1.2;
  const sub=c.createGain();sub.gain.value=.45;
  this.engineA.connect(this.engineFilter);this.engineB.connect(sub);sub.connect(this.engineFilter);this.engineFilter.connect(this.engineGain);this.engineGain.connect(this.sfxBus);
  this.engineA.start();this.engineB.start();
  // Looping skid (drift) and rumble (dirt) beds.
  const loop=(filterType:BiquadFilterType,frequency:number)=>{const source=c.createBufferSource();source.buffer=this.noiseBuffer;source.loop=true;const f=c.createBiquadFilter();f.type=filterType;f.frequency.value=frequency;f.Q.value=2;const g=c.createGain();g.gain.value=0;source.connect(f);f.connect(g);g.connect(this.sfxBus!);source.start();return{g,f,source};};
  const skid=loop('bandpass',1900);this.skidGain=skid.g;this.skidFilter=skid.f;
  const rumble=loop('lowpass',180);this.rumbleGain=rumble.g;
  this.loops=[this.engineA,this.engineB,skid.source,rumble.source];
  window.addEventListener('pointerdown',this.unlock,{passive:true});window.addEventListener('keydown',this.unlock);window.addEventListener('storage',this.storage);document.addEventListener('visibilitychange',this.visibility);
  this.unlock();this.applyLevels();
  this.nextBeat=c.currentTime+.1;this.scheduler=setInterval(()=>this.schedule(),60);
 }
 private loops:AudioScheduledSourceNode[]=[];

 private track(source:AudioScheduledSourceNode,nodes:AudioNode[],music=false){
  const voice:Voice={source,nodes,released:false,music};this.voices.add(voice);
  const release=()=>{if(voice.released)return;voice.released=true;this.voices.delete(voice);for(const node of nodes)node.disconnect();source.onended=null;};
  source.onended=release;return release;
 }
 private count(music:boolean){let n=0;for(const v of this.voices)if(v.music===music)n++;return n;}
 private canPlay(music=false){return !this.disposed&&!this.muted&&this.context?.state==='running'&&this.master!==null&&this.count(music)<(music?10:16);}

 tone(freq:number,duration=.1,type:OscillatorType='sine',delay=0,pan=0,volume=.4,endFrequency?:number,music=false,at?:number){
  if(!this.canPlay(music))return;
  const c=this.context!,t=at??c.currentTime+bounded(delay,0,1.2),length=bounded(duration,.02,1.2),o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner();
  o.type=type;o.frequency.setValueAtTime(bounded(freq,20,12000,220),t);
  if(endFrequency!==undefined)o.frequency.exponentialRampToValueAtTime(bounded(endFrequency,20,12000,220),t+length);
  p.pan.value=bounded(pan,-1,1,0);
  g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(bounded(volume,.001,.65,.1),t+.006);g.gain.exponentialRampToValueAtTime(.001,t+length);
  o.connect(g);g.connect(p);p.connect(music?this.musicBus!:this.sfxBus!);this.track(o,[o,g,p],music);o.start(t);o.stop(t+length+.01);
 }
 private noise(duration:number,filter:BiquadFilterType,frequency:number,pan:number,volume:number,delay=0,endFrequency?:number,music=false,at?:number){
  if(!this.canPlay(music)||!this.noiseBuffer)return;
  const c=this.context!,t=at??c.currentTime+bounded(delay,0,1.2),length=bounded(duration,.02,.8),source=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),p=c.createStereoPanner();
  source.buffer=this.noiseBuffer;f.type=filter;f.frequency.setValueAtTime(bounded(frequency,40,12000,800),t);f.Q.value=filter==='bandpass'?1.3:.7;
  if(endFrequency!==undefined)f.frequency.exponentialRampToValueAtTime(bounded(endFrequency,40,12000,800),t+length);
  p.pan.value=bounded(pan,-1,1,0);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(bounded(volume,.001,.65,.1),t+.008);g.gain.exponentialRampToValueAtTime(.001,t+length);
  source.connect(f);f.connect(g);g.connect(p);p.connect(music?this.musicBus!:this.sfxBus!);this.track(source,[source,f,g,p],music);source.start(t,Math.random()*(.99-length));source.stop(t+length+.01);
 }

 /** Look-ahead scheduler: sixteenth notes placed on the audio clock, steady even if frames drop. */
 private schedule(){
  if(!this.context||document.hidden)return;const c=this.context,step=60/(this.song.bpm*(1+this.intensity*.06))/4;
  if(this.nextBeat<c.currentTime-.2)this.nextBeat=c.currentTime+.05;
  while(this.nextBeat<c.currentTime+.18){this.musicStep(this.beat++,this.nextBeat);this.nextBeat+=step*(this.beat%2?1+this.song.swing:1-this.song.swing);}
 }
 private musicStep(beat:number,at:number){
  if(!this.canPlay(true))return;const s=this.song,bar=Math.floor(beat/16)%8,sixteenth=beat%16,root=s.scale[s.bass[bar]]/2;
  if(sixteenth%4===0)this.tone(70,.12,'sine',0,0,.32,34,true,at);
  if(sixteenth%8===4)this.noise(.11,'bandpass',1500,0,.16,0,undefined,true,at);
  if(sixteenth%2===1)this.noise(.03,'highpass',7000,.15,.06,0,undefined,true,at);
  if(sixteenth%4===2||sixteenth%4===0)this.tone(root/2,.14,'triangle',0,-.05,.2,undefined,true,at);
  const note=s.lead[(Math.floor(beat/2))%16];
  if(beat%2===0&&note>=0&&(this.intensity>0||beat%4===0))this.tone(s.scale[note]*(this.intensity>.5?2:1),.12,'square',0,.12,.05,undefined,true,at);
  if(sixteenth===0&&bar%2===0)this.tone(s.scale[(s.bass[bar]+2)%8],.4,'triangle',0,-.2,.05,undefined,true,at);
 }
 setTrack(id:string){this.song=SONGS[id]??this.song;}
 /** 0 calm (countdown/menus), 1 racing, 2 final lap. */
 setIntensity(level:number){this.intensity=bounded(level,0,2,0)/2;}

 private launch(object:string,pan:number,volume=.22){
  if(['victoria','tona','rum','flor','sixpack'].includes(object)){
   this.noise(.1,'bandpass',1400,pan,volume*.38,0,4200);this.tone(1700,.1,'sine',.012,pan,volume*.38,1000);this.tone(2400,.085,'sine',.02,pan,volume*.2,1800);
  }else if(['coin','diamond','ashtray'].includes(object)){
   this.tone(object==='diamond'?2200:1450,.13,'sine',0,pan,volume*.7,1100);this.tone(2600,.085,'triangle',.025,pan,volume*.25);
  }else if(object==='basketball'){
   this.tone(245,.2,'sine',0,pan,volume,76);this.noise(.065,'lowpass',350,pan,volume*.3);
  }else if(['leaf','bill','cigarettes','brush','pencil','eraser'].includes(object)){
   this.noise(.15,'bandpass',object==='brush'?1700:2800,pan,volume*.7,0,600);if(object==='pencil')this.tone(450,.09,'triangle',0,pan,volume*.3,900);
  }else if(['frog','onion','cucumber'].includes(object)){
   this.tone(object==='frog'?400:290,.14,'sine',0,pan,volume,85);if(object==='frog')this.tone(175,.075,'triangle',.055,pan,volume*.4,130);
  }else if(object==='ice'){
   this.noise(.12,'highpass',2600,pan,volume*.6);this.tone(2600,.075,'sine',.01,pan,volume*.25,2100);
  }else{this.noise(.11,'bandpass',1200,pan,volume*.6,0,400);this.tone(170,.1,'triangle',0,pan,volume*.35,90);}
 }
 /** Material signature on impact: glass, coins, ball, ice, leaves, frogs, onions, milk… */
 private impact(object:string,pan:number,volume=.3){
  if(['victoria','tona','rum','flor','sixpack'].includes(object)){this.noise(.18,'highpass',3200,pan,volume*.8);[2600,3400,4100].forEach((f,i)=>this.tone(f,.08,'sine',i*.03,pan,volume*.25,f*.7));}
  else if(object==='coin'||object==='bill'){[1800,2400,2100,2900].forEach((f,i)=>this.tone(f,.07,'triangle',i*.045,pan,volume*.3));}
  else if(object==='diamond'){this.tone(3200,.25,'sine',0,pan,volume*.35,2400);this.tone(4100,.2,'sine',.05,pan,volume*.2);}
  else if(object==='basketball'){[0,.17,.29].forEach((d,i)=>this.tone(170-i*20,.1,'sine',d,pan,volume*(1-i*.3),60));}
  else if(object==='ice'||object==='ashtray'){this.noise(.16,'bandpass',4200,pan,volume*.6,0,1800);this.tone(object==='ashtray'?900:2100,.1,'triangle',.01,pan,volume*.3,600);}
  else if(object==='leaf'||object==='smoke'||object==='talc'||object==='cigarettes'){this.noise(.3,'bandpass',2500,pan,volume*.5,0,700);}
  else if(object==='frog'){this.tone(180,.09,'square',0,pan,volume*.4,120);this.tone(150,.09,'square',.11,pan,volume*.35,95);}
  else if(object==='onion'||object==='cucumber'||object==='pizza'){this.tone(120,.14,'sine',0,pan,volume*.7,55);this.noise(.08,'lowpass',500,pan,volume*.4);}
  else if(object==='milk'){this.noise(.4,'lowpass',1600,pan,volume*.7,0,300);this.tone(300,.2,'sine',.05,pan,volume*.2,120);}
  else if(object==='console'){this.noise(.12,'bandpass',800,pan,volume*.6);[440,330,220].forEach((f,i)=>this.tone(f,.08,'square',.05+i*.06,pan,volume*.18));}
  else if(object==='slipper'){this.noise(.08,'highpass',1800,pan,volume*.7);this.tone(1200,.18,'sawtooth',.02,pan,volume*.2,300);}
  else if(object==='brush'||object==='backpack'){this.noise(.2,'bandpass',1200,pan,volume*.6,0,3000);}
  else{this.tone(160,.22,'sawtooth',0,pan,volume*.5,58);this.noise(.14,'bandpass',900,pan,volume*.6);}
 }
 private special(object:string,pan:number){
  // Shared «stinger» so every special is recognisable, then its own signature.
  this.tone(110,.5,'sawtooth',0,pan,.18,440);this.noise(.35,'highpass',2000,pan,.12,0,8000);
  if(object==='slipper'){this.tone(180,.3,'sawtooth',.03,pan,.14,1400);this.noise(.18,'bandpass',2200,pan,.25,.12,4500);[880,1320,880].forEach((f,i)=>this.tone(f,.06,'square',.22+i*.05,pan,.1));}
  else if(object==='sixpack'){this.launch(object,pan,.32);[330,440,660].forEach((f,i)=>this.tone(f,.13,'triangle',.09+i*.055,pan,.16));}
  else if(object==='console'){[185,277,370,554].forEach((f,i)=>this.tone(f,.14,'square',i*.07,pan,.11));}
  else if(object==='milk'){this.noise(.48,'lowpass',1400,pan,.36,.03,230);this.tone(95,.27,'sine',.025,pan,.25,35);this.noise(.2,'bandpass',750,pan,.18,.15,1500);}
  else if(object==='smoke'||object==='talc'){this.noise(.52,'lowpass',2300,pan,.32,.02,250);this.noise(.26,'bandpass',950,pan,.15,.15,300);this.tone(60,.5,'sine',.05,pan,.3,30);}
  else if(object==='backpack'){this.noise(.28,'bandpass',2200,pan,.23,.04,600);this.tone(660,.14,'sine',.2,pan,.16);this.tone(880,.18,'sine',.32,pan,.16);}
  else if(object==='claudia'){[262,330,392,523].forEach((f,i)=>this.tone(f,.17,'triangle',i*.07,pan,.16));this.launch('onion',pan,.28);}
  else if(object==='pizza'){this.tone(500,.36,'triangle',0,pan,.2,95);this.noise(.17,'lowpass',550,pan,.2,.12);}
  else{[220,330,440,660].forEach((f,i)=>this.tone(f,.16,'triangle',i*.055,pan,.15));}
 }

 effect(kind:string,pan=0,object?:string,intensity=1,own=false){
  if(!this.canPlay())return;
  const force=bounded(intensity,0,3,1);
  if(kind==='pickup'){this.tone(660,.09,'sine',0,pan,.22);this.tone(990,.12,'sine',.06,pan,.22);this.tone(1320,.14,'sine',.12,pan,.16);}
  else if(kind==='collision'){
   if(object==='curb'){this.noise(.1,'lowpass',500,pan,.18);return;}
   const f=Math.min(1,force);this.tone(75+f*30,.12+f*.09,'sine',0,pan,.2+f*.29,30);this.noise(.07+f*.08,'bandpass',420+f*900,pan,.14+f*.24);this.tone(190,.055,'triangle',.012,pan,.09+f*.1,95);
  }else if(kind==='land'){this.tone(83,.16,'sine',0,pan,.2+force*.2,35);this.noise(.085,'lowpass',600,pan,.14+force*.1);}
  else if(kind==='hit'){this.impact(object??'',pan,own?.34:.26);if(own)this.tone(1320,.08,'square',.05,0,.09);}
  else if(kind==='special')this.special(object??'',pan);
  else if(kind==='attack')this.launch(object??'',pan);
  else if(kind==='boost'){if(force<1)return;if(force>=4){this.noise(.6,'bandpass',300,pan,.32,0,6500);this.tone(180,.5,'sawtooth',0,pan,.12,1100);this.tone(360,.4,'square',.05,pan,.06,1500);return;}const strong=force>=3;this.noise(strong?.45:.3,'bandpass',350,pan,strong?.3:.22,0,strong?5000:3500);this.tone(strong?200:240,.28,'sawtooth',0,pan,.1,strong?900:700);}
  else if(kind==='draft'){this.noise(.4,'bandpass',600,pan,.16,0,2400);}
  else if(kind==='drift'){this.tone(140,.06,'square',0,pan,.08,200);}
  else if(kind==='count'){this.tone(force>=1?1047:523,force>=1?.5:.16,'square',0,0,.16);}
  else if(kind==='lap'){[523,659,784,1047].forEach((f,i)=>this.tone(f,.12,'square',i*.08,0,.12));}
  else if(kind==='finish'){[392,523,659,784,1047].forEach((f,i)=>this.tone(f,.22,'triangle',i*.1,pan,.2));}
  else if(kind==='warn'){if(object==='bong'){[0,.16,.32].forEach((d,i)=>{this.tone(660,.1,'square',d,0,.13);this.tone(990,.1,'square',d+.08,0,.11);});this.bubbles(0,.25);}else{this.tone(880,.08,'square',0,pan,.1);this.tone(880,.08,'square',.12,pan,.1);}}
  else if(kind==='fall'){
   if(object==='water'){this.noise(.5,'lowpass',1600,pan,.32,0,300);this.bubbles(pan,.3);}
   else if(object==='lava'){this.noise(.6,'highpass',2200,pan,.22,0,800);this.tone(70,.5,'sawtooth',0,pan,.16,35);this.noise(.4,'bandpass',600,pan,.2,.15,200);}
   else if(object==='mud'){this.noise(.3,'lowpass',500,pan,.3);this.tone(120,.2,'sine',.05,pan,.2,60);}
   else{this.tone(900,.7,'triangle',0,pan,.12,120);}
  }
  else if(kind==='respawn'){[523,784,1047].forEach((f,i)=>this.tone(f,.12,'triangle',i*.07,0,.12));this.noise(.25,'highpass',3000,0,.08);}
  else if(kind==='item'){
   if(object==='cafe'||object==='cafe3'){this.noise(.2,'bandpass',900,pan,.18,0,2400);this.tone(300,.4,'sawtooth',.08,pan,.12,1200);}
   else if(object==='casco'){[1200,1800].forEach((f,i)=>this.tone(f,.18,'triangle',i*.05,pan,.15,f*.8));}
   else if(object==='coco'){this.tone(220,.15,'sine',0,pan,.25,90);this.tone(330,.1,'triangle',.05,pan,.12);}
   else if(object==='chilero'){this.tone(500,.06,'square',0,pan,.12,900);this.noise(.2,'lowpass',900,pan,.2,.05);}
   else if(object==='cohetes'){[0,.1,.2].forEach(d=>{this.noise(.35,'bandpass',2600,pan,.14,d,7000);});}
   else if(object==='bong'){this.bubbles(pan,.32);this.tone(400,.6,'sine',.2,pan,.14,1600);}
   else{[880,1175,1568].forEach((f,i)=>this.tone(f,.06,'square',i*.05,pan,.09));}
  }
  else if(kind==='shield'){this.tone(1500,.2,'triangle',0,pan,.2,900);this.noise(.12,'highpass',4000,pan,.15);}
  else if(kind==='flash'){[0,.12,.26].forEach((d,i)=>{this.noise(.08,'highpass',6000,pan,.2,d);this.tone(140-i*20,.25,'sine',d,pan,.22,40);});}
  else if(kind==='bong'){this.bubbles(pan,.34);this.tone(300,.8,'sine',.1,pan,.15,1400);}
  else if(kind==='birds'){
   // Zanates: metallic whistles and clacks, a few voices panned around.
   for(let i=0;i<7;i++){const p=((i*37)%20-10)/10,d=i*.13;this.tone(1700+((i*311)%900),.09,'square',d,p,.08,2600+((i*173)%800));this.noise(.03,'highpass',5200,p,.08,d+.06);}
  }
  else this.tone(260,.09,'square',0,pan,.13);
 }

 /** Glug-glug: a few short descending blips. */
 private bubbles(pan:number,volume:number){for(let i=0;i<5;i++)this.tone(260+((i*97)%140),.07,'sine',i*.07,pan,volume*.6,140);}
 update(speed:number,vehicleId='silver-surfer',drifting=false,boost=0,surface=0,driftTier=0){
  if(!this.context||!this.engineA||!this.engineB||!this.engineGain||!this.engineFilter||this.disposed)return;
  const e=ENGINES[vehicleId]??ENGINES['silver-surfer'],value=bounded(speed,0,40,0),time=this.context.currentTime,top=24;
  // Fake gearbox: rpm climbs within each gear and drops at the shift — reads as acceleration.
  const span=top/e.gears,gear=Math.min(e.gears-1,Math.floor(value/span)),rpm=Math.min(1,(value-gear*span)/span),boosted=boost>0?1.12:1;
  const pitch=(e.base+e.range*(.35+.65*rpm)+gear*e.base*.08)*boosted;
  this.engineA.type=e.wave;this.engineA.frequency.setTargetAtTime(pitch,time,.05);this.engineB.frequency.setTargetAtTime(pitch*.502,time,.05);
  this.engineFilter.frequency.setTargetAtTime(e.filter+value*12+(boost>0?500:0),time,.06);
  this.engineGain.gain.setTargetAtTime(.05+Math.min(value/22,1)*.05,time,.08);
  this.skidGain?.gain.setTargetAtTime(drifting&&value>9?.07+driftTier*.025:0,time,.05);
  this.skidFilter?.frequency.setTargetAtTime(1500+driftTier*600+value*20,time,.08);
  this.rumbleGain?.gain.setTargetAtTime(surface>0&&value>4?.05*surface:0,time,.1);
 }
 private applyLevels(){
  if(!this.context||!this.master)return;const t=this.context.currentTime;
  this.master.gain.setTargetAtTime(this.muted||document.hidden?0:.22,t,.025);
  this.musicBus?.gain.setTargetAtTime(audioSettings.music*.55,t,.05);this.sfxBus?.gain.setTargetAtTime(audioSettings.sfx,t,.05);
 }
 refresh(){this.muted=audioSettings.muted;this.applyLevels();}
 toggle(){this.muted=!this.muted;audioSettings.set('morly-muted',this.muted?'yes':'no');this.applyLevels();if(!this.muted)this.unlock();}
 dispose(){
  if(this.disposed)return;this.disposed=true;
  window.removeEventListener('pointerdown',this.unlock);window.removeEventListener('keydown',this.unlock);window.removeEventListener('storage',this.storage);document.removeEventListener('visibilitychange',this.visibility);clearInterval(this.scheduler);this.scheduler=undefined;
  for(const voice of this.voices){try{voice.source.stop();}catch{/* already stopped */}voice.source.onended=null;for(const node of voice.nodes)node.disconnect();voice.released=true;}
  for(const loop of this.loops){try{loop.stop();}catch{/* already stopped */}loop.disconnect();}
  this.voices.clear();this.loops=[];this.engineA=this.engineB=null;this.engineGain=null;this.engineFilter=null;this.skidGain=null;this.rumbleGain=null;this.master?.disconnect();this.compressor?.disconnect();this.noiseBuffer=null;
  this.context?.close().catch(()=>{});this.context=null;this.master=null;this.compressor=null;this.musicBus=null;this.sfxBus=null;
 }
}
