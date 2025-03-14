import { JsonData } from "@prisma/client";
import { db } from "../../lib/db.js";
export type JsonDataValue<T> = Omit<JsonData, "value"> & { value: T };
export const jsonDataService = {
  async findByKey<T>(key: string) {
    return (await db.jsonData.findFirst({
      where: { key },
    })) as JsonDataValue<T> | null;
  },

  async findByKeyLike<T>(key: string) {
    return (await db.$queryRaw`
      SELECT * FROM "JsonData"
      WHERE "key" LIKE ${key}
      ORDER BY "createdAt" DESC`) as JsonDataValue<T>[];
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
    return await db.jsonData.createMany({
      data: dataArray.map((d) => ({ ...d, value: d.value as any })),
      skipDuplicates: true, // Skips duplicates if key already exists
    });
  },

  async deleteByKey<T>(key: string) {
    return (await db.jsonData.delete({
      where: { key },
    })) as JsonDataValue<T>;
  },

  async deleteByKeyLike(key: string) {
    return await db.$executeRaw`
      DELETE FROM "JsonData"
      WHERE "key" LIKE ${key}`;
  },
};
