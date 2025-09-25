// types/db.ts
// Ducktylo veri şeması için merkezi TypeScript tipleri
// (Supabase tablo alanlarına göre hazırlanmıştır)

export type Role = 'writer' | 'producer';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface User {
  id: string;
  email: string;
  role: Role | null;
}

export interface Script {
  id: string;
  title: string;
  genre: string;
  length: number;
  synopsis: string;
  description: string;
  price_cents: number;
  owner_id: string; // senaryo sahibi (writer)
  created_at: string; // ISO
}

export type ListingSource = 'producer_listings' | 'requests';

export interface Listing {
  id: string;
  owner_id: string | null;
  title: string;
  description: string | null;
  genre: string;
  budget_cents: number | null;
  created_at: string;
  deadline?: string | null;
  source: ListingSource;
}

export interface ProducerListing {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  genre: string;
  budget_cents: number;
  created_at: string;
  deadline?: string | null;
}

export interface Request {
  id: string;
  title: string;
  description: string | null;
  genre: string;
  length: number | null; // dakika cinsinden süre
  budget: number | null;
  deadline?: string | null; // date (YYYY-MM-DD) olabilir
  created_at: string; // ISO
  // Şemanızda her ikisi de görüldüğü için ikisini de opsiyonel tuttum:
  user_id?: string | null; // eski kullanım (ilan sahibi)
  producer_id?: string | null; // yeni kullanım (ilan sahibi)
}

export interface Application {
  id: string;
  request_id?: string | null;
  listing_id?: string | null;
  producer_listing_id?: string | null;
  writer_id: string;
  script_id: string;
  producer_id?: string | null;
  owner_id?: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at?: string;
}

export interface Suggestion {
  id: string;
  script_id: string;
  request_id: string;
  user_id: string;
  status: ApplicationStatus | string;
  created_at: string; // ISO
}

export interface Order {
  id: string;
  script_id: string;
  buyer_id: string;
  amount_cents: number;
  created_at: string;
}

export interface Conversation {
  id: string;
  application_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

// Sayfalarda kullandığımız JOIN çıktı tipleri
export interface ApplicationWithJoins {
  id: string;
  status: ApplicationStatus | string;
  script:
    | Pick<
        Script,
        'id' | 'title' | 'genre' | 'length' | 'synopsis' | 'description' | 'price_cents' | 'owner_id'
      >
    | null;
  writer: Pick<User, 'id' | 'email'> | null;
}
