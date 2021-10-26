FROM node:14 as build-deps
WORKDIR /usr/src/app
COPY package.json yarn.lock ./

RUN yarn
COPY . ./
RUN yarn build

FROM nginx:1.12-alpine
COPY --from=build-deps /usr/src/app/build /usr/share/nginx/html/alon

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
