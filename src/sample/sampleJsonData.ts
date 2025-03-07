import { jsonDataService } from "../routers/children/jsonDataService.js";

type Details = {
  count: number;
};
const sampleJsonData = async () => {
  console.log("hi");
  const key = "details";
  const { value: details } = await jsonDataService.createOrUpdate({
    key: key,
    value: {
      count: 10,
    },
  });
  console.log(details.count);
  const { value: fetchedDetails } =
    (await jsonDataService.findByKey<Details>(key)) ?? {};
  console.log(fetchedDetails?.count);
  //   const { value: deletedDetails } = await jsonDataService.deleteByKey<Details>(
  //     key
  //   );
  //   console.log(deletedDetails.count);
  const deletedCount = await jsonDataService.deleteByKeyLike(key);
  console.log({ deletedCount });
  const allDetailsKeys = await jsonDataService.findByKeyLike<Details>(key);
  console.log(allDetailsKeys.length);
  if (allDetailsKeys.length > 0) {
    console.log(allDetailsKeys[0].value.count);
  }

  const batchPayload = await jsonDataService.createMany([
    {
      key: "first",
      value: {
        sex: "male",
      },
    },
    {
      key: "second",
      value: {
        sex: "female",
      },
    },
  ]);
  console.log({ batchPayload });
};
sampleJsonData();
