import type { Point } from './types';

/*
 * Course features shared by the authoritative server, client prediction and the renderer.
 * Main-route positions are fractions of the lap; features on an alternative lane (`lane`)
 * use fractions of that lane. Everything is compiled once into metres (see compileCourse).
 *
 * Rules that keep surprises fair:
 * - Every big ramp has a super boost pad right before it and a minimum launch speed, so taking
 *   the ramp straight always clears its gap. Falls come from missing a ramp or leaving an open
 *   edge, both signposted.
 * - A fall returns you to the last safe point on the main road, never ahead of where you fell.
 */
export type GapKind='lava'|'water'|'mud'|'pit';
export interface ElevDef { from:number; to:number; height:number; ramp?:number }
export interface RampDef { at:number; len?:number; height?:number; lift:number; minSpeed?:number; big?:boolean; lane?:string; width?:number; offset?:number }
export interface PadDef { at:number; offset?:number; width?:number; len?:number; power?:number; lane?:string; super?:boolean; laps?:number[] }
export interface GapDef { from:number; to:number; kind:GapKind; lane?:string }
export interface EdgeDef { from:number; to:number; side:-1|0|1; kind:GapKind|'cliff'; lane?:string }
export interface AltDef { id:string; name:string; from:number; to:number; via:[number,number][]; width:number; rough?:boolean; laps?:number[]; lift?:number; sign?:string }
export interface RowDef { at:number; lane?:string }
export interface TreatDef { at:number; offsets:number[]; kind:'quesillo'; /** Roadside the thrower stands on (-1 left, 1 right). */ side:-1|1; lane?:string }
export interface CourseDef {
 elev?:ElevDef[]; ramps?:RampDef[]; pads?:PadDef[]; gaps?:GapDef[]; edges?:EdgeDef[]; alts?:AltDef[];
 /** Visual: road on pillars instead of an embankment. */ bridges?:[number,number][];
 /** Visual: covered section (Masaya). */ tunnels?:[number,number][];
 /** Visual: the road runs through a building (Galerías, the club). Keeps roadside dressing out. */ covered?:[number,number][];
 /** Visual: cross streets where buses cross the course (fractions of the lap). */ crossings?:number[];
 /** Treats a character drops on the road (La Salle's quesillo): a small turbo for whoever grabs one. */ treats?:TreatDef[];
 rough?:[number,number][]; charges:RowDef[]; items:RowDef[];
}

export interface Lane { id:string; name:string; points:Point[]; dist:number[]; length:number; from:number; to:number; width:number; rough:boolean; laps:number[]|null; sign:string }
export interface CRamp { lane:string; at:number; len:number; height:number; lift:number; minSpeed:number; big:boolean; width:number; offset:number }
export interface CPad { lane:string; at:number; len:number; offset:number; width:number; power:number; super:boolean; laps:number[]|null }
export interface CGap { lane:string; from:number; to:number; kind:GapKind }
export interface CEdge { lane:string; from:number; to:number; side:number; kind:string }
export interface CTreat { lane:string; at:number; offsets:number[]; kind:string; side:number }
export interface Course { ramps:CRamp[]; pads:CPad[]; gaps:CGap[]; edges:CEdge[]; bridges:[number,number][]; tunnels:[number,number][]; covered:[number,number][]; treats:CTreat[]; crossings:number[]; rough:[number,number][]; charges:{lane:string;at:number}[]; items:{lane:string;at:number}[]; elev:ElevDef[] }

export const COURSES:Record<string,CourseDef>={
 // La Salle: túmulos, la loma del norte, las canchas (se abren en la 2.ª vuelta), el gran salto sobre la zanja, la
 // cafetería (la señora tira quesillos a la calle: turbo para quien lo agarre) y el atajo por la cancha de fútbol.
 'la-salle':{
  elev:[{from:.598,to:.668,height:4.5,ramp:30},{from:.706,to:.80,height:4,ramp:26},{from:.17,to:.176,height:2.8,ramp:11},{from:.952,to:.958,height:2.8,ramp:11}],
  ramps:[{at:.152,lift:3.2,height:.35,len:3},{at:.578,lift:4.2,height:.45,len:3.5},{at:.727,len:13,height:2.2,lift:8,minSpeed:19,big:true},{at:.905,lift:3.4,height:.36,len:3},{at:.085,lift:3,height:.3,len:3,offset:4,width:6},
   {lane:'canchas',at:.43,len:7,height:1,lift:5.2,minSpeed:15},{lane:'futbol',at:.52,len:5,height:.7,lift:4.6,minSpeed:14,width:6}],
  pads:[{at:.025,offset:-4,power:.8},{at:.372,offset:3.5,power:.9},{at:.708,power:1.5,super:true,width:10},{at:.89,offset:4,power:.8},{lane:'canchas',at:.32,power:1.2,super:true,width:5},{lane:'futbol',at:.38,power:1.2,super:true,width:5}],
  gaps:[{from:.7395,to:.7555,kind:'mud'},{lane:'canchas',from:.48,to:.535,kind:'water'}],
  alts:[{id:'canchas',name:'POR LAS CANCHAS',from:.385,to:.565,via:[[96,82],[60,81],[26,80],[2,80]],width:9,lift:1.2,laps:[1,2],sign:'CANCHAS ABIERTAS →'},
   {id:'futbol',name:'POR LA CANCHA DE FÚTBOL',from:.826,to:.968,via:[[-140,-92],[-110,-104],[-80,-120],[-55,-140]],width:10,rough:true,sign:'⚽ POR LA CANCHA →'}],
  treats:[{at:.468,offsets:[-4.2,0,4.2],kind:'quesillo',side:1}],
  bridges:[],charges:[{at:.06},{at:.2},{at:.33},{at:.48},{at:.62},{at:.84},{at:.95}],items:[{at:.31},{at:.68},{at:.87}],
 },
 // Mercado Oriental: calles angostas, peatones, el cauce y el callejón de los chinamos.
 oriental:{
  elev:[{from:.548,to:.62,height:3.6,ramp:22},{from:.16,to:.166,height:2.8,ramp:11},{from:.34,to:.346,height:2.8,ramp:11}],
  rough:[[.30,.52]],
  ramps:[{at:.205,lift:3,height:.3,len:3},{at:.432,lift:3.6,height:.35,len:3},{at:.566,len:11,height:2,lift:7.6,minSpeed:18.5,big:true},
   {lane:'callejon',at:.52,len:5,height:.8,lift:4.4,minSpeed:14,width:6}],
  pads:[{at:.06,offset:3.5,power:.8},{at:.55,power:1.5,super:true,width:10},{at:.69,offset:-3.5,power:.9},{at:.9,offset:-3,power:.8},{lane:'callejon',at:.2,power:1,width:5}],
  gaps:[{from:.5775,to:.5915,kind:'mud'}],
  crossings:[.958],
  alts:[{id:'callejon',name:'CALLEJÓN DE LOS CHINAMOS',from:.70,to:.865,via:[[-175,30],[-178,-20],[-176,-62]],width:8,rough:true,sign:'CALLEJÓN →'}],
  charges:[{at:.04},{at:.17},{at:.29},{at:.41},{at:.66},{at:.79},{at:.93}],items:[{at:.13},{at:.53},{at:.69}],
 },
 // Managua: malecón, paso a desnivel (figura de ocho), Loma de Tiscapa y la calle rota.
 managua:{
  elev:[{from:.7763,to:.8487,height:4,ramp:24},{from:.24,to:.246,height:2.8,ramp:11}],
  ramps:[{at:.0585,lift:3.2,height:.35,len:3},{at:.3291,lift:3.4,height:.35,len:3},{at:.8114,len:12,height:2.2,lift:8,minSpeed:19,big:true}],
  pads:[{at:.0195,offset:-4.5,power:.9},{at:.2651,offset:4.5,power:.9},{at:.5505,power:1.1,width:10},{at:.7937,power:1.5,super:true,width:11},{at:.884,offset:-4.5,power:1,width:5},{at:.9303,offset:4.5,power:.8},{lane:'mirador',at:.25,power:1.2,width:5,super:true}],
  gaps:[{from:.8239,to:.8377,kind:'water'}],
  edges:[{lane:'mirador',from:.18,to:.86,side:1,kind:'water'}],
  alts:[{id:'mirador',name:'MIRADOR DE TISCAPA',from:.3291,to:.4668,via:[[160,95],[178,58],[177,8]],width:8,sign:'MIRADOR · SIN BARANDA'}],
  bridges:[[.5308,.6686]],covered:[[.928,.972]],crossings:[.122,.0683],
  charges:[{at:.039},{at:.147},{at:.2454},{at:.4914},{at:.6095},{at:.7275},{at:.9015}],items:[{at:.3045},{at:.7763},{at:.9698}],
 },
 // Hipa Hipa: pads al ritmo, el salto sobre la piscina VIP, la espiral de tres vueltas alrededor de la palmera gigante (cuatro
 // calles apiladas en su entrada), la bajada larga con brinco y el atajo por la barra.
 'hipa-hipa':{
  ramps:[{at:.046,lift:3.2,height:.32,len:3},{at:.151,len:11,height:2,lift:7.6,minSpeed:18.5,big:true},{at:.254,lift:3.6,height:.35,len:3},
   {at:.775,lift:4.4,height:.5,len:4,minSpeed:16},{at:.81,lift:3.8,height:.4,len:3.5},{at:.955,lift:3.4,height:.35,len:3,offset:4,width:6},
   {lane:'barra',at:.5,len:4,height:.6,lift:4.4,minSpeed:14,width:6}],
  pads:[{at:.023,offset:3.5,power:.9},{at:.1406,power:1.5,super:true,width:10},{at:.223,offset:-4,power:.9},{at:.4,power:1,width:6,offset:-2},{at:.47,power:1,width:6,offset:2},{at:.54,power:1,width:6,offset:-2},{at:.61,power:1,width:6,offset:2},{at:.68,power:1,width:6,offset:-2},
   {at:.735,power:1.5,super:true,width:10},{at:.875,offset:-4,power:.8},{at:.97,offset:4,power:.8},{lane:'barra',at:.35,power:1.3,super:true,width:5},{lane:'barra',at:.7,power:1,width:5}],
  gaps:[{from:.1595,to:.1702,kind:'water'}],
  alts:[{id:'barra',name:'POR LA BARRA DE AFUERA',from:.862,to:.935,via:[[-148,-58],[-128,-100]],width:9,sign:'🍹 POR LA BARRA →'}],
  bridges:[[.37,.85]],
  charges:[{at:.031},{at:.108},{at:.208},{at:.307},{at:.45},{at:.6},{at:.83},{at:.95}],items:[{at:.127},{at:.325},{at:.52},{at:.845}],
 },
 // Volcán Masaya: la entrada del parque, lomas para volar, la cresta de lava enfriada, el túnel de magma con saltos y el
 // gran salto de salida.
 masaya:{
  elev:[{from:.085,to:.095,height:2.8,ramp:11},{from:.284,to:.29,height:2.8,ramp:11},{from:.445,to:.452,height:2.6,ramp:12},{from:.855,to:.862,height:2.8,ramp:11}],
  rough:[[.12,.24],[.32,.58],[.78,.84]],
  ramps:[{at:.045,lift:3.2,height:.32,len:3,offset:-4,width:6},{at:.175,lift:3.6,height:.38,len:3},{at:.33,lift:3.8,height:.4,len:3.2,offset:4,width:6},{at:.398,lift:3.4,height:.35,len:3},{at:.52,lift:4,height:.45,len:3.5},
   {at:.6205,len:4,height:.7,lift:4.6,minSpeed:15},{at:.656,len:4,height:.7,lift:4.6,minSpeed:15},{at:.716,len:13,height:2.4,lift:8.2,minSpeed:19.5,big:true},{at:.80,lift:3.6,height:.38,len:3},{at:.93,lift:3.4,height:.35,len:3,offset:4,width:6},
   {lane:'cresta',at:.47,len:4,height:.6,lift:4.2,minSpeed:14}],
  pads:[{at:.05,offset:4,power:.9},{at:.16,offset:-4,power:.9},{at:.3,offset:-4,power:.9},{at:.49,power:1,width:8},{at:.61,power:.8,width:8},{at:.70,power:1.6,super:true,width:12},{at:.78,offset:4,power:.9},{at:.9,offset:-4,power:.8},{lane:'cresta',at:.2,power:1,width:5}],
  gaps:[{from:.6245,to:.632,kind:'lava'},{from:.660,to:.6675,kind:'lava'},{from:.7275,to:.7495,kind:'lava'},{lane:'cresta',from:.53,to:.6,kind:'lava'}],
  edges:[{from:.592,to:.70,side:-1,kind:'lava'},{lane:'cresta',from:.12,to:.88,side:0,kind:'cliff'}],
  alts:[{id:'cresta',name:'CRESTA DE LAVA ENFRIADA',from:.163,to:.245,via:[[171,-66],[172,-40],[162,-20]],width:7,rough:true,sign:'CRESTA · SIN MUROS'}],
  tunnels:[[.585,.705]],
  charges:[{at:.04},{at:.14},{at:.27},{at:.36},{at:.5},{at:.82},{at:.92}],items:[{at:.15},{at:.57},{at:.68}],
 },
 // San Juan del Sur: malecón, pueblo, subida al Cristo, el salto de la quebrada, el puente y la playa: el salto del
 // estero junto al mar, rampas de arena entre las palmeras y la orilla con dunas.
 'san-juan':{
  elev:[{from:.585,to:.655,height:3.6,ramp:24},{from:.768,to:.812,height:2.6,ramp:16},{from:.22,to:.226,height:2.8,ramp:11},{from:.45,to:.456,height:2.8,ramp:11}],
  rough:[[.86,.9]],
  ramps:[{at:.054,len:11,height:2,lift:7.4,minSpeed:18.5,big:true},{at:.12,lift:3,height:.3,len:3},{at:.37,lift:3.6,height:.4,len:3},{at:.613,len:12,height:2.2,lift:8,minSpeed:19,big:true},
   {at:.93,lift:3.6,height:.4,len:3.5,offset:-4,width:6},{at:.965,lift:3.6,height:.4,len:3.5,offset:4,width:6},
   {lane:'playa',at:.2,len:4,height:.6,lift:4.4,minSpeed:14,width:7},{lane:'playa',at:.38,len:4,height:.6,lift:4.4,minSpeed:14,width:7},{lane:'playa',at:.55,len:6,height:1,lift:5,minSpeed:16},{lane:'playa',at:.8,len:4,height:.7,lift:4.6,minSpeed:14,width:7}],
  pads:[{at:.03,offset:4,power:.8},{at:.042,power:1.5,super:true,width:10},{at:.25,offset:-4,power:.9},{at:.596,power:1.5,super:true,width:10},{at:.82,offset:3.5,power:.8},{lane:'playa',at:.1,power:1,width:5},{lane:'playa',at:.45,power:1.2,width:5,super:true}],
  gaps:[{from:.0635,to:.0765,kind:'water'},{from:.6245,to:.639,kind:'pit'},{lane:'playa',from:.60,to:.66,kind:'water'}],
  edges:[{lane:'playa',from:.15,to:.9,side:1,kind:'water'}],
  alts:[{id:'playa',name:'POR LA ARENA',from:.875,to:.985,via:[[-126,-186],[-84,-214],[-38,-206]],width:10,rough:true,lift:.6,sign:'🏖 POR LA ARENA · RAMPAS'}],
  bridges:[[.775,.805]],
  charges:[{at:.022},{at:.15},{at:.27},{at:.4},{at:.52},{at:.72},{at:.94}],items:[{at:.2},{at:.58},{at:.86}],
 },

};

const smooth=(t:number)=>t<=0?0:t>=1?1:t*t*(3-2*t);
/** Plateau elevation added on top of the control-point profile, with eased ramps (metres). */
export function elevationAt(elev:ElevDef[],d:number,length:number){
 let y=0;for(const e of elev){const a=e.from*length,b=e.to*length,r=e.ramp??20;if(d<a-r||d>b+r)continue;y+=e.height*smooth((d-(a-r))/r)*smooth(((b+r)-d)/r);}return y;
}
function spline(a:number,b:number,c:number,d:number,t:number){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
type MainSample=(d:number)=>Point&{yaw:number};
/** Builds a smooth polyline that leaves the main road at `from`, passes `via` and rejoins at `to`. */
export function buildLane(def:AltDef,length:number,main:MainSample):Lane{
 const fromD=def.from*length,toD=def.to*length,a=main(fromD),b=main(toD);
 const ctrl=[{x:a.x-Math.sin(a.yaw)*20,z:a.z-Math.cos(a.yaw)*20},{x:a.x,z:a.z},...def.via.map(([x,z])=>({x,z})),{x:b.x,z:b.z},{x:b.x+Math.sin(b.yaw)*20,z:b.z+Math.cos(b.yaw)*20}];
 const points:Point[]=[];
 for(let k=1;k<ctrl.length-2;k++){const [p0,p1,p2,p3]=[ctrl[k-1],ctrl[k],ctrl[k+1],ctrl[k+2]],seg=Math.hypot(p2.x-p1.x,p2.z-p1.z),steps=Math.max(2,Math.ceil(seg/3));
  for(let i=0;i<steps;i++){const t=i/steps;points.push({x:spline(p0.x,p1.x,p2.x,p3.x,t),y:0,z:spline(p0.z,p1.z,p2.z,p3.z,t)});}}
 points.push({x:b.x,y:0,z:b.z});
 const dist=[0];for(let i=1;i<points.length;i++)dist.push(dist[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
 const len=dist.at(-1)!,lift=def.lift??0;
 points.forEach((p,i)=>{const t=dist[i]/len;p.y=a.y+(b.y-a.y)*t+lift*smooth(dist[i]/10)*smooth((len-dist[i])/10);});
 return{id:def.id,name:def.name,points,dist,length:len,from:fromD,to:toD<fromD?toD+length:toD,width:def.width,rough:!!def.rough,laps:def.laps??null,sign:def.sign??def.name};
}
export function compileCourse(def:CourseDef|undefined,length:number,lanes:Lane[]):Course{
 const d=def??{charges:[],items:[]},m=(lane:string|undefined,f:number)=>{if(!lane)return f*length;const l=lanes.find(v=>v.id===lane);return l?f*l.length:f*length;};
 return{
  ramps:(d.ramps??[]).map(r=>({lane:r.lane??'',at:m(r.lane,r.at),len:r.len??(r.big?12:3),height:r.height??(r.big?2.2:.35),lift:r.lift,minSpeed:r.minSpeed??0,big:!!r.big,width:r.width??0,offset:r.offset??0})),
  pads:(d.pads??[]).map(p=>({lane:p.lane??'',at:m(p.lane,p.at),len:p.len??(p.super?7:5),offset:p.offset??0,width:p.width??4.2,power:p.power??.8,super:!!p.super,laps:p.laps??null})),
  gaps:(d.gaps??[]).map(g=>({lane:g.lane??'',from:m(g.lane,g.from),to:m(g.lane,g.to),kind:g.kind})),
  edges:(d.edges??[]).map(e=>({lane:e.lane??'',from:m(e.lane,e.from),to:m(e.lane,e.to),side:e.side,kind:e.kind})),
  bridges:(d.bridges??[]).map(([a,b])=>[a*length,b*length]),tunnels:(d.tunnels??[]).map(([a,b])=>[a*length,b*length]),covered:(d.covered??[]).map(([a,b])=>[a*length,b*length]),crossings:(d.crossings??[]).map(f=>f*length),treats:(d.treats??[]).map(t=>({lane:t.lane??'',at:m(t.lane,t.at),offsets:t.offsets,kind:t.kind,side:t.side})),rough:(d.rough??[]).map(([a,b])=>[a*length,b*length]),
  charges:d.charges.map(r=>({lane:r.lane??'',at:m(r.lane,r.at)})),items:d.items.map(r=>({lane:r.lane??'',at:m(r.lane,r.at)})),elev:d.elev??[],
 };
}
/** Ramp surface height at `s` on a lane (the kicker curves up to its lip). */
export function rampHeight(r:CRamp,s:number){if(s<r.at||s>r.at+r.len)return 0;const t=(s-r.at)/r.len;return r.height*Math.pow(t,1.35);}
