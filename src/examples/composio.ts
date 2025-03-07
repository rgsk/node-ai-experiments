import composioToolset from "lib/composioToolset";
import { writeFile } from "lib/generalUtils";
import openAIClient from "lib/openAIClient";
const practice = async () => {
  const tools = await composioToolset.getTools({
    apps: ["googlesheets"],
  });
  console.log(tools);
  writeFile("basic.json", JSON.stringify(tools));
  const completion = await openAIClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content:
          "analyse data in the sheet, call the tool perform a batch get on a specific spreadsheet - https://docs.google.com/spreadsheets/d/1cq2PIO46rZo9QWPwfIg167HdkJgeCpBX9RrK3dgy20g/edit?gid=0#gid=0?",
      },
    ],
    tools,
  });

  console.log("tool_calls", completion.choices[0].message.tool_calls);
  const toolCall = completion.choices[0].message.tool_calls?.[0];
  if (toolCall) {
    // toolCall.function.name
    const resp = await composioToolset.executeToolCall(toolCall);
    console.log(resp);
  }
};
practice();
