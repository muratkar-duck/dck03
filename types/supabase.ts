export type SupabaseApplicationScriptMetadata =
  | (Record<string, unknown> & {
      id?: unknown;
      title?: unknown;
      length?: unknown;
      price_cents?: unknown;
      writer_email?: unknown;
    })
  | null;

export interface SupabaseApplicationListing {
  id: string | null;
  title: string | null;
  owner_id: string | null;
  source: string | null;
}

export interface SupabaseApplicationWriter {
  id: string | null;
  email: string | null;
}

export interface SupabaseApplicationConversation {
  id: string | null;
}

export interface SupabaseApplicationRow {
  application_id: string | null;
  status: string | null;
  created_at: string | null;
  listing_id: string | null;
  producer_listing_id: string | null;
  request_id: string | null;
  owner_id: string | null;
  producer_id: string | null;
  script_id: string | null;
  script_metadata: SupabaseApplicationScriptMetadata;
  listing: SupabaseApplicationListing | null;
  writer: SupabaseApplicationWriter | null;
  conversations: SupabaseApplicationConversation[] | null;
}
