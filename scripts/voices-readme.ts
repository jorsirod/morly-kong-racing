// Regenerates public/voices/README.md from the voice lines in src/game/voices.ts.
import { readFileSync, writeFileSync } from 'node:fs';
import { CHARACTERS } from '../shared/content';
import { KIND_LABEL, allLines } from '../src/game/voices';
const manifest=JSON.parse(readFileSync('public/voices/manifest.json','utf8')) as {files:string[]};
const have=new Set(manifest.files.map(f=>f.replace(/\.[a-z0-9]+$/i,'')));
const lines=allLines(),missing=lines.filter(l=>!have.has(l.file));
let md=`# Voces de Morly Kong Racing

Estado: **${lines.length-missing.length} de ${lines.length} líneas tienen grabación real.** Las que faltan suenan con una voz sintética
del sistema (genérica, no imita a nadie) y el subtítulo las marca como **VOZ PROVISIONAL**. Esa voz no es la versión final.

## Cómo grabar

1. **Desde el juego:** Ajustes → *Estudio de voces*. Cada uno elige su piloto, toca **● Grabar** y dice la frase
   (máximo 4 segundos). La grabación se usa al instante en ese equipo. Con **⬇** se descarga el archivo.
2. **Con cualquier grabadora:** un archivo por línea, mono, sin música de fondo, de 0,5 a 4 s, sin silencio al
   principio. Sirven \`.mp3\`, \`.ogg\`, \`.m4a\` o \`.webm\`.

Graba solo **tu propia voz** o la de alguien que te haya dado permiso. Las frases especiales se dicen
**exactamente** como están escritas abajo.

## Cómo incluirlas en el juego publicado

1. Copia el archivo a \`public/voices/<piloto>/<línea>.<ext>\` (por ejemplo \`public/voices/morly/special.mp3\`).
   Los archivos descargados del estudio vienen como \`morly__special.webm\`: cambia \`__\` por una carpeta.
2. Agrega la ruta a \`public/voices/manifest.json\`, por ejemplo \`{"files":["morly/special.mp3"]}\`.
3. Opcional: \`npx tsx scripts/voices-readme.ts\` actualiza esta lista.

## Líneas
`;
for(const c of CHARACTERS){
 md+=`\n### ${c.name}\n\n| Línea | Archivo | Texto | Estado |\n|---|---|---|---|\n`;
 for(const l of lines.filter(l=>l.characterId===c.id))md+=`| ${KIND_LABEL[l.kind]} | \`${l.file}.mp3\` | ${l.kind==='special'?'**':''}«${l.text}»${l.kind==='special'?'**':''} | ${have.has(l.file)?'Grabada':'FALTA'} |\n`;
}
writeFileSync('public/voices/README.md',md);console.log(`${missing.length} missing of ${lines.length}`);
