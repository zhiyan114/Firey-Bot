/* Webhook service using express-based server (for replit compatibility) */

import { default as Express } from 'express';
import websocket from 'ws';
import https from 'https';
import http from 'http';
import {webServer as webConf} from '../config';
import { sendLog, LogType } from '../utils/eventLogger';


export const isHttpsMode = webConf.https.certificate && webConf.https.key;
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
export const restServer = Express();
let internalServer : https.Server | http.Server;
if(isHttpsMode) {
    internalServer = https.createServer(restServer);
} else {
    internalServer = http.createServer(restServer);
}
// Configure Websocket Server
export const socketServer = new websocket.Server({ server: internalServer, path: "/api/v1/websocket" });

// No internal websocket implementation, just log and kick off illegal client
socketServer.on('connection', (socket, req) => {
    console.log("Illegal webSocket connection established...");
    sendLog(LogType.Warning, "Illegal webSocket connection established",{
        IP: req.socket.remoteAddress || "Unavailable",
    });
    socket.close(1011);
});

// Start Server

let strMode = isHttpsMode ? "HTTPS" : "HTTP";
internalServer.listen(webConf.Port || (isHttpsMode ? 443 : 80), "0.0.0.0", undefined,()=> {
    console.log(`Internal Webserver launched (${strMode} Mode)...`);
});