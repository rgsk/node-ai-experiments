import axios from "axios";
import environmentVars from "./environmentVars.js";
import { encodeQueryParams } from "./utils.js";

const axiosInstance = axios.create({
  baseURL: environmentVars.PYTHON_EXPERIMENTS_SERVER_URL,
});

const aiService = {
  getWebpageContent: async (url: string) => {
    const result = await axiosInstance.get<{
      title: string;
      description: string;
      og?: {
        site_name: string;
        type: string;
        title: string;
        description: string;
        image: string;
        url: string;
      };
      content: string;
    }>(`/webpage-content?${encodeQueryParams({ url })}`);
    return result.data;
  },
  getClashRoyaleCards: async (url: string) => {
    const result = await axiosInstance.get<string[]>(
      `/clash-royale-cards?${encodeQueryParams({ url })}`
    );
    return result.data;
  },
};
export default aiService;
