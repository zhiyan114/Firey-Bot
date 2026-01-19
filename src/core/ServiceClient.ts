import { baseClient } from "./baseClient";
import Express, { type NextFunction } from "express";
import { captureException, getIsolationScope, httpRequestToRequestData } from "@sentry/core";
import http from 'http';
import https from "https";
import { sendLog } from "../utils/eventLogger";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Redis from "ioredis";
import { redisPrefix } from "../config.json";
import { RedisEvents } from "../events";


// Sentry JS SDK Implementation
interface MiddlewareError extends Error {
  status?: number | string;
  statusCode?: number | string;
  status_code?: number | string;
  output?: {
    statusCode?: number | string;
  };
}

export class ServiceClient extends baseClient {
  private _prisma: PrismaClient;
  private _redis;
  private _express;
  private rawServer;
  constructor() {
    super();
    // Express Handler
    this._express = Express();
    this.rawServer = (process.env["WEBSERVER_HTTPS"] === "true") ?
      https.createServer(this._express) : http.createServer(this._express);
    this._express.get("/test/", this.HealthRoute);

    // Prisma Handler
    this._prisma = new PrismaClient({
      errorFormat: "minimal",
      adapter: new PrismaPg({ connectionString: process.env["POSTGRESQL_CONN"] })
    });

    // Redis Handler
    this._redis = new Redis((process.env["ISDOCKER"] && !process.env["REDIS_CONN"]) ?
      "redis://redis:6379" : process.env["REDIS_CONN"] ?? "", {
      keyPrefix: `${redisPrefix}:`,
      enableReadyCheck: false,
    });
    new RedisEvents(this._redis)
      .registerEvents();
  }

  public async start() {
    const port = process.env["WEBSERVER_PORT"];
    this.rawServer.listen((port && !Number.isNaN(parseInt(port))) ? parseInt(port) : 8080, ()=> {
      sendLog({
        type: "Info",
        message: "Web server started!"
      });
    });
    await this.prisma.$connect();
    if(this.redis.status === "close")
      await this.redis.connect();
  }

  public preProcess() {
    this._express.use(this.preScopeMidware);
  }

  public postProcess() {
    this._express.use(this.errMiddleWare);
  }

  public async dispose() {
    await new Promise<void>((resolve, reject) => this.rawServer.close((err)=> err ? reject(err) : resolve()));
    await this.prisma.$disconnect();
    await this.redis.quit();
  }

  get express() {
    return this._express;
  }

  get prisma() {
    return this._prisma;
  }

  get redis() {
    return this._redis;
  }

  private HealthRoute(req: Express.Request, res: Express.Response) {
    res.status(200).send("You have been OwO");
  }

  private errMiddleWare(err: MiddlewareError, req: http.IncomingMessage, res: http.ServerResponse, next: NextFunction) {
    const statusCode = parseInt((err.status ?? err.statusCode ?? err.status_code ?? err.output?.statusCode ?? "500") as string, 10);
    getIsolationScope().setSDKProcessingMetadata({ normalizedRequest: httpRequestToRequestData(req) });
    if(statusCode >= 500)
      (res as { sentry?: string }).sentry = captureException(err, { mechanism: { type: 'middleware', handled: false } });
    next(err);
  }

  private preScopeMidware(req: http.IncomingMessage, res: http.ServerResponse, next: NextFunction) {
    getIsolationScope()
      .setAttributes({
        platform: "ExpressJS",
        userAgent: req.headers["user-agent"]
      })
      .setTags({
        platform: "ExpressJS",
        userAgent: req.headers["user-agent"]
      });

    next();
  }
}