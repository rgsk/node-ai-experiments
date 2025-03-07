import mcpClient from "lib/mcpClient";
//  nr run-js-file dist/examples/exampleMcpClient.js
const practice = async () => {
  const mcpToolsSchema = await mcpClient.listTools();
  console.log(mcpToolsSchema);
  const result = await mcpClient.callTool({
    name: "saveUserInfoToMemory",
    arguments: {
      statement: "hii",
      userEmail: "rahulguptasde@gmail.com",
    },
  });
  console.log(result);
};
practice();
