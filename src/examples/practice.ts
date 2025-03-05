import { OpenAIToolSet } from "composio-core";
import openAIClient from "lib/openAIClient";
const practice = async () => {
  const composioToolset = new OpenAIToolSet({
    apiKey: "m9szfhv52wlo9kp5s72qh",
  });

  const tools = await composioToolset.getTools({
    apps: ["googlesheets"],
  });
  const completion = await openAIClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content:
          "analyse data in the sheet - https://docs.google.com/spreadsheets/d/1cq2PIO46rZo9QWPwfIg167HdkJgeCpBX9RrK3dgy20g/edit?gid=0#gid=0?",
      },
    ],
    tools,
  });

  console.log(completion.choices[0].message.tool_calls);
  const resp = await composioToolset.handleToolCall(completion);
  console.log(resp);
};
practice();
