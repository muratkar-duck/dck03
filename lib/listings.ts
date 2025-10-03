import type { ListingSource, VListingUnifiedStatus } from '@/types/db';

export const getListingSourceLabel = (
  source: ListingSource | string | null | undefined
): string | null => {
  if (source === 'request') {
    return 'Talep';
  }

  if (source === 'producer' || source === 'producer_listing') {
    return 'Yapımcı İlanı';
  }

  return null;
};

export const getListingStatusLabel = (
  status: VListingUnifiedStatus | string | null | undefined
): string | null => {
  if (!status) {
    return null;
  }

  const normalized = String(status).toLowerCase();

  switch (normalized) {
    case 'open':
      return 'Açık';
    case 'closed':
      return 'Kapalı';
    case 'draft':
      return 'Taslak';
    default:
      return String(status);
  }
};
