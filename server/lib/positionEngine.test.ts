// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { calculatePosition } from './positionEngine.js';

describe('calculatePosition', () => {
  it('processes long positions in chronological FIFO order', () => {
    const result = calculatePosition([
      { type: 'buy', quantity: 10, price: 10, fees: 0 },
      { type: 'sell', quantity: 5, price: 15, fees: 0 },
    ]);

    expect(result).toEqual({
      quantity: 5,
      avgCostBasis: 10,
      realizedPl: 25,
    });
  });

  it('applies stock splits to the remaining lots', () => {
    const result = calculatePosition([
      { type: 'buy', quantity: 10, price: 10, fees: 0 },
      { type: 'split', quantity: 1, price: 2, fees: 0 },
    ]);

    expect(result).toEqual({
      quantity: 20,
      avgCostBasis: 5,
      realizedPl: 0,
    });
  });

  it('tracks short positions and buy-to-cover P&L', () => {
    const result = calculatePosition([
      { type: 'sell', quantity: 2, price: 10, fees: 0 },
      { type: 'buy', quantity: 1, price: 8, fees: 0 },
    ]);

    expect(result).toEqual({
      quantity: -1,
      avgCostBasis: 10,
      realizedPl: 2,
    });
  });

  it('can flip from short to long in a single buy', () => {
    const result = calculatePosition([
      { type: 'sell', quantity: 2, price: 10, fees: 0 },
      { type: 'buy', quantity: 3, price: 8, fees: 0 },
    ]);

    expect(result).toEqual({
      quantity: 1,
      avgCostBasis: 8,
      realizedPl: 4,
    });
  });
});
