# Convierte out/*.wav a mp3 parejos: recorta silencios, sube a ~-14 dBFS RMS con limitador y, si un piloto quedó agudo, lo baja un poco.
import glob,os,subprocess,collections,numpy as np,sys
sys.path.insert(0,'.')
from f0 import load,f0,level
files=sorted(glob.glob('out/*/*.wav'));med=collections.defaultdict(list)
for p in files:
    v=f0(load(p))
    if v: med[p.split('/')[1]].append(v)
for pil,v in med.items():
    m=float(np.median(v));r=min(1.0,max(2**(-2.5/12),150/m)) if m>150 else 1.0
    med[pil]=(m,r)
for p in files:
    pil=p.split('/')[1];m,r=med[pil];q='mp3/'+p[4:-4]+'.mp3';os.makedirs(os.path.dirname(q),exist_ok=True)
    pre=f"aresample=24000,asetrate=24000*{r:.4f},aresample=24000,atempo={1/r:.4f}," if r<1 else ""
    trim="silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
    x=load(p);rms=level(x)[0];gain=-14-rms
    af=f"{pre}{trim}highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,volume={gain+2:.1f}dB,alimiter=limit=0.89:level=false,apad=pad_dur=0.08"
    subprocess.run(['ffmpeg','-v','error','-y','-i',p,'-af',af,'-ar','44100','-ac','1','-b:a','96k',q],check=True)
for pil,(m,r) in sorted(med.items()): print(pil,round(m),'shift',round(12*np.log2(r),1))
