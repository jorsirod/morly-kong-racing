# Revisión 2 — conducción, ataques, personajes, mundos y presentación arcade

9 de octubre de 2026. Trabajo hecho sobre el proyecto existente; respaldo de la versión anterior en `work/respaldo-antes-revision-2/`.

## Diagnóstico inicial (medido antes de cambiar)

- Con teclado el giro saltaba a tope: un piloto simulado con teclado cambiaba de dirección ~90 veces por vuelta. A 72 km/h el radio de giro era 13 m en pistas de 15 m.
- Aceleración lineal; recuperar velocidad tras un golpe tomaba ~1,6 s.
- El derrape era sólo menos agarre: sin entrada clara, sin dirección fija y con un solo nivel. En Masaya nunca convenía derrapar.
- La ayuda empujaba siempre al centro y aun así, sin tocar nada, el carro salía de la pista entre 3 y 23 s por vuelta.
- Los choques no cambiaban la velocidad propia (sólo un «empuje» aparte de ~1 s), con restitución 1,12 (añadía energía), y el giro por impacto se borraba en 0,15 s.
- La cámara iba rígida a la orientación del carro, saltaba de 4,3 a 7,4 m de altura con carros detrás y el carro tapaba el centro.
- En los GLB las ruedas no giraban ni se orientaban y la carrocería no se inclinaba: los nodos usaban cuaterniones y el código cambiaba ángulos de Euler.

## Etapa 1 — conducción, colisiones y cámara

- Capacidad de giro según velocidad (radio ≈15 m a tope, más cerrado despacio o frenando), entrada progresiva del teclado (0,42 → 1 en 0,2 s), zona muerta y curva en joystick y mando.
- Aceleración fuerte desde abajo y suave arriba; 1,1 s de tirón extra al levantarse de un aturdimiento.
- Derrape con dirección fija, saltito visual, carro de lado, dos niveles (azul y naranja), empujón al soltar. Raspar el muro corta la carga.
- Superficies: tierra y fuera de pista agarran menos, rebotan más y suenan distinto. El turbo ignora la pérdida de velocidad fuera de pista.
- Ayuda suave que cede al tocar el control y guarda de borde cerca del muro.
- Choques por componentes: la parte longitudinal cambia la velocidad propia y la lateral es un empuje que se disipa según estabilidad. El giro por impacto depende del punto de contacto. Restitución 0,45 sin añadir energía; un golpe fuerte corta el derrape.
- Rebufo con indicador; ayuda limitada a rezagados (hasta +4,5 %); aterrizaje limpio con empujón.
- Presentación de salida de 1,6 s, semáforo 3-2-1, ¡DALE! y salida con turbo bien sincronizada.
- Cámara con rumbo amortiguado, anticipación de curva, altura y FOV por velocidad, elevación suave con carros detrás, seguimiento de saltos y opción «menos movimiento».
- Nombres de rivales en capa HTML de tamaño fijo, ocultos de cerca, lejos o sobre el propio carro.

## Etapa 2 — ataques

- **Un solo botón de básicos** (tocar = lanza; mantener = rueda con los tres, soltar = lanza el elegido; arrastrar hacia abajo cancela) y **especial aparte**. En computadora: una sola pieza con los tres básicos y la especial separada.
- Objetos más grandes con halo de su color, sombra y movimiento propio. Trampas traseras con anillo pulsante y señal; nubes y leche que crecen hasta el radio real; búmeran que gira.
- Apuntado suave limitado (ver `mecanicas-y-habilidades.md`). Proyectiles que se gastan al golpear.
- Especiales con banda anime de 0,75 s, columna del color del lanzador (nunca sobre el propio carro), salpicadura del six-pack y el PS3, rayo de la chinela, Claudia junto al carro y estrellitas al aturdido.
- Aviso «¡CUIDADO ATRÁS!» para proyectiles que se acercan; confirmación al acertar con texto, sonido y vibración.
- Teclado configurable (dos teclas por acción) en Pausa y en Controles.

## Etapa 3 — pilotos y carros

- Rasgos confirmados aplicados: cachetes sólo de Chete, Morly el más moreno, Sap Heinz flaco, Semilla el más alto, Calín orejón y narizón. Cada piloto tiene peinado, boca y accesorio propios; camisola MORLY 24 en la espalda.
- Carros: nombre atrás, «EL MÁS CULITO» en la llanta del Jimny, placas y diamantes del Black Diamond. Ruedas, dirección, inclinación, salto de derrape, giro al aturdir y reacciones del piloto y de ALF.

## Etapa 4 — La Salle

Portón verde con pilares, rótulo, portería y banderas; edificio principal con arcos y capilla; estudiantes en la acera; parqueo con bus; corredor techado de aulas sobre la recta este con rótulos colgantes; dos canchas con malla y graderías; EL BAR con toldo, mesas y menú; patio con cancha de fútbol y árboles. Muros que coinciden con la barrera física; asfalto y pasto con textura. La batalla ocurre entre dos canchas con graderías y el bar.

## Etapa 5 — interfaz y audio

HUD nuevo (posición, vuelta con marcas, mapa con colores por piloto, reloj, cargas, derrape, rebufo, peligro), pausa con ajustes, ajustes en el menú, logo animado, resultados con podio, confeti y premios. Música original sintetizada por mundo con intensidad de última vuelta; motores con cambios simulados; volúmenes separados. Navegación de menús con mando y aviso al conectar o desconectar.

## Etapa 6 — mundos y modos

Ambientación nueva en Mercado Oriental, Managua, Hipa Hipa, Masaya y San Juan del Sur; trazado de Masaya rehecho. Copa de tres pistas distintas. Bots con tres niveles, líneas propias, adelantamientos, derrapes, búsqueda de cajas y ataques apuntados. Cajas en filas.

## Etapa 7–8 — online, rendimiento y publicación

- Calidad automática que sólo baja tras dos ventanas lentas; manual alta/media/baja. Media y baja usan sombras de contacto en vez de sombras dinámicas. Distancia de simplificación de carros por nivel. Calcomanías ocultas a más de 30 m. Cajas de carga con instancias (4 llamadas de dibujo para todas).
- Service worker: la página siempre sale de la misma versión que el código y los modelos guardados. La versión nueva espera y se ofrece en el menú con «ACTUALIZAR AHORA», nunca en carrera.
- Hostinger: la cuenta conectada no tiene VPS todavía (consulta de sólo lectura). El despliegue sigue preparado en `deploy/`.

## Cómo se comprobó

- **68 pruebas automáticas** correctas: reglas, física, predicción, contratos GLB, caché, más nuevas de conducción (10), combate (6) y modos (3).
- Typecheck correcto. Las pruebas corrieron en un entorno Linux con el mismo código; falta repetirlas en tu Mac con `npm test` y TypeScript 7.
- Online contra el servidor real: 3 salas × 12 clientes, reconexión, y **una carrera completa de 12 clientes humanos hasta el podio** (12/12 terminan, mismo podio en todos; `npm run test:online-race`).
- Vueltas simuladas en las seis pistas con estilos de teclado, stick, manos libres y derrape. Carreras de 12 bots en los tres niveles.
- Capturas en escritorio 1280×720, celular horizontal 844×390 y menús verticales 390×844 (en esta carpeta).

## Limitaciones

- Las capturas se hicieron con renderizado por software; los FPS reales en celulares Android/iPhone **no se han medido**.
- El tacto fino de conducción y la cantidad de ataques necesitan pruebas con la pandilla.
- La Salle y los demás mundos son interpretaciones artísticas. Faltan fotos de época.
- Las caras siguen siendo caricaturas.
- Publicación pendiente: no hay VPS en la cuenta de Hostinger.
