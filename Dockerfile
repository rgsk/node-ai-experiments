FROM docker:23-cli AS docker-cli


FROM node:18.19-slim


RUN apt-get update -y && \
    apt-get install -y openssl fontconfig tesseract-ocr


COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

WORKDIR /app


COPY ./package*.json ./
COPY ./yarn.lock ./
RUN yarn


COPY ./ ./


RUN yarn init:prisma
RUN yarn build

CMD ["yarn", "start"]
