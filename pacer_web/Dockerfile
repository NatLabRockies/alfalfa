FROM node:22-slim AS base
ARG GIT_COMMIT
ENV GIT_COMMIT=$GIT_COMMIT

RUN apt-get update && apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/pacer

COPY pacer_web/package.json pacer_web/package-lock.json /srv/pacer/
RUN npm install

COPY pacer_web /srv/pacer

ARG NODE_ENV
RUN npm run build
CMD [ "node", "build/index.js" ]

# **** Staged build for running in development mode ****
FROM base AS dev

# The docker-compose will require the mounting
# of the files into the container, see docker-compose.dev.yml

WORKDIR /srv/pacer

# Run in watch mode so it will automatically restart
CMD [ "npm", "run", "watch" ]
