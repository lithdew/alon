FROM node:14

COPY package.json .
COPY yarn.lock .
RUN yarn install

COPY public/ ./public/
COPY src/ ./src/
COPY yarn.lock .
COPY craco.config.js .
COPY tailwind.config.js .
COPY tsconfig.json .

EXPOSE 3000
CMD yarn start