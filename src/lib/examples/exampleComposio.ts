import { ChatCompletionMessageParam } from "openai/resources/index.mjs";
import composioToolset from "../composioToolset.js";
import { writeFile } from "../generalUtils.js";
import openAIClient from "../openAIClient.js";

const exampleComposio = async () => {
  // Retrieve the required tools (e.g., for Google Sheets)
  const tools = await composioToolset.getTools({ apps: ["googlesheets"] });

  // Initialize the conversation messages with the user's request.
  const messages: Array<ChatCompletionMessageParam> = [
    {
      role: "user",
      content:
        "fetch the details in this google sheet - https://docs.google.com/spreadsheets/d/1cq2PIO46rZo9QWPwfIg167HdkJgeCpBX9RrK3dgy20g/edit?gid=0#gid=0",
    },
  ];

  let finalAssistantMessage = null;
  // Loop until the assistant returns a message without a tool call.
  while (!finalAssistantMessage) {
    const completion = await openAIClient.chat.completions.create({
      messages: messages,
      model: "gpt-4o",
      tools: tools,
    });

    // Get the assistant's message from the completion
    const assistantMessage = completion.choices[0].message;
    console.dir(assistantMessage, { depth: null });
    messages.push(assistantMessage);
    // Check if the assistant message contains tool calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Process each tool call returned by the assistant
      for (const toolCall of assistantMessage.tool_calls) {
        console.log("Executing tool call:", toolCall);
        // Execute the tool call and get the result
        const toolResult = await composioToolset.executeToolCall(toolCall);
        console.log("Tool result:", toolResult);

        // Append the tool result to the conversation history.
        messages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: toolCall.id,
        });
      }
    } else {
      // No tool call indicates this is the final assistant message.
      finalAssistantMessage = assistantMessage;
    }
  }

  // Output the final assistant message.
  console.log("Final assistant message:", finalAssistantMessage);
  console.log("Program finished");
  writeFile("basic.json", JSON.stringify(messages, null, 4));
};

export default exampleComposio;
