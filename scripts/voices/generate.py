#!/usr/bin/env python3
"""Genera las voces de Morly Kong Racing con el Qwen3-TTS local (MLX Audio en 127.0.0.1:8000).

1) VoiceDesign crea una voz nicaragüense para cada piloto (una frase de referencia).
2) Base 1.7B clona esa voz para todas sus frases, así cada piloto suena siempre igual.

Uso (con ./qwen3-tts/start.sh corriendo en otra ventana):
  python3 generate.py            # todo lo que falte
  python3 generate.py roman      # solo un piloto
Los WAV quedan en voices-gen/out/<piloto>/<frase>.wav. Si un archivo ya existe, se salta.
"""
import json, sys, time, urllib.request, urllib.parse
from pathlib import Path

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

def speak(payload, out: Path):
    audio = call("POST", "/v1/audio/speech", body=payload)
    if audio[:4] != b"RIFF":
        raise RuntimeError("respuesta sin WAV: " + audio[:200].decode("utf-8", "replace"))
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
    # 1) Una voz original por piloto.
    todo = [p for p in pilots if not (refs / f"{p}.wav").exists()]
    if todo:
        activate(DESIGN)
        for p in todo:
            t = time.time()
            speak({"model": DESIGN, "input": job["ref"][p], "instruct": job["voices"][p] + " " + job["accent"], "lang_code": "spanish",
                   "response_format": "wav", "stream": False, "max_tokens": 1200, "temperature": .75, "top_p": .9, "top_k": 40, "repetition_penalty": 1.05}, refs / f"{p}.wav")
            print(f"voz de {p} lista ({time.time()-t:.0f} s)", flush=True)
    # 2) Todas las frases con la voz de cada uno.
    lines = [l for l in job["lines"] if l["id"] in pilots and not (HERE / "out" / (l["file"] + ".wav")).exists()]
    if lines:
        activate(CLONE)
        for i, l in enumerate(lines, 1):
            t = time.time()
            try:
                speak({"model": CLONE, "input": l["text"], "lang_code": "spanish", "ref_audio": str(refs / f"{l['id']}.wav"), "ref_text": job["ref"][l["id"]],
                       "response_format": "wav", "stream": False, "max_tokens": 600, "temperature": .7, "top_p": .95, "top_k": 40, "repetition_penalty": 1.05}, HERE / "out" / (l["file"] + ".wav"))
                print(f"[{i}/{len(lines)}] {l['file']}  «{l['text']}»  ({time.time()-t:.0f} s)", flush=True)
            except Exception as e:
                print(f"[{i}/{len(lines)}] {l['file']} FALLÓ: {e}", flush=True)
    print("LISTO: todas las voces generadas.", flush=True)
    (HERE / "DONE").write_text(time.strftime("%Y-%m-%d %H:%M:%S"))

if __name__ == "__main__":
    main()
