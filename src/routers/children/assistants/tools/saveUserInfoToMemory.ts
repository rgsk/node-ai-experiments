const saveUserInfoToMemory = async ({
  statement,
  userId,
}: {
  statement: string;
  userId: string;
}) => {
  try {
    // const memory = await db.memory.create({
    //   data: {
    //     statement,
    //     userId,
    //   },
    // });
    return "Saved successfully.";
  } catch (err) {
    return "Some error occurred.";
  }
};

export default saveUserInfoToMemory;
