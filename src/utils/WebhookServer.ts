/* Webhook service using express-based server (for replit compatibility) */

import express from 'express';
const server = express();

server.listen(80,()=>{});
export default server;