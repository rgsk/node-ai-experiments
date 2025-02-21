sh scripts/restart_postgres.sh

sed -i '' 's/localhost/host.docker.internal/g' .env

docker run -d \
--env "HOST_DIR=$(pwd)" \
--env-file .env \
-v /var/run/docker.sock:/var/run/docker.sock \
-v ./code-runners:/app/code-runners \
-v ./secrets:/app/secrets \
-p 4004:4004 \
-p 5555:5555 \
--name node-ai-experiments \
rgskartner/node-ai-experiments

sed -i '' 's/host.docker.internal/localhost/g' .env