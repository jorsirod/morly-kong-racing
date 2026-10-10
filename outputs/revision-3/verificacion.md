# Revisión 3 de Morly Kong Racing: verificación

Rama `revision-3` en GitHub (`jorsirod/morly-kong-racing`), 10 commits sobre `main` (f66f7e2).
Los mismos archivos ya están copiados en la carpeta del proyecto en la Mac (54 archivos: 36 modificados, 18 nuevos).
Antes de copiar se comprobó que ninguno de los 36 había cambiado en la Mac desde `main`.

## Qué se comprobó, en resumen

| Comprobación | Resultado |
|---|---|
| Pruebas automáticas (`bun test tests/`, compatibles con vitest) | **94 de 94 pasan** (12 archivos; 86 antes de esta revisión) |
| Tipos (TypeScript 6.0.3, `tsc --noEmit`) | Sin errores |
| Salas en línea (`tests/online.ts`): 3 salas × 12 jugadores | Pasa |
| Reconexión (`tests/reconnect.ts`) | Pasa |
| Carreras completas con 6 bots en las 6 pistas | Las 6 terminan, 6 de 6 bots llegan a la meta en cada una |
| Descarga del juego (aproximación con esbuild, gzip) | 1,84 MB (antes 1,67 MB; el presupuesto es 12 MB) |
| Cuadros por segundo en la nube, con renderizado por software y 12 carros | 10–11 FPS, igual que la versión anterior en la misma máquina (11). No equivale a un celular real. |

## 1. Pistas: dinámica, saltos, caídas y eventos

**Lo que se hizo** (commits ffb5d4b, 07435d6 y b100373):

- Rampas pequeñas y grandes, pads de súper turbo antes de cada salto grande, huecos para saltar, terraplenes elevados, puentes, túnel de magma, bordes abiertos y calles rotas.
- Rutas alternas con riesgo:
  - La Salle: canchas, abiertas desde la vuelta 2.
  - Mercado: callejón.
  - Managua: mirador de Tiscapa.
  - Hipa Hipa: terraza VIP.
  - Masaya: cresta.
  - San Juan: la playa.
- Caer fuera de la pista activa una animación corta según lo que hay abajo (agua, lava, lodo o barranco). El carro reaparece en el último punto seguro y nunca más adelante de donde cayó, así que caerse no sirve de atajo.
- Eventos por mundo, siempre anunciados con señales o sonido:
  - Zanates en La Salle, con sombras, aviso y manchas en los bordes de la pantalla.
  - Peatones con ritmo predecible y carretillas en el Mercado.
  - El bus RUTA 119 y semáforos en Managua.
  - Fumarolas y rocas en el túnel de Masaya.
  - Olas y cangrejos en San Juan.
  - Bailarines en Hipa Hipa.
- Managua ahora es un ocho con paso a desnivel. Incluye el malecón, los Árboles de la Vida, la antigua Catedral, la Loma de Tiscapa y el Puerto Salvador Allende.
- Corrección de hoy: en San Juan los árboles de los tramos elevados se quedan sobre el terraplén y ya no flotan (captura 13).

**Cómo se verificó**:

- `tests/course.test.ts`:
  - Hay un salto grande con pad antes y hueco después en cada pista.
  - El hueco se cruza a 13, 20 y 27 m/s.
  - Al caer en un hueco se reaparece atrás.
  - Ningún punto seguro queda junto a un hueco.
  - El paso a desnivel distingue los dos niveles.
  - 8 bots de nivel 2 terminan todas las pistas usando las rutas alternas.
- Carreras completas, con caídas por pista:
  - La Salle: 3 (lodo y agua de las canchas).
  - Managua: 2 (agua del mirador).
  - Masaya: 6 (lava y barranco).
  - Mercado, Hipa Hipa y San Juan: 0.
  - En Masaya dos bots tardan varios segundos en un tramo de lava, pero terminan.
- Capturas en la nube de cada tramo nuevo.

## 2. Carros reconocibles

**Lo que se hizo** (commit 6a11e03): carrocerías nuevas, modeladas por secciones, una por modelo real:

- **Silver Surfer (Jimny 2008)**: caja recta, parrilla de cinco ranuras, faros redondos en marco cuadrado, guardafangos anchos, estribo, barras de techo y llanta de repuesto con «EL MÁS CULITO».
- **White Empanade (Hilux 1999 doble cabina)**: frente alto con parrilla cromada de tres barras, cuatro puertas, estribos, guardafangos negros 4×4 y palangana corta.
- **Hola Willy (Golf IV)**: frente redondeado, dos faros redondos por lado bajo mica, logo redondo, pilar trasero ancho (el sello del Golf IV) y portón casi vertical.
- **Orange Seed (Mazda 3 hatchback)**: cuña baja, parabrisas inclinado, faros afilados hacia atrás, alerón y calaveras redondas.
- **Black Diamond (Matiz)**: pequeño y alto, con los faros «saltones» sobre el capó.
- **La Raulina (S-10 cabina sencilla)**: baja, de cabina corta y palangana larga, con la cruz dorada en la parrilla.

Cada carro tiene su estilo de rin. La cabina deja siempre a la vista la cabeza del piloto desde la cámara: el parabrisas es bajo y el techo empieza detrás de la cabeza.

**Arreglo importante encontrado al verificar.** Los carros cargados desde los archivos GLB quedaban en espejo internamente. Por eso:

- El piloto se sentaba del lado derecho, encima de ALF.
- Los letreros traseros salían al revés.
- Los giros de ruedas e inclinación calculados en el juego iban invertidos.

Ahora se corrige al cargar, y se midió: piloto a −0,43 m e ALF a +0,47 m.

**Suspensión e inclinación.** Ya existían (aplastamiento al aterrizar, inclinación por masa en curvas, cabeceo en saltos). Se revisó que la inclinación vaya hacia afuera de la curva.

**Manejo.** Se mantiene el que ya tenía cada carro (masa, agarre y respuesta distintos).

**Cómo se verificó**:

- Capturas de los seis de frente, de perfil, en 3/4 y desde la cámara de carrera (capturas 01–03).
- La prueba de contrato de los GLB pasa: ruedas, anclajes, ALF solo en el Golf, presupuesto de triángulos.

## 3. Poderes especiales más claros

**Lo que se hizo**:

- Pose real del piloto: se levanta, crece y alza los brazos.
- La cámara gira a tres cuartos sin quitar el control.
- Banner con el retrato en pose, quién la lanzó y a quién va.
- Texto sobre la víctima.
- Frase dicha y subtitulada.
- Sonido propio de cada especial.

Los brazos ahora son articulados y también giran el timón y lanzan los ataques básicos.

**Cómo se verificó**: capturas de la especial de Jorsi y Raulín (captura 06) y de la de Enanonitas con su frase (captura 10).

**Límite de la prueba**: en el navegador sin tarjeta gráfica de la nube cada cuadro tarda tanto que la animación de entrada del banner no se alcanza a ver en las capturas. Sí se comprobó que el banner aparece en la página.

## 4. Ítems y El Bong Cachinflín

**Lo que se hizo**:

- Ítems nuevos en cajas sorpresa:
  - Cafecito y Triple café (turbo).
  - Casco (escudo).
  - Coco (rebota).
  - Chilero (hacia atrás).
  - Cohetes (deslumbran a los de adelante).
  - El Bong Cachinflín.
- El Bong persigue al líder siguiendo la pista. Su ventaja se mide con el avance real (vueltas y puntos de control).
- Solo lo reciben quienes van atrás y con 110 m o más de desventaja. Hay una pausa mínima de 32 s entre uno y otro.
- Avisa al líder al menos 1,2 s antes y le causa tambaleo, giro cómico y pérdida temporal de velocidad.
- Todo es configurable en `shared/items.ts` (`BONG`).

**Cómo se verificó**:

- `tests/items.test.ts`:
  - El líder nunca lo recibe.
  - La ventaja usa el avance real.
  - Se respetan umbral y pausa.
  - El aviso llega a tiempo.
  - El casco lo bloquea.
  - Los cohetes solo afectan a los de adelante.
- Carreras completas con bots: se lanzó de 1 a 3 veces por carrera e impactó de 1 a 2 veces. Permite remontar sin dominar.

## 5. Menús y cards

**Lo que se hizo** (commit a5425cf):

- Cards de piloto con el color de cada uno. Al seleccionarlo, el retrato pasa a la pose de especial, con animación de selección.
- Nombre y carro visibles («Maneja Silver Surfer»).
- Ficha del piloto:
  - Frase de la especial exacta y qué hace.
  - Sus tres ataques con el efecto de cada uno.
  - Cuatro estadísticas comparables (Golpe, Ráfaga, Control, Defensa), calculadas de los datos reales de sus ataques.
- Legibilidad:
  - Textos de al menos 11–12 px (había textos de 6–8 px en celular horizontal).
  - Los nombres sobre la vista 3D van en placa oscura; la sombra dura se veía como texto doble.
  - En celular horizontal se oculta el título grande para que quepan las cards.

**Cómo se verificó**: capturas en 1280×720, 1920×1080, celular horizontal 844×390 y celular vertical 390×844 (capturas 07–09).

**Pendiente**: en celular horizontal la ficha del piloto y el paso 4 piden desplazarse dentro del panel.

## 6. Personajes pulidos y ALF

**Lo que se hizo** (commit 9bc1373):

- Brazos articulados.
- Detalles en la espalda, que es lo que ve la cámara:
  - Mochila con el corazón sonriente de Jorsi.
  - Manchas de vaca de Raulín.
  - Sapito en el hombro de Sap Heinz.
  - Nombres y número en la camiseta.
  - Cadena y $ de Chete.
- En el Matiz el piloto va sentado más alto para que se vea sobre el techo.

ALF es más grande, con cabeza y brazos separados. Hace una rutina con pausas y variedad (saluda, mira hacia atrás, celebra, se agarra). Reacciona a curvas, saltos, golpes y turbos.

**Cómo se verificó**: capturas de las espaldas y de ALF saludando, mirando atrás y celebrando desde la cámara (capturas 04 y 06).

**Pendiente**: las caras siguen siendo caricaturas; no son retratos fieles de las fotos.

## 7. Música original dinámica

**Lo que se hizo** (commit 8a7e9d8): seis piezas compuestas para el juego, sintetizadas en el dispositivo (sin archivos ni licencias):

| Pista | Pieza | Estilo |
|---|---|---|
| La Salle | «Recreo con banda» | Banda de chicheros |
| Mercado | «Chinamos al trote» | Cumbia con acordeón |
| Managua | «Rotonda en mayor» | Ruta heroica |
| Hipa Hipa | «Luces de la terraza» | Disco |
| Masaya | «El cráter despierta» | Marimba y tambores |
| San Juan | «Bajando al malecón» | Ritmo de playa con steel drum |

Cada pieza tiene capas que cambian con la carrera:

- Calma en la cuenta regresiva.
- Banda completa en carrera.
- Fanfarria al entrar a la última vuelta. Desde ahí la música va 6 % más rápida, un tono más arriba, con arpegios y melodía doblada.
- Capa de tensión cuando viene el Bong o hay un rival a menos de 12 m en la última vuelta.
- Más percusión a alta velocidad.

**Cómo se verificó**:

- `tests/music.test.ts`:
  - Todos los compases están completos.
  - Las notas son válidas.
  - Cada nivel (calma, carrera, tensión, última vuelta) agrega capas.
  - Ninguna pista repite la melodía de otra.
- No hubo errores al reproducir en el navegador.

**Pendiente**: la mezcla final hay que escucharla en parlantes reales. En la nube no se puede oír.

## 8. Voces

**Lo que se hizo**:

- Las nueve frases especiales se dicen **exactamente**, en el instante en que empieza la animación del poder:
  - «Acompáñame a comprar bicha»
  - «Si yo me voy nadie juega play»
  - «Chinelazo Voltio Impact!!»
  - «Kokonit Fatality»
  - «Ármate 1»
  - «Pizza de la rotonda»
  - «Yo te invoco, Claudia Salinas»
  - «Yo te pinto la mochila»
  - «Balde de leche»
- Reacciones con variantes para cada piloto (90 líneas): salto, rebase, pega, recibe, caída y gana.
- Las reacciones respetan pausas: no se enciman, no repiten la misma frase seguida, la especial tiene prioridad y la música baja mientras alguien habla.
- Subtítulos sincronizados.
- Volumen independiente para Voces, Música y Efectos, en Ajustes y en la pausa.

**Estudio de voces** (Ajustes): cada amigo graba su propia voz, frase por frase. Se usa al instante en ese equipo y se puede descargar para incluirla en el juego publicado.

**Cómo se verificó**:

- `tests/voices.test.ts`:
  - Las nueve frases son idénticas a las pedidas y a los nombres de los poderes.
  - Las pausas y la prioridad funcionan.
  - El README lista las 99 líneas.
- Captura de la frase de Enanonitas con subtítulo (captura 10) y del estudio (captura 11).

**Falta, y no se presenta como terminado**:

- **No hay ninguna grabación real.** Las 99 líneas están pendientes y `public/voices/README.md` las lista con su archivo esperado.
- Mientras tanto, cada línea suena con la voz sintética del navegador. Es genérica, no imita a nadie, y el subtítulo la marca como **VOZ PROVISIONAL**. Se puede apagar en Ajustes.
- Si el navegador no tiene voz en español, se muestra solo el subtítulo.

## 9. Pendiente para cerrar

1. Grabar las voces con el estudio y pasar los archivos a `public/voices/`.
2. En la Mac, correr `npm test`, `npm run build`, `npm run budget` y `npm run assets`. Aquí no se pudo usar Vite (sus binarios nativos no funcionan en la nube), así que la compilación se probó con esbuild.
3. Medir FPS en celulares físicos. Las cifras de arriba son de renderizado por software.
4. Publicar en un servidor para que la pandilla juegue.
5. Pendientes que ya venían de antes:
   - Retratos fieles a las fotos.
   - Escuchar la mezcla de música en parlantes reales.

## Capturas (carpeta `capturas/`)

01 carros de frente · 02 de perfil · 03 desde la cámara · 04 ALF · 05 retratos y poses · 06 espaldas y pose especial · 07 menú 1280×720 · 08 celular horizontal · 09 celular vertical · 10 frase especial · 11 estudio de voces · 12 Managua antes y después · 13 árboles de San Juan
