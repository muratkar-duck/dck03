export const calculateTaxBreakdown = (priceCents: number | null) => {
  if (priceCents == null) {
    return null;
  }

  const netCents = priceCents;
  const vatCents = Math.round(netCents * 0.2);
  const grossCents = netCents + vatCents;

  return {
    netCents,
    vatCents,
    grossCents,
  } as const;
};
