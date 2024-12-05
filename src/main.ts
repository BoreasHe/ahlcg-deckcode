import { base32Decode, base32Encode } from "@ctrl/ts-base32";
import { CardInfo, Cards } from "./types/deck.types.js";
import {
  DecodeResult,
  EncodeResult,
  ExceptionGroupBuildResult,
  ProcessingError,
  QuantityGroupBuildResult,
  SetGroupBuildResult,
} from "./types/result.types.js";
import {
  cardInfoComparer,
  concatCardId,
  NoValidVarIntError,
  parseFullCardId,
  VarIntProcessor,
} from "./utils/common.js";
import {
  invalidBase32String,
  invalidQuantity,
  malformedCardId,
  malformedDeckCode,
  unknownError,
} from "./utils/errors.js";

class AHLCGDeckCode {
  public static encode(cards: Cards): EncodeResult {
    // Warnings/errors will be put inside this array.
    const errors: ProcessingError[] = [];

    // This is to store the transformed data from the input
    let preprocessedCards: CardInfo[] = [];

    // The first thing is to divide the deck into groups of "how many copies a card is included in the deck"
    const singleCopyGroup = new QuantityGroup(1);
    const twoCopiesGroup = new QuantityGroup(2);
    const myriadGroup = new QuantityGroup(3);
    // Sled Dog gigachad
    const exceptionsGroup: CardInfo[] = [];

    // Validate the format of the card ids
    for (const [fullCardId, copiesIncluded] of Object.entries(cards)) {
      try {
        const parsedId = parseFullCardId(fullCardId);
        if (copiesIncluded < 1) {
          errors.push(invalidQuantity(fullCardId, copiesIncluded));
          continue;
        }
        preprocessedCards.push({ ...parsedId, copies: copiesIncluded });
      } catch {
        errors.push(malformedCardId(fullCardId));
      }
    }

    // If the input is invalid, return early with all errors
    if (errors.length)
      return {
        ok: false,
        errors,
        log: AHLCGDeckCode.logErrors(errors),
      };

    // Pre-sort the cards to ensure the output is the same with the same deck
    preprocessedCards = preprocessedCards.sort(cardInfoComparer);

    for (const cardInfo of preprocessedCards) {
      const { setId, cardId, copies } = cardInfo;

      // Group the cards by their copies included in the deck
      if (copies == 1) singleCopyGroup.push(setId, cardId);
      else if (copies == 2) twoCopiesGroup.push(setId, cardId);
      else if (copies == 3) myriadGroup.push(setId, cardId);
      // Exceptions will not be preprocessed in the QuantityGroup class
      else exceptionsGroup.push(cardInfo);
    }

    // Generate the number arrays (uint8) for each group
    const encodedSingleCopyGroup = singleCopyGroup.build();
    const encodedTwoCopiesGroup = twoCopiesGroup.build();
    const encodedMyriadGroup = myriadGroup.build();
    const encodedExceptionsGroup = AHLCGDeckCode.encodeNCopies(exceptionsGroup);

    // Concat that whole thing
    const resultBytes = new Uint8Array([
      ...encodedSingleCopyGroup.fullArray,
      ...encodedTwoCopiesGroup.fullArray,
      ...encodedMyriadGroup.fullArray,
      ...encodedExceptionsGroup.fullArray,
    ]);

    // This is the deck code
    const base32String = base32Encode(resultBytes);

    return {
      ok: true,
      errors,
      code: base32String,
      log: AHLCGDeckCode.logEncodeResult(
        [encodedSingleCopyGroup, encodedTwoCopiesGroup, encodedMyriadGroup],
        encodedExceptionsGroup,
      ),
    };
  }

  public static decode(deckCode: string): DecodeResult {
    let bytes: Uint8Array;

    try {
      bytes = base32Decode(deckCode);
      // The input string is not a base32 string
      if (!bytes) throw new Error();
    } catch {
      const error = invalidBase32String(deckCode);
      return {
        ok: false,
        errors: [error],
        log: AHLCGDeckCode.logErrors([error]),
      };
    }

    // The processor is an instance that retrieve meaning information from the input bytes procedurally
    const processor = new VarIntProcessor(bytes);
    const proceduralLog: string[] = [];

    // An buffer object that stores the deck cards output
    const cards: Cards = {};

    // TODO: Extract Versioning

    // The following three chunk of data represents card groups of 1 copy, 2 copies and 3 copies(a.k.a. myriad)
    const quantityGroups = [1, 2, 3];

    try {
      for (const copies of quantityGroups) {
        const sizeOfThisGroup = processor.decodeNext();
        proceduralLog.push(
          `Found Size of group for ${copies} copy(s): ${sizeOfThisGroup}`,
        );
        // Check whether there are cards that the user included 1 copy
        if (sizeOfThisGroup > 0) {
          for (let setCursor = 0; setCursor < sizeOfThisGroup; setCursor++) {
            // Then find the size for each sub group of sets(cycles)
            const sizeOfThisSet = processor.decodeNext();
            if (sizeOfThisSet > 0) {
              // Next is the set Id
              const setId = processor.decodeNext();
              proceduralLog.push(`Found Size of ↓this↓ set: ${sizeOfThisSet}`);
              proceduralLog.push(`Found Set ID: ${setId}`);

              for (
                let cardCursor = 0;
                cardCursor < sizeOfThisSet;
                cardCursor++
              ) {
                const cardId = processor.decodeNext();
                proceduralLog.push(`Found Card ID: ${cardId}`);

                // Finally append the full card id with the copies included in the deck to the buffer
                // It should look like { "01023": 1 }
                proceduralLog.push(
                  `Inserted: ${concatCardId(setId, cardId)} for ${copies} copy(s)`,
                );
                cards[concatCardId(setId, cardId)] = copies;
              }
            }
          }
        }
      }

      // Now handle the case of exceptions like sled dogs(which allow 4 copies)
      // If there is no exception in the data, it should end here and return the results
      if (!processor.finished()) {
        while (!processor.finished()) {
          const copies = processor.decodeNext();
          const setId = processor.decodeNext();
          const cardId = processor.decodeNext();

          cards[concatCardId(setId, cardId)] = copies;
        }
      }
    } catch (e: unknown) {
      let error: ProcessingError;
      if (e instanceof NoValidVarIntError) error = malformedDeckCode(deckCode);
      else error = unknownError();

      return {
        ok: false,
        errors: [error],
        log: AHLCGDeckCode.logErrors([error]),
      };
    }

    return {
      ok: true,
      errors: [],
      cards,
      log: AHLCGDeckCode.logDecodeResult(proceduralLog),
    };
  }

  private static encodeNCopies(
    cardInfos: CardInfo[],
  ): ExceptionGroupBuildResult {
    const result: ExceptionGroupBuildResult = {
      fullArray: [],
      cardInfos: [],
    };

    // Encode each exceptions to have the format of [Quantity][Set Id][Card Id]
    for (const cardInfo of cardInfos) {
      const { setId, cardId, copies } = cardInfo;
      result.cardInfos.push(cardInfo);
      result.fullArray = [
        ...result.fullArray,
        ...VarIntProcessor.encode(copies),
        ...VarIntProcessor.encode(setId),
        ...VarIntProcessor.encode(cardId),
      ];
    }

    return result;
  }

  private static logEncodeResult(
    quantityGroups: QuantityGroupBuildResult[],
    exceptionGroup: ExceptionGroupBuildResult,
  ): () => void {
    return (): void => {
      console.debug(`\n[Encoding Log]`);
      for (const quantityGroup of quantityGroups) {
        console.debug(
          ` └ [Quantity Group for ${quantityGroup.groupForCopiesOf} copy(s)]`,
        );
        console.debug(`  └ Size: ${quantityGroup.size}`);
        for (const setGroup of quantityGroup.setGroups) {
          console.debug(`  └ [Set Group]`);
          console.debug(`    └ Size: ${setGroup.size}`);
          console.debug(`    └ Set ID: ${setGroup.groupForSetOf}`);
          console.debug(`    └ Cards: ${setGroup.cards}`);
        }
      }

      if (!exceptionGroup.cardInfos.length) return;
      console.debug(` └ [Exceptions]`);

      for (const { fullId, copies } of exceptionGroup.cardInfos) {
        console.debug(`  └ Card ${fullId}: ${copies} copies`);
      }
    };
  }

  private static logDecodeResult(logs: string[]): () => void {
    return (): void => {
      for (const log of logs) {
        console.debug(log);
      }
    };
  }

  private static logErrors(errors: ProcessingError[]): () => void {
    return (): void => {
      console.debug(`\n[Encoding Log]`);
      console.debug(` └ Encoding failed due to following error(s):`);
      for (const error of errors) {
        console.debug(`  └ ${error.code}: ${error.message}`);
      }
    };
  }
}

class QuantityGroup {
  groupForCopiesOf: number;
  // A map that stores all cards the user had included X copies in this deck, grouped by set id
  setGroupMap: Map<number, SetGroup> = new Map<number, SetGroup>();

  constructor(copies: number) {
    this.groupForCopiesOf = copies;
  }

  // Subgroup all cards from the same set(cycle) under a set-keyed array
  push(setId: number, cardId: number): void {
    if (!this.setGroupMap.has(setId))
      this.setGroupMap.set(setId, new SetGroup(setId));

    this.setGroupMap.get(setId).push(cardId);
  }

  // Encode this group (of quantity) to get a varint number array for further process
  build(): QuantityGroupBuildResult {
    const result: QuantityGroupBuildResult = {
      groupForCopiesOf: this.groupForCopiesOf,
      size: this.setGroupMap.size,
      setGroups: [],
      fullArray: [],
    };

    // A header that records how many sets are under this quantity group
    result.fullArray = [...VarIntProcessor.encode(this.setGroupMap.size)];

    // Push each sub group(set)'s encoding result to the result array
    for (const [_, setGroup] of this.setGroupMap) {
      const setGroupResult = setGroup.build();
      result.setGroups.push(setGroupResult);

      result.fullArray = [...result.fullArray, ...setGroupResult.fullArray];
    }

    return result;
  }
}

class SetGroup {
  groupForSetOf: number;
  cardIds: number[] = [];

  constructor(setId: number) {
    this.groupForSetOf = setId;
  }

  push(cardId: number): void {
    this.cardIds.push(cardId);
  }

  // Encode this sub group (of set) to get a varint number array to concat it later
  build(): SetGroupBuildResult {
    const result: SetGroupBuildResult = {
      groupForSetOf: this.groupForSetOf,
      size: this.cardIds.length,
      cards: this.cardIds,
      fullArray: [],
    };

    // A header that records how many cards are under this set group
    result.fullArray = [...VarIntProcessor.encode(this.cardIds.length)];

    // A header that records the set id for this set
    result.fullArray = [
      ...result.fullArray,
      ...VarIntProcessor.encode(this.groupForSetOf),
    ];

    // Push each card's varint encoding result to the temp array
    for (const cardId of this.cardIds)
      result.fullArray = [
        ...result.fullArray,
        ...VarIntProcessor.encode(cardId),
      ];

    return result;
  }
}

export default AHLCGDeckCode;
