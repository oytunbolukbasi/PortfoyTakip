# Portföy Takip (Portfolio Tracker)

Türkiye borsaları, ABD piyasaları ve yatırım fonları için geliştirilmiş, mobil öncelikli (Mobile-First) tasarım anlayışına sahip gelişmiş bir portföy yönetim ve analitik uygulaması.

## 🏗️ Mimari ve Teknoloji Yığını

- **Önyüz (Frontend)**: React 18, TypeScript, Vite. Native benzeri bir deneyim için Tailwind CSS ve Radix UI üzerine inşaa edilmiş özel UI bileşenleri.
- **Sunucu (Backend)**: Node.js, Express.js. API güvenliği için `express-session` tabanlı, çevre değişkenleri (`APP_USERNAME/PASSWORD`) ile doğrulanan özel bir authentication middleware'i kullanılır.
- **Veritabanı (Database)**: PostgreSQL (Neon Serverless). Şema yönetimi ve query builder olarak `Drizzle ORM` kullanımı.
- **Fiyat Motoru**: Google Sheets JSON API — tüm BIST ve ABD hisse fiyatlarının tek ve güvenilir kaynağı.
- **Yapay Zeka (AI)**: Google Gemini 2.5 Flash. Dinamik portföy enjeksiyonu ve `prompt.ts` üzerinden modüler yönetim.
- **Deployment**: Railway platformu üzerinde Docker/Nixpacks konteyner yapısında çalışır.

## 🌐 Veri Toplama ve Fiyat Motoru

Uygulama, varlık türüne göre farklı veri kaynakları kullanır. Tüm kaynaklar için **sıfır sahte veri (Zero Mock Data)** politikası uygulanır: fiyat bulunamazsa `null` döner, asla uydurma fiyat üretilmez.

### 1. BIST Hisseleri (Borsa İstanbul)
- **Kaynak**: Google Sheets JSON API.
- **Format**: `{ "GARAN": 138.5, "MAVI": 44.08, ... }` şeklinde `Record<string, number>` yapısı.
- **Güncelleme**: `PriceMonitor` servisi her 15 dakikada bir Google Sheets'ten çeker ve veritabanını günceller.
- **Yeni Sembol Ekleme (Webhook)**: Yeni pozisyon eklendiğinde, Google Sheets API'sine arka planda otomatik `POST` isteği gönderilir (örn: `{"symbol": "IST:THYAO"}`), böylece ilgili sembol fiyat takip listesine eklenir.
- **Hata Durumu**: Sheets yanıt vermezse veritabanındaki son başarılı fiyat (`currentPrice`) kullanılır. O da yoksa `null` döner.

### 2. ABD Hisseleri (NASDAQ / NYSE)
- **Kaynak**: BIST hisseleriyle aynı Google Sheets JSON API. Fiyatlar USD cinsinden gelir.
- **Döviz Çevrimi**: Portföy toplamı ve k/z hesaplaması için `Frankfurter API` üzerinden anlık USD/TRY kuru alınır.
- **Hata Durumu**: Kur servisi çalışmazsa varsayılan sabit kur (35.00) kullanılır.
- **Webhook**: Yeni ABD hisse pozisyonu eklendiğinde, `{"symbol": "NASDAQ:AAPL"}` veya `{"symbol": "NYSE:SES"}` formatında POST gönderilir.

### 3. Yatırım Fonları
Fon verileri en karmaşık ve korumalı yapıdır:
- **Fintables Scraper**: `fintables.com` üzerinden HTML parsing (Cheerio) ile güncel fon fiyatları alınır.
- **ScraperAPI Proxy**: Fintables'ın Cloudflare ve bot korumalarını aşmak için tüm istekler `render=true` ve `premium=true` parametreleriyle ScraperAPI üzerinden proxy ile yönlendirilir.
- **Kota Koruması (Quota Protection)**: ScraperAPI kredilerini korumak için fonlar sadece günde iki kez (TSİ 09:00 ve 10:00) güncellenir.
- **Manuel Yenileme Engeli**: Kullanıcıların manuel "Refresh" butonuna basması fonlar için canlı tetikleme yapmaz; veritabanındaki son başarılı fiyat gösterilir.

## ⏱️ Zamanlanmış Görevler (Cron Jobs) ve Kota Yönetimi

ScraperAPI ve dış kaynak maliyetlerini/kotalarını optimize etmek için katı bir güncelleme politikası uygulanır:

- **Fon Güncellemeleri**: Her gün sadece Türkiye saati ile **09:00 ve 10:00**'da (UTC 06:00/07:00) otomatik olarak yapılır.
- **Hisse Güncellemeleri**: Her **15 dakikada bir** Google Sheets JSON API üzerinden otomatik güncellenir.
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
- **Günlük Değişim (Daily P/L)**: Kaldırılmıştır. Güvenilir bir "dünkü kapanış fiyatı" kaynağı olmadan günlük değişim hesaplanamadığından, portföy özet kartından tamamen çıkarılmıştır.
- **Veri Giriş Standardı**: Kullanıcıdan gelen her türlü sayısal veri (fiyat, adet vb.) sistem tarafından otomatik olarak işlenir:
    - Binlik ayırıcılar (.) silinir.
    - Ondalık virgül (,) noktaya (.) dönüştürülür.
    - Veritabanında her zaman standart matematiksel (float) formatta saklanır.

## 🔒 Sıfır Sahte Veri Politikası (Zero Mock Data)

Sistem hiçbir koşulda sahte fiyat üretmez:
1. **Canlı kaynak (Google Sheets / Fintables)** yanıt vermezse → veritabanındaki son başarılı fiyat kullanılır.
2. **Veritabanında da fiyat yoksa** → `null` döner.
3. **Frontend'de `null` fiyat** → Kullanıcıya "Fiyat Güncellenemedi" uyarısı gösterilir, portföy hesaplamalarında `buyPrice` (maliyet) geçici değer olarak kullanılır.

## ⚡ Optimistic Updates (İyimser Güncelleme)

Kullanıcı deneyimini iyileştirmek için React Query `useMutation` ile optimistic update yapısı kullanılır:
- Yeni pozisyon eklendiğinde, backend yanıtı beklenmeden form anında kapanır ve pozisyon listeye eklenir.
- Backend başarısız olursa cache otomatik olarak geri alınır (rollback).
- Her durumda `onSettled` ile cache invalidate edilir ve gerçek veri sunucudan yenilenir.

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
- Google Sheets JSON API uç noktası (Apps Script Web App)
- ScraperAPI Hesabı (API Key — sadece yatırım fonları için)
- Neon DB veya herhangi bir PostgreSQL bağlantısı

### Kurulum Adımları
1. Bağımlılıklar: `npm install`
2. DB Şeması: `npm run db:push`
3. Dev: `npm run dev`

### Kritik Environment Variables
- `DATABASE_URL`: PostgreSQL bağlantı dizesi.
- `SCRAPER_API_KEY`: ScraperAPI erişim anahtarı (yatırım fonları için).
- `APP_USERNAME` / `APP_PASSWORD`: Giriş bilgileri.

## 📂 API Endpoints

| Endpoint | Metod | Açıklama |
|---|---|---|
| `/api/positions` | `GET` | Tüm aktif pozisyonları listeler |
| `/api/positions` | `POST` | Yeni pozisyon ekler, Google Sheets webhook tetikler |
| `/api/positions/:id` | `DELETE` | Pozisyonu siler |
| `/api/prices/refresh` | `POST` | Tüm portföy fiyatlarını toplu günceller |
| `/api/positions/:id/refresh-price` | `POST` | Tekil pozisyon fiyatını zorla günceller |
| `/api/admin/force-refresh-tefas` | `GET` | Manuel tüm fonları güncelleme |
| `/api/ai/history` | `GET` | Yapay zeka geçmiş analizleri listeleme |
| `/api/ai/analyze` | `POST` | Yeni yapay zeka analizi başlatma |
| `/api/ai/history` | `DELETE` | Tüm analiz geçmişini kalıcı olarak silme |

---
*Bu proje Railway platformu üzerinde koşturulmak üzere optimize edilmiştir.*
*Son güncelleme: 25 Nisan 2026*