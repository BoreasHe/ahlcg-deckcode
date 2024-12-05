import { describe, expect, it } from "vitest";
import { ParsedCardId } from "../../src/types/deck.types.js";
import { cardInfoComparer, parseFullCardId } from "../../src/utils/common.js";

describe("parseFullCardId()", () => {
  it("can parse a valid full card id", () => {
    const { setId, cardId } = parseFullCardId("01022");
    expect(setId).toBe(1);
    expect(cardId).toBe(22);
  });

  it("throws with an invalid full card id", () => {
    expect(() => parseFullCardId("01a22")).toThrowError(/Malformed/);
  });
});

describe("cardInfoComparer()", () => {
  it("can sort card infos", () => {
    const input: ParsedCardId[] = [
      { setId: 2, cardId: 1 },
      { setId: 1, cardId: 10 },
      { setId: 3, cardId: 1 },
      { setId: 1, cardId: 1 },
      { setId: 2, cardId: 10 },
    ];

    const output = input.sort(cardInfoComparer);

    expect(output).toStrictEqual([
      { setId: 1, cardId: 1 },
      { setId: 1, cardId: 10 },
      { setId: 2, cardId: 1 },
      { setId: 2, cardId: 10 },
      { setId: 3, cardId: 1 },
    ]);
  });
});
