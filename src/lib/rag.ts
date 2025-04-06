import { Prisma } from "@prisma/client";
import { JsonValue } from "@prisma/client/runtime/library";
import { v4 } from "uuid";
import { db } from "./db.js";
import openAIClient from "./openAIClient.js";
import { chunkWithOverlap, html } from "./utils.js";
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

const processFileMessage = async (props: {
  content: string;
  source: string;
  collectionName: string;
  ragAllowed?: boolean;
}) => {
  const { content, source, collectionName, ragAllowed = true } = props;
  const ragContentLengthThreshold = 10000;
  if (ragAllowed && content.length > ragContentLengthThreshold) {
    await rag.deleteSource({ collectionName, source });
    const { count } = await rag.embedContent({
      data: {
        content: content,
        source: source,
        collectionName: collectionName,
      },
      config: {
        chunkLength: 250,
        overlapLength: 0,
      },
    });
    const summary = await rag.summariseContent({
      data: { content },
      config: {
        chunkLength: 2000,
        overlapLength: 0,
      },
    });

    return {
      summary,
      embeddingCount: count,
      type: "rag",
      instruction: html`
        <span>
          user entered a url or attached a file, it's contents were too large to
          fit inside context window, so you are made available it's summary, if
          it's appropriate to fetch more specific details, you can use
          retrieveRelevantDocs tool
        </span>

        here are it's creds that you can use to call the tool
        retrieveRelevantDocs:
        ${JSON.stringify({
          source,
          collectionName,
        })}
      `,
    };
  } else {
    return {
      content,
      type: "full",
      instruction: html`
        for this file or url, this is the full parsed content, use these
        contents to answer the user query
      `,
    };
  }
};

const rag = {
  createEmbeddings,
  retrieveRelevantDocs,
  deleteCollection,
  deleteSource,
  embedContent,
  summariseContent,
  processFileMessage,
};
export default rag;
