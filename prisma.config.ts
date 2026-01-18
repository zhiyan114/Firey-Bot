import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env["POSTGRESQL_CONN"] ? env('POSTGRESQL_CONN') : undefined,
  }
});