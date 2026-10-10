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
export interface CourseDef {
 elev?:ElevDef[]; ramps?:RampDef[]; pads?:PadDef[]; gaps?:GapDef[]; edges?:EdgeDef[]; alts?:AltDef[];
 /** Visual: road on pillars instead of an embankment. */ bridges?:[number,number][];
 /** Visual: covered section (Masaya). */ tunnels?:[number,number][];
 rough?:[number,number][]; charges:RowDef[]; items:RowDef[];
}

export interface Lane { id:string; name:string; points:Point[]; dist:number[]; length:number; from:number; to:number; width:number; rough:boolean; laps:number[]|null; sign:string }
export interface CRamp { lane:string; at:number; len:number; height:number; lift:number; minSpeed:number; big:boolean; width:number; offset:number }
export interface CPad { lane:string; at:number; len:number; offset:number; width:number; power:number; super:boolean; laps:number[]|null }
export interface CGap { lane:string; from:number; to:number; kind:GapKind }
export interface CEdge { lane:string; from:number; to:number; side:number; kind:string }
export interface Course { ramps:CRamp[]; pads:CPad[]; gaps:CGap[]; edges:CEdge[]; bridges:[number,number][]; tunnels:[number,number][]; rough:[number,number][]; charges:{lane:string;at:number}[]; items:{lane:string;at:number}[]; elev:ElevDef[] }

export const COURSES:Record<string,CourseDef>={
 // La Salle: túmulos, la loma del norte, las canchas (se abren en la 2.ª vuelta) y el gran salto sobre la zanja.
 'la-salle':{
  elev:[{from:.598,to:.668,height:4.5,ramp:30},{from:.706,to:.80,height:4,ramp:26}],
  ramps:[{at:.152,lift:3.2,height:.35,len:3},{at:.578,lift:4.2,height:.45,len:3.5},{at:.727,len:13,height:2.2,lift:8,minSpeed:19,big:true},
   {lane:'canchas',at:.43,len:7,height:1,lift:5.2,minSpeed:15,width:7}],
  pads:[{at:.025,offset:-4,power:.8},{at:.372,offset:3.5,power:.9},{at:.708,power:1.5,super:true,width:10},{at:.905,offset:4,power:.8},{lane:'canchas',at:.32,power:1.2,super:true,width:5}],
  gaps:[{from:.7395,to:.7555,kind:'mud'},{lane:'canchas',from:.48,to:.535,kind:'water'}],
  alts:[{id:'canchas',name:'POR LAS CANCHAS',from:.385,to:.565,via:[[96,82],[60,81],[26,80],[2,80]],width:9,lift:1.2,laps:[1,2],sign:'CANCHAS ABIERTAS →'}],
  bridges:[],charges:[{at:.06},{at:.2},{at:.33},{at:.48},{at:.62},{at:.84},{at:.95}],items:[{at:.31},{at:.68},{at:.87}],
 },
 // Mercado Oriental: calles angostas, peatones, el cauce y el callejón de los chinamos.
 oriental:{
  elev:[{from:.548,to:.62,height:3.6,ramp:22}],
  rough:[[.30,.52]],
  ramps:[{at:.205,lift:3,height:.3,len:3},{at:.432,lift:3.6,height:.35,len:3},{at:.566,len:11,height:2,lift:7.6,minSpeed:18.5,big:true},
   {lane:'callejon',at:.52,len:5,height:.8,lift:4.4,minSpeed:14,width:6}],
  pads:[{at:.06,offset:3.5,power:.8},{at:.55,power:1.5,super:true,width:10},{at:.69,offset:-3.5,power:.9},{at:.9,offset:-3,power:.8},{lane:'callejon',at:.2,power:1,width:5}],
  gaps:[{from:.5775,to:.5915,kind:'mud'}],
  alts:[{id:'callejon',name:'CALLEJÓN DE LOS CHINAMOS',from:.70,to:.865,via:[[-175,30],[-178,-20],[-176,-62]],width:8,rough:true,sign:'CALLEJÓN →'}],
  charges:[{at:.04},{at:.17},{at:.29},{at:.41},{at:.66},{at:.79},{at:.93}],items:[{at:.13},{at:.53},{at:.69}],
 },
 // Managua: malecón, paso a desnivel (figura de ocho), Loma de Tiscapa y la calle rota.
 managua:{
  elev:[{from:.79,to:.865,height:4,ramp:24}],
  ramps:[{at:.06,lift:3.2,height:.35,len:3},{at:.335,lift:3.4,height:.35,len:3},{at:.826,len:12,height:2.2,lift:8,minSpeed:19,big:true}],
  pads:[{at:.02,offset:-4.5,power:.9},{at:.27,offset:4.5,power:.9},{at:.56,power:1.1,width:10},{at:.808,power:1.5,super:true,width:11},{at:.93,offset:4.5,power:.8},{lane:'mirador',at:.25,power:1.2,width:5,super:true}],
  gaps:[{from:.8385,to:.8525,kind:'water'}],
  edges:[{lane:'mirador',from:.18,to:.86,side:1,kind:'water'}],
  alts:[{id:'mirador',name:'MIRADOR DE TISCAPA',from:.335,to:.475,via:[[160,95],[178,58],[177,8]],width:8,sign:'MIRADOR · SIN BARANDA'}],
  bridges:[[.54,.68]],
  charges:[{at:.04},{at:.15},{at:.25},{at:.5},{at:.62},{at:.74},{at:.9}],items:[{at:.31},{at:.79},{at:.97}],
 },
 // Hipa Hipa: pads al ritmo, la pista de baile y el salto sobre la piscina VIP.
 'hipa-hipa':{
  elev:[{from:.645,to:.715,height:3.6,ramp:20}],
  ramps:[{at:.12,lift:3,height:.3,len:3},{at:.46,lift:3.8,height:.4,len:3},{at:.664,len:11,height:2,lift:7.6,minSpeed:18.5,big:true}],
  pads:[{at:.05,offset:3.5,power:.9},{at:.30,offset:-3,power:.9},{at:.648,power:1.5,super:true,width:10},{at:.86,offset:-4,power:.8},{lane:'baile',at:.5,power:1.1,width:6}],
  gaps:[{from:.6765,to:.6915,kind:'water'}],
  alts:[{id:'baile',name:'POR LA TERRAZA VIP',from:.205,to:.38,via:[[166,-10],[168,30],[158,64]],width:10,sign:'TERRAZA VIP →'}],
  charges:[{at:.04},{at:.16},{at:.27},{at:.44},{at:.55},{at:.77},{at:.93}],items:[{at:.19},{at:.62},{at:.83}],
 },
 // Volcán Masaya: la cresta de lava enfriada, el túnel de magma con saltos y el gran salto de salida.
 masaya:{
  rough:[[.12,.58],[.76,.88]],
  ramps:[{at:.398,lift:3.4,height:.35,len:3},{at:.6205,len:4,height:.7,lift:4.6,minSpeed:15},{at:.656,len:4,height:.7,lift:4.6,minSpeed:15},{at:.716,len:13,height:2.4,lift:8.2,minSpeed:19.5,big:true},
   {lane:'cresta',at:.47,len:4,height:.6,lift:4.2,minSpeed:14,width:6}],
  pads:[{at:.05,offset:4,power:.9},{at:.3,offset:-4,power:.9},{at:.61,power:.8,width:8},{at:.70,power:1.6,super:true,width:12},{at:.9,offset:-4,power:.8},{lane:'cresta',at:.2,power:1,width:5}],
  gaps:[{from:.6245,to:.632,kind:'lava'},{from:.660,to:.6675,kind:'lava'},{from:.7275,to:.7495,kind:'lava'},{lane:'cresta',from:.53,to:.6,kind:'lava'}],
  edges:[{from:.592,to:.70,side:-1,kind:'lava'},{lane:'cresta',from:.12,to:.88,side:0,kind:'cliff'}],
  alts:[{id:'cresta',name:'CRESTA DE LAVA ENFRIADA',from:.163,to:.245,via:[[171,-66],[172,-40],[162,-20]],width:7,rough:true,sign:'CRESTA · SIN MUROS'}],
  tunnels:[[.585,.705]],
  charges:[{at:.04},{at:.14},{at:.26},{at:.36},{at:.5},{at:.8},{at:.92}],items:[{at:.15},{at:.57},{at:.68}],
 },
 // San Juan del Sur: malecón, pueblo, subida al Cristo, el salto de la quebrada, el puente y la playa.
 'san-juan':{
  elev:[{from:.585,to:.655,height:3.6,ramp:24},{from:.768,to:.812,height:2.6,ramp:16}],
  rough:[[.86,.9]],
  ramps:[{at:.12,lift:3,height:.3,len:3},{at:.37,lift:3.6,height:.4,len:3},{at:.613,len:12,height:2.2,lift:8,minSpeed:19,big:true},
   {lane:'playa',at:.55,len:6,height:1,lift:5,minSpeed:16,width:7}],
  pads:[{at:.03,offset:4,power:.8},{at:.25,offset:-4,power:.9},{at:.596,power:1.5,super:true,width:10},{at:.82,offset:3.5,power:.8},{lane:'playa',at:.42,power:1.2,width:5,super:true}],
  gaps:[{from:.6245,to:.639,kind:'pit'},{lane:'playa',from:.60,to:.66,kind:'water'}],
  edges:[{lane:'playa',from:.15,to:.9,side:1,kind:'water'}],
  alts:[{id:'playa',name:'POR LA ORILLA DE LA PLAYA',from:.875,to:.985,via:[[-126,-186],[-84,-212],[-38,-204]],width:9,rough:true,lift:1.4,sign:'ORILLA · CUIDADO CON LAS OLAS'}],
  bridges:[[.775,.805]],
  charges:[{at:.04},{at:.15},{at:.27},{at:.4},{at:.52},{at:.72},{at:.94}],items:[{at:.2},{at:.58},{at:.86}],
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
  bridges:(d.bridges??[]).map(([a,b])=>[a*length,b*length]),tunnels:(d.tunnels??[]).map(([a,b])=>[a*length,b*length]),rough:(d.rough??[]).map(([a,b])=>[a*length,b*length]),
  charges:d.charges.map(r=>({lane:r.lane??'',at:m(r.lane,r.at)})),items:d.items.map(r=>({lane:r.lane??'',at:m(r.lane,r.at)})),elev:d.elev??[],
 };
}
/** Ramp surface height at `s` on a lane (the kicker curves up to its lip). */
export function rampHeight(r:CRamp,s:number){if(s<r.at||s>r.at+r.len)return 0;const t=(s-r.at)/r.len;return r.height*Math.pow(t,1.35);}
