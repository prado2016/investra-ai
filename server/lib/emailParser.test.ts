// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseEmailText } from './emailParser.js';

describe('emailParser', () => {
  it('extracts the account name from Wealthsimple confirmations', () => {
    const transactions = parseEmailText(
      'Account: *TFSA* Type: *Limit* *Buy* Symbol: *TSLL* Shares: *100* Average price: *US$12.42* Total cost: *US$1,242.00* Time: *July 21, 2025*'
    );

    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      symbol: 'TSLL',
      type: 'buy',
      accountName: 'TFSA',
    });
  });
});
