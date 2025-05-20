sh scripts/restart_postgres.sh 
sh scripts/restart_redis.sh 


yarn watch &
yarn studio &
yarn serve