# Setup build image
FROM node:20-buster-slim as buildenv
WORKDIR /source/
RUN npm install -g npm@latest

# Install system build tools
RUN apt-get update
RUN apt-get install python3 make g++ git -y

# Install npm packages
COPY package.json package-lock.json ./
RUN npm install

# Copy all build files and build
COPY tsconfig.json ./
COPY scripts/ ./scripts
RUN chmod +x ./scripts/*
COPY prisma/ ./
RUN npx prisma generate
COPY src/ ./src/
RUN npm run build

# Passthrough git to keep commit hash up to date
COPY .git/ ./.git/
RUN echo $(git -C /source/ rev-parse HEAD) > "commitHash"

# Setup sentry source mapping
ARG SENTRY_AUTH_TOKEN
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
RUN scripts/sentryDeploy.sh

# Perform build cleanup (or post-build stuff)
RUN npm prune --omit=dev



# Setup production image
FROM node:20-buster-slim

# Setup the environment?
WORKDIR /app/

# Install/upgrade some system packages
RUN npm install -g npm@latest
RUN apt-get update
RUN apt-get install fonts-noto ffmpeg -y

# Copy files from the build env
COPY --from=buildenv /source/node_modules /app/node_modules/
COPY --from=buildenv /source/dist /app/
COPY --from=buildenv /source/commitHash /app/commitHash

# Exposed web server port
EXPOSE ${WEBSERVER_PORT}

CMD node index.js