#!/bin/bash

sh "scripts/remove_postgres.sh"

docker volume create node-ai-experiments-postgres-data

docker run \
	-p 5466:5432 \
	--name node-ai-experiments-postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_DB=postgres \
	-v node-ai-experiments-postgres-data:/var/lib/postgresql/data \
	-d pgvector/pgvector:pg16
