import openAIClient from "lib/openAIClient";

async function completionExample() {
  const completion = await openAIClient.chat.completions.create({
    messages: [
      {
        role: "user",
        content: "What is the meaning of life, give a short answer",
      },
    ],
    model: "gpt-3.5-turbo",
  });

  console.log(completion.choices[0]);
}

completionExample();
