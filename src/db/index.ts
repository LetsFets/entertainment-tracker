import { drizzle } from "drizzle-orm/libsql";

export const db = drizzle({
  connection: {
    // biome-ignore lint/style/noNonNullAssertion: We have a .env file so we expect this to be fine
    url: process.env.DATABASE_URL!,
  },
});
