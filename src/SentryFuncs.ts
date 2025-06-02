import type { Breadcrumb, ErrorEvent, EventHint, StackFrame } from "@sentry/node";
import type { TransactionEvent } from "@sentry/core";
import { relative } from "path";
import { DiscordAPIError, DiscordjsError } from "discord.js";
import { APIErrors } from "./utils/discordErrorCode";
import { Prisma } from "@prisma/client";
import { errors } from 'undici';

const errCntDB = new Map<string, number>();

export function beforeSend(event: ErrorEvent, hint: EventHint) {
  const ex = hint.originalException;

  // Ignore the unhandlable errors
  if(ex instanceof DiscordAPIError && ex.code === APIErrors.UNKNOWN_INTERACTION) return null; // Nothing we can do, really...
  if(ex instanceof DiscordjsError && ex.code === "GuildMembersTimeout") return null; // Known issue with discord's backend API
  if(ex instanceof Prisma.PrismaClientKnownRequestError && ex.code === "P1017") return null; // Somehow...
  if(ex instanceof Error && ex.message.includes('Could not load the "sharp"')) return null; // Holy Hell, sharp...
  if(ex instanceof errors.SocketError && ex.message === "other side closed") return null; // Probably just discord's WS downtime

  // Ignore same errors if seen more than 5 times
  if(typeof(ex) === "string") {
    const cnt = errCntDB.get(ex) ?? 0;
    if(cnt > 5) return null;
    errCntDB.set(ex, cnt + 1);
  }
  if(typeof(ex) === "number" || typeof(ex) === "bigint") {
    const cnt = errCntDB.get(ex.toString()) ?? 0;
    if(cnt >= 5) return null;
    errCntDB.set(ex.toString(), cnt + 1);
  }
  if(ex instanceof Error) {
    const cnt = errCntDB.get(ex.name+ex.message) ?? 0;
    if(cnt >= 5) return null;
    errCntDB.set(ex.name+ex.message, cnt + 1);
  }

  return event;
}

export function beforeBreadcrumb(breadcrumb: Breadcrumb) {
  // List of urls to ignore
  const ignoreUrl = [
    "https://api.twitch.tv",
    "https://o125145.ingest.sentry.io", // Why is sentry being added to BC?????
  ];

  // Ignore Http Breadcrumbs from the blacklisted url
  if(breadcrumb.category === "http" &&
    ignoreUrl.find(url=>breadcrumb.data?.url.startsWith(url))) return null;
  return breadcrumb;
}

export function frameStackIteratee(frame: StackFrame) {
  const absPath = frame.filename;
  if(!absPath) return frame;

  // Set the base path as the dist output to match the naming artifact on sentry
  frame.filename = `/${relative(__dirname, absPath).replace(/\\/g, "/")}`;
  return frame;
}

export function beforeSendTransaction(transaction: TransactionEvent) {
  // Ignore callback stuff from PubSubHubbubAdd commentMore actions
  if(new RegExp("/UwU/youtube/callback/").test(transaction.transaction ?? ""))
    return null;
  if(new RegExp("/test/").test(transaction.transaction ?? ""))
    return null;
  // Drop Prisma only transactionsAdd commentMore actions
  if(transaction.transaction?.startsWith("prisma:"))
    return null;
  return transaction;
}