/* Webhook service using express-based server (for replit compatibility) */

import { default as Express } from 'express';
import fs from 'fs';
import websocket from 'ws';
import https from 'https';
import http, { Server } from 'http';

import config from '../../config.json';
import { sendLog, LogType } from '../utils/eventLogger';


export const isHttpsMode = config.https.certificate && config.https.key;
//let socketServer : websocket.Server = null;
/*
const restServer = fastify.fastify({
    logger: false,
    serverFactory: (handler, opt) => {
        / Although http2 is compatible with fastify (tested with js), typescript disliked it thus we won't be using it for now
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
}); */
const restServer = Express();
// Configure Websocket Server
const socketServer = new websocket.Server({ noServer: true, path: "/api/v1/websocket" });
//@ts-ignore For some reason, this type check keeps failing dispite the fact that it's a valid usage.
restServer.on('upgrade', (request, socket, head) => {
    socketServer.handleUpgrade(request, socket, head, (ws) => {
        socketServer.emit('connection', ws, request);
    });
});
// Start Server
if(isHttpsMode) {
    // Enable HTTPS Mode
    restServer.listen(config.webServerPort || 443, "0.0.0.0",()=> {
        console.log("Internal Webserver launched (HTTPS Mode)...");
        sendLog(LogType.Info, "Webserver has been successfully launched", {"Mode": "HTTPS"});
    });
} else {
    // Enable HTTP Mode
    restServer.listen(config.webServerPort || 80, "0.0.0.0",()=>{
        console.log("Internal Webserver launched (HTTP Mode)...")
        sendLog(LogType.Info, "Webserver has been successfully launched", {"Mode": "HTTP"});
    });
}

export {
    restServer,
    socketServer,
};