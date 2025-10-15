# Codex Prompt: ducktylo Senaryo Pazaryeri'ni Baştan İnşa Et

Aşağıdaki talimatı, boş bir GitHub deposuna bağlıyken uygulayacaksın. Amacın, mevcut ducktylo MVP'sinin bütün işlevlerini kapsayan; ancak daha temiz mimariye, daha güçlü tip güvenliğine ve uçtan uca testlerle doğrulanan yeni bir sürümünü sıfırdan yazmak.

## 1. Genel Mimari
- **Çatı teknoloji:** Next.js 13+ (App Router) + TypeScript + Tailwind CSS.
- **İstemci tarafı durum:** React Query (TanStack Query) veya benzer bir veri katmanı kullanarak Supabase çağrılarını önbelleğe al ve yeniden dene. Gerektiğinde Zustand gibi hafif global durum çözümleri kullanabilirsin ancak gereksiz karmaşıklıktan kaçın.
- **Veri kaynağı:** Supabase Postgres + Auth. `@supabase/supabase-js` ve `@supabase/auth-helpers-nextjs` paketlerini kullanarak hem sunucu hem istemci tarafı oturum yönetimini ele al.
- **Stil rehberi:** Tailwind ile temalı komponent seti (btn, card, badge, table vb.). Figma referansı yok; mevcut tonları (orman yeşili, sıcak sarılar, krem arka plan) ve tipografiyi koru.
- **CI/CD:** `npm run lint`, `npm run test`, `npm run test:e2e` komutlarını kapsayan GitHub Actions iş akışı yaz.
- **Kod standartları:** ESLint (Next.js config) + Prettier. Tüm Supabase veri modelleri ve RPC fonksiyonları için paylaşılan TypeScript tipleri üret.

## 2. Supabase Şeması ve Mantığı
Supabase'de aşağıdaki tabloları, indeksleri, RLS politikalarını ve fonksiyonları oluştur. Var olan MVP ile birebir uyumlu olacak; ancak tip, constraint ve hata yönetimi açısından geliştirilmiş olmalı.

1. `users`
   - Kolonlar: `id (uuid, pk)`, `email`, `role ('writer' | 'producer')`, `created_at`, `updated_at`.
   - `auth.users` ile senkron, email benzersiz, role için index.

2. `scripts`
   - Writer'ların eserleri. `owner_id` → `users.id`. `title`, `genre`, opsiyonel `length` (dakika), `synopsis`, `description`, `price_cents`.
   - `created_at/updated_at` timestamp. Listeleme/satın alma için indexler.

3. `producer_listings`
   - Üreticilerin açtığı ilanlar. `owner_id` bağla. `title`, `description`, `genre`, `budget_cents`, opsiyonel `deadline`.

4. `requests`
   - Yapımcı istekleri (eski + yeni sürüm). Hem `producer_id` hem `user_id` kolonlarını koru; en az birinin dolu olmasını `check` constraint ile zorunlu kıl.

5. `applications`
   - Writer → ilan başvuruları. Kolonlar: `id`, `request_id`, `listing_id`, `producer_listing_id`, `writer_id`, `script_id`, `producer_id`, `owner_id`, `status ('pending'|'accepted'|'rejected')`, `created_at`, `updated_at`.
   - Varsayılan statü `pending`, uygun indexler, RLS politikası hem writer hem producer için seçime izin verir.

6. `orders`
   - Satın almalar. `script_id`, `buyer_id`, `amount_cents`, `created_at`.

7. `interests`
   - Yapımcıların senaryolara “ilgi” bırakması. Birleşik birincil anahtar (`producer_id`, `script_id`).

8. `notification_queue`
   - Asenkron bildirim kuyruğu. `status` enum (`pending`, `processing`, `sent`, `failed`).

9. `conversations`, `conversation_participants`, `messages`
   - `conversations.application_id` üzerinden başvurulara bağlı mesajlaşma. Her konuşmada writer ve producer katılımcıları otomatik ekleyen `ensure_conversation_with_participants` RPC'si.
   - `messages` için `sender_id`, `body`, `created_at` kolonları.

10. Görünümler & RPC
    - `v_listings_unified`: `producer_listings` ve `requests` verilerini tek tabloda birleştir.
    - `get_producer_applications(producer_id uuid)`: Başvuruları listele.
    - `enqueue_notification(recipient_id uuid, template text, payload jsonb)`: Kuyruğa kayıt.
    - `rpc_mark_interest(script_id uuid)`: idempotent ilgi kaydı.
    - `ensure_conversation_with_participants(application_id uuid, acting_user_id uuid)`: Başvuruya ait konuşmayı oluşturan/geri döndüren fonksiyon. Writer ve producer'ı `conversation_participants` tablosuna ekler.

Her tablo için RLS politikaları yaz: kullanıcı yalnızca kendi kayıtlarını okuyup yazabilsin; yönetici servis rolü gerekli yerlerde tam yetkiye sahip olsun. Trigger ile `updated_at` alanlarını otomatik güncelle. Gerekli constraint/foreign key eksiklerini tamamla.

## 3. Seed Script
- `npm run seed:mvp` komutu ile çalışan bir `scripts/seed-mvp.ts` yaz.
- Servis rolü ile Supabase'e bağlanır, writer (`writer@ducktylo.test` / `password`) ve producer (`producer@ducktylo.test` / `password`) hesaplarını hazırlar.
- Writer için iki senaryo (`Göbeklitepe Günlükleri`, `Sahildeki Düşler`), producer için iki ilan (`Festival İçin Duygusal Uzun Metraj Aranıyor`, `Belgesel Ortak Yapım İlanı`) ekler.
- `Göbeklitepe Günlükleri` senaryosuna bir satış (`orders`), `Sahildeki Düşler` için kabul edilmiş başvuru, ilgili konuşma ve birkaç demo mesajı oluşturur.
- Kuyruğa bir örnek bildirim ekler.
- Script idempotent olmalı: kayıt varsa güncelle, yoksa oluştur.

## 4. Arayüz ve UX
### 4.1 Genel Layout
- `RootLayout`: global Tailwind stilleri (`app/globals.css`), `AppHeader`, `BackToTop` butonu, alt bilgi.
- `AppHeader`: oturum yoksa marketing bağlantıları (`Ana Sayfa`, `Hakkımızda`, `Nasıl Çalışır`, `Planlar`); oturum varsa rol bazlı (`/browse`, `/dashboard/<role>`, `/dashboard/<role>/messages`). Aktif bağlantı vurgusu.
- `UserMenu`: oturum durumuna göre giriş/çıkış, profil, rol bazlı hızlı bağlantılar.
- `TabTitleHandler`: sekme başlığını sayfa başlığı ile eşleştirir.

### 4.2 Marketing Sayfaları
- Ana sayfa (`app/page.tsx`): hero, özellikler, güven unsurları, CTA.
- `about`, `how-it-works`, `contact`, `plans`: mevcut içerikleri Türkçe koru, modern kart/ikon düzeni.
- `public` klasöründeki marka varlıklarını (logo vb.) kullan.

### 4.3 Auth Akışı
- Supabase e-posta/şifre tabanlı giriş.
- Sayfalar: `auth/sign-in`, `auth/sign-up-writer`, `auth/sign-up-producer`, `auth/reset-password`, `auth/sign-out`.
- Kaydolurken Supabase `user_metadata.role` ve `public.users.role` alanlarını senkronize et.
- `AuthGuard` bileşeni: oturumu olmayanları `/auth/sign-in`'e yönlendir, opsiyonel `allowedRoles` parametresiyle rol tabanlı koruma.

### 4.4 Browse Deneyimi
- `/browse`: oturum rolüne göre farklı içerik (producer hero, writer upsell, misafir teaser).
- Producer paneli altında (`/dashboard/producer/browse`): Supabase'den `scripts` ve `v_listings_unified` çeken sekmeli arayüz, filtreler (aranan kelime, tür, süre, fiyat, sıralama), canlı sonuç sayısı.
- Yapımcı ilgi butonu: `rpc_mark_interest` ve `enqueue_notification` çağrıları ile writer'a bildirim gönder. Buton durumunu anlık güncelle.

## 5. Dashboard Mimarisi
### 5.1 Ortak Bileşenler
- `DashboardShell`: masaüstü/ mobil uyumlu yan menü, nav item'lar; sticky sidebar; alt bilgi notu.
- Ortak bileşen seti: tablo, istatistik kartı, etiket, boş durum.

### 5.2 Producer Paneli
- `/dashboard/producer`: satın alma/başvuru özet kartları, kısa istatistikler.
- `scripts`: satın alınan senaryolar listesi, fiyat + KDV (`calculateTaxBreakdown`) detayı.
- `purchases`: `orders` tablosundan veriler, writer bilgileri.
- `listings` & `requests`: ilan oluşturma/düzenleme formları, durum değişimi, son başvuru tarihi yönetimi.
- `applications`: `get_producer_applications` RPC ile gelen başvuruları status etiketi, başvuru tarihi, script özetleriyle göster; kabul/ret aksiyonları + konuşma başlatma.
- `messages`: `conversation_participants` → `messages` akışı. Polling veya Supabase Realtime ile yeni mesajları çek; mesaj gönderiminde `ensure_conversation_with_participants` çağır.
- `notifications`: `notification_queue` + ilgi kayıtları; okunmamış/okunmuş durum (istemci tarafı state).
- `billing`: plan yükseltme sahte modülü; statik fiyat tablosu.

### 5.3 Writer Paneli
- `/dashboard/writer`: toplam senaryo sayısı, toplam gelir, bekleyen/kabul edilmiş başvuru sayıları.
- `scripts`: CRUD, Supabase Realtime ile anlık güncelleme. Silme işlemi confirm ile korunur.
- `stats`: satış grafikleri (ör. aylık sipariş sayısı) – Chart.js veya Recharts ile sahte veri yok, `orders` tablosundan gerçek veri.
- `listings` & `requests`: `v_listings_unified` listesinden başvurulabilir ilanlar; filtre, tür, bütçe. Başvuru sırasında script seçimi.
- `applications`: writer'ın gönderdiği başvurular, durum etiketi, ilan başlığı, `updated_at`.
- `notifications`: producer ilgileri vb.; Supabase `interests` tablosundan.
- `messages`: producer paneliyle aynı konuşma UI'sı.
- `billing`: plan yükseltme.

### 5.4 Ek Modüller
- `profile`: kullanıcı bilgisi, rol, parola yenileme linki.
- `contact` formu: Supabase `support_messages` tablosuna (ekle) veya e-posta stub'u.

## 6. Testler
- **Unit/Component (Jest + React Testing Library):**
  - `AppHeader` navigasyonu, `AuthGuard` yönlendirmesi, `calculateTaxBreakdown` fonksiyonu.
  - Dashboard bileşenlerinin veri durumları (loading/error/empty) için snapshot değil, davranış testleri.
- **E2E (Playwright):**
  - `/test/pipeline` route: writer script oluşturur, producer ilan açar, writer başvurur, producer başvuruyu kabul eder, mesajlaşma başlar. Supabase çağrılarını mock'layan deterministic test harness.
  - Ek olarak `auth` flow testi: kayıt → çıkış → giriş.

## 7. Kullanılabilirlik ve Performans İyileştirmeleri
- Skeleton loading ekranları, hata banner'ları, toast sistemi (`react-hot-toast` veya kendi implementasyonun).
- API katmanında hata mesajlarını kullanıcı dostu şekilde göster.
- Form validasyonu için `react-hook-form` + `zod` kullan.
- Realtime kanal abonelikleri için otomatik temizleme.
- Tüm Supabase sorgularında tip güvenliği (`Database` tipleri, `PostgrestError` yakalama).
- Lighthouse > 90 hedefi: görseller `next/image`, `font-display: swap`.

## 8. Dokümantasyon
- `README.md`: kurulum, env değişkenleri (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`), seed script çalıştırma, testler.
- `docs/architecture.md`: veri modeli diyagramı, ana akışlar (Browse → Buy → Dashboard → Apply → Messages).
- `docs/testing.md`: e2e ve unit test senaryoları.

## 9. Teslim Kriterleri
- `npm run lint`, `npm run test`, `npm run test:e2e` sorunsuz.
- Seed edilen demo hesaplarıyla README'deki demo akışı eksiksiz çalışır.
- RLS politikaları sayesinde kullanıcı kendi verisi dışında hiçbir kaydı göremez.
- Tüm kritik fonksiyonlar (signup, script oluşturma, purchase simülasyonu, başvuru, mesajlaşma) Supabase Realtime ve RPC katmanı ile entegre.
- UI responsive, Türkçe içerik korunmuş, `data-test-id` öznitelikleri kritik bileşenlerde bulunur (header, dashboard nav, e2e için form adımları).

Bu talimatı aynen uygula ve projeyi eksiksiz teslim et.
