import aiService from "lib/aiService";

const practice = async () => {
  console.log("practice");
  const result = await aiService.getRelevantDocs({
    query: "software",
    collectionName: "8ee917e6-f9e5-4d0c-bb46-a36e50911aa1",
  });
  console.log(result);
};
practice();
