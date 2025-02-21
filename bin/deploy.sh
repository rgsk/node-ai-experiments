docker build . -t rgskartner/node-ai-experiments --platform linux/amd64

docker tag rgskartner/node-ai-experiments:latest public.ecr.aws/g3x7x7f3/rgskartner/node-ai-experiments:latest

docker push public.ecr.aws/g3x7x7f3/rgskartner/node-ai-experiments:latest