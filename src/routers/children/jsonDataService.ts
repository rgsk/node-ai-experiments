import { JsonData, Prisma } from "@prisma/client";
import { Sql } from "@prisma/client/runtime/library";
import { db } from "../../lib/db.js";
export type JsonDataValue<T> = Omit<JsonData, "value"> & { value: T };
export const jsonDataService = {
  async findByKey<T>(key: string) {
    return (await db.jsonData.findFirst({
      where: { key },
    })) as JsonDataValue<T> | null;
  },

  async findByKeyLike<T>({
    key,
    page,
    perPage,
    valueFilters,
  }: {
    key: string;
    page?: number;
    perPage?: number;
    valueFilters?: Sql;
  }) {
    const res = await db.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*) AS count FROM "JsonData"
    WHERE "key" LIKE ${key}
    ${valueFilters ?? Prisma.sql``}
  `;

    const count = Number(String(res[0].count));

    const data = (await db.$queryRaw`
      SELECT * FROM "JsonData"
      WHERE "key" LIKE ${key}
      ${valueFilters ?? Prisma.sql``}
      ORDER BY "createdAt" DESC
      
      ${
        page !== undefined
          ? Prisma.sql`LIMIT ${perPage ?? 10} OFFSET ${
              (page - 1) * (perPage ?? 10)
            }`
          : Prisma.sql``
      }
    `) as JsonDataValue<T>[];
    return { data, count };
  },
  getRowNumber: async ({
    key,
    keyLike,
    valueFilters,
  }: {
    key: string;
    keyLike: string;
    valueFilters?: Sql;
  }) => {
    const res = await db.$queryRaw<{ rank: number }[]>`
WITH ranked_data AS (
  SELECT 
    *,
    RANK() OVER (ORDER BY "createdAt" DESC) AS rank
  FROM "JsonData"
  WHERE "key" LIKE ${keyLike}
  ${valueFilters ?? Prisma.sql``}
)
SELECT rank
FROM ranked_data
WHERE "key" = ${key};
  `;

    if (res[0] === undefined) {
      return 0;
    }
    const rank = Number(String(res[0].rank));
    return rank;
  },

  async createOrUpdate<T>(data: {
    key: string;
    value: T;
    version?: string;
    expireAt?: Date;
  }) {
    const jsonData = await this.findByKey(data.key);
    if (!jsonData) {
      return (await db.jsonData.create({
        data: {
          key: data.key,
          value: data.value as any,
          version: data.version,
          expireAt: data.expireAt,
        },
      })) as JsonDataValue<T>;
    }
    return (await db.jsonData.update({
      where: { key: data.key },
      data: {
        value: data.value as any,
        version: data.version,
        expireAt: data.expireAt,
      },
    })) as JsonDataValue<T>;
  },

  async createMany<T>(
    dataArray: Array<{
      key: string;
      value: T;
      version?: string;
      expireAt?: Date;
    }>
  ) {
    const baseTime = Date.now();
    return await db.jsonData.createMany({
      data: dataArray.map((d, i) => ({
        ...d,
        value: d.value as any,
        createdAt: new Date(baseTime + i),
      })),
      skipDuplicates: true, // Skips duplicates if key already exists
    });
  },

  async deleteByKey<T>(key: string) {
    return (await db.jsonData.delete({
      where: { key },
    })) as JsonDataValue<T>;
  },

  async deleteKeys<T>(keys: string[]) {
    return await db.jsonData.deleteMany({
      where: { key: { in: keys } },
    });
  },

  async deleteByKeyLike(key: string) {
    return await db.$executeRaw`
      DELETE FROM "JsonData"
      WHERE "key" LIKE ${key}`;
  },
};
