# Add the node 18.x on ubuntu
FROM node:18.3.0-bullseye-slim
WORKDIR /source/

# Install/upgrade some packages
RUN npm install -g npm@latest
RUN apt-get update
RUN apt-get install python3 make g++ git -y

# Setup and install node packages
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

# Exposed web server port
EXPOSE ${WEBSERVER_PORT}

CMD ["npm", "run", "start"]