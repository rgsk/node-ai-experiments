import { jsonDataService } from "routers/children/jsonDataService";

const practice = async () => {
  await jsonDataService.createOrUpdate({
    key: "admin/public/counter",
    value: {
      count: 10,
    },
  });
  await jsonDataService.createOrUpdate({
    key: "admin/person",
    value: {
      name: "rahul",
    },
  });
};
practice();
