import aiService from "lib/aiService";
import { Persona } from "lib/typesJsonData";

const getRelevantDocs = async ({
  query,
  persona,
}: {
  query: string;
  persona: Persona;
}) => {
  //   console.log({ query });
  const relevantDocs = await aiService.getRelevantDocs({
    query: query,
    collectionName: persona.collectionName,
  });
  //   console.log(relevantDocs);
  return relevantDocs;
};
export default getRelevantDocs;
