export interface PositionEngineTransaction {
  type: 'buy' | 'sell' | 'dividend' | 'split' | 'transfer_in' | 'transfer_out';
  quantity: number;
  price: number;
  fees: number;
}

interface Lot {
  quantity: number;
  unitBasis: number;
}

export interface PositionEngineResult {
  quantity: number;
  avgCostBasis: number;
  realizedPl: number;
}

function totalQuantity(lots: Lot[]) {
  return lots.reduce((sum, lot) => sum + lot.quantity, 0);
}

function averageBasis(lots: Lot[]) {
  const quantity = totalQuantity(lots);
  if (quantity === 0) return 0;

  const totalBasis = lots.reduce((sum, lot) => sum + lot.quantity * lot.unitBasis, 0);
  return totalBasis / quantity;
}

function closeLots(remaining: number, lots: Lot[], unitPrice: number, realizedPl: number, isShort: boolean) {
  let nextRealizedPl = realizedPl;
  let qtyRemaining = remaining;

  while (qtyRemaining > 0 && lots.length > 0) {
    const lot = lots[0];
    const matched = Math.min(qtyRemaining, lot.quantity);
    nextRealizedPl += isShort
      ? (lot.unitBasis - unitPrice) * matched
      : (unitPrice - lot.unitBasis) * matched;

    lot.quantity -= matched;
    qtyRemaining -= matched;

    if (lot.quantity === 0) {
      lots.shift();
    }
  }

  return { qtyRemaining, realizedPl: nextRealizedPl };
}

export function calculatePosition(transactions: PositionEngineTransaction[]): PositionEngineResult {
  const longLots: Lot[] = [];
  const shortLots: Lot[] = [];
  let realizedPl = 0;

  for (const tx of transactions) {
    if (tx.type === 'buy' || tx.type === 'transfer_in') {
      const unitCost = (tx.quantity * tx.price + tx.fees) / tx.quantity;
      const closeResult = closeLots(tx.quantity, shortLots, unitCost, realizedPl, true);
      realizedPl = closeResult.realizedPl;

      if (closeResult.qtyRemaining > 0) {
        longLots.push({ quantity: closeResult.qtyRemaining, unitBasis: unitCost });
      }
      continue;
    }

    if (tx.type === 'sell' || tx.type === 'transfer_out') {
      const unitProceeds = (tx.quantity * tx.price - tx.fees) / tx.quantity;
      const closeResult = closeLots(tx.quantity, longLots, unitProceeds, realizedPl, false);
      realizedPl = closeResult.realizedPl;

      if (closeResult.qtyRemaining > 0) {
        shortLots.push({ quantity: closeResult.qtyRemaining, unitBasis: unitProceeds });
      }
      continue;
    }

    if (tx.type === 'dividend') {
      realizedPl += tx.quantity * tx.price - tx.fees;
      continue;
    }

    if (tx.type === 'split' && tx.price > 0) {
      for (const lot of longLots) {
        lot.quantity *= tx.price;
        lot.unitBasis /= tx.price;
      }
      for (const lot of shortLots) {
        lot.quantity *= tx.price;
        lot.unitBasis /= tx.price;
      }
    }
  }

  const longQuantity = totalQuantity(longLots);
  const shortQuantity = totalQuantity(shortLots);
  const netQuantity = longQuantity - shortQuantity;

  if (netQuantity > 0) {
    return {
      quantity: netQuantity,
      avgCostBasis: averageBasis(longLots),
      realizedPl,
    };
  }

  if (netQuantity < 0) {
    return {
      quantity: netQuantity,
      avgCostBasis: averageBasis(shortLots),
      realizedPl,
    };
  }

  return {
    quantity: 0,
    avgCostBasis: 0,
    realizedPl,
  };
}
