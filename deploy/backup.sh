#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p data/backups
docker compose --env-file deploy/.env -f deploy/compose.yaml exec -T game node --input-type=module -e 'import{DatabaseSync,backup}from"node:sqlite";const db=new DatabaseSync("/app/data/races.sqlite");await backup(db,"/app/data/backups/races-"+new Date().toISOString().slice(0,10)+".sqlite");db.close();'

find data/backups -type f -name 'races-*.sqlite' -mtime +14 -delete
