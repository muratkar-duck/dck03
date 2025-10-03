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
  script_title: string | null;
  script_genre: string | null;
  script_length: number | string | null;
  script_price_cents: number | string | null;
  script_writer_email: string | null;
  listing_title: string | null;
  listing_source: string | null;
  request_title: string | null;
  request_genre: string | null;
  request_length: number | string | null;
  request_writer_email: string | null;
  conversation_id: string | null;
}
