import { describe, it, afterEach, beforeEach, expect } from "vitest";
import AHLCGDeckCode from "../../src/main.js";
import {
  randomSledDogDeck,
  rolandStarterDeck,
  unsortedRolandStarterDeck,
} from "../testCommon.js";

describe("AHLCGDeckCode Encoder", () => {
  it("can encode Roland's starter deck into a deck code", () => {
    const output = AHLCGDeckCode.encode(rolandStarterDeck);
    output.log();
    expect(output.code).toBe(
      "AEMACAABAYDRAEISCMKBKFQXDAMR4HZAEERCGJBFEYTQCBIBKZLVQWK4AA======"
    );
  });

  it("returns the same result with a deck (of different sorting) with the same cards", () => {
    const outputOfSortedDeck = AHLCGDeckCode.encode(rolandStarterDeck);
    const outputOfUnsortedDeck = AHLCGDeckCode.encode(
      unsortedRolandStarterDeck
    );

    expect(outputOfSortedDeck.code).toEqual(outputOfUnsortedDeck.code);
  });

  it("can encode a deck with cards with 4 copies included", () => {
    const output = AHLCGDeckCode.encode(randomSledDogDeck);
    output.log();
    expect(output.code).toBe(
      "AQBACACYAEB3IAQCAQDAOAQIPWAACBIEAEKBKGK3AIBLQAN4AEBQGFU6AHUQCAQFCZ3ACPDWAACAQ7Y="
    );
  });

  it("returns error if the data contains an invalid quantity of a card", () => {
    const output = AHLCGDeckCode.encode({
      ...rolandStarterDeck,
      "01234": -1,
      "05678": 0,
    });
    output.log();
    expect(output.errors).toHaveLength(2);
    expect(output.errors[0].code).toBe("INVALID_QUANTITY");
    expect(output.errors[0].message).toMatch(/01234/);
    expect(output.errors[1].code).toBe("INVALID_QUANTITY");
    expect(output.errors[1].message).toMatch(/05678/);
  });

  it("returns error if the data contains malformed ID", () => {
    const output = AHLCGDeckCode.encode({
      ...rolandStarterDeck,
      "012345": 1,
      a5678: 2,
    });
    output.log();
    expect(output.errors).toHaveLength(2);
    expect(output.errors[0].code).toBe("MALFORMED_CARD_ID");
    expect(output.errors[0].message).toMatch(/012345/);
    expect(output.errors[1].code).toBe("MALFORMED_CARD_ID");
    expect(output.errors[1].message).toMatch(/a5678/);
  });
});

describe("AHLCGDeckCode Decoder", () => {
  it("can decode a valid deck code for Roland's starter deck into a card list", () => {
    const inputString =
      "AEMACAABAYDRAEISCMKBKFQXDAMR4HZAEERCGJBFEYTQCBIBKZLVQWK4AA======";
    const output = AHLCGDeckCode.decode(inputString);
    output.log();

    expect(output.cards).toEqual(rolandStarterDeck);
  });

  it("can decode a valid deck code for a deck that contains 4 copies of a card", () => {
    const inputString =
      "AQBACACYAEB3IAQCAQDAOAQIPWAACBIEAEKBKGK3AIBLQAN4AEBQGFU6AHUQCAQFCZ3ACPDWAACAQ7Y=";
    const output = AHLCGDeckCode.decode(inputString);
    output.log();

    expect(output.cards).toEqual(randomSledDogDeck);
  });

  it("returns error if the input is not a valid base32 string", () => {
    const inputString =
      "0EMACAABAYDRAEISCMKBKFQXDAMR4HZAEERCGJBFEYTQCBIBKZLVQWK4AA======";
    const output = AHLCGDeckCode.decode(inputString);
    output.log();

    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].code).toBe("INVALID_BASE32_STRING");
  });

  it("returns error if the input is not a valid deck code or it is corrupted", () => {
    const inputString =
      "ZEMACAABAYDRAEISCMKBKFQXDAMR4HZAEERCGJBFEYTQCBIBKZLVQWK4AA======";
    const output = AHLCGDeckCode.decode(inputString);
    output.log();

    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].code).toBe("MALFORMED_DECK_CODE");
  });
});
