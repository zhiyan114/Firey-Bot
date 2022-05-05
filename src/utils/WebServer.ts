/* Webhook service using express-based server (for replit compatibility) */

import * as fastify from 'fastify';
import fs from 'fs';
import websocket from 'ws';
import https from 'https';
import http from 'http';
import middie from 'middie';

import config from '../../config.json';
import { sendLog, LogType } from '../utils/eventLogger';


const isHttpsMode = config.https.certificate && config.https.key;
let socketServer : websocket.Server = null;
const restServer = fastify.fastify({
    logger: false,
    serverFactory: (handler, opt) => {
        /* Although http2 is compatible with fastify (tested with js), typescript disliked it thus we won't be using it for now */
        if(isHttpsMode) {
            const secureServer = new https.Server({
                key: fs.readFileSync(config.https.key),
                cert: fs.readFileSync(config.https.certificate),
            },handler);
            socketServer = new websocket.Server({ server: secureServer as any, path: "/api/v1/websocket" });
            return secureServer;
        } else {
            const server = http.createServer(handler)
            socketServer = new websocket.Server({ server: server, path: "/api/v1/websocket" });
            return server;
        }
    }
});
restServer.register(middie);
if(isHttpsMode) {
    // Enable HTTPS Mode
    restServer.register(require('fastify-https-redirect'));
    restServer.listen(443, "0.0.0.0",()=> {
        console.log("Internal Webserver launched (HTTPS Mode)...");
        sendLog(LogType.Info, "Webserver has been successfully launched", {"Mode": "HTTPS"});
    });
} else {
    // Enable HTTP Mode
    restServer.listen(80, "0.0.0.0",()=>{
        console.log("Internal Webserver launched (HTTP Mode)...")
        sendLog(LogType.Info, "Webserver has been successfully launched", {"Mode": "HTTP"});
    });
}

export {
    restServer,
    socketServer,
};