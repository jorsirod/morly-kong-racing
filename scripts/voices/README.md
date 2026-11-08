# Voces de la pandilla (Qwen3-TTS local)

Las 121 frases de `public/voices/` salieron del Qwen3-TTS local (MLX Audio) del Mac de Jorsi:

1. `bun scripts/voices/export-job.ts` escribe `job.json` con las frases (de `src/game/voices.ts`), la descripción de voz de cada piloto y el acento nicaragüense.
2. Copia `generate.py`, `job.json` y `GENERAR-VOCES.command` a una carpeta del Mac y abre el `.command`: arranca `qwen3-tts/start.sh`, crea una voz por piloto con VoiceDesign y clona esa voz para todas sus frases con Base 1.7B. Los WAV quedan en `out/`.
3. Convierte a MP3 mono (normalizado, sin silencios) y cópialos a `public/voices/<piloto>/<frase>.mp3`; actualiza `manifest.json` y corre `bun scripts/voices-readme.ts`.

Para rehacer un piloto: borra `refs/<piloto>.wav` y `out/<piloto>/`, y corre `python3 generate.py <piloto>`.
