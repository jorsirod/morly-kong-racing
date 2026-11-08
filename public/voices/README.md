# Voces de Morly Kong Racing

Estado: **121 de 121 líneas tienen grabación real.** Las que faltan suenan con una voz sintética
del sistema (genérica, no imita a nadie) y el subtítulo las marca como **VOZ PROVISIONAL**. Esa voz no es la versión final.

## Cómo grabar

1. **Desde el juego:** Ajustes → *Estudio de voces*. Cada uno elige su piloto, toca **● Grabar** y dice la frase
   (máximo 4 segundos). La grabación se usa al instante en ese equipo. Con **⬇** se descarga el archivo.
2. **Con cualquier grabadora:** un archivo por línea, mono, sin música de fondo, de 0,5 a 4 s, sin silencio al
   principio. Sirven `.mp3`, `.ogg`, `.m4a` o `.webm`.

Graba solo **tu propia voz** o la de alguien que te haya dado permiso. Las frases especiales se dicen
**exactamente** como están escritas abajo.

## Cómo incluirlas en el juego publicado

1. Copia el archivo a `public/voices/<piloto>/<línea>.<ext>` (por ejemplo `public/voices/morly/special.mp3`).
   Los archivos descargados del estudio vienen como `morly__special.webm`: cambia `__` por una carpeta.
2. Agrega la ruta a `public/voices/manifest.json`, por ejemplo `{"files":["morly/special.mp3"]}`.
3. Opcional: `npx tsx scripts/voices-readme.ts` actualiza esta lista.

## Líneas

### Semilla

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `semilla/special.mp3` | **«Acompáñame a comprar bicha»** | Grabada |
| Salto | `semilla/jump-1.mp3` | «¡Agarrame la Victoria, chavalo!» | Grabada |
| Salto | `semilla/jump-2.mp3` | «¡Va pues, allá voy!» | Grabada |
| Rebase | `semilla/overtake-1.mp3` | «¡Con permiso, que voy por otra helada!» | Grabada |
| Rebase | `semilla/overtake-2.mp3` | «¡Adiós, chele, ahí te ves!» | Grabada |
| Pega | `semilla/hit-1.mp3` | «¡Salud, maje!» | Grabada |
| Pega | `semilla/hit-2.mp3` | «¡Esa va por cuenta de la casa!» | Grabada |
| Recibe | `semilla/hurt-1.mp3` | «¡Ideay! ¿Y a mí por qué?» | Grabada |
| Recibe | `semilla/hurt-2.mp3` | «¡No jodás, se me regó la birria!» | Grabada |
| Caída | `semilla/fall-1.mp3` | «¡Púchica, se me fue la bicha!» | Grabada |
| Gana | `semilla/win-1.mp3` | «¡Gané! La otra ronda la pago yo, pues.» | Grabada |

### Morly

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `morly/special.mp3` | **«Chinelazo Voltio Impact!!»** | Grabada |
| Salto | `morly/jump-1.mp3` | «¡Clavada de los Lakers, chocho!» | Grabada |
| Salto | `morly/jump-2.mp3` | «¡Voltio, papá!» | Grabada |
| Rebase | `morly/overtake-1.mp3` | «¡Quitate, que voy pintando!» | Grabada |
| Rebase | `morly/overtake-2.mp3` | «¡Pasando, chavalo, pasando!» | Grabada |
| Pega | `morly/hit-1.mp3` | «¡Chinelazo, maje!» | Grabada |
| Pega | `morly/hit-2.mp3` | «¡Tomá tu voltio!» | Grabada |
| Recibe | `morly/hurt-1.mp3` | «¡Púchica!» | Grabada |
| Recibe | `morly/hurt-2.mp3` | «¡Eso fue falta, ideay!» | Grabada |
| Caída | `morly/fall-1.mp3` | «¡Me fui al charco, jodido!» | Grabada |
| Gana | `morly/win-1.mp3` | «¡Campeón, como los Lakers, chavalos!» | Grabada |

### Chete

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `chete/special.mp3` | **«Si yo me voy nadie juega play»** | Grabada |
| Salto | `chete/jump-1.mp3` | «¡Este brinco lo pago yo!» | Grabada |
| Salto | `chete/jump-2.mp3` | «¡Volando en primera, chele!» | Grabada |
| Rebase | `chete/overtake-1.mp3` | «¡Te pasé, quedate con el vuelto!» | Grabada |
| Rebase | `chete/overtake-2.mp3` | «¡Así se maneja con plata, maje!» | Grabada |
| Pega | `chete/hit-1.mp3` | «¡Ahí está tu vuelto!» | Grabada |
| Pega | `chete/hit-2.mp3` | «¡Cobrado, chavalo!» | Grabada |
| Recibe | `chete/hurt-1.mp3` | «¡Me desfalcaron, ideay!» | Grabada |
| Recibe | `chete/hurt-2.mp3` | «¡Eso me lo pagás, oíste!» | Grabada |
| Caída | `chete/fall-1.mp3` | «¡Se me cayó la cartera, no jodás!» | Grabada |
| Gana | `chete/win-1.mp3` | «¡Gané! La plata siempre gana, chavalos.» | Grabada |

### Coconitas

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `coconitas/special.mp3` | **«Kokonit Fatality»** | Grabada |
| Salto | `coconitas/jump-1.mp3` | «¡Alley-oop, maje!» | Grabada |
| Salto | `coconitas/jump-2.mp3` | «¡Volando al aro!» | Grabada |
| Rebase | `coconitas/overtake-1.mp3` | «¡Te hice el crossover, chele!» | Grabada |
| Rebase | `coconitas/overtake-2.mp3` | «¡Te amagué, chavalo!» | Grabada |
| Pega | `coconitas/hit-1.mp3` | «¡Triple, papá!» | Grabada |
| Pega | `coconitas/hit-2.mp3` | «¡Tapón, jodido!» | Grabada |
| Recibe | `coconitas/hurt-1.mp3` | «¡Falta, árbitro, ideay!» | Grabada |
| Recibe | `coconitas/hurt-2.mp3` | «¡Ay, mi tobillo, no jodás!» | Grabada |
| Caída | `coconitas/fall-1.mp3` | «¡Fuera de la cancha, púchica!» | Grabada |
| Gana | `coconitas/win-1.mp3` | «¡Encestado! Gané, chavalos.» | Grabada |

### Calín

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `calin/special.mp3` | **«Ármate 1»** | Grabada |
| Salto | `calin/jump-1.mp3` | «¡Tranquilo, tranquilo, chavalo!» | Grabada |
| Salto | `calin/jump-2.mp3` | «¡Uy, qué viaje, maje!» | Grabada |
| Rebase | `calin/overtake-1.mp3` | «¡Suave, suave… ya te pasé!» | Grabada |
| Rebase | `calin/overtake-2.mp3` | «¡Despacito, que llevo prisa!» | Grabada |
| Pega | `calin/hit-1.mp3` | «¡Hojazo, maje!» | Grabada |
| Pega | `calin/hit-2.mp3` | «¡Armate esa, chele!» | Grabada |
| Recibe | `calin/hurt-1.mp3` | «¡Ay, mi gorra, ideay!» | Grabada |
| Recibe | `calin/hurt-2.mp3` | «¡Qué onda, vos!» | Grabada |
| Caída | `calin/fall-1.mp3` | «¡Me fui volando, jodido!» | Grabada |
| Gana | `calin/win-1.mp3` | «Tranquilo, chavalos… gané.» | Grabada |

### Sap Heinz

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `sap-heinz/special.mp3` | **«Pizza de la rotonda»** | Grabada |
| Salto | `sap-heinz/jump-1.mp3` | «¡Croac, chavalo!» | Grabada |
| Salto | `sap-heinz/jump-2.mp3` | «¡Salto de sapo, maje!» | Grabada |
| Rebase | `sap-heinz/overtake-1.mp3` | «¡Paso de sapito!» | Grabada |
| Rebase | `sap-heinz/overtake-2.mp3` | «¡Adiós, renacuajo!» | Grabada |
| Pega | `sap-heinz/hit-1.mp3` | «¡Sapazo, chele!» | Grabada |
| Pega | `sap-heinz/hit-2.mp3` | «¡Te cayó el sapito, ideay!» | Grabada |
| Recibe | `sap-heinz/hurt-1.mp3` | «¡Ay, mi pizza, no jodás!» | Grabada |
| Recibe | `sap-heinz/hurt-2.mp3` | «¡Me aplastaron, púchica!» | Grabada |
| Caída | `sap-heinz/fall-1.mp3` | «¡Al charco, jodido!» | Grabada |
| Gana | `sap-heinz/win-1.mp3` | «¡Pizza de la rotonda para todos! Gané.» | Grabada |

### Enanonitas

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `enanonitas/special.mp3` | **«Yo te invoco, Claudia Salinas»** | Grabada |
| Salto | `enanonitas/jump-1.mp3` | «¡Mirame volar, chavalo!» | Grabada |
| Salto | `enanonitas/jump-2.mp3` | «¡Arriba, pues!» | Grabada |
| Rebase | `enanonitas/overtake-1.mp3` | «¡Chiquito pero jodido!» | Grabada |
| Rebase | `enanonitas/overtake-2.mp3` | «¡Cebolla y adiós, maje!» | Grabada |
| Pega | `enanonitas/hit-1.mp3` | «¡Cebollazo!» | Grabada |
| Pega | `enanonitas/hit-2.mp3` | «¡A llorar se ha dicho, chele!» | Grabada |
| Recibe | `enanonitas/hurt-1.mp3` | «¡Me hicieron llorar, ideay!» | Grabada |
| Recibe | `enanonitas/hurt-2.mp3` | «¡No jodás, hombre!» | Grabada |
| Caída | `enanonitas/fall-1.mp3` | «¡Me caí y ni me vieron, púchica!» | Grabada |
| Gana | `enanonitas/win-1.mp3` | «¡El más chiquito, el primero, chavalos!» | Grabada |

### Jorsi

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `jorsi/special.mp3` | **«Yo te pinto la mochila»** | Grabada |
| Salto | `jorsi/jump-1.mp3` | «¡Pincelada en el aire, maje!» | Grabada |
| Salto | `jorsi/jump-2.mp3` | «¡Weee, qué tuani!» | Grabada |
| Rebase | `jorsi/overtake-1.mp3` | «¡Te borré del mapa, chele!» | Grabada |
| Rebase | `jorsi/overtake-2.mp3` | «¡Te pinté la raya, chavalo!» | Grabada |
| Pega | `jorsi/hit-1.mp3` | «¡Pintado, maje!» | Grabada |
| Pega | `jorsi/hit-2.mp3` | «¡Obra de arte, ideay!» | Grabada |
| Recibe | `jorsi/hurt-1.mp3` | «¡Me rayaron el dibujo, no jodás!» | Grabada |
| Recibe | `jorsi/hurt-2.mp3` | «¡Borrón y cuenta nueva!» | Grabada |
| Caída | `jorsi/fall-1.mp3` | «¡Se me cayó el lápiz, púchica!» | Grabada |
| Gana | `jorsi/win-1.mp3` | «Firmado: Jorsi. ¡Qué tuani!» | Grabada |

### Roman

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `roman/special.mp3` | **«Moonwalk de Michael Jackson (Bailado por Romie)»** | Grabada |
| Salto | `roman/jump-1.mp3` | «¡Ji-ji! ¡De puntitas, chavalo!» | Grabada |
| Salto | `roman/jump-2.mp3` | «¡Volando, maje!» | Grabada |
| Rebase | `roman/overtake-1.mp3` | «¡Te pasé de espaldas, ideay!» | Grabada |
| Rebase | `roman/overtake-2.mp3` | «¡Ni me viste, chavalo!» | Grabada |
| Pega | `roman/hit-1.mp3` | «¡Tenedorazo, maje!» | Grabada |
| Pega | `roman/hit-2.mp3` | «¡Se te explotó el control, chele!» | Grabada |
| Recibe | `roman/hurt-1.mp3` | «¡Me arruinaron el paso, no jodás!» | Grabada |
| Recibe | `roman/hurt-2.mp3` | «¡Ay, mi nacatamal!» | Grabada |
| Caída | `roman/fall-1.mp3` | «¡Moonwalk directo al hoyo, púchica!» | Grabada |
| Gana | `roman/win-1.mp3` | «¡Gané bailando! Romie no falla.» | Grabada |

### Cucukis

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `cucukis/special.mp3` | **«Invocación de Peeerrrrisss»** | Grabada |
| Salto | `cucukis/jump-1.mp3` | «¡Ahoy, chavalo!» | Grabada |
| Salto | `cucukis/jump-2.mp3` | «¡Al agua, patos!» | Grabada |
| Rebase | `cucukis/overtake-1.mp3` | «¡Midamos mesas, maje!» | Grabada |
| Rebase | `cucukis/overtake-2.mp3` | «¡Te pasé, grumete!» | Grabada |
| Pega | `cucukis/hit-1.mp3` | «¡Bombazo, chele!» | Grabada |
| Pega | `cucukis/hit-2.mp3` | «¡Megabombazo, ideay!» | Grabada |
| Recibe | `cucukis/hurt-1.mp3` | «¡Se me cayó la Victoria, no jodás!» | Grabada |
| Recibe | `cucukis/hurt-2.mp3` | «¡Hombre al agua!» | Grabada |
| Caída | `cucukis/fall-1.mp3` | «¡Naufragué, púchica!» | Grabada |
| Gana | `cucukis/win-1.mp3` | «¡Mesa para todos, chavalos, gané yo!» | Grabada |

### Raulín

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `raulin/special.mp3` | **«Balde de leche»** | Grabada |
| Salto | `raulin/jump-1.mp3` | «¡Pepino volador, chavalo!» | Grabada |
| Salto | `raulin/jump-2.mp3` | «¡Arriba la leche, maje!» | Grabada |
| Rebase | `raulin/overtake-1.mp3` | «¡Fresco como pepino!» | Grabada |
| Rebase | `raulin/overtake-2.mp3` | «¡Te pasé, lechero!» | Grabada |
| Pega | `raulin/hit-1.mp3` | «¡Pepinazo, chele!» | Grabada |
| Pega | `raulin/hit-2.mp3` | «¡Te lo dije, fresco!» | Grabada |
| Recibe | `raulin/hurt-1.mp3` | «¡Se me regó la leche, ideay!» | Grabada |
| Recibe | `raulin/hurt-2.mp3` | «¡Ay, ay, ay, no jodás!» | Grabada |
| Caída | `raulin/fall-1.mp3` | «¡Me resbalé en mi propia leche, púchica!» | Grabada |
| Gana | `raulin/win-1.mp3` | «¡Gané, y de postre leche, chavalos!» | Grabada |
