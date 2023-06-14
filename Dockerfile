# Add the node 18.x
FROM node:18.3.0-alpine3.14
WORKDIR /source/

# Setup and install node packages
COPY package.json package-lock.json ./
RUN npm install
RUN npm run build

# Exposed web server port and move rest of the source code
COPY . .
EXPOSE ${WEBSERVER_PORT}

CMD ["npm", "run", "start"]