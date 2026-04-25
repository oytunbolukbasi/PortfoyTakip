Portföy App - Development Style & Agent Memory
Bu dosya, "Portföy Takip" (Portfolio Tracker) uygulamasının mimari kurallarını, tasarım sistemini ve geliştirme standartlarını içerir. Projede yapılacak her kod değişikliği bu kurallara sıkı sıkıya bağlı kalmalıdır.

1. Mimari ve Teknoloji Yığını
Önyüz (Frontend): React 18, TypeScript, Vite.

UI Kütüphaneleri: Tailwind CSS, Radix UI (özellikle Vaul bottom sheet bileşenleri için).

Arkayüz (Backend): Node.js, Express.js.

Veritabanı (Database): PostgreSQL (Neon Serverless), Drizzle ORM.

Altyapı (Deployment): Railway platformu (Docker/Nixpacks).

2. Tasarım Felsefesi (UI/UX)
Mobile-First ve Native Hissiyat: Uygulama, iOS/Android native uygulamaları gibi hissettirmelidir. Tam ekran modallar yerine ekranın altından kayarak açılan (Bottom Sheet) Vaul yapıları kullanılmalıdır.

Minimalizm (Revolut/Midas Tarzı): Kullanıcının bilişsel yükünü azaltmak için ekranlar temiz tutulmalıdır. Gereksiz tekrar eden metinlerden (örneğin her satırda "KAR / ZARAR" yazması) ve kalabalıktan kaçınılmalıdır.

Akıcılık (Optimistic Updates): Form gönderimlerinde (örneğin pozisyon ekleme) backend yanıtı beklenmeden, React Query kullanılarak arayüzde "İyimser Güncelleme" (Optimistic Update) yapılmalıdır. Backend'den hata gelse bile UI önce kullanıcıya başarı hissi vermeli, hata durumunda "Rollback" (Geri alma) yapmalıdır. Toast mesajları backend'den gelen detaylı hata mesajını içermelidir.

Düzen ve Bilgi Hiyerarşisi: Yoğun listelerde satır aralarına ince ayırıcı çizgiler (divide-y) eklenerek okunabilirlik artırılmalıdır. Özellikler birbirinden kopuk değil, "Bütünleşik Kart" (Unified Hub) mantığıyla gruplandırılmalıdır.

Dark Mode ve Renk Sistemi: Geliştirmeler merkezi renk token'ları üzerinden yapılmalı, hardcode dark: class'ları ile tasarıma müdahale edilmemelidir.

3. Veri Yönetimi ve Fiyatlandırma Stratejisi
Mock (Sahte) Veriye Sıfır Tolerans: Fiyat alınamadığında veya sistem hata verdiğinde ASLA uydurma veri (mock price) üretilmemelidir. Sistem null dönmeli ve eski fiyat korunmalıdır.

Güvenli Hata Yönetimi (Null-Handling): Fiyat güncellenemediğinde uygulama veya grafikler çökmemeli; bunun yerine kullanıcıya UI üzerinden zarifçe "Veri Bekleniyor" veya AlertCircle ikonu ile eksik veri uyarısı gösterilmeli ve analizler son alış maliyeti (buyPrice) üzerinden yapılmalıdır.

BIST ve ABD Hisseleri: Veriler, Google Sheets API'si üzerinden (=GOOGLEFINANCE formülleri kullanılarak) oluşturulan özel bir JSON uç noktasından çekilir. Yeni eklenen semboller backend üzerinden Webhook (doPost) ile otomatik olarak bu tabloya işlenir. Yabancı hisselerin çevrimi için Frankfurter API kullanılır.

Yatırım Fonları: Veriler doğrudan Fintables üzerinden ScraperAPI kullanılarak çekilir. Kota tasarrufu ve hız için `render=false` parametresi ile ham HTML üzerinden regex tabanlı kazıma yapılır.

4. Yapay Zeka (Gemini) Entegrasyonu
Model ve Görev: Uygulama, kullanıcının portföy analizi için Gemini 2.5 Flash modelini kullanır.

Bağlam (Context) Yönetimi: Yapay zekaya "hafıza" kazandırmak için her kullanıcı mesajında portföyün güncel JSON snapshot'ı arka planda sisteme (system instruction olarak) tekrar enjekte edilir.

Chat UX: Uzayan sohbet geçmişleri için Load More fonksiyonu kullanılmalı ve "Geçmişi Temizle" özelliği şık, native hissettiren bir uyarı modalı (Alert Dialog) ile korunmalıdır.

5. Güvenlik ve Agent Geliştirme Kuralları
Çevresel Değişkenler (Environment Variables): API Anahtarları (SCRAPER_API_KEY, GEMINI_API_KEY, DATABASE_URL) asla frontend koduna gömülmez veya commit edilmez. Sadece .env dosyası ve Railway Variables üzerinden yönetilir.

Yetkilendirme: Veri çekme veya manipüle etme işlemleri yapan admin endpoint'leri muhakkak kimlik doğrulama (requireAuth) ile korunmalıdır.

Ajan Komut Sınırları: UI/UX geliştirmeleri yapılırken mevcut matematiksel algoritmalar ve business logic KESİNLİKLE değiştirilmeyecektir.