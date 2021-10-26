FROM node:14-alpine

COPY package.json .
COPY yarn.lock .
RUN yarn install

COPY public/ ./public/
COPY src/ ./src/

EXPOSE 3200
CMD yarn run start