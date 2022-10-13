import { MongoClient, ServerApiVersion } from "mongodb";
export const dbclient = new MongoClient(process.env['MONGODB_CONN'] as string, {
  sslKey: process.env['MONGODB_CERT'],
  sslCert: process.env['MONGODB_CERT'],
  serverApi: ServerApiVersion.v1
});