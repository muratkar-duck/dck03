import { calculateTaxBreakdown } from '@/app/dashboard/producer/purchases/page';

describe('calculateTaxBreakdown', () => {
  it('returns null when price is null', () => {
    expect(calculateTaxBreakdown(null)).toBeNull();
  });

  it('calculates net, vat and gross values in cents', () => {
    const mockPrices = [
      { price: 10000, expected: { netCents: 10000, vatCents: 2000, grossCents: 12000 } },
      { price: 33333, expected: { netCents: 33333, vatCents: 6667, grossCents: 40000 } },
    ];

    mockPrices.forEach(({ price, expected }) => {
      const breakdown = calculateTaxBreakdown(price);
      expect(breakdown).not.toBeNull();
      expect(breakdown).toMatchObject(expected);
    });
  });
});
