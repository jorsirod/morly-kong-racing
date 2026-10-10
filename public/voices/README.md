# Voces de Morly Kong Racing

Estado: **0 de 99 líneas tienen grabación real.** Las que faltan suenan con una voz sintética
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
| Especial | `semilla/special.mp3` | **«Acompáñame a comprar bicha»** | FALTA |
| Salto | `semilla/jump-1.mp3` | «¡Agárrenme la Victoria!» | FALTA |
| Salto | `semilla/jump-2.mp3` | «¡Allá voy, pues!» | FALTA |
| Rebase | `semilla/overtake-1.mp3` | «¡Con permiso, voy por otra!» | FALTA |
| Rebase | `semilla/overtake-2.mp3` | «¡Adiós, chele!» | FALTA |
| Pega | `semilla/hit-1.mp3` | «¡Salud!» | FALTA |
| Pega | `semilla/hit-2.mp3` | «¡Esa va por la casa!» | FALTA |
| Recibe | `semilla/hurt-1.mp3` | «¡Ideay! ¿Y a mí por qué?» | FALTA |
| Recibe | `semilla/hurt-2.mp3` | «¡Se me riega la cerveza!» | FALTA |
| Caída | `semilla/fall-1.mp3` | «¡Nooo, la bicha!» | FALTA |
| Gana | `semilla/win-1.mp3` | «¡La próxima ronda la pago yo!» | FALTA |

### Morly

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `morly/special.mp3` | **«Chinelazo Voltio Impact!!»** | FALTA |
| Salto | `morly/jump-1.mp3` | «¡Clavada de los Lakers!» | FALTA |
| Salto | `morly/jump-2.mp3` | «¡Voltio!» | FALTA |
| Rebase | `morly/overtake-1.mp3` | «¡Pasando por la pintura!» | FALTA |
| Rebase | `morly/overtake-2.mp3` | «¡Quítate, que llevo prisa!» | FALTA |
| Pega | `morly/hit-1.mp3` | «¡Chinelazo!» | FALTA |
| Pega | `morly/hit-2.mp3` | «¡Toma tu voltio!» | FALTA |
| Recibe | `morly/hurt-1.mp3` | «¡Púchica!» | FALTA |
| Recibe | `morly/hurt-2.mp3` | «¡Eso fue falta!» | FALTA |
| Caída | `morly/fall-1.mp3` | «¡Me fui al agua!» | FALTA |
| Gana | `morly/win-1.mp3` | «¡Campeón, como los Lakers!» | FALTA |

### Chete

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `chete/special.mp3` | **«Si yo me voy nadie juega play»** | FALTA |
| Salto | `chete/jump-1.mp3` | «¡Este salto lo pago yo!» | FALTA |
| Salto | `chete/jump-2.mp3` | «¡Volando en primera clase!» | FALTA |
| Rebase | `chete/overtake-1.mp3` | «¡Te pasé, quedate con el vuelto!» | FALTA |
| Rebase | `chete/overtake-2.mp3` | «¡Así se maneja con plata!» | FALTA |
| Pega | `chete/hit-1.mp3` | «¡Ahí está tu vuelto!» | FALTA |
| Pega | `chete/hit-2.mp3` | «¡Cobrado!» | FALTA |
| Recibe | `chete/hurt-1.mp3` | «¡Me desfalcaron!» | FALTA |
| Recibe | `chete/hurt-2.mp3` | «¡Eso me lo pagás!» | FALTA |
| Caída | `chete/fall-1.mp3` | «¡Se me cayó la billetera!» | FALTA |
| Gana | `chete/win-1.mp3` | «¡Gané! La plata siempre gana.» | FALTA |

### Coconitas

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `coconitas/special.mp3` | **«Kokonit Fatality»** | FALTA |
| Salto | `coconitas/jump-1.mp3` | «¡Alley-oop!» | FALTA |
| Salto | `coconitas/jump-2.mp3` | «¡Volando al aro!» | FALTA |
| Rebase | `coconitas/overtake-1.mp3` | «¡Crossover!» | FALTA |
| Rebase | `coconitas/overtake-2.mp3` | «¡Te hice un amague!» | FALTA |
| Pega | `coconitas/hit-1.mp3` | «¡Triple!» | FALTA |
| Pega | `coconitas/hit-2.mp3` | «¡Bloqueo!» | FALTA |
| Recibe | `coconitas/hurt-1.mp3` | «¡Falta, árbitro!» | FALTA |
| Recibe | `coconitas/hurt-2.mp3` | «¡Ay, mi tobillo!» | FALTA |
| Caída | `coconitas/fall-1.mp3` | «¡Fuera de la cancha!» | FALTA |
| Gana | `coconitas/win-1.mp3` | «¡Encestado! Gané.» | FALTA |

### Calín

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `calin/special.mp3` | **«Ármate 1»** | FALTA |
| Salto | `calin/jump-1.mp3` | «¡Tranquilo, tranquilo!» | FALTA |
| Salto | `calin/jump-2.mp3` | «¡Uy, qué viaje!» | FALTA |
| Rebase | `calin/overtake-1.mp3` | «¡Suave, suave… ya te pasé!» | FALTA |
| Rebase | `calin/overtake-2.mp3` | «¡Despacio, que llevo prisa!» | FALTA |
| Pega | `calin/hit-1.mp3` | «¡Hojazo!» | FALTA |
| Pega | `calin/hit-2.mp3` | «¡Ármate esa!» | FALTA |
| Recibe | `calin/hurt-1.mp3` | «¡Ay, mi gorra!» | FALTA |
| Recibe | `calin/hurt-2.mp3` | «¡Qué onda, vos!» | FALTA |
| Caída | `calin/fall-1.mp3` | «¡Me fui volando!» | FALTA |
| Gana | `calin/win-1.mp3` | «Tranquilo… gané.» | FALTA |

### Sap Heinz

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `sap-heinz/special.mp3` | **«Pizza de la rotonda»** | FALTA |
| Salto | `sap-heinz/jump-1.mp3` | «¡Croac!» | FALTA |
| Salto | `sap-heinz/jump-2.mp3` | «¡Salto de sapo!» | FALTA |
| Rebase | `sap-heinz/overtake-1.mp3` | «¡Paso de sapito!» | FALTA |
| Rebase | `sap-heinz/overtake-2.mp3` | «¡Adiós, renacuajo!» | FALTA |
| Pega | `sap-heinz/hit-1.mp3` | «¡Sapazo!» | FALTA |
| Pega | `sap-heinz/hit-2.mp3` | «¡Te cayó el sapito!» | FALTA |
| Recibe | `sap-heinz/hurt-1.mp3` | «¡Ay, mi pizza!» | FALTA |
| Recibe | `sap-heinz/hurt-2.mp3` | «¡Me aplastaron!» | FALTA |
| Caída | `sap-heinz/fall-1.mp3` | «¡Al charco!» | FALTA |
| Gana | `sap-heinz/win-1.mp3` | «¡Pizza para todos! Gané.» | FALTA |

### Enanonitas

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `enanonitas/special.mp3` | **«Yo te invoco, Claudia Salinas»** | FALTA |
| Salto | `enanonitas/jump-1.mp3` | «¡Mirame volar!» | FALTA |
| Salto | `enanonitas/jump-2.mp3` | «¡Arriba, pues!» | FALTA |
| Rebase | `enanonitas/overtake-1.mp3` | «¡Chiquito pero rápido!» | FALTA |
| Rebase | `enanonitas/overtake-2.mp3` | «¡Cebolla y adiós!» | FALTA |
| Pega | `enanonitas/hit-1.mp3` | «¡Cebollazo!» | FALTA |
| Pega | `enanonitas/hit-2.mp3` | «¡A llorar se ha dicho!» | FALTA |
| Recibe | `enanonitas/hurt-1.mp3` | «¡Me hicieron llorar!» | FALTA |
| Recibe | `enanonitas/hurt-2.mp3` | «¡Ideay!» | FALTA |
| Caída | `enanonitas/fall-1.mp3` | «¡Me caí y ni me vieron!» | FALTA |
| Gana | `enanonitas/win-1.mp3` | «¡El más pequeño, el primero!» | FALTA |

### Jorsi

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `jorsi/special.mp3` | **«Yo te pinto la mochila»** | FALTA |
| Salto | `jorsi/jump-1.mp3` | «¡Pincelada en el aire!» | FALTA |
| Salto | `jorsi/jump-2.mp3` | «¡Weee!» | FALTA |
| Rebase | `jorsi/overtake-1.mp3` | «¡Te borré del mapa!» | FALTA |
| Rebase | `jorsi/overtake-2.mp3` | «¡Te pinté la raya!» | FALTA |
| Pega | `jorsi/hit-1.mp3` | «¡Pintado!» | FALTA |
| Pega | `jorsi/hit-2.mp3` | «¡Obra de arte!» | FALTA |
| Recibe | `jorsi/hurt-1.mp3` | «¡Me rayaron el dibujo!» | FALTA |
| Recibe | `jorsi/hurt-2.mp3` | «¡Borrón y cuenta nueva!» | FALTA |
| Caída | `jorsi/fall-1.mp3` | «¡Se me cayó el lápiz!» | FALTA |
| Gana | `jorsi/win-1.mp3` | «Firmado: Jorsi.» | FALTA |

### Raulín

| Línea | Archivo | Texto | Estado |
|---|---|---|---|
| Especial | `raulin/special.mp3` | **«Balde de leche»** | FALTA |
| Salto | `raulin/jump-1.mp3` | «¡Pepino volador!» | FALTA |
| Salto | `raulin/jump-2.mp3` | «¡Arriba la leche!» | FALTA |
| Rebase | `raulin/overtake-1.mp3` | «¡Fresco como pepino!» | FALTA |
| Rebase | `raulin/overtake-2.mp3` | «¡Te pasé, lechero!» | FALTA |
| Pega | `raulin/hit-1.mp3` | «¡Pepinazo!» | FALTA |
| Pega | `raulin/hit-2.mp3` | «¡Te lo dije, fresco!» | FALTA |
| Recibe | `raulin/hurt-1.mp3` | «¡Se me regó la leche!» | FALTA |
| Recibe | `raulin/hurt-2.mp3` | «¡Ay, ay, ay!» | FALTA |
| Caída | `raulin/fall-1.mp3` | «¡Me resbalé en mi propia leche!» | FALTA |
| Gana | `raulin/win-1.mp3` | «¡Gané, y de postre leche!» | FALTA |
