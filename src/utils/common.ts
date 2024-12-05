import { CardInfo, ParsedCardId } from "../types/deck.types.js";
import * as VarInt from "varint";

export const cardIdRegex: RegExp = /^(\d{2})(\d{3})$/;

// Split the full card id to get its cycle(set) id and card id
export function parseFullCardId(fullCardId: string): Omit<CardInfo, "copies"> {
  const matches = fullCardId.match(cardIdRegex);

  if (!matches) {
    throw new Error("Malformed Full Card Id");
  }

  return {
    setId: parseInt(matches[1]),
    cardId: parseInt(matches[2]),
    fullId: fullCardId,
  };
}

export function concatCardId(setId: number, cardId: number): string {
  return setId.toString().padStart(2, "0") + cardId.toString().padStart(3, "0");
}

export function cardInfoComparer(a: ParsedCardId, b: ParsedCardId): number {
  return a.setId - b.setId || a.cardId - b.cardId;
}

export class VarIntProcessor {
  private bytes: Uint8Array;

  public constructor(input: Uint8Array) {
    this.bytes = input;
  }

  public static encode(num: number): Uint8Array {
    return VarInt.encode(num);
  }

  public decodeNext(): number {
    let currentValue = 0;
    let shift = 0;

    for (let cursor = 0; cursor < this.bytes.length; cursor++) {
      const byte = this.bytes[cursor];
      // Add the lower 7 bits of the current byte to the current value
      currentValue |= (byte & 0x7f) << shift;

      if ((byte & 0x80) === 0) {
        // MSB is 0, this is the last byte of the current VarInt
        // Cut out this part and return the value
        this.bytes = this.bytes.slice(cursor + 1);
        return currentValue;
      } else {
        // MSB is 1, continue to the next byte
        shift += 7;
      }
    }

    throw new NoValidVarIntError(
      "Looped through the input bytes but did not find any valid VarInts",
    );
  }

  public finished(): boolean {
    return this.bytes.length == 0;
  }
}

export class NoValidVarIntError extends Error {}
