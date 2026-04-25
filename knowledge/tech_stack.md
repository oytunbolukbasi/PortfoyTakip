# Teknoloji Yığını (Tech Stack)

Bu doküman, Portföy Takip uygulamasının mimarisini, kullanılan teknolojileri, bağımlılıkları ve deployment süreçlerini detaylandırır.

## 🏗️ Temel Mimari
Uygulama, modern bir full-stack web uygulaması mimarisine sahiptir ve **Single Page Application (SPA)** modelini kullanır.

- **Frontend Framework**: React 18
- **Backend Framework**: Express.js (Node.js)
- **Dil**: TypeScript (Uçtan uca tip güvenliği)
- **Build Tool**: Vite (Frontend) & Esbuild (Backend bundle)

## 🎨 Frontend (Önyüz) Katmanı
Mobil öncelikli (Mobile-First) tasarım anlayışıyla geliştirilmiştir.

- **Styling**: Tailwind CSS (Token tabanlı sistem)
- **UI Bileşenleri**: Radix UI (Unstyled primitive'ler) + shadcn/ui
- **State Management & Data Fetching**: React Query (TanStack Query) v5
- **Form Yönetimi**: React Hook Form + Zod (Validation)
- **Animasyonlar**: Framer Motion
- **İkonlar**: Lucide React & React Icons
- **Grafikler**: Recharts
- **PWA**: Vite Plugin PWA (Offline destek ve mobil uygulama deneyimi)

## ⚙️ Backend (Sunucu) Katmanı
Güvenlik ve verimlilik odaklı bir API katmanıdır.

- **Authentication**: `express-session` tabanlı session yönetimi.
- **ORM**: Drizzle ORM (Type-safe SQL query builder)
- **Zamanlanmış Görevler**: `node-cron` (Fiyat güncellemeleri için)
- **HTTP Client**: Axios (Google Sheets ve Fintables Scraper bağlantıları için)

## 📊 Veri Kaynakları ve Fiyatlandırma Motoru
Uygulamanın kalbi olan veri katmanı, "Sıfır Sahte Veri" politikasıyla çalışır.

- **BIST & ABD Fiyatları**: Google Sheets JSON API (Özel Apps Script Web App)
- **Fon Fiyatları**: Fintables Scraper + ScraperAPI (Proxy/Bypass)
- **Döviz Kurları**: Frankfurter API (USD/TRY çevrimi için)
- **Webhook**: Yeni sembollerin Google Sheets'e otomatik kaydı için asenkron POST yapısı.

## 🗄️ Veritabanı ve Depolama
- **Database**: PostgreSQL
- **Provider**: Neon Serverless (Cloud PostgreSQL)
- **Storage Strategy**: `storage.ts` interface'i üzerinden modüler veri erişimi.

## 🧠 Yapay Zeka (AI) Entegrasyonu
- **Model**: Google Gemini 2.5 Flash
- **SDK**: `@google/generative-ai`
- **Logic**: Dinamik portföy verisi enjeksiyonu ve `prompt.ts` üzerinden merkezi talimat yönetimi.

## 🚀 Deployment ve DevOps
- **Platform**: Railway
- **Containerization**: Nixpacks (Otomatik Docker build)
- **Database Migrations**: `drizzle-kit push`
- **Sürüm Takibi**: `scripts/update-version.js` (Otomatik VERSION_HISTORY.md yönetimi)

## 📦 Temel Bağımlılıklar (Dependencies)
```json
{
  "react": "^18.3.1",
  "express": "^4.21.2",
  "drizzle-orm": "^0.39.1",
  "@tanstack/react-query": "^5.60.5",
  "tailwindcss": "^3.4.17",
  "vaul": "^1.1.2", // Drawer/Modal deneyimi için
  "node-cron": "^4.2.1",
  "zod": "^3.24.2"
}
```

---
*Son Güncelleme: 25 Nisan 2026*
