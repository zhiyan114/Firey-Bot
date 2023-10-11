# Add the node 18.x on ubuntu
FROM node:18.3.0-bullseye-slim

# Setup the environment?
WORKDIR /source/
ENV ISDOCKER=true

# Install/upgrade some packages
RUN npm install -g npm@latest
RUN apt-get update
RUN apt-get install python3 make g++ git fonts-noto ffmpeg -y

# Install npm packages
COPY package.json package-lock.json ./
RUN npm install

# Copy over rest of the essential files
COPY tsconfig.json prisma/ ./
COPY src/ ./src/
COPY .git/ ./.git/

# Build the package
RUN npm run build

# Exposed web server port
EXPOSE ${WEBSERVER_PORT}

CMD ["npm", "run", "start"]