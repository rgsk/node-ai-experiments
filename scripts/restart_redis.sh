sh "scripts/remove_redis.sh"

docker volume create node-ai-experiments-redis-data

docker run \
  -p 6390:6379 \
  --name node-ai-experiments-redis \
  -v node-ai-experiments-redis-data:/data \
  -d \
  redis:latest