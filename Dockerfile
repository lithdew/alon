# This stage installs our modules
FROM mhart/alpine-node:12
WORKDIR /app

# If you have native dependencies, you'll need extra tools
# RUN apk add --no-cache make gcc g++ python3

# RUN npm ci --prod

# Then we copy over the modules from above onto a `slim` image
FROM mhart/alpine-node:slim-12

# If possible, run your container using `docker run --init`
# Otherwise, you can use `tini`:
# RUN apk add --no-cache tini
# ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /app
COPY --from=0 /app .
COPY . .
RUN yarn


CMD yarn start
