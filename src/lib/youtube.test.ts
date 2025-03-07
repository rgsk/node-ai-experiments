import { chunkWithOverlap } from "./youtube.js";

test("chunkWithOverlap", () => {
  expect(chunkWithOverlap([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, 2))
    .toMatchInlineSnapshot(`
[
  [
    1,
    2,
    3,
    4,
  ],
  [
    3,
    4,
    5,
    6,
  ],
  [
    5,
    6,
    7,
    8,
  ],
  [
    7,
    8,
    9,
  ],
  [
    9,
  ],
]
`);
});
