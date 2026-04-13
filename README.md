# Turkish Portfolio Tracker

Türkiye borsaları için gelişmiş, mobil benzeri kullanıcı deneyimi sunan bir yatırım portföy takip uygulaması.

## Özellikler

- 📱 **Mobil-First Tasarım**: iPhone-style native UX/UI deneyimi
- 📊 **Gerçek Zamanlı Takip**: BIST hisseleri ve TEFAS fonları için otomatik fiyat güncellemesi
- 💰 **Kar/Zarar Analizi**: Detaylı performans metrikleri ve analitik
- 🌙 **Dark Mode**: Kapsamlı karanlık mod desteği
- 📈 **Analytics Dashboard**: Tarih bazlı filtreleme ve performans analizi
- 🔄 **Çoklu Görünüm**: Kart ve tablo görünümleri arası geçiş

## Teknoloji Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Neon Serverless)
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **State Management**: TanStack Query
- **ORM**: Drizzle ORM

## Admin & Debugging Endpoints

Uygulamanın çalışmasını kontrol etmek ve güvenli bir şekilde fiyat güncellemeye zorlamak için aşağıdaki gizli admin servislerini kullanabilirsiniz (Sadece yetkili/yerel ortamda test etmek için):

- **TEFAS Zorunlu Güncelleme**  
  `GET /api/admin/force-refresh-tefas`  
  *Kullanım:* Tarayıcı üzerinden `http://localhost:5001/api/admin/force-refresh-tefas` adresine gidildiğinde, saat 09:00 Cron işini beklemeden ve lokal fiyat veritabanı korumasını baypas ederek tüm TEFAS fonlarının son güncel fiyatlarını canlı olarak TEFAS resmi sitesini ziyaret edip(cookie/session kalkanını da aşarak) zorla günceller.
  
- **TEFAS Canlılık Kontrolü**  
  `GET /api/admin/tefas-health`  
  *Kullanım:* TEFAS API'sine bağlı olup olmadığınızı (IP ban/Soft-block testleri) kontrol eden genel bir diagnostic endpoint'tir.

## Kurulum

1. Bağımlılıkları yükle:
```bash
npm install
```

2. Veritabanı şemasını güncelle:
```bash
npm run db:push
```

3. Geliştirme modunda çalıştır:
```bash
npm run dev
```

4. Production build:
```bash
npm run build
npm run start
```

## Deployment

Bu uygulama Replit platformunda deploy edilmek üzere optimize edilmiştir:

- PostgreSQL veritabanı otomatik olarak hazırlanır
- Environment variables (DATABASE_URL, vb.) otomatik olarak ayarlanır
- Build script production için optimize edilmiştir

## Fiyat Servisleri ve Veri Kaynakları

Portföy Takip uygulaması, piyasa verilerini en güvenilir ve optimize edilmiş şekilde çekmek için farklı stratejiler kullanır:

### 1. TEFAS Yatırım Fonları
- **Kaynak:** `https://www.tefas.gov.tr/api/DB/BindHistoryInfo`
- **İşleyiş:** TEFAS sunucuları botlara karşı katı IP sınırlandırmalarına sahiptir (Soft-block / Socket hang up hataları). Bu korumayı aşmak için sistem, önce `TarihselVeriler.aspx` sayfasına bir arka plan isteği atarak gerçek bir tarayıcı oturumu (Session Cookie) başlatır. Ardından bu çerezleri kullanarak API'den verileri çeker.
- **Optimizasyon:** Uygulama içerisinde sürekli fiyat güncellemek, anında IP ban yemenize sebep olur. Bu yüzden sistem; fiyatları **sadece 09:00 ve 10:00 saatlerinde arka plan Cron Job'u ile** TEFAS'tan günceller. Gün içindeki uygulamayı açıp kapamalarınızda (yeni eklenen fonlar hariç) tamamen yerel PostgreSQL veritabanındaki son başarılı fiyatı kullanır (Fallback mekanizması).

### 2. BIST Hisseleri
- **Kaynak:** Google Finance (`https://www.google.com/finance/quote/SEMBOL:IST`)
- **İşleyiş:** Doğrudan HTML scraping (Cheerio) kullanılarak canlı fiyat okunur. Google Finance DOM node'ları (`.YMlKec.fxKbKc` vb.) ve Türkçe para birimi/ondalık formatları (örn. `₺119,30`) Regex ile parse edilip matematiksel değerlere dönüştürülür.
- **Optimizasyon:** Google sunucuları yüksek trafik kaldırabildiği için BIST verileri her **15 dakikada bir** güncellenir. Eğer Google Finance hata verirse lokal mock/yedek fiyatlara geri dönülür.

### 3. ABD Hisseleri (US Stocks)
- **Kaynak:** Google Finance (`NASDAQ` veya `NYSE`)
- **İşleyiş:** Hisse senedinin borsası kesin bilinmediği için, sistem akıllı tarama yapar. Önce `NASDAQ` borsasında sembolü arar; eğer bulamazsa (veya sıfır dönerse) otomatik olarak `NYSE` borsasını dener ve amerikan doları ($) cinsinden hisse fiyatını parse eder.
- **Optimizasyon:** BIST ile birlikte 15 dakikalık cron takviminde güncellenir.

### 4. Döviz Kuru (USD/TRY vb.)
- **Kaynak:** Frankfurter API (`https://api.frankfurter.app`) ve Google Finance
- **İşleyiş:** Sisteme eklenen Amerikan hisselerinin Türk Lirası cinsinden güncel değerini, veya geçmiş tarihli "Alış Kuru" detaylarını hesaplamak için kullanılır. 
- Eğer **güncel (live)** kur çekmek gerekirse Frankfurter API `latest` endpoint'ine, **geçmiş (historical)** bir alış kurunu çekmek gerekirse `1999-01-04` stili spesifik tarih endpoint'ine istek atılarak isabetli Merkez Bankası kur verisi alınır. Frankfurter çökükse Google Finance'in `/quote/USD-TRY:CURRENCY` adresine fallback atar.

## Lisans

MIT License