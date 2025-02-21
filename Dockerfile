FROM node:18.19-slim

RUN apt-get update -y && apt-get install -y openssl && apt-get install -y fontconfig
RUN apt-get install tesseract-ocr -y

WORKDIR /app

COPY ./package*.json ./
COPY ./yarn.lock ./


RUN yarn

COPY ./ ./

RUN yarn init:prisma
RUN yarn build

CMD ["sh", "./bin/start.sh"]
