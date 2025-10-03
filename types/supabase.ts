export type ListingSource = 'request' | 'producer';

export type VListingUnifiedStatus = 'open' | 'closed' | 'draft' | string;

export type VListingUnified = {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  genre: string | null;
  budget: number | null;
  created_at: string;
  deadline: string | null;
  status: VListingUnifiedStatus | null;
  source: ListingSource;
};

export type SupabaseApplicationRow = {
  application_id: string | null;
  status: string | null;
  created_at: string | null;
  listing_id: string | null;
  producer_listing_id: string | null;
  request_id: string | null;
  request_title: string | null;
  listing_title: string | null;
  listing_source: ListingSource | null;
  owner_id: string | null;
  producer_id: string | null;
  script_id: string | null;
  script_metadata:
    | (Record<string, unknown> & {
        id?: unknown;
        title?: unknown;
        length?: unknown;
        price_cents?: unknown;
        writer_email?: unknown;
      })
    | null;
  writer_email: string | null;
  conversations: Array<{ id: string | null }> | null;
};

export type SupabaseApplicationScriptMetadata = SupabaseApplicationRow['script_metadata'];
