import { v4 } from "uuid";
import { Memory } from "../../../../lib/typesJsonData.js";
import { getPopulatedKey } from "../../../../routers/children/jsonDataRouter.js";
import { jsonDataService } from "../../../../routers/children/jsonDataService.js";

const saveUserInfoToMemory = async ({
  statement,
  userEmail,
}: {
  statement: string;
  userEmail: string;
}) => {
  const key = `reactAIExperiments/users/$userEmail/memories`;
  const jsonData = await jsonDataService.findByKey<Memory[]>(
    getPopulatedKey(key, userEmail)
  );
  const memory: Memory = {
    id: v4(),
    statement,
    createdAt: new Date().toISOString(),
  };
  if (!jsonData) {
    const jsonData = await jsonDataService.createOrUpdate({
      key: getPopulatedKey(key, userEmail),
      value: [memory],
    });
  } else {
    const memories = jsonData.value;
    const newJsonData = await jsonDataService.createOrUpdate({
      key: getPopulatedKey(key, userEmail),
      value: [...memories, memory],
    });
  }
  return "Saved successfully.";
};

export default saveUserInfoToMemory;
