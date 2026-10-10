# Publicación en Hostinger VPS

Preparado para KVM 2, Boston, Linux y Docker Compose. Falta confirmar el VPS, su acceso y una dirección pública válida. No se ha publicado todavía ni se ha ejecutado Docker en esta computadora.

1. Copiar el proyecto al VPS (excluir node_modules, work y las credenciales locales).
2. Instalar Docker desde su distribución oficial. Permitir 80/443 en el firewall; mantener 2567 sin publicar.
3. En la raíz del proyecto, crear `data` y `data/backups`, y darles el propietario UID/GID 1000 del contenedor Node. Copiar `deploy/.env.example` a `deploy/.env` y completar `PUBLIC_HOSTNAME` y un `COOKIE_SECRET` aleatorio de 32 bytes o más. Proteger ese archivo con permisos 600.
4. Apuntar el DNS de `PUBLIC_HOSTNAME` al VPS. Caddy requiere una dirección resoluble y acceso a los puertos para obtener el certificado. Una dirección provisional sirve si permite HTTPS válido.
5. Compilar y arrancar:

```sh
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build
```

6. Revisar `/api/health`, crear una sala desde dos dispositivos y correr una vuelta antes de enviar invitaciones. El código de sala no da acceso al servidor ni a la base de datos.
7. Programar `deploy/backup.sh` diariamente. Usa la API de backup de SQLite, compatible con WAL. Mantiene catorce copias; guardar también una copia cifrada fuera del VPS.

## Actualizaciones y regreso a una versión anterior

El servicio usa la imagen `morly-racing:current`. Antes de reconstruir, etiquetar la imagen actual como `morly-racing:previous`. Compilar los cambios y esperar a que las salas activas terminen antes de reiniciar. Para volver: etiquetar `previous` como `current` y ejecutar `up -d --no-build`. Las carreras activas no sobreviven un reinicio del servidor. La base de datos está en un volumen separado; no borrar `data` al volver de versión.

Revisar logs con `docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=100 game`. No registrar cookies ni tokens. Los errores de una sala se aíslan y los errores fatales quedan en stderr. El healthcheck verifica el proceso HTTP. Un servicio externo de alertas todavía no está configurado.

## Aceptación antes de publicar

- 3 salas simultáneas × 12 clientes, reserva de 30 s, anfitrión desconectado y recarga.
- Celulares físicos Android/iPhone: una vuelta después del tutorial, controles táctiles, instalación y offline.
- Sesión de 15 minutos; FPS al menos 30 en calidad baja; latencia desde Nicaragua y EEUU.
- Caché vacía con 10 Mbps: menú ≤3 s y carrera ≤20 s; caché descargada ≤5 s.
- Ajustar equilibrio y arte con pruebas de la pandilla. Los valores de FPS y carga son objetivos hasta medirlos.
