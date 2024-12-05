import { ProcessingError } from "../types/result.types.js";

export function invalidQuantity(id: string, found: number): ProcessingError {
  return {
    code: "INVALID_QUANTITY",
    message: `The card ${id} should have a positive number of copies in the deck (1-4), but found ${found} instead.`,
  };
}

export function malformedCardId(id: string): ProcessingError {
  return {
    code: "MALFORMED_CARD_ID",
    message: `The card ${id} has an invalid card id. It should follow the format of {XXYYY}, where XX is the set number and YYY is the card id in that set.`,
  };
}

export function invalidBase32String(code: string): ProcessingError {
  return {
    code: "INVALID_BASE32_STRING",
    message: `The deck code provided (${code}) is not in a valid base32 string.`,
  };
}

export function malformedDeckCode(code: string): ProcessingError {
  return {
    code: "MALFORMED_DECK_CODE",
    message: `The deck code provided (${code}) is a valid base32 string but is somehow corrupted and/or does not match the encoding standard for ahlcg-deckcode.`,
  };
}

export function unknownError(): ProcessingError {
  return {
    code: "UNKNOWN",
    message: `The program encountered an unknown runtime error. Please submit an issue to the ahlcg-deckcode repo on github. Thank you!`,
  };
}
