export function normalizeMinutes(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const direct = Number(trimmed.replace(',', '.'));
    if (Number.isFinite(direct)) {
      return direct;
    }

    const match = trimmed.match(/\d+(?:[.,]\d+)?/);
    if (!match) {
      return null;
    }

    const fallback = Number(match[0].replace(',', '.'));
    return Number.isFinite(fallback) ? fallback : null;
  }

  return null;
}

export function formatMinutes(
  minutes: number | null | undefined,
  fallback = 'Belirtilmemiş'
): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return fallback;
  }

  const hasFraction = !Number.isInteger(minutes);
  const formatted = minutes.toLocaleString('tr-TR', {
    minimumFractionDigits: hasFraction ? 1 : 0,
    maximumFractionDigits: hasFraction ? 1 : 0,
  });

  return `${formatted} dk`;
}
