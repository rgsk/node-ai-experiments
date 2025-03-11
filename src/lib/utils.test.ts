import { chunkWithOverlap, encodeQueryParams } from "./utils.js";

describe("encodeQueryParams", () => {
  test("should return an empty string for an empty params object", () => {
    const params = {};
    expect(encodeQueryParams(params)).toBe("");
  });
  test("undefined should be ignored", () => {
    const params = { name: undefined, age: 24 };
    expect(encodeQueryParams(params)).toBe("age=24");
  });

  test("should encode a single key-value pair", () => {
    const params = { name: "John" };
    expect(encodeQueryParams(params)).toBe("name=John");
  });

  test("should encode multiple key-value pairs", () => {
    const params = { name: "John", age: 30, active: true };
    expect(encodeQueryParams(params)).toBe("name=John&age=30&active=true");
  });

  test("should correctly encode special characters", () => {
    const params = { "na me": "John & Jane", city: "New York" };
    expect(encodeQueryParams(params)).toBe(
      "na%20me=John%20%26%20Jane&city=New%20York"
    );
  });

  test("should convert boolean and number values to strings", () => {
    const params = { isAdmin: false, score: 100 };
    expect(encodeQueryParams(params)).toBe("isAdmin=false&score=100");
  });

  test("should handle keys and values that need encoding", () => {
    const params = { "special key": "special value/?&" };
    expect(encodeQueryParams(params)).toBe(
      "special%20key=special%20value%2F%3F%26"
    );
  });

  test("should handle array values for duplicate keys", () => {
    const params = { name: ["rahul", "mehak"], age: 25 };
    // Order is preserved in the array
    expect(encodeQueryParams(params)).toBe("name=rahul&name=mehak&age=25");
  });

  test("should handle mixed single and array values", () => {
    const params = { name: ["alice", "bob"], city: "Wonderland" };
    expect(encodeQueryParams(params)).toBe(
      "name=alice&name=bob&city=Wonderland"
    );
  });
});

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
