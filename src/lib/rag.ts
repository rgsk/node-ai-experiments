import { Prisma } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import { v4 } from "uuid";
import { db } from "./db.js";
import openAIClient from "./openAIClient.js";
export const createEmbeddings = async (
  data: {
    content: string;
    metadata?: JsonValue;
    collectionName: string;
    source: string;
  }[]
) => {
  const responses = await openAIClient.embeddings.create({
    model: "text-embedding-ada-002",
    input: data.map((d) => d.content),
  });
  const values = responses.data.map((res, index) => {
    const entry = data[index];

    return [
      v4(),
      entry.collectionName,
      entry.source,
      entry.metadata ?? {},
      entry.content,
      res.embedding,
    ];
  });
  const count = await db.$executeRaw`
    INSERT INTO "Document" ("id", "collectionName", "source", "metadata", "content", "embedding") 
    VALUES ${Prisma.join(
      values.map((row) => Prisma.sql`(${Prisma.join(row)})`)
    )};
  `;
  return { count };
};

export async function retrieveRelevantDocs({
  query,
  collectionName,
  source,
  limit = 5,
}: {
  query: string;
  collectionName: string;
  source: string;
  limit?: number;
}) {
  const response = await openAIClient.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });

  const embedding = response.data[0].embedding;

  const result = await db.$queryRaw`
  SELECT "collectionName", "source", "metadata", "content" FROM "Document"
  where "collectionName" = ${collectionName} AND "source" = ${source}
  ORDER BY embedding <-> ${embedding}::vector LIMIT ${limit}
  `;

  return result as {
    collectionName: string;
    source: string;
    metadata: JsonValue;
    content: string;
  }[];
}
