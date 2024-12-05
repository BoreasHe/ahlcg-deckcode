import { CardInfo, Cards } from "./deck.types.js";

export interface EncodeResult {
  ok: boolean;
  errors: ProcessingError[];
  code?: string;
  log: () => void;
}

export interface DecodeResult {
  ok: boolean;
  errors: ProcessingError[];
  cards?: Cards;
  log: () => void;
}

export interface ProcessingError {
  code: string;
  message: string;
}

export interface QuantityGroupBuildResult {
  groupForCopiesOf: number;
  size: number;
  setGroups: SetGroupBuildResult[];
  fullArray: number[];
}

export interface SetGroupBuildResult {
  groupForSetOf: number;
  size: number;
  cards: number[];
  fullArray: number[];
}

export interface ExceptionGroupBuildResult {
  cardInfos: CardInfo[];
  fullArray: number[];
}
