#!/usr/bin/env python3
"""Genera las voces de Morly Kong Racing con el Qwen3-TTS local (MLX Audio en 127.0.0.1:8000).

1) VoiceDesign crea una voz nicaragüense para cada piloto (una frase de referencia).
2) Base 1.7B clona esa voz para todas sus frases, así cada piloto suena siempre igual.

Uso (con ./qwen3-tts/start.sh corriendo en otra ventana):
  python3 generate.py            # todo lo que falte
  python3 generate.py roman      # solo un piloto
Los WAV quedan en voices-gen/out/<piloto>/<frase>.wav. Si un archivo ya existe, se salta.
"""
import io, json, sys, time, urllib.request, urllib.parse
from pathlib import Path
import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
API = "http://127.0.0.1:8000"
DESIGN = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-8bit"
CLONE = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-8bit"
ALL = {DESIGN, CLONE, "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit", "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit"}
opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def call(method, path, params=None, body=None, timeout=900):
    url = API + path + ("?" + urllib.parse.urlencode(params) if params else "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={"Content-Type": "application/json"} if data else {})
    with opener.open(req, timeout=timeout) as r:
        return r.read()

def activate(model):
    loaded = {m.get("id", "") for m in json.loads(call("GET", "/v1/models")).get("data", [])}
    for other in ALL - {model}:
        if other in loaded:
            call("DELETE", "/v1/models", {"model_name": other})
    if model not in loaded:
        print("Cargando", model.split("/")[-1], "…", flush=True)
        call("POST", "/v1/models", {"model_name": model})

def pitch(wav: bytes):
    """Median F0 (Hz) of the voiced frames and the duration, from WAV bytes."""
    x, sr = sf.read(io.BytesIO(wav), dtype="float32", always_2d=True)
    x = x.mean(axis=1)
    if sr != 16000:
        idx = np.arange(0, len(x), sr / 16000.0).astype(int)
        x = x[idx[idx < len(x)]]
    sr = 16000; fr = int(.04 * sr); hop = int(.01 * sr); vals = []
    peak = np.max(np.abs(x)) + 1e-9
    for i in range(0, len(x) - fr, hop):
        w = x[i:i + fr] * np.hanning(fr)
        if np.sqrt(np.mean(w ** 2)) < .05 * peak:
            continue
        ac = np.correlate(w, w, "full")[fr - 1:]
        lo, hi = int(sr / 400), int(sr / 65)
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > .35 * ac[0]:
            vals.append(sr / k)
    return (float(np.median(vals)) if len(vals) > 5 else 0.0), len(x) / sr

def fetch(payload):
    audio = call("POST", "/v1/audio/speech", body=payload)
    if audio[:4] != b"RIFF":
        raise RuntimeError("respuesta sin WAV: " + audio[:200].decode("utf-8", "replace"))
    return audio

def save(audio: bytes, out: Path):
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".part")
    tmp.write_bytes(audio)
    tmp.rename(out)

def main():
    job = json.loads((HERE / "job.json").read_text())
    only = set(sys.argv[1:])
    pilots = [p for p in job["voices"] if not only or p in only]
    try:
        call("GET", "/v1/models", timeout=5)
    except Exception as e:
        sys.exit("MLX Audio no responde en 127.0.0.1:8000. Abre otra ventana y corre ./qwen3-tts/start.sh. (" + str(e) + ")")
    refs = HERE / "refs"
    report = {}
    # 1) A man's voice per pilot: several candidates, keep the one whose pitch sits in that pilot's male range.
    todo = [p for p in pilots if not (refs / f"{p}.wav").exists()]
    if todo:
        activate(DESIGN)
        for p in todo:
            lo, hi = job["f0"][p]; best = None
            for attempt in range(8):
                audio = fetch({"model": DESIGN, "input": job["ref"][p], "instruct": job["voices"][p] + " " + job["accent"], "lang_code": "spanish",
                               "response_format": "wav", "stream": False, "max_tokens": 1200, "temperature": .7, "top_p": .9, "top_k": 40, "repetition_penalty": 1.05})
                f0, dur = pitch(audio)
                ok = lo <= f0 <= hi and 3.0 < dur < 12
                score = 0 if ok else min(abs(f0 - lo), abs(f0 - hi)) + (50 if not 3.0 < dur < 12 else 0)
                print(f"  {p} intento {attempt+1}: {f0:.0f} Hz, {dur:.1f} s {'✓' if ok else ''}", flush=True)
                if best is None or score < best[0]:
                    best = (score, audio, f0)
                if ok:
                    break
            save(best[1], refs / f"{p}.wav")
            report[p] = round(best[2])
            print(f"voz de {p} lista: {best[2]:.0f} Hz", flush=True)
    ref_f0 = {p: pitch((refs / f"{p}.wav").read_bytes())[0] for p in pilots}
    # 2) Every line with that voice. Shouting raises the pitch, but a jump far above the reference means the model drifted
    #    toward another voice: try again and keep the closest take.
    lines = [l for l in job["lines"] if l["id"] in pilots and not (HERE / "out" / (l["file"] + ".wav")).exists()]
    if lines:
        activate(CLONE)
        for i, l in enumerate(lines, 1):
            t = time.time(); best = None; limit = max(ref_f0[l["id"]] * 1.55, 150)
            for attempt in range(4):
                try:
                    audio = fetch({"model": CLONE, "input": l["text"], "lang_code": "spanish", "ref_audio": str(refs / f"{l['id']}.wav"), "ref_text": job["ref"][l["id"]],
                                   "response_format": "wav", "stream": False, "max_tokens": 600, "temperature": .65, "top_p": .92, "top_k": 40, "repetition_penalty": 1.05})
                except Exception as e:
                    print(f"  {l['file']} error: {e}", flush=True); continue
                f0, dur = pitch(audio)
                ok = 0 < f0 <= limit and dur < 6
                if best is None or (ok and not best[2]) or (ok == best[2] and f0 < best[1]):
                    best = (audio, f0, ok)
                if ok:
                    break
            if best:
                save(best[0], HERE / "out" / (l["file"] + ".wav"))
                print(f"[{i}/{len(lines)}] {l['file']}  «{l['text']}»  {best[1]:.0f} Hz {'' if best[2] else '(revisar)'} ({time.time()-t:.0f} s)", flush=True)
            else:
                print(f"[{i}/{len(lines)}] {l['file']} FALLÓ", flush=True)
    print("LISTO: todas las voces generadas.", flush=True)
    (HERE / "DONE").write_text(time.strftime("%Y-%m-%d %H:%M:%S"))

if __name__ == "__main__":
    main()
