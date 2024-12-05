export interface Deck {
  cards: Cards;
}

export type Cards = Record<string, number>;

export interface ParsedCardId {
  setId: number;
  cardId: number;
}

export type CardInfo = ParsedCardId & {
  fullId: string;
  copies: number;
};
