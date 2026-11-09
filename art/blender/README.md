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
