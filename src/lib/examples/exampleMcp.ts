import experimentsMcpClient, {
  experimentsMcpTransport,
} from "../experimentsMcpClient.js";

const practice = async () => {
  await experimentsMcpClient.connect(experimentsMcpTransport);
  const userEmail = "rahulguptasde@gmail.com";
  //   const memoriesResult = await experimentsMcpClient.readResource({
  //     uri: `users://${userEmail}/memories`,
  //   });
  //   console.log(memoriesResult);
  //   const result = await experimentsMcpClient.callTool({
  //     name: "saveUserInfoToMemory",
  //     arguments: {
  //       statement: `${new Date().getTime()}`,
  //       userEmail,
  //     },
  //   });
  //   console.log(result);
  //   const resources = await experimentsMcpClient.listResourceTemplates();
  //   console.log(resources);
  const prompt = await experimentsMcpClient.getPrompt({
    name: "memory",
    arguments: {
      userEmail,
    },
  });
  console.dir(prompt, { depth: null });
};

practice();
