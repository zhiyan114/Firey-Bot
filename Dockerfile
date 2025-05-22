# Setup build image
FROM node:22-bookworm-slim as buildenv
WORKDIR /source/
RUN npm install -g npm@latest

# Install system build tools
RUN apt-get update
RUN apt-get install python3 make g++ git -y

# Install npm packages
COPY package.json package-lock.json ./
RUN npm ci

# Env Setup
COPY tsconfig.json ./
COPY scripts/ ./scripts
RUN chmod +x ./scripts/*
COPY prisma/ ./
RUN npx prisma generate

# Passthrough git to keep commit hash up to date
COPY .git/ ./.git/
RUN echo "COMMITHASH=$(git -C /source/ rev-parse HEAD)" >> .env_build
RUN echo "ENVIRONMENT=${ENVIRONMENT:=????}" >> .env_build

# Build the source
COPY src/ ./src/
COPY build.js ./build.js
RUN npm run build

# Setup sentry source mapping
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG ENVIRONMENT
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ENV ENVIRONMENT=${ENVIRONMENT}
RUN scripts/sentryDeploy.sh

# Perform build cleanup (or post-build stuff)
RUN npm prune --omit=dev



# Setup production image
FROM node:22-bookworm-slim

# Setup the environment?
WORKDIR /app/

# Install/upgrade some system packages
RUN npm install -g npm@latest
RUN apt-get update
RUN apt-get install fonts-noto ffmpeg -y
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy files from the build env
COPY --from=buildenv /source/node_modules /app/node_modules/
COPY --from=buildenv /source/dist /app/

# Import build env
COPY --from=buildenv /source/.env_build /app/.env_build
RUN cat .env_build >> .env
RUN rm .env_build

# Exposed web server port
EXPOSE ${WEBSERVER_PORT}

CMD node loader.js