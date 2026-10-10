# Partidas online

Colyseus autoritativo: 60 Hz de simulación y 20 Hz de actualización. Salas privadas, códigos aleatorios de 8 caracteres, hasta 12 participantes y 3 salas simultáneas en el piloto. Apodo de 1–24 caracteres y ids de catálogo validados. El servidor fija personajes/vehículos al comenzar y decide cargas, impactos, vueltas y puntuación.

Entrada secuenciada, cola máxima 8 y límite por conexión. Sin consultas a cuentas sociales. Desconexión: bot al instante, reserva de 30 segundos y transferencia del anfitrión; la carrera no depende del creador. El regreso mantiene identidad y secuencias. Cookie de recarga HttpOnly/SameSite Strict y firmada; validar no debe desconectar un cliente activo.

SQLite con consultas preparadas y retención de 30 días. HTTPS/WSS por Caddy. Orígenes permitidos, límites HTTP, cuerpo de 2 KB y mensajes WS de 4 KB. El archivo de configuración de producción no se incluye en el proyecto.

Aceptación: 3 × 12 clientes, entradas inválidas, salas llenas, transferencia, bot, reserva y reconexión. Falta medir latencia real Nicaragua–Boston y redes móviles adversas.
