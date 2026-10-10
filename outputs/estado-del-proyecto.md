# Estado — 9 de octubre de 2026, revisión 2

Versión jugable con nueve pilotos, seis carros y seis mundos; carrera, práctica, batalla y copa de tres pistas. Esta revisión rehízo la conducción (giro por velocidad, derrape de dos niveles, salida con turbo, rebufo), los choques por componentes, la cámara, el HUD con **un solo botón de básicos** y especial aparte, la presentación de los ataques, los rasgos de los pilotos, La Salle completa, la ambientación de los otros cinco mundos, la música por mundo, los bots y los resultados con premios. Teclado configurable y navegación con mando.

Detalle y comprobaciones: `revision-2/verificacion.md` (capturas en la misma carpeta). La revisión anterior sigue en `revision-arcade/`.

## Pendiente

- Probar en celulares físicos (15 minutos, FPS en calidad baja) y con la pandilla para ajustar el tacto y el equilibrio.
- Fotos de La Salle 2000–2005 y de la pandilla para afinar mundos y caras. Confirmar si Enanonitas es bajito.
- Contratar o crear el VPS (la cuenta de Hostinger no tiene ninguno), DNS, HTTPS y publicar con `deploy/`.

## Historial de la revisión anterior


Proyecto centralizado en `/Users/Jorsi/Documents/Morly Kong Racing`. Versión jugable con nueve pilotos, seis vehículos, seis pistas/arenas, carrera, práctica, batalla y campeonato de tres mangas. Menú arcade en español y textos sarcásticos.

La reparación actual añade masa y carrocerías sólidas, inercia, empujes, dirección gradual y predicción online de los contactos. Se renovaron modelos, caras, ruedas/suspensión, tamaño/etiquetas de ataques, efectos, iluminación, cámara, audio e interfaz. La cámara eleva su vista cuando hay carros detrás para que el pelotón no bloquee el camino. Los nombres de rivales se limitan por distancia.

Silver Surfer mantiene [4,4,5,4,5] y «El más culito de todos.»; Black Diamond conserva la punta máxima y los tanques, mayor masa. `tiempos-simulados.json` corresponde a la revisión anterior de la conducción, como registro histórico.

## Verificado

- 49 pruebas unitarias, compilación TypeScript/cliente/servidor y contratos de los seis GLB. ALF permanente, anclajes activos y ruedas independientes.
- Tres salas simultáneas, doce clientes por sala, selección independiente, estado finito y límites. Reconexión, bot temporal, transferencia del anfitrión, cookie HttpOnly y vuelta al mismo piloto.
- Choques frontal/lateral Hilux–Matiz, separación por masa y conservación de momentum. Doce bots completan los seis circuitos.
- Navegador: personajes, carros, ALF, ataque Victoria, especial six-pack y banda; carrera local y sala online de doce carros. Viewports 1280×720, 844×390 y 390×844; controles libres de solapamientos y miniaturas proporcionadas. Se observaron 59–60 FPS en esta computadora durante la carrera online; no es una medición en celular físico.
- Descarga offline completa confirmada en el navegador, incluyendo fuentes locales y modelos. La comprobación previa de arranque sin servidor sigue documentada; la revisión actual confirma el guardado de recursos nuevos.
- Descarga completa 6,83 MB de archivos / 1,615 MB con gzip, dentro del presupuesto de 12 MB comprimidos.

Detalles y evidencia en `revision-arcade/verificacion.md` y capturas del mismo directorio.

## Siguiente etapa de entrega pública

Los rostros son caricaturas diferenciadas, todavía sin semejanza fotográfica final. Las referencias históricas de La Salle siguen incompletas. Faltan pruebas físicas Android/iPhone de quince minutos, tutorial con alguien nuevo y redes lentas reales; después, VPS, DNS/HTTPS y publicación. Las salas de localhost sirven en esta computadora; el servidor público aún no está desplegado.
