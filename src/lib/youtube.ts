import { YoutubeTranscript } from "youtube-transcript";
import { getOpenAIClient } from "./openAIClient.js";

interface SummaryItem {
  offset: number;
  text: string;
}
interface ChapterItem {
  offset: number;
  title: string;
}

export function chunkWithOverlap<T>(
  arr: T[],
  chunkLength: number,
  overlapLength = 0
): T[][] {
  if (chunkLength <= 0) throw new Error("chunkLength must be positive");
  if (overlapLength < 0 || overlapLength >= chunkLength)
    throw new Error("invalid overlapLength");
  const chunks: T[][] = [];
  let i = 0;
  while (i < arr.length) {
    chunks.push(arr.slice(i, i + chunkLength));
    i += chunkLength - overlapLength;
  }
  return chunks;
}

async function getSummaries(chunk: string[]): Promise<SummaryItem[]> {
  const sampleOutput = { summaries: [{ offset: 0, text: "" }] };
  const content = `
    Your task is to create a JSON list of summaries with timestamps based on the transcript of a video.
    Transcript lines are in the format offsetInSeconds-text
    Here is the chunk:
    ${JSON.stringify(chunk)}
    Return a JSON object with the key "summaries".
    ${JSON.stringify(sampleOutput)}
  `;
  const { openAIClient } = getOpenAIClient();
  const r = await openAIClient.chat.completions.create({
    messages: [{ role: "user", content }],
    model: "gpt-4o",
    response_format: { type: "json_object" },
  });
  console.log("summary tokens:", r.usage?.total_tokens);
  const raw = r.choices[0].message?.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    return parsed.summaries || [];
  } catch {
    return [];
  }
}

async function getChapters(summaries: string[]): Promise<ChapterItem[]> {
  const sampleOutput = { chapters: [{ offset: 0, title: "" }] };
  const content = `
    Your task is to create JSON chapters with timestamps from these summary lines:
    ${JSON.stringify(summaries)}
    Return a JSON object with the key "chapters".
    ${JSON.stringify(sampleOutput)}
    title should be around 5 words long.
  `;
  const { openAIClient } = getOpenAIClient();
  const r = await openAIClient.chat.completions.create({
    messages: [{ role: "user", content }],
    model: "gpt-4o",
    response_format: { type: "json_object" },
  });
  console.log("chapters tokens:", r.usage?.total_tokens);
  const raw = r.choices[0].message?.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    return parsed.chapters || [];
  } catch {
    return [];
  }
}

export async function generateChapters(videoId: string) {
  const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  const lines = transcript.map((i) => `${i.offset}-${i.text}`);
  if (lines.length < 1000) {
    return getChapters(lines);
  }
  const chunks = chunkWithOverlap(lines, 1000, 5);
  console.log(`Total chunks: ${chunks.length}`);
  const summaries = await Promise.all(
    chunks.map((chunk) => {
      return getSummaries(chunk);
    })
  );
  const allSummaries = summaries.flat();
  const summaryLines = allSummaries.map((s) => `${s.offset}-${s.text}`);
  return getChapters(summaryLines);
}
