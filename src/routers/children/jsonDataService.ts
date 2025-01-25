import { db } from "lib/db";

export const jsonDataService = {
  async findByKey(key: string) {
    return await db.jsonData.findFirst({
      where: { key },
    });
  },

  async findByKeyLike(key: string) {
    return await db.$queryRaw`
      SELECT * FROM "JsonData"
      WHERE "key" LIKE ${key}
      ORDER BY "createdAt" DESC`;
  },

  async createOrUpdate(data: {
    key: string;
    value: any;
    version?: string;
    expireAt?: Date;
  }) {
    const jsonData = await this.findByKey(data.key);

    if (!jsonData) {
      return await db.jsonData.create({
        data,
      });
    }

    return await db.jsonData.update({
      where: { key: data.key },
      data: {
        value: data.value,
        version: data.version,
        expireAt: data.expireAt,
      },
    });
  },

  async createMany(
    dataArray: Array<{
      key: string;
      value: any;
      version?: string;
      expireAt?: Date;
    }>
  ) {
    return await db.jsonData.createMany({
      data: dataArray,
      skipDuplicates: true, // Skips duplicates if key already exists
    });
  },

  async deleteByKey(key: string) {
    return await db.jsonData.delete({
      where: { key },
    });
  },

  async deleteByKeyLike(key: string) {
    return await db.$executeRaw`
      DELETE FROM "JsonData"
      WHERE "key" LIKE ${key}`;
  },
};
