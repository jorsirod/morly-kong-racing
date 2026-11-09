import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

/*
 * Surface textures painted on the device: tileable fractal noise (no seams), a colour map and a
 * normal map from the same height field, so sunlight picks out gravel, pebbles, grass blades,
 * sand ripples and tile grout. Nothing is downloaded and everything works offline. The pixels are
 * kept in memory, so a second race on the same world does not paint them again.
 *
 * Quality: 'low' paints at 256 px and skips the normal maps (one texture fetch less per pixel).
 */
export type SurfaceKind='grass'|'dirt'|'sand'|'asphalt'|'rock'|'tile'|'lava'|'water'|'mud';
let low=false;
/** Called by the renderer before building a world. */
export function setTextureQuality(isLow:boolean){low=isLow;}
export function textureQualityLow(){return low;}

type Baked={size:number;color:Uint8ClampedArray;height:Float32Array};
const cache=new Map<string,Baked>();

function prng(seed:number){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000;};}
/** Tileable value noise: a lattice of `cells` x `cells` random values, wrapped at the edges. */
function lattice(cells:number,r:()=>number){const v=new Float32Array(cells*cells);for(let i=0;i<v.length;i++)v[i]=r();return v;}
function fbm(size:number,seed:number,base:number,octaves:number,ridged=false){
 const r=prng(seed),out=new Float32Array(size*size);let amp=1,total=0;
 for(let o=0;o<octaves;o++){const cells=base<<o,lat=lattice(cells,r),k=cells/size;
  for(let y=0;y<size;y++){const fy=y*k,y0=Math.floor(fy),ty=fy-y0,sy=ty*ty*(3-2*ty),r0=(y0%cells)*cells,r1=((y0+1)%cells)*cells;
   for(let x=0;x<size;x++){const fx=x*k,x0=Math.floor(fx),tx=fx-x0,sx=tx*tx*(3-2*tx),c0=x0%cells,c1=(x0+1)%cells;
    const a=lat[r0+c0]+(lat[r0+c1]-lat[r0+c0])*sx,b=lat[r1+c0]+(lat[r1+c1]-lat[r1+c0])*sx;let n=a+(b-a)*sy;
    if(ridged)n=1-Math.abs(n*2-1);out[y*size+x]+=n*amp;}}
  total+=amp;amp*=.5;}
 for(let i=0;i<out.length;i++)out[i]/=total;return out;
}
const hex=(h:string)=>{const c=Color3.FromHexString(h);return[c.r*255,c.g*255,c.b*255];};
const clamp=(v:number)=>v<0?0:v>255?255:v;

/** Paints colour and height for one surface. All randomness is seeded: the same world always looks the same. */
function bake(kind:SurfaceKind,base:string,size:number):Baked{
 const key=kind+base+size,hit=cache.get(key);if(hit)return hit;
 const N=size*size,color=new Uint8ClampedArray(N*4),height=new Float32Array(N),b=hex(base),seed=kind.length*977+base.charCodeAt(1)*31+base.charCodeAt(3);
 const r=prng(seed),s=size/512;
 const put=(i:number,k:number,tint?:number[],t=0)=>{const c=tint?b.map((v,j)=>v+(tint[j]-v)*t):b;color[i*4]=clamp(c[0]*k);color[i*4+1]=clamp(c[1]*k);color[i*4+2]=clamp(c[2]*k);color[i*4+3]=255;};
 const dot=(cx:number,cy:number,rad:number,fn:(i:number,d:number)=>void)=>{const R=Math.ceil(rad);for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const d=Math.hypot(dx,dy)/rad;if(d>1)continue;const x=((Math.round(cx)+dx)%size+size)%size,y=((Math.round(cy)+dy)%size+size)%size;fn(y*size+x,d);}};
 if(kind==='asphalt'){
  const tone=fbm(size,seed,4,4),patch=fbm(size,seed+1,2,3);
  // Soft repair patches (barely darker), aggregate speckle and gentle tone drift.
  for(let i=0;i<N;i++){const g=r(),p=patch[i];let k=.9+tone[i]*.18;if(p>.66)k*=1-Math.min(.06,(p-.66)*.5);if(g>.94)k*=1.28;else if(g<.07)k*=.74;put(i,k);height[i]=tone[i]*.3+(g>.94?.7:g<.07?-.4:0);}
  // Two or three sealed cracks: thin tar lines, only a little darker than the road.
  for(let c=0;c<3;c++){let x=r()*size,y=r()*size,a=r()*6.3;for(let t=0;t<60*s+30;t++){a+=(r()-.5)*.7;x+=Math.cos(a)*1.3;y+=Math.sin(a)*1.3;dot(x,y,.75*Math.max(1,s),(i)=>{color[i*4]*=.82;color[i*4+1]*=.82;color[i*4+2]*=.82;height[i]-=.25;});}}
 } else if(kind==='dirt'||kind==='mud'){
  const tone=fbm(size,seed,4,5),warm=hex(kind==='mud'?'#3b2a1a':'#a77b4a');
  for(let i=0;i<N;i++){const g=r();put(i,.84+tone[i]*.3+(g-.5)*.08,warm,tone[i]*.35);height[i]=tone[i]*.6+(g-.5)*.15;}
  for(let p=0;p<(kind==='mud'?140:520)*s*s+60;p++){const x=r()*size,y=r()*size,rad=(1.2+r()*3.4)*Math.max(1,s),light=r()<.6;
   dot(x,y,rad,(i,d)=>{const k=light?1.18-d*.25:.72+d*.2;color[i*4]=clamp(color[i*4]*k);color[i*4+1]=clamp(color[i*4+1]*k);color[i*4+2]=clamp(color[i*4+2]*k);height[i]+=(1-d*d)*.9;});}
 } else if(kind==='grass'){
  const tone=fbm(size,seed,3,4),dry=hex('#b9b45a'),lush=hex('#3f8f3a'),patch=fbm(size,seed+3,2,3);
  for(let i=0;i<N;i++){const t=patch[i];put(i,.86+tone[i]*.26,t>.55?dry:lush,Math.abs(t-.5)*.6);height[i]=tone[i]*.3;}
  for(let k=0;k<9000*s*s+800;k++){let x=r()*size,y=r()*size;const len=(3+r()*5)*Math.max(1,s),lean=(r()-.5)*.8,kk=r()<.5?.72:1.22;
   for(let t=0;t<len;t++){x+=lean*.4;y-=1;const xi=((Math.round(x)%size)+size)%size,yi=((Math.round(y)%size)+size)%size,i=yi*size+xi;color[i*4]=clamp(color[i*4]*kk);color[i*4+1]=clamp(color[i*4+1]*kk);color[i*4+2]=clamp(color[i*4+2]*kk);height[i]+=.5*(1-t/len);}}
 } else if(kind==='sand'){
  const tone=fbm(size,seed,4,4),warp=fbm(size,seed+5,2,3);
  // Fine grain with faint, irregular wind ripples (strong regular ripples read as wooden planks).
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,rip=Math.sin((y/size*24+warp[i]*7)*Math.PI*2)*(.4+warp[i]*.6),g=r();put(i,.93+tone[i]*.14+rip*.012+(g-.5)*.12);height[i]=rip*.12+tone[i]*.25+(g-.5)*.18;}
 } else if(kind==='rock'){
  const tone=fbm(size,seed,3,5),cracks=fbm(size,seed+7,4,4,true);
  for(let i=0;i<N;i++){const c=cracks[i],crack=c>.86?(c-.86)/.14:0,g=r();put(i,(.78+tone[i]*.4)*(1-crack*.45)+(g-.5)*.1);height[i]=tone[i]*.9-crack*.8+(g-.5)*.1;}
 } else if(kind==='tile'){
  const tile=size/4,tone=fbm(size,seed,8,3),grout=Math.max(2,3*s);
  const shade=Array.from({length:16},()=>.92+r()*.14);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=y*size+x,gx=x%tile,gy=y%tile,edge=gx<grout||gy<grout;
   if(edge){put(i,.62);height[i]=-.8;}else{const k=shade[Math.floor(y/tile)*4+Math.floor(x/tile)];put(i,k*(.96+tone[i]*.08));height[i]=.3+tone[i]*.1-(gx<grout*2||gy<grout*2?.2:0);}}
 } else if(kind==='lava'){
  // Dark cooled crust with bright flowing veins; the veins also drive the glow (emissive).
  const flow=fbm(size,seed,3,5,true),tone=fbm(size,seed+2,4,3),crust=hex('#2a0d06'),hot=hex('#ff7a1c'),white=hex('#ffe08a');
  for(let i=0;i<N;i++){const v=Math.pow(flow[i],5),heat=Math.min(1,v*1.6+tone[i]*.15),c=heat<.5?crust.map((a,j)=>a+(hot[j]-a)*heat*2):hot.map((a,j)=>a+(white[j]-a)*(heat-.5)*2);
   color[i*4]=clamp(c[0]);color[i*4+1]=clamp(c[1]);color[i*4+2]=clamp(c[2]);color[i*4+3]=255;height[i]=(1-heat)*.8;}
 } else {
  // Water: base colour, lighter crests along a ridged pattern (reads as ripples and caustics).
  const ridges=fbm(size,seed,4,4,true),tone=fbm(size,seed+9,2,3),foam=hex('#e9fbff');
  for(let i=0;i<N;i++){const rr=Math.pow(ridges[i],6);put(i,.9+tone[i]*.2,foam,rr*.55);height[i]=ridges[i];}
 }
 const out={size,color,height};cache.set(key,out);return out;
}

function toTexture(scene:Scene,name:string,size:number,data:Uint8ClampedArray){
 const tex=new DynamicTexture(name,{width:size,height:size},scene,true),ctx=tex.getContext() as CanvasRenderingContext2D;
 ctx.putImageData(new ImageData(data as unknown as Uint8ClampedArray<ArrayBuffer>,size,size),0,0);tex.update();tex.wrapU=tex.wrapV=Texture.WRAP_ADDRESSMODE;tex.anisotropicFilteringLevel=4;return tex;
}
/** Normal map at half the colour resolution (relief does not need more), from the same height field. */
function normalMap(b:Baked,strength:number){
 const {size,height}=b,half=size>>1,out=new Uint8ClampedArray(half*half*4),h=(x:number,y:number)=>height[((y+size)%size)*size+((x+size)%size)];
 for(let y=0;y<half;y++)for(let x=0;x<half;x++){const X=x*2,Y=y*2,dx=(h(X+2,Y)-h(X-2,Y))*strength*.5,dy=(h(X,Y+2)-h(X,Y-2))*strength*.5,l=Math.hypot(dx,dy,1),i=(y*half+x)*4;
  out[i]=(-dx/l*.5+.5)*255;out[i+1]=(-dy/l*.5+.5)*255;out[i+2]=(1/l*.5+.5)*255;out[i+3]=255;}
 return {size:half,data:out};
}
const BUMP:Record<SurfaceKind,[number,number]>={asphalt:[2.2,.5],dirt:[2.6,.7],mud:[2,.6],grass:[2,.45],sand:[1.6,.5],rock:[3,.8],tile:[3,.6],lava:[2,.5],water:[1.4,.45]};

/** Standard material with the painted colour map and (unless quality is low) a normal map. Cached per scene. */
export function surfaceMaterial(scene:Scene,kind:SurfaceKind,base:string,u=1,v=u){
 const name='surface-'+kind+base+(low?'-lo':'')+(u!==1||v!==1?`-${u}x${v}`:''),cached=scene.getMaterialByName(name) as StandardMaterial|null;if(cached)return cached;
 const m=new StandardMaterial(name,scene);m.specularColor=new Color3(.06,.06,.06);
 if(typeof document==='undefined'){m.diffuseColor=Color3.FromHexString(base);return m;}
 const size=low?256:512,b=bake(kind,base,size);
 m.diffuseTexture=toTexture(scene,name,size,b.color);
 if(!low){const [strength,level]=BUMP[kind],nm=normalMap(b,strength*size/256),n=toTexture(scene,name+'-n',nm.size,nm.data);n.level=level;m.bumpTexture=n;}
 for(const t of [m.diffuseTexture,m.bumpTexture] as (Texture|null)[])if(t){t.uScale=u;t.vScale=v;}
 if(kind==='lava'){m.emissiveTexture=m.diffuseTexture;m.emissiveColor=new Color3(1,1,1);m.diffuseColor=new Color3(.35,.35,.35);m.specularColor=new Color3(0,0,0);m.disableLighting=false;flow(scene,m,.025,.012);}
 if(kind==='water'){m.specularColor=new Color3(.7,.75,.8);m.specularPower=96;m.emissiveColor=new Color3(.05,.18,.24);m.alpha=.92;flow(scene,m,.018,.01);}
 if(kind==='mud'){m.specularColor=new Color3(.25,.22,.18);m.specularPower=40;}
 return m;
}
/** Slowly scrolls a material's textures (lava, water). One observer per material. */
function flow(scene:Scene,m:StandardMaterial,u:number,v:number){
 const textures=[m.diffuseTexture,m.bumpTexture].filter(Boolean) as Texture[];
 const obs=scene.onBeforeRenderObservable.add(()=>{const t=performance.now()/1000;for(const tex of textures){tex.uOffset=(t*u)%1;tex.vOffset=(t*v)%1;}});
 m.onDisposeObservable.add(()=>scene.onBeforeRenderObservable.remove(obs));
}
