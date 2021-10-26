FROM node:14 as build-deps
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
COPY public/ ./public/
COPY src/ ./src/
COPY yarn.lock .
COPY craco.config.js .
COPY tailwind.config.js .
COPY tsconfig.json .

RUN yarn
COPY . ./
RUN yarn build

FROM nginx:1.12-alpine
COPY --from=build-deps /usr/src/app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]