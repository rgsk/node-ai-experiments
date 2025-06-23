// const axiosInstance = axios.create({
//   baseURL: environmentVars.PYTHON_EXPERIMENTS_SERVER_URL,
// });

// const aiService = {
//   getRelevantDocs: async ({
//     query,
//     collectionName,
//     sources,
//     numDocs,
//   }: {
//     query: string;
//     collectionName: string;
//     sources?: string[];
//     numDocs?: number;
//   }) => {
//     const queryString = encodeQueryParams({
//       query,
//       collection_name: collectionName,
//       sources: sources,
//       num_docs: numDocs,
//     });
//     const result = await axiosInstance.get<
//       {
//         id: string;
//         page_content: string;
//         metadata: { source: string };
//       }[]
//     >(`/relevant_docs?${queryString}`);
//     return result.data;
//   },
//   getWebpageContent: async (url: string) => {
//     const result = await axiosInstance.get<{
//       title: string;
//       description: string;
//       og?: {
//         site_name: string;
//         type: string;
//         title: string;
//         description: string;
//         image: string;
//         url: string;
//       };
//       content: string;
//     }>(`/webpage-content?${encodeQueryParams({ url })}`);
//     return result.data;
//   },
// };
// export default aiService;
