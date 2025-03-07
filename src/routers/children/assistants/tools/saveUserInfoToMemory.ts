import { Memory } from "lib/typesJsonData";
import { getPopulatedKey } from "routers/children/jsonDataRouter";
import { jsonDataService } from "routers/children/jsonDataService";
import { v4 } from "uuid";

const saveUserInfoToMemory = async ({
  statement,
  userEmail,
}: {
  statement: string;
  userEmail: string;
}) => {
  try {
    console.log({ statement, userEmail });
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
  } catch (err) {
    return "Some error occurred.";
  }
};

export default saveUserInfoToMemory;
