# Portföy Takip (Portfolio Tracker)

Türkiye borsaları, ABD piyasaları ve yatırım fonları için geliştirilmiş, mobil öncelikli (Mobile-First) tasarım anlayışına sahip gelişmiş bir portföy yönetim ve analitik uygulaması.

## 🏗️ Mimari ve Teknoloji Yığını

- **Önyüz (Frontend)**: React 18, TypeScript, Vite. Native benzeri bir deneyim için Tailwind CSS ve Radix UI üzerine inşaa edilmiş özel UI bileşenleri.
- **Sunucu (Backend)**: Node.js, Express.js. API güvenliği için `express-session` tabanlı, çevre değişkenleri (`APP_USERNAME/PASSWORD`) ile doğrulanan özel bir authentication middleware'i kullanılır.
- **Veritabanı (Database)**: PostgreSQL (Neon Serverless). Şema yönetimi ve query builder olarak `Drizzle ORM` kullanımı.
- **Yapay Zeka (AI)**: Google Gemini 2.5 Flash. Dinamik portföy enjeksiyonu ve `prompt.ts` üzerinden modüler yönetim.
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

- **Mantık**: Amerikan hisselerinin TL karşılığını hesaplamak ve alış tarihindeki geçmiş kurları (Historical Rate) yakalamak için kullanılır.
- **Geriye Dönük Veritabanı (Backfill)**: Eksik kur verileri için geçmişe dönük otomatik tamamlama (`backfill-rates`) mekanizması mevcuttur.

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
    - **Gerçekleşen Maliyet**: Alış tarihindeki kur (`buyRate`) üzerinden gerçek TL maliyeti detay ekranında takip edilir.
- **Portföy Özeti**: Gerçekleşen (Satılmış) ve Bekleyen (Aktif) pozisyonların toplam k/z verisi konsolide edilir.
- **Veri Giriş Standardı**: Kullanıcıdan gelen her türlü sayısal veri (fiyat, adet vb.) sistem tarafından otomatik olarak işlenir:
    - Binlik ayırıcılar (.) silinir.
    - Ondalık virgül (,) noktaya (.) dönüştürülür.
    - Veritabanında her zaman standart matematiksel (float) formatta saklanır.

## 🤖 Yapay Zeka Analisti (Gemini 2.5 Flash)

Analiz sayfası, portföyünüzü proaktif bir şekilde inceleyen bir "AI Hub" mimarisine sahiptir:

1. **Dinamik Context (Hafıza) Enjeksiyonu**: Gemini'ye gönderilen her mesajda, sistem o anki aktif ve kapalı portföy durumunu JSON formatında otomatik olarak çeker ve `systemInstruction` içerisine gömer. 
2. **Modüler Prompt Yönetimi**: Sistem talimatları `server/prompt.ts` dosyasında merkezi olarak yönetilir. AI, sadece kendisine verilen bu portföy verilerine dayanarak analiz yapar.
3. **Sohbet Hafızası**: Yapay zeka ile yapılan tüm konuşmalar veritabanında saklanır ve her yeni oturumda Gemini API'nin anladığı formata (User/Model role mapping) çevrilerek geri yüklenir.
4. **Lean Tasarım**: UI tarafında kullanıcıyı yormayan, klavye dostu (iOS dvh uyumlu) ve geçmiş analizlere kolay erişim sunan bir sohbet arayüzü kullanılır.

## 🎨 Design System

Uygulama, `design_system.md` dokümanında tam olarak tanımlanmış token tabanlı bir renk sistemine sahiptir.

### Çalışma Prensibi

Tüm renkler `client/src/index.css` içindeki CSS değişkenleri (custom properties) üzerinden yönetilir. Hiçbir bileşen içinde hardcoded hex renk kullanılmaz.

```
CSS Variables (index.css)
  └── Tailwind Config (tailwind.config.ts)
        └── Bileşenler (token class'ları: bg-card, text-success-500, ...)
```

### Token Kategorileri

| Kategori | Tailwind Class Örneği | Kullanım Yeri |
|---|---|---|
| **Primary (Teal)** | `bg-primary-500`, `text-primary-400` | Butonlar, aktif durumlar |
| **Success (Kâr)** | `text-success-500`, `bg-success-100` | Pozitif K/Z değerleri |
| **Error (Zarar)** | `text-error-500`, `bg-error-100` | Negatif K/Z değerleri |
| **Backgrounds** | `bg-card`, `bg-subtle` | Kart ve ikincil yüzeyler |
| **Text** | `text-text-primary`, `text-text-secondary`, `text-text-tertiary` | Metin hiyerarşisi |
| **Asset Colors** | `text-asset-hisse`, `text-asset-usd`, `text-asset-fon` | Sadece grafik/legend |
| **Insight (AI)** | `text-insight`, `bg-insight/10` | AI Hub bileşenleri |

### İki Namespace Stratejisi

shadcn/Radix UI bileşenleri (`button`, `badge`, `input` vb.) kendi `--primary`, `--foreground` token'larını kullanmaya devam eder. Projeye özgü token'lar (`--color-primary-500` vb.) shadcn namespace'inin **yanına** eklenir, üstüne yazılmaz.

### Dark Mode

`.dark` class'ı `<html>` elementine uygulandığında CSS değişkenleri otomatik olarak dark değerlerine geçer. Bileşenlerde tek bir `dark:` Tailwind prefixi kullanılmaz; tüm dark mode yönetimi merkezi CSS bloğundan yapılır.

> Tam token listesi, mimari kararlar ve bileşen migration kuralları için → [`design_system.md`](./design_system.md)

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
- `GET /api/ai/history`: Yapay zeka geçmiş analizleri listeleme.
- `POST /api/ai/analyze`: Yeni yapay zeka analizi başlatma.
- `DELETE /api/ai/history`: Tüm analiz geçmişini kalıcı olarak silme.
- `POST /api/prices/refresh`: Tüm portföy fiyatlarını toplu güncelleme.
- `POST /api/positions/:id/refresh-price`: Tekil pozisyon fiyatını zorla güncelleme.

---
*Bu proje Railway platformu üzerinde koşturulmak üzere optimize edilmiştir.*