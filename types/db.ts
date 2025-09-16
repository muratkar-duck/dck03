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

export interface Request {
  id: string;
  title: string;
  description: string | null;
  genre: string;
  length: string | null; // "90 dakika", "Kısa Film" gibi string değerler
  budget: number | null;
  deadline?: string | null; // date (YYYY-MM-DD) olabilir
  created_at: string; // ISO
  // Şemanızda her ikisi de görüldüğü için ikisini de opsiyonel tuttum:
  user_id?: string | null; // eski kullanım (ilan sahibi)
  producer_id?: string | null; // yeni kullanım (ilan sahibi)
}

export interface Application {
  id: string;
  request_id: string;
  script_id: string;
  user_id: string; // başvuruyu yapan (writer)
  producer_id: string | null; // ilan sahibi (producer)
  status: ApplicationStatus | string;
  created_at: string; // ISO
}

export interface Suggestion {
  id: string;
  script_id: string;
  request_id: string;
  user_id: string;
  status: ApplicationStatus | string;
  created_at: string; // ISO
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
