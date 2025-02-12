import { chunkWithOverlap } from "lib/youtube";

const practice = async () => {
  const items = [1, 2, 3, 4, 5, 6, 7];
  console.log(chunkWithOverlap(items, 4, 2));
};
practice();
