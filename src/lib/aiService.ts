import axios from "axios";
import environmentVars from "./environmentVars";
import { encodeQueryParams } from "./generalUtils";

const axiosInstance = axios.create({
  baseURL: environmentVars.PYTHON_EXPERIMENTS_SERVER_URL,
});

const aiService = {
  getRelevantDocs: async ({
    query,
    collectionName,
    sources,
    numDocs,
  }: {
    query: string;
    collectionName: string;
    sources?: string[];
    numDocs?: number;
  }) => {
    const queryString = encodeQueryParams({
      query,
      collection_name: collectionName,
      sources: sources,
      num_docs: numDocs,
    });
    const result = await axiosInstance.get<
      {
        id: string;
        page_content: string;
        metadata: { source: string };
      }[]
    >(`/relevant_docs?${queryString}`);
    return result.data;
  },
};
export default aiService;
