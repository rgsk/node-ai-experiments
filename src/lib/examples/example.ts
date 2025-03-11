import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { db } from "../db.js";
import openAIClient from "../openAIClient.js";
const createEmbeddings1 = async (texts: string[]) => {
  console.log("Generating embeddings...");

  // Generate embeddings for all texts
  const responses = await openAIClient.embeddings.create({
    model: "text-embedding-ada-002",
    input: texts,
  });
  const text = texts[0];
  const collectionName = "exampleCollection";
  const source = "website";
  const metadata = {
    source: "user_input",
    length: text.length,
    createdAt: new Date().toISOString(),
  };
  const embedding = responses.data[0].embedding;
  // Prepare the SQL query dynamically
  const values = responses.data.map((res, index) => {
    const text = texts[index];
    const collectionName = "exampleCollection";
    const source = "website";
    const metadata = {
      source: "user_input",
      length: text.length,
      createdAt: new Date().toISOString(),
    };

    return [v4(), collectionName, source, metadata, text, res.embedding];
  });
  //
  const result = await db.$executeRaw`
    INSERT INTO "Document" ("id", "collectionName", "source", "metadata", "content", "embedding") 
    VALUES 
    ${Prisma.join(values.map((row) => Prisma.sql`(${Prisma.join(row)})`))}
      
      ;
  `;
  console.log(result);
  console.log("Inserted successfully");
};

async function retrieveRelevantDocs12(query: string) {
  const response = await openAIClient.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });

  const embedding = response.data[0].embedding;

  const result = await db.$queryRaw`
  SELECT "collectionName", "source", "metadata", "content" FROM "Document"
  ORDER BY embedding <-> ${embedding}::vector LIMIT 1
  `;

  return result as {
    collectionName: string;
    source: string;
    metadata: any;
    content: string;
  }[];
}

const example = async () => {
  //   const result = await createEmbeddings([
  //     {
  //       collectionName: "fsd",
  //       source: "fsdff",
  //       content: "ffffff",
  //     },
  //   ]);
  //   console.log(result);
  //   const fds = await retrieveRelevantDocs({
  //     query: "hii",
  //     collectionName: "fsd",
  //     source: "fsdff",
  //     limit: 1,
  //   });
  //   console.log(fds);
  //   const result = await deleteSource({
  //     collectionName: "exampleCollection",
  //     source: "fdf",
  //   });
  //   console.log(result);
};

export default example;
