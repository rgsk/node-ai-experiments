import { PrismaClient } from "@prisma/client";
export const db = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
  ],
});
const LOG_POSTGRES_CALLS = false;
db.$on("query", async (e: any) => {
  if (LOG_POSTGRES_CALLS) {
    console.log(`${e.query} ${e.params}`);
  }
});
