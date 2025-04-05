import { split as sentenceSplitter } from "sentence-splitter";

// Function to get audio stream by sentence
export const getAudioStreamBySentence = async function* (
  textStream: AsyncIterable<string>,
  getAudioStream: (text: string) => AsyncIterable<Uint8Array>
) {
  for await (const sentence of segmentTextBySentenceStream(textStream)) {
    for await (const chunk of getAudioStream(sentence)) {
      yield chunk;
    }
  }
};

// Function to segment text by sentence
const segmentTextBySentenceStream = async function* (
  stream: AsyncIterable<string>
) {
  const minLength = 30;
  let buffer = "";

  for await (const chunk of stream) {
    buffer += chunk;
    const sentences = sentenceSplitter(buffer)
      .filter((item) => item.type === "Sentence")
      .map((item) => item.raw);

    if (sentences.length > 1) {
      const res = sentences.slice(0, -1).join("");
      if (res.length > minLength) {
        yield res;
        buffer = sentences[sentences.length - 1];
      }
    }
  }

  if (buffer) {
    yield buffer;
  }
};

export async function* chunkBuffer(
  stream: AsyncIterable<Uint8Array>,
  chunkSize: number
): AsyncIterable<Uint8Array> {
  let buffer = new Uint8Array(0);

  for await (const value of stream) {
    const newBuffer = new Uint8Array(buffer.length + value.length);
    newBuffer.set(buffer);
    newBuffer.set(value, buffer.length);
    buffer = newBuffer;

    while (buffer.length >= chunkSize) {
      yield buffer.slice(0, chunkSize);
      buffer = buffer.slice(chunkSize);
    }
  }

  if (buffer.length > 0) {
    yield buffer; // Yield any remaining data in the buffer
  }
}

export const parseReaderByChunks = async function* (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  chunkSize: number
) {
  const stream = {
    async *[Symbol.asyncIterator]() {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) yield value;
      }
    },
  };

  yield* chunkBuffer(stream, chunkSize);
};
