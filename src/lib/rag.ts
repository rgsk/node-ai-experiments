import { Prisma } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import { v4 } from "uuid";
import { db } from "./db.js";
import openAIClient from "./openAIClient.js";
import { chunkWithOverlap } from "./utils.js";
const createEmbeddings = async (
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

async function retrieveRelevantDocs({
  query,
  collectionName,
  sources,
  limit = 5,
}: {
  query: string;
  collectionName: string;
  sources?: string[];
  limit?: number;
}) {
  const response = await openAIClient.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });

  const embedding = response.data[0].embedding;

  const result = await db.$queryRaw`
  SELECT "collectionName", "source", "metadata", "content" FROM "Document"
  WHERE "collectionName" = ${collectionName} ${
    sources
      ? Prisma.sql`AND "source" in (${Prisma.join(sources)})`
      : Prisma.sql``
  }
  ORDER BY embedding <-> ${embedding}::vector LIMIT ${limit}
  `;

  return result as {
    collectionName: string;
    source: string;
    metadata: JsonValue;
    content: string;
  }[];
}

async function deleteCollection({
  collectionName,
}: {
  collectionName: string;
}) {
  const count = await db.$executeRaw`
    DELETE FROM "Document"
    WHERE "collectionName" = ${collectionName}
  `;
  return { count };
}
async function deleteSource({
  collectionName,
  source,
}: {
  collectionName: string;
  source: string;
}) {
  const count = await db.$executeRaw`
    DELETE FROM "Document"
    WHERE "collectionName" = ${collectionName} AND "source" = ${source}
  `;
  return { count };
}

const embedContent = async ({
  data: { content, metadata, collectionName, source },
  config: { chunkLength, overlapLength },
}: {
  data: {
    content: string;
    metadata?: JsonValue;
    collectionName: string;
    source: string;
  };
  config: {
    chunkLength: number;
    overlapLength: number;
  };
}) => {
  // break contents into chunks
  content = content.replace(/\x00/g, "\uFFFD");
  const chunks = chunkWithOverlap(content, chunkLength, overlapLength);
  const result = await createEmbeddings(
    chunks.map((chunk) => ({
      content: chunk as string,
      collectionName,
      source,
      metadata,
    }))
  );
  return result;
};

const summariseChunk = async (chunk: string) => {
  const prompt = `
    give a short summary of below text - 
    <text>${chunk}</text>
  `;
  const r = await openAIClient.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o",
  });
  return r.choices[0].message?.content ?? "";
};

const summariseContent = async ({
  data: { content },
  config: { chunkLength, overlapLength },
}: {
  data: {
    content: string;
  };
  config: {
    chunkLength: number;
    overlapLength: number;
  };
}) => {
  const chunks = chunkWithOverlap(content, chunkLength, overlapLength);
  // console.log(`chunks count: ${chunks.length}`);
  const result = await Promise.all(
    chunks.map((chunk) => summariseChunk(chunk as string))
  );
  const prompt = `
    give a summary of below text - 
    <text>${result.join("\n")}</text>
  `;
  const r = await openAIClient.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o",
  });
  return r.choices[0].message?.content ?? "";
};

const rag = {
  createEmbeddings,
  retrieveRelevantDocs,
  deleteCollection,
  deleteSource,
  embedContent,
  summariseContent,
};
export default rag;
