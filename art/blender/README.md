# Modelos de Blender

Aquí viven los carros (y luego escenarios) hechos en Blender.

- `art/blender/<id>.blend`: archivo fuente de Blender, por ejemplo `silver-surfer.blend`.
- `art/blender/exports/<id>.glb`: el carro exportado y listo para el juego.

`npm run assets` usa `exports/<id>.glb` cuando existe; si no, genera el carro desde el código (`src/game/vehicles.ts`). Un GLB que no cumple el contrato no se copia: `public/models/` queda como estaba y el comando termina con error. Para volver al carro del código, borra o renombra su GLB de `exports/`, o corre `npm run assets -- --codigo`.

```
npm run assets                          # todos los carros
npm run assets -- silver-surfer         # solo uno
npm run assets -- --codigo              # ignora Blender
npm test                                # incluye el contrato de exports/ y public/models/
```

## Cómo armar un carro en Blender

Ejes: el frente del carro mira a **−Y**, el lado del conductor (izquierdo) está en **+X** y arriba es **+Z**. Unidades en metros, escala 1.

Jerarquía (los nombres son exactos, sin sufijos `.001`):

```
vehicle-<id>                 empty raíz
└── body                     empty; todo lo que se mueve con la carrocería
    ├── (mallas de carrocería, vidrios, calcomanías…)
    ├── driver-socket        empty; el piloto se agrega aquí en el juego
    ├── passenger-socket     empty
    ├── ALF-plush            solo en hola-willy, con su malla
    └── wheel-pivot-front-left      empty en el centro de la rueda (dirección)
        └── wheel-spin-front-left   empty en el mismo punto (rodadura)
            └── (malla de la llanta)
        … igual para front-right, rear-left y rear-right
```

Los empties de rueda van sin rotación ni escala. Si hace falta girar la llanta, gira la malla de adentro y aplica la rotación (`Ctrl+A`).

Presupuesto: entre 1.000 y 30.000 triángulos por carro, pocas texturas (512–1024 px) y pocos materiales. Sin Draco ni meshopt: el juego carga sin internet.

Para tomar medidas, el carro actual de cada modelo está en `src/game/vehicles.ts` (por ejemplo, ruedas del Jimny en x = ±1,08, z = 1,30 / −1,32 en coordenadas del juego, que en Blender son x = ±1,08, y = −1,30 / 1,32).

## Exportar

Desde Blender (consola de Python o el MCP de Blender Lab):

```python
exec(open("<repo>/scripts/blender/export_vehicle.py").read())
export_vehicle("silver-surfer", repo_root="<repo>")
```

Sin interfaz:

```
blender -b art/blender/silver-surfer.blend --python scripts/blender/export_vehicle.py -- silver-surfer
```

El script revisa la escena antes de exportar (nombres, jerarquía, ruedas, orientación y triángulos), exporta solo el carro de la escena activa con la configuración correcta y escribe `art/blender/exports/<id>.glb`. Después corre `npm run assets` y `npm test`, y prueba el carro en el juego.

## Escenarios (vegetación y monumentos)

`art/blender/scenery.blend` tiene una escena por pieza (`prop-palm`, `prop-cristo`, `prop-catedral`…), construida por `art/blender/scenery.py`. Cada pieza tiene un empty raíz que se llama exactamente como su tipo en el juego, en el origen, sin rotación ni escala. Se modela en coordenadas del juego con `G()`: y hacia arriba y +z como frente de la pieza.

| Archivo | Tipos |
|---|---|
| `public/models/scenery/vegetation.glb` | `palm`, `mango`, `malinche`, `ceiba`, `pine`, `bush`, `rock` |
| `public/models/scenery/cristo.glb` | `cristo` |
| `public/models/scenery/managua.glb` | `catedral`, `arbol-vida`, `palacio`, `concha`, `casa-m1`, `casa-m2`, `casa-m3`, `casa-techo` |
| `public/models/scenery/oriental.glb` | `chinamo`, `lona` |
| `public/models/scenery/masaya.glb` | `volcano` |
| `public/models/scenery/lasalle.glb` | `aula-pb`, `aula-pa`, `aula-techo` (módulos de aulas que se repiten y estiran), `capilla`, `porton-lasalle`, `bus-escolar`, `cafeteria`, `bar-lasalle` |
| `public/models/scenery/sanjuan.glb` | `casa-playa-1`, `casa-playa-2`, `teja-playa` |
| `public/models/scenery/hipa.glb` | `barra`, `palmera-tronco`, `palmera-copa` (cuelga del nodo que se mece) |

```python
import sys; sys.path[:0] = ["<repo>/scripts/blender", "<repo>/art/blender"]
import scenery, export_scenery
scenery.build("palm")                      # o scenery.build_all()
export_scenery.export_file("vegetation", repo_root="<repo>")
```

En el juego, `kit.prop(tipo, x, y, z, yaw, escala, códigoDeRespaldo, tinte)` coloca la pieza (`src/game/worlds/props.ts`). Primero el mundo se dibuja con la versión de código. Cuando llega el GLB, cada tipo pasa a dibujarse con *thin instances*: una llamada de dibujo por material, sin importar cuántas palmeras tenga la pista. Si el GLB falta, se queda la versión de código.

- **Materiales:** se convierten a `StandardMaterial`, como el resto del mundo, con la misma regla de color que los carros (base 0,62 × color lineal). Si el nombre empieza con `tex-<tipo>`, el material usa la textura procedural del juego; la pieza debe llevar UV en metros (`planar_uv`).
- **Piezas blancas:** las lonas, los Árboles de la Vida, las rocas y las paredes y techos de las casas se modelan en blanco y el juego les da el color de cada ejemplar.
- **Oclusión ambiental:** va horneada en el atributo `AO`, como en los carros.
- **Piezas animadas:** `kit.prop(…, parent)` cuelga el modelo de un nodo que se mueve, como la copa de la palmera gigante.
- **Varias piezas por bloque:** `kit.propFallback(tipo)` guarda el código de respaldo de un bloque entero mientras sus módulos llegan como varias piezas.
- **Contrato y presupuesto:** `tests/scenery.test.ts` revisa el contrato y el presupuesto de triángulos por tipo (`src/game/worlds/propFiles.ts`).
