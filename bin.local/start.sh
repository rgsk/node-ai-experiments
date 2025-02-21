sh scripts/restart_postgres.sh

sed -i '' 's/localhost/host.docker.internal/g' .env

docker run -d \
--env-file .env \
-p 4004:4004 \
-p 5555:5555 \
--name node-ai-experiments \
rgskartner/node-ai-experiments

sed -i '' 's/host.docker.internal/localhost/g' .env