import { google } from "googleapis";
import getGoogleAuth from "./getGoogleAuth.js";

const getGoogleDocData = async ({ documentId }: { documentId: string }) => {
  const auth = await getGoogleAuth();
  const result = await google.docs("v1").documents.get({
    documentId,
    auth,
  });
  const title = result.data.title;
  const content = result.data.body?.content;

  // Function to extract text from the document content
  const extractText = (contentArray: any[]) => {
    let parsedText = "";
    if (contentArray && contentArray.length) {
      contentArray.forEach((element) => {
        if (element.paragraph) {
          const paragraphElements = element.paragraph.elements;
          paragraphElements.forEach((elem: any) => {
            if (elem.textRun && elem.textRun.content) {
              parsedText += elem.textRun.content; // Append the text content
            }
          });
        }
      });
    }
    return parsedText;
  };

  const parsedContent = extractText(content!);
  const output = `Title: ${title}\nContent:\n${parsedContent}`;
  return output;
};
export default getGoogleDocData;
