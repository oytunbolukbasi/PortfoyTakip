# Portföy Takip (Portfolio Tracker)

Türkiye borsaları, ABD piyasaları ve yatırım fonları için geliştirilmiş, mobil öncelikli (Mobile-First) tasarım anlayışına sahip gelişmiş bir portföy yönetim ve analitik uygulaması.

## 🏗️ Mimari ve Teknoloji Yığını

- **Önyüz (Frontend)**: React 18, TypeScript, Vite. Native benzeri bir deneyim için Tailwind CSS ve Radix UI üzerine inşaa edilmiş özel UI bileşenleri.
- **Sunucu (Backend)**: Node.js, Express.js. API güvenliği için `Passport.js` tabanlı authentication.
- **Veritabanı (Database)**: PostgreSQL (Neon Serverless). Şema yönetimi ve query builder olarak `Drizzle ORM` kullanımı.
- **Deployment**: Railway platformu üzerinde Docker/Nixpacks konteyner yapısında çalışır.

## 🌐 Veri Toplama ve Network Katmanı

Uygulama, veri kaynaklarına olan erişimi stabilize etmek ve IP engellerini aşmak için gelişmiş bir tünelleme mimarisi kullanır.

### 1. Yatırım Fonları (TEFAS)
- **Kaynak**: `fintables.com/fonlar/${symbol}` (Agresif TEFAS IP bloklarını aşmak için alternatif kaynak).
- **Yöntem**: Tüm istekler **ScraperAPI** üzerinden yönlendirilir.
- **Bypass**: Cloudflare ve Bot Fight Mode korumalarını aşmak için `render=true` (JS Rendering) aktif edilir.
- **Konfigürasyon**: Ağ gecikmeleri ve render süreleri için **60 saniyelik timeout** tanımlıdır.

### 2. Borsa İstanbul (BIST) ve ABD Hisseleri
- **Kaynak**: Google Finance.
- **Yöntem**: Doğrudan HTML kazıma (Cheerio).
- **BIST**: `:IST` borsası üzerinden TL fiyat çekilir.
- **ABD**: `NASDAQ` ve `NYSE` borsaları üzerinden USD fiyat çekilir.

### 3. Döviz Kuru (USD/TRY)
- **Kaynak**: Frankfurter API (Birincil), Google Finance Currency (Yedek).
- **Mantık**: Amerikan hisselerinin TL karşılığını hesaplamak ve alış tarihindeki geçmiş kurları (Historical Rate) yakalamak için kullanılır.

## ⏱️ Zamanlanmış Görevler (Cron Jobs) ve Kota Yönetimi

ScraperAPI ve dış kaynak maliyetlerini/kotalarını optimize etmek için katı bir güncelleme politikası uygulanır:

- **Fon Güncellemeleri**: Her gün sadece Türkiye saati ile **09:00 ve 10:00**'da (UTC 06:00/07:00) otomatik olarak yapılır.
- **Hisse Güncellemeleri**: Her **15 dakikada bir** otomatik olarak güncellenir.
- **Kota Koruması (On-Demand Fetch)**: Kullanıcı yeni bir fon eklediğinde veya sayfa görüntülendiğinde **canlı istek atılmaz**. Sistem veritabanındaki veya cache'teki son fiyatı kullanır.
- **Manuel Zorlama (Forced Refresh)**: 
    - Admin endpoint: `/api/admin/force-refresh-tefas` (Tüm fonlar için canlı güncellemeyi zorlar).
    - Pozisyon Detay: Pozisyon kartı içindeki "Fiyatı Güncelle" butonu sadece ilgili fon için canlı sorgu başlatır.

## 📈 Hesaplama Mantığı ve Business Logic

Uygulama içindeki tüm matematiksel gösterimler aşağıdaki kurallara göre hesaplanır:

- **Kar/Zarar (TRY)**: `(Güncel Fiyat - Alış Fiyatı) * Adet`.
- **ABD Hisse Senetleri**:
    - **Maliyet (TRY)**: `Alış Fiyatı (USD) * Adet * Güncel USD/TRY Kuru`. (Not: Özet ekranında kur etkisini izole etmek için hem maliyet hem değer güncel kurla normalize edilir).
    - **Detay Görünümü**: Alış tarihindeki kur (`buyRate`) üzerinden gerçek TL maliyeti de takip edilebilir.
- **Portföy Özeti**: Gerçekleşen (Satılmış) ve Bekleyen (Aktif) pozisyonların toplam k/z verisi konsolide edilir.
- **Sayı Formatı**: Türkiye standartlarına uygun; ondalık ayırıcı virgül (`,`), binlik ayırıcı nokta (`.`) olarak kullanılır.

## 🛠️ Kurulum ve Deployment

### Gereksinimler
- Node.js >= 20.0
- ScraperAPI Hesabı (API Key)
- Neon DB veya herhangi bir PostgreSQL bağlantısı

### Kurulum Adımları
1. Bağımlılıklar: `npm install`
2. DB Şeması: `npm run db:push`
3. Dev: `npm run dev`

### Kritik Environment Variables
- `DATABASE_URL`: PostgreSQL bağlantı dizesi.
- `SCRAPER_API_KEY`: ScraperAPI erişim anahtarı.
- `APP_USERNAME` / `APP_PASSWORD`: Giriş bilgileri.

## 📂 API Endpoints

- `GET /api/admin/force-refresh-tefas`: Manuel tüm fonları güncelleme.
- `GET /api/admin/tefas-health`: Bağlantı ve proxy durum testi.
- `POST /api/positions/:id/refresh-price`: Tekil pozisyon fiyatını zorla güncelleme.

---
*Bu proje Railway platformu üzerinde koşturulmak üzere optimize edilmiştir.*