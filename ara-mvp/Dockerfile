FROM node:17.3.0-slim

USER root

WORKDIR /home/node/app

COPY ./package.json ./

RUN npm -g config set user root
RUN npm cache clean --force
RUN npm install -g iexec

ENV NODE_OPTIONS=--openssl-legacy-provider

RUN npm install

COPY ./src /home/node/app/src

ENTRYPOINT ["node", "src/server.js"]