import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { ColorCurves } from '@babylonjs/core/Materials/colorCurves';
import type { Scene } from '@babylonjs/core/scene';
import { RawCubeTexture } from '@babylonjs/core/Materials/Textures/rawCubeTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { SphericalPolynomial } from '@babylonjs/core/Maths/sphericalPolynomial';
import { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
import type { Material } from '@babylonjs/core/Materials/material';
import '@babylonjs/core/Meshes/Builders/sphereBuilder';
import '@babylonjs/core/Materials/Textures/rawCubeTexture';

/*
 * The colour grade of each world: a painted sky dome, the fog that melts into its horizon and the
 * image processing. ACES tone mapping made everything look washed out (it was built for physically
 * based materials, ours are flat arcade colours), so it is off and a gentle saturation lift is on.
 */
export interface Look { top:string; mid:string; horizon:string; hemiSky:string; hemiGround:string; sun:string; sunPower:number; hemiPower:number; saturation:number; contrast:number; exposure:number; stars?:boolean; sunDisc?:string; fogStart:number; fogEnd:number }
export const LOOKS:Record<string,Look>={
 'la-salle':{top:'#1f7fe6',mid:'#58b6f5',horizon:'#c9f1ff',hemiSky:'#d3ecff',hemiGround:'#c9cbb4',sun:'#ffe6a8',sunPower:1.49,hemiPower:0.81,saturation:34,contrast:1.15,exposure:1.04,sunDisc:'#fff6c9',fogStart:290,fogEnd:630},
 oriental:{top:'#2a7fe0',mid:'#6fb9f0',horizon:'#f6ecd2',hemiSky:'#fff1d8',hemiGround:'#cdc2a8',sun:'#ffe4b0',sunPower:1.48,hemiPower:0.81,saturation:24,contrast:1.17,exposure:1.04,sunDisc:'#fff0bf',fogStart:270,fogEnd:590},
 managua:{top:'#1b78e2',mid:'#4fb0f2',horizon:'#bff0ff',hemiSky:'#d5edff',hemiGround:'#cccdb8',sun:'#ffe7ac',sunPower:1.52,hemiPower:0.81,saturation:34,contrast:1.15,exposure:1.04,sunDisc:'#fff6cf',fogStart:290,fogEnd:630},
 'hipa-hipa':{top:'#05041a',mid:'#140a38',horizon:'#3a1a5e',hemiSky:'#c2b8ff',hemiGround:'#2b2048',sun:'#c9bcff',sunPower:.55,hemiPower:.85,saturation:30,contrast:1.12,exposure:1.08,stars:true,fogStart:240,fogEnd:620},
 masaya:{top:'#2b6fd0',mid:'#7ab0e6',horizon:'#ffd7ae',hemiSky:'#ffe9d2',hemiGround:'#bfae9b',sun:'#ffd7a0',sunPower:1.56,hemiPower:0.77,saturation:32,contrast:1.17,exposure:1.04,sunDisc:'#ffe2a6',fogStart:270,fogEnd:610},
 'san-juan':{top:'#0f7ee0',mid:'#3fc0f2',horizon:'#b6fbff',hemiSky:'#d2f2ff',hemiGround:'#d6d6bc',sun:'#ffe9b0',sunPower:1.56,hemiPower:0.83,saturation:38,contrast:1.15,exposure:1.05,sunDisc:'#fff8d6',fogStart:310,fogEnd:670},
 isletas:{top:'#0c7fe2',mid:'#45c1f4',horizon:'#c4f6ff',hemiSky:'#d2f1ff',hemiGround:'#bfd6c6',sun:'#ffe9b0',sunPower:1.56,hemiPower:.83,saturation:40,contrast:1.15,exposure:1.05,sunDisc:'#fff8d6',fogStart:320,fogEnd:690},
 // Play Land Park: the fair opens at dusk — violet sky, orange horizon, a low warm sun and the lights already on.
 playland:{top:'#231553',mid:'#7a3f9a',horizon:'#ff9f6e',hemiSky:'#cdb8ff',hemiGround:'#a58a9a',sun:'#ffb37a',sunPower:1.25,hemiPower:.8,saturation:36,contrast:1.14,exposure:1.08,sunDisc:'#ffd9a0',fogStart:280,fogEnd:640},
};
export const lookFor=(id:string)=>LOOKS[id]??LOOKS['la-salle'];
const lin=(hex:string)=>Color3.FromHexString(hex).toLinearSpace();

/** Image processing for a race or preview scene. */
export function grade(scene:Scene,look:Look){
 const ip=scene.imageProcessingConfiguration;
 ip.toneMappingEnabled=false;ip.exposure=look.exposure;ip.contrast=look.contrast;
 const curves=new ColorCurves();curves.globalSaturation=look.saturation;curves.highlightsSaturation=look.saturation*.4;curves.shadowsHue=222;curves.shadowsDensity=24;curves.shadowsSaturation=36;curves.highlightsHue=42;curves.highlightsDensity=14;
 ip.colorCurves=curves;ip.colorCurvesEnabled=true;
 ip.vignetteEnabled=true;ip.vignetteWeight=1.6;ip.vignetteStretch=.6;ip.vignetteCameraFov=.9;
}
export function lightColors(look:Look){return{hemiSky:lin(look.hemiSky),hemiGround:lin(look.hemiGround),sun:lin(look.sun)};}

/** Cumulus clouds painted on the sky texture: lit tops, shaded flat bases, smaller and paler towards the horizon.
 * Drawn three times across the seam so the texture wraps around the dome. Deterministic: same sky for everyone. */
function paintClouds(ctx:CanvasRenderingContext2D,W:number,H:number,look:Look){
 let s=look.top.charCodeAt(1)*977+look.horizon.charCodeAt(3)*131+11;const r=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};
 const puff=(x:number,y:number,rad:number,color:string,alpha:number)=>{for(const dx of [-W,0,W]){const g=ctx.createRadialGradient(x+dx,y,rad*.1,x+dx,y,rad);g.addColorStop(0,color+alpha+')');g.addColorStop(.55,color+alpha*.7+')');g.addColorStop(1,color+'0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x+dx,y,rad,0,Math.PI*2);ctx.fill();}};
 const shade=Color3.FromHexString(look.mid),sr=Math.round(140+shade.r*80),sg=Math.round(150+shade.g*80),sb=Math.round(170+shade.b*80);
 for(let i=0;i<22;i++){
  // depth 0 = overhead and big, 1 = far, small, low over the horizon.
  const depth=r(),x=r()*W,y=H*(.3+depth*.165),size=(30-depth*19)*(.7+r()*.7),n=4+Math.floor(r()*4),alpha=.95-depth*.4;
  ctx.save();ctx.beginPath();ctx.rect(0,0,W,y+size*.32);ctx.clip(); // flat base
  for(let k=0;k<n;k++){const ox=(k-(n-1)/2)*size*.62+(r()-.5)*size*.3,rad=size*(.55+r()*.5)*(1-Math.abs(k-(n-1)/2)/n*.7);puff(x+ox,y+size*.22,rad*1.05,`rgba(${sr},${sg},${sb},`,alpha*.8);}
  for(let k=0;k<n;k++){const ox=(k-(n-1)/2)*size*.62+(r()-.5)*size*.3,rad=size*(.5+r()*.5)*(1-Math.abs(k-(n-1)/2)/n*.7);puff(x+ox-size*.06,y-size*.08-rad*.25,rad,'rgba(255,253,246,',alpha);}
  ctx.restore();
 }
}
/** Painted sky dome: gradient, a soft sun glow, or stars at night. Never fogged, follows the camera. */
export function skyDome(scene:Scene,look:Look){
 const dome=MeshBuilder.CreateSphere('sky-dome',{diameter:1250,segments:16,sideOrientation:1},scene);
 dome.isPickable=false;dome.infiniteDistance=true;dome.applyFog=false;
 const m=new StandardMaterial('sky-dome',scene);m.disableLighting=true;m.backFaceCulling=false;m.fogEnabled=false;
 if(typeof document!=='undefined'){
  const W=look.stars?64:1024,H=512,tex=new DynamicTexture('sky-dome',{width:W,height:H},scene,false),ctx=tex.getContext() as CanvasRenderingContext2D;
  // V runs from the bottom pole (0) to the top pole (1): the horizon sits at the middle.
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,look.top);g.addColorStop(.3,look.mid);g.addColorStop(.47,look.horizon);g.addColorStop(.53,look.horizon);g.addColorStop(1,look.horizon);
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(look.stars){let s=7;const r=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%1000)/1000;};for(let i=0;i<160;i++){const y=r()*H*.42,a=.35+r()*.65;ctx.fillStyle=`rgba(255,255,255,${a})`;ctx.fillRect(r()*W,y,r()<.15?2:1,1);}}
  if(!look.stars)paintClouds(ctx,W,H,look);
  tex.update(false);tex.hasAlpha=false;m.emissiveTexture=tex;m.diffuseColor=new Color3(0,0,0);m.specularColor=new Color3(0,0,0);
 }else m.emissiveColor=Color3.FromHexString(look.mid);
 dome.material=m;dome.renderingGroupId=0;
 // A warm halo where the sun is, low over the horizon behind the scenery.
 if(look.sunDisc){
  const sun=MeshBuilder.CreatePlane('sky-sun',{size:120},scene);sun.isPickable=false;sun.applyFog=false;sun.infiniteDistance=true;sun.billboardMode=7;sun.position.set(-330,190,380);
  const sm=new StandardMaterial('sky-sun',scene);sm.disableLighting=true;sm.fogEnabled=false;sm.backFaceCulling=false;
  if(typeof document!=='undefined'){const S=128,t=new DynamicTexture('sky-sun',{width:S,height:S},scene,false),c=t.getContext() as CanvasRenderingContext2D,rg=c.createRadialGradient(S/2,S/2,2,S/2,S/2,S/2);rg.addColorStop(0,'rgba(255,255,240,1)');rg.addColorStop(.16,look.sunDisc);rg.addColorStop(.22,'rgba(255,240,200,.55)');rg.addColorStop(1,'rgba(255,240,200,0)');c.fillStyle=rg;c.fillRect(0,0,S,S);t.update(false);t.hasAlpha=true;sm.emissiveTexture=t;sm.opacityTexture=t;}
  sun.material=sm;
 }
 return dome;
}

/*
 * Reflections for the GLB cars (their PBR materials): a tiny cube map painted from the world's own sky
 * colours. It is generated on the device, so there is nothing to download and it works offline.
 * The sky goes top -> mid -> horizon above, and the horizon fades into the darker ground below, so
 * hoods and roofs reflect sky while the lower body picks up the road. It is used ONLY as a reflection
 * on paint, chrome, glass and rims (no diffuse sky light): applied scene-wide it tinted tyres and
 * dark trim blue and washed out the paint colours.
 */
const srgb=(h:string)=>{const c=Color3.FromHexString(h);return[c.r,c.g,c.b];};
const mix=(a:number[],b:number[],t:number)=>a.map((v,i)=>v+(b[i]-v)*t);
const smooth=(e0:number,e1:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-e0)/(e1-e0)));return t*t*(3-2*t);};
export function skyColorAt(look:Look,y:number){
 const top=srgb(look.top),mid=srgb(look.mid),hor=srgb(look.horizon),ground=srgb(look.hemiGround).map(v=>v*.55),road=srgb('#5d6168').map(v=>v*.7);
 if(y>=0)return y<.35?mix(hor,mid,smooth(0,.35,y)):mix(mid,top,smooth(.35,1,y));
 return mix(mix(hor,ground,.35),mix(ground,road,.5),smooth(0,.3,-y));
}
export function skyReflection(scene:Scene,look:Look,size=32){
 const cached=scene.getTextureByName('sky-reflection');if(cached)return cached as RawCubeTexture;
 const dir=(face:number,u:number,v:number)=>{switch(face){case 0:return[1,-v,-u];case 1:return[-1,-v,u];case 2:return[u,1,v];case 3:return[u,-1,-v];case 4:return[u,-v,1];default:return[-u,-v,-1];}};
 const faces:Uint8Array[]=[];
 for(let f=0;f<6;f++){const b=new Uint8Array(size*size*4);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){const u=2*(i+.5)/size-1,v=2*(j+.5)/size-1,d=dir(f,u,v),c=skyColorAt(look,d[1]/Math.hypot(d[0],d[1],d[2])),k=(j*size+i)*4;
   for(let n=0;n<3;n++)b[k+n]=Math.round(Math.min(1,c[n])*255);b[k+3]=255;}
  faces.push(b);}
 const tex=new RawCubeTexture(scene,faces,size,Constants.TEXTUREFORMAT_RGBA,Constants.TEXTURETYPE_UNSIGNED_BYTE,true,false,Texture.TRILINEAR_SAMPLINGMODE);
 tex.gammaSpace=true;tex.name='sky-reflection';tex.sphericalPolynomial=new SphericalPolynomial();
 return tex;
}
/** Gloss for the GLB cars: sky reflections on paint, chrome, glass and rims, and a light clear coat on the paint. */
export function paintFinish(scene:Scene,look:Look,materials:Material[],clearCoat=true){
 const tex=skyReflection(scene,look);
 for(const m of materials){if(!(m instanceof PBRMaterial))continue;
  if(!/paint|chrome|glass|rim|cover|mirror|windscreen/.test(m.name))continue;
  m.reflectionTexture=tex;
  // Paint keeps its colour: a full sky reflection turned orange pink and black blue.
  if(/paint/.test(m.name)){m.environmentIntensity=.45;
   // A little fill light of its own colour: the side in shade stays the car's colour instead of going grey-green.
   m.emissiveColor=m.albedoColor.scale(.2);if(clearCoat){m.clearCoat.isEnabled=true;m.clearCoat.intensity=.2;m.clearCoat.roughness=.1;}}}
}
