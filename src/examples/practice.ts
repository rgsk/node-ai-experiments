import { CreditDetails } from "lib/typesJsonData";
import { jsonDataService } from "routers/children/jsonDataService";
import { v4 } from "uuid";

const practice = async () => {
  await jsonDataService.createMany<CreditDetails>([
    {
      key: `reactAIExperiments/admin/public/creditDetails/rahulguptasde@gmail.com`,
      value: {
        id: v4(),
        balance: 100,
        userEmail: "rahulguptasde@gmail.com",
      },
    },
    {
      key: `reactAIExperiments/admin/public/creditDetails/rahulguptacs1@gmail.com`,
      value: {
        id: v4(),
        balance: 100,
        userEmail: "rahulguptacs1@gmail.com",
      },
    },
  ]);
};
practice();
