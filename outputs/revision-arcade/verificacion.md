# Reparación arcade — verificación del 8 de octubre de 2026

## Cambios implementados

- Colisiones con rectángulos orientados y masas diferentes; separación en el mismo paso, impulso relativo, fricción y empujes que conservan inercia. Hilux 2,5 / S-10 2,15 / Jimny 1,7 / Golf 1,25 / Mazda 1,08 / Matiz 0,75 en unidades arcade. Choques independientes de los aturdimientos especiales.
- Predicción online de los contactos, corrección con cada estado del servidor y extrapolación acotada de rivales. Los finalistas continúan rodando y conservan colisiones.
- Seis modelos renovados, ruedas que giran y orientan, suspensión y balanceo según peso. Conductores visibles y ALF permanente. Nueve caras estilizadas con cabello, ojos y expresiones; vestuario de Morly y Calín conservado.
- Ataques más grandes, etiquetas legibles desde atrás, objetos distintivos y estelas. Un six-pack completo para Semilla, en lugar de seis packs. Pintura del corazón de la mochila en ambas caras.
- Efectos de impacto, recogida, derrape, aterrizaje y turbo; pool fijo de 80 partículas (48 en baja). Audio de motores por vehículo y sonidos por objeto, máximo 12 voces.
- Mejor iluminación, sombras de contacto y dinámicas, carretera contrastada, vegetación, señales, nubes y público en La Salle. Cámara más próxima, reacción a los golpes y elevación al detectar carros detrás, para conservar la vista del camino. Nombres de rivales acotados por distancia.
- Retratos y miniaturas 3D reales en selección, Bungee/Nunito locales, iconos dibujados y HUD despejado. Cargas junto a los botones, selector de básicos con nombre y confirmaciones de ataque/impacto.
- Silver Surfer conserva sus ventajas y el texto «El más culito de todos.».

## Pruebas automáticas

- 49 pruebas unitarias de reglas, física, predicción, contratos GLB y caché, correctas.
- Tres salas simultáneas con doce clientes cada una: 36 clientes, entradas a 60 Hz, estado finito, límites y rechazo de selecciones inválidas.
- Reconexión: bot temporal, transferencia de anfitrión, vuelta al mismo piloto, cargas/ataques y cookie HttpOnly. Origen externo y cookie alterada rechazados.
- Choque frontal con velocidades iniciales +20/−20 m/s: la Hilux sigue a +9,66 m/s, el Matiz rebota a +14,46 m/s. La separación del Matiz es 3,33 veces mayor. Momentum conservado, sin penetración residual en ese caso. Choque lateral cubierto por regresión.
- Doce bots completaron las seis pistas en 168–196 segundos en la simulación de esta revisión.
- Compilación TypeScript, cliente y servidor correctas. Descarga completa: 6,83 MB de archivos / 1,615 MB con gzip; presupuesto 12 MB comprimidos. Los seis GLB suman 244,6 KiB con gzip.

## Límites de la comprobación

La revisión en navegador usa viewports de escritorio, 844×390 horizontal y 390×844 vertical. No equivale a una prueba de rendimiento en Android/iPhone físicos. Los rostros son caricaturas diferenciadas; todavía no se reproducen fielmente las fotos históricas. La publicación en el VPS sigue siendo una etapa posterior.
