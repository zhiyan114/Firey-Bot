# Add the node 18.x on ubuntu
FROM node:18.3.0-bullseye-slim

# Setup the environment?
WORKDIR /source/
ENV ISDOCKER=true

# Install/upgrade some packages
RUN npm install -g npm@latest
RUN apt-get update
RUN apt-get install python3 make g++ git -y

# Copy over files
COPY package.json package-lock.json ./
COPY tsconfig.json prisma/ ./
COPY src/ ./src/
COPY .git/ ./.git/

# Install and build node packages
RUN npm install
RUN npm run build

# Exposed web server port
EXPOSE ${WEBSERVER_PORT}

CMD ["npm", "run", "start"]