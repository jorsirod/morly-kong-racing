#!/bin/zsh
# Morly Kong Racing: 1) voces nuevas con Qwen3-TTS  2) arte con Qwen Image en ComfyUI. Todo local; apaga los servidores al terminar.
QWEN="/Users/Jorsi/Documents/My Ai Configuration/qwen3-tts"
COMFY="/Users/Jorsi/Documents/ComfyUI_Clean"
HERE="/Users/Jorsi/Documents/Morly Kong Racing/voices-gen"
rm -f "$HERE/DONE" "$HERE/DONE-IMAGENES"
echo "=== 1/2 VOCES ==="
cd "$QWEN" || exit 1
STARTED=0
if ! curl -s --noproxy '*' http://127.0.0.1:8000/v1/models >/dev/null 2>&1; then
  echo "Iniciando MLX Audio (Qwen3-TTS)…"
  ./start.sh > "$HERE/servidor.log" 2>&1 &
  SERVER=$!; STARTED=1
  for i in {1..180}; do curl -s --noproxy '*' http://127.0.0.1:8000/v1/models >/dev/null 2>&1 && break; sleep 2; done
fi
"$QWEN/.venv/bin/python" "$HERE/generate.py" 2>&1 | tee "$HERE/generar.log"
if [[ $STARTED == 1 ]]; then echo "Apagando Qwen3-TTS…"; kill $SERVER 2>/dev/null; pkill -f "mlx_audio" 2>/dev/null; sleep 5; fi
echo "=== 2/2 IMÁGENES ==="
cd "$COMFY" || exit 1
CSTARTED=0
if ! curl -s --noproxy '*' http://127.0.0.1:8188/system_stats >/dev/null 2>&1; then
  echo "Iniciando ComfyUI…"
  ./venv/bin/python main.py --listen 127.0.0.1 --port 8188 > "$HERE/comfy.log" 2>&1 &
  COMFYPID=$!; CSTARTED=1
  for i in {1..240}; do curl -s --noproxy '*' http://127.0.0.1:8188/system_stats >/dev/null 2>&1 && break; sleep 2; done
fi
./venv/bin/python "$HERE/imagenes.py" 2>&1 | tee "$HERE/imagenes.log"
if [[ $CSTARTED == 1 ]]; then echo "Apagando ComfyUI…"; kill $COMFYPID 2>/dev/null; fi
echo "Listo. Puedes cerrar esta ventana."
