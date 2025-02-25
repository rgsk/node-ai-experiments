import { Router } from "express";
import { deepSeekClient } from "lib/deepSeekClient";
import environmentVars from "lib/environmentVars";
import { getProps } from "lib/middlewareProps";
import openAIClient from "lib/openAIClient";
import { CreditDetails } from "lib/typesJsonData";
import adminRequired from "middlewares/adminRequired";
import { Middlewares } from "middlewares/middlewaresNamespace";
import { v4 } from "uuid";
import adminRouter from "./children/adminRouter";
import assistantsRouter from "./children/assistants/assistantsRouter";
import awsRouter from "./children/awsRouter";
import friendsRouter from "./children/friendsRouter";
import jsonDataRouter from "./children/jsonDataRouter";
import { jsonDataService } from "./children/jsonDataService";

const rootRouter = Router();
rootRouter.use("/friends", friendsRouter);
rootRouter.use("/json-data", jsonDataRouter);
rootRouter.use("/aws", awsRouter);
rootRouter.use("/assistants", assistantsRouter);
rootRouter.use("/admin", adminRequired, adminRouter);
rootRouter.get("/", async (req, res, next) => {
  try {
    return res.json({
      message: `Server is running on http://localhost:${environmentVars.PORT}`,
    });
  } catch (err) {
    return next(err);
  }
});

// An endpoint which would work with the client code above - it returns
// the contents of a REST API request to this protected endpoint
rootRouter.get("/session", async (req, res, next) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${environmentVars.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
      }),
    });
    const data = await r.json();

    // Send back the JSON we received from the OpenAI REST API
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});
enum AIClient {
  Deepseek = "deepseek",
  OpenAI = "openai",
}
const aiClient = AIClient.OpenAI as AIClient.Deepseek | AIClient.OpenAI; // Example usage

const getClient = () => {
  if (aiClient === AIClient.Deepseek) {
    return deepSeekClient;
  } else {
    return openAIClient;
  }
};

const getModel = (overrideModel?: Partial<Record<AIClient, string>>) => {
  if (aiClient === AIClient.Deepseek) {
    return overrideModel?.[aiClient] || "deepseek-chat";
  } else {
    return overrideModel?.[aiClient] || "gpt-4o";
  }
};
rootRouter.post("/completion", async (req, res, next) => {
  try {
    const { messages } = req.body;
    const completion = await getClient().chat.completions.create({
      messages: messages,
      model: getModel(),
    });
    return res.json({
      content: completion.choices[0].message.content,
    });
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/json-completion", async (req, res, next) => {
  try {
    const { messages } = req.body;
    const completion = await getClient().chat.completions.create({
      messages: messages,
      model: getModel(),
      response_format: { type: "json_object" },
    });
    return res.json(JSON.parse(completion.choices[0].message.content as any));
  } catch (err) {
    return next(err);
  }
});

rootRouter.post("/text", async (req, res, next) => {
  try {
    const { messages } = req.body;
    const textStream = getTextStreamOpenAI(messages);
    for await (const chunk of textStream) {
      res.write(chunk);
    }
    return res.end();
  } catch (err) {
    return next(err);
  }
});

export const getTextStreamOpenAI = async function* (messages: any) {
  const stream = await getClient().chat.completions.create({
    messages: messages,
    model: getModel(),
    stream: true,
  });
  for await (const part of stream) {
    const content = part.choices[0].delta.content ?? "";
    yield content;
  }
};
rootRouter.post("/initialize-credits", async (req, res, next) => {
  try {
    const { userEmail } = getProps<Middlewares.Authenticate>(
      req,
      Middlewares.Keys.Authenticate
    );

    const { value: creditDetails } =
      (await jsonDataService.findByKey<CreditDetails>(
        `reactAIExperiments/admin/public/creditDetails/${userEmail}`
      )) ?? {};
    if (creditDetails) {
      throw new Error(
        `creditDetails for userEmail - ${userEmail} already exist`
      );
    }
    const initialFreeCreditBalance = 10;
    const result = await jsonDataService.createOrUpdate<CreditDetails>({
      key: `reactAIExperiments/admin/public/creditDetails/${userEmail}`,
      value: {
        id: v4(),
        userEmail: userEmail,
        balance: initialFreeCreditBalance,
      },
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});
rootRouter.post("/deduct-credits", async (req, res, next) => {
  try {
    const { userEmail } = getProps<Middlewares.Authenticate>(
      req,
      Middlewares.Keys.Authenticate
    );
    const { value: creditDetails } =
      (await jsonDataService.findByKey<CreditDetails>(
        `reactAIExperiments/admin/public/creditDetails/${userEmail}`
      )) ?? {};
    if (!creditDetails) {
      throw new Error(`creditDetails for userEmail - ${userEmail} not found`);
    }
    const deductionAmount = 1;
    if (creditDetails.balance < deductionAmount) {
      return res.json({
        isAllowed: false,
        creditsBalance: creditDetails.balance,
      });
    }
    const result = await jsonDataService.createOrUpdate<CreditDetails>({
      key: `reactAIExperiments/admin/public/creditDetails/${userEmail}`,
      value: {
        ...creditDetails,
        balance: creditDetails.balance - deductionAmount,
      },
    });
    const updatedCreditDetails = result.value;
    return res.json({
      isAllowed: true,
      creditsBalance: updatedCreditDetails.balance,
    });
  } catch (err) {
    return next(err);
  }
});

export default rootRouter;
