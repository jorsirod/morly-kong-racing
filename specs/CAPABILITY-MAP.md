# Capacidades aprobadas

| Módulo | Capacidad | Implementación | Contratos |
|---|---|---|---|
| race-core | conducción, cargas, impactos, protección, controles de vuelta, puntuación | shared/simulation.ts, shared/track.ts, shared/hazards.ts | PlayerInput, GameState |
| game-content | nueve personajes, seis vehículos independientes y seis mundos | shared/content.ts, src/game/models.ts, src/game/world.ts, public/models | CharacterDefinition, VehicleDefinition, AttackDefinition, TrackDefinition |
| race-client | renderizado, cámara, controles, efectos, sonido y predicción | src/game | Session |
| online-rooms | salas privadas, autoridad, bots, reconexión y persistencia | server | RaceWire |
| web-app | menú arcade, selección, invitaciones, modos, resultados, offline | src/App.tsx, src/components, public/sw.js | Selection |

Dependencias: contenido → núcleo; cliente → contenido y núcleo; salas → contenido y núcleo; aplicación → cliente y salas. La simulación no depende de React, Babylon ni del DOM.

Los nombres, carros, colores y poderes provienen de las instrucciones del usuario. Las estadísticas son valores del juego. No se infiere una semejanza personal a partir de los modelos provisionales.
