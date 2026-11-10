# Arte generado con Qwen Image (local)

`public/art/` (portada, tarjetas de pistas, retratos de pilotos) y los íconos (`public/icon-*.png`, `apple-touch-icon.png`,
`favicon-48.png`) se generaron en el Mac con **Qwen Image 2.1 Turbo (GGUF Q4)** en ComfyUI (`127.0.0.1:8188`).

- `imagenes.py` encola cada imagen por la API de ComfyUI y la guarda en `ComfyUI_Clean/output/morly/` (se salta las que existen).
- `GENERAR-TODO.command` (doble clic en el Mac) genera primero las voces que falten con Qwen3-TTS y después el arte; apaga los servidores al terminar.
- Elegidas: `icon-s11`, `cover-s7`, `world-*-s5`, `pilot-*-s3` (semilla, roman, cucukis) y `pilot-*-s8` (el resto, corregidos). Exportadas a WebP: portada 1344×768 (q80), pistas 640×366 (q74), retratos 256×256 (q76).

- La tarjeta de El Tiburón (`public/art/car-el-tiburon.webp`) no salió de ComfyUI: Qwen Image lo dibujaba como hatchback. Se generó con ChatGPT Image 2.5 desde Codex, usando una foto del Yaris sedán como referencia de forma y otra tarjeta como referencia de estilo.
