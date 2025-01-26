FROM node:18.19-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY ./package*.json ./
COPY ./yarn.lock ./


RUN yarn

COPY ./ ./
