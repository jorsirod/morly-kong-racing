# Morly Kong Racing

Carreras 3D entre amigos, con carros y bromas de la pandilla. Proyecto en `/Users/Jorsi/Documents/Morly Kong Racing`.

## Jugar y desarrollar

Requiere Node.js 24 o superior.

```sh
npm ci
npm run dev
```

Abrir **http://localhost:5173**. El servidor de partidas usa el puerto 2567. El menú tiene cuatro pasos: piloto, carro, pista y partida. Una sala privada comparte un enlace con código; cualquier piloto puede usar cualquiera de los seis carros.

```sh
npm test
npm run build
npm run budget
npm run test:online     # requiere el servidor activo
npm run test:reconnect  # requiere el servidor activo
npm run test:online-race # carrera completa de 12 clientes (≈3 min, servidor activo)
npm run assets         # regenera los seis GLB
```

En producción se inicia con `npm start` después de compilar. `PUBLIC_ORIGIN` y `COOKIE_SECRET` son obligatorios. El secreto debe ser aleatorio y privado, con al menos 32 bytes.

## Controles

Aceleración automática.

- **Computadora (teclas por defecto, se cambian en Pausa → Teclado o en Controles):** A/D o flechas para girar, S/↓ frenar, Espacio/Shift derrapar, W/↑ lanzar el básico elegido, 1/2/3 elegir y lanzar cada básico, Q cambiar de básico, E especial, Esc/P pausa.
- **Celular horizontal:** joystick a la izquierda; a la derecha derrape, freno, **un solo botón de ataque** (tocar lanza el básico elegido, mantener abre la rueda con los tres y al soltar lanza el elegido; arrastrar hacia abajo cancela) y la especial aparte.
- **Mando:** palanca o cruceta, RB/RT derrape, A básico, X/Y cambia básico, B especial, LT/LB freno, Start pausa. En los menús: cruceta para moverse, A elige, B regresa.

Derrape: mantenlo en la curva hasta azul o naranja y suelta para el turbo. En el 3-2-1, derrapar justo antes del ¡DALE! da salida con turbo.

Las cajas vienen en filas de tres y suman tres cargas, hasta seis. Los básicos gastan una y las especiales cinco. El modo carrera comienza sin cargas y práctica/batalla con tres. El piloto define los ataques y el carro define el manejo.

## Modos

Carrera de tres vueltas, práctica (bots opcionales, reinicio rápido desde la pausa), batalla de tres minutos en arena y **copa de tres pistas seguidas** (la elegida y las dos siguientes), con puntos acumulados y podio. Bots en tres niveles: Relajados, Normales y Picados.

## Implementación

- React y Vite: menús de arcade, selección, salas, tutorial, resultados y aplicación instalable.
- Babylon.js: pistas y carros 3D, modelos GLB, iluminación, cámara y efectos.
- Núcleo TypeScript compartido: conducción a 60 pasos/segundo, colisiones, vueltas, atajos, obstáculos, rebufo, derrape y combate.
- Colyseus: servidor autoritativo, actualizaciones a 20/segundo, predicción local, salas de 12, bot al desconectarse y reserva de 30 segundos.
- SQLite: resultados y puntos del campeonato, retención de 30 días.
- Service worker: práctica local con recursos descargados y opción de borrar la descarga.

Los nueve pilotos, seis vehículos y seis mundos tienen contenido jugable. La copa recorre tres pistas distintas. La Salle incluye entrada, corredor con aula, bar y canchas; su batalla usa las canchas. Las otras arenas son reinterpretaciones del mundo elegido.

El arte actual es una **versión estilizada provisional** hecha con geometría y materiales de color. Los rostros todavía no son retratos fieles de las referencias. El pipeline de Blender está preparado en `scripts/art-pipeline.py`; las texturas KTX2 y los niveles de detalle de los modelos finales pertenecen a la siguiente etapa de arte. Los sonidos son sintetizados: motores distintos por vehículo, derrape, impactos y firmas de los ataques. La revisión arcade añade colisiones por masa y carrocería, ruedas y suspensión animadas, retratos/miniaturas 3D, partículas y una cámara más próxima. Detalles y verificación en `outputs/revision-2/verificacion.md` (revisión actual) y `outputs/revision-arcade/verificacion.md` (anterior).

## Documentación

- `specs/`: contratos, capacidades y tareas de implementación.
- `outputs/`: investigación y estado del proyecto.
- `deploy/`: contenedores, HTTPS/WSS, copias de seguridad y guía para el VPS.
- `tests/`: reglas, modelos, caché offline, concurrencia y reconexión.

El despliegue público y las pruebas de quince minutos en celulares físicos siguen pendientes de disponer del VPS y de los dispositivos. Las mediciones en navegador de escritorio no sustituyen esas pruebas.

Silver Surfer afinado por petición del usuario: velocidad 4, aceleración 4, manejo 5, estabilidad 4 y terreno 5. Es la opción con más ventajas en conjunto, con un pequeño privilegio deliberado; Black Diamond conserva la punta máxima y los tanques conservan mayor resistencia.
