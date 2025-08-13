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

## Veri Kaynakları

- **BIST Hisseleri**: Google Finance API entegrasyonu
- **TEFAS Fonları**: Resmi TEFAS web sitesi entegrasyonu
- **Gerçek Zamanlı Güncelleme**: 5 dakikada bir otomatik fiyat güncellemesi

## Lisans

MIT License