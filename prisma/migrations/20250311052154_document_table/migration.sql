CREATE EXTENSION IF NOT EXISTS vector;


-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "collectionName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);
