# Varlık Takip ve Fiyatlandırma Metodolojisi

Bu doküman, Portföy Takip uygulamasının BIST hisseleri, ABD hisseleri ve TEFAS fonları için veriyi nasıl çektiğini, hata durumlarında nasıl davrandığını ve ön yüzde veriyi nasıl sunduğunu açıklar.

## 1. Varlık Türlerine Göre Veri Çekme Metodolojisi

### A. BIST Hisseleri (Borsa İstanbul)
BIST hisseleri için artık scraping veya mock veri yöntemleri kullanılmamaktadır:
1.  **Google Sheets JSON API:** Tek ve güvenilir kaynak olarak özel bir Google Sheets JSON API uç noktası kullanılır.
2.  **Format:** Fiyatlar doğrudan `{ "GARAN": 138.5, ... }` formatında çekilir.
3.  **Güncelleme Sıklığı:** Arka planda çalışan `PriceMonitor` servisi her 15 dakikada bir fiyatları günceller.
4.  **Yeni Sembol Ekleme (Webhook):** Sisteme yeni bir BIST pozisyonu eklendiğinde, Google Sheets API'sine arka planda bir `POST` isteği (örn: `{"symbol": "IST:THYAO"}`) gönderilerek bu sembolün tablodaki fiyat takip listesine otomatik olarak dahil edilmesi sağlanır.

### B. ABD Hisseleri (NASDAQ / NYSE)
1.  **Google Sheets JSON API:** BIST hisseleriyle aynı mekanizma üzerinden, aynı JSON objesi içinde USD cinsinden çekilir.
2.  **Döviz Çevrimi:** Portföy toplamı için `Frankfurter API` üzerinden anlık USD/TRY kuru alınarak çevrim yapılır.
3.  **Hata Durumu:** Eğer kur servisi çalışmazsa, hesaplamalarda varsayılan sabit bir kur (örn: 35.00) kullanılır.
4.  **Yeni Sembol Ekleme (Webhook):** Sisteme yeni bir ABD hisse pozisyonu eklendiğinde, Google Sheets API'sine arka planda bir `POST` isteği (örn: `{"symbol": "NASDAQ:AAPL"}`) gönderilerek fiyat takibi başlatılır.

### C. Yatırım Fonları (TEFAS)
Fon verileri en karmaşık ve korumalı yapıdır:
1.  **Resmi TEFAS API:** `tefas.gov.tr/api/DB/BindHistoryInfo` adresi kullanılır.
2.  **ScraperAPI Proxy:** TEFAS'ın Cloudflare korumasını aşmak için tüm istekler ScraperAPI üzerinden proxy ile yönlendirilir.
3.  **Fintables / Halk Yatırım Fallback:** Resmi API hata verirse Fintables sayfasından HTML scraping yapılır.
4.  **Kota Koruması (Quota Protection):** ScraperAPI kredilerini korumak için fonlar sadece günde iki kez (TSİ 09:00 ve 10:00) güncellenir.
5.  **Manuel Yenileme Engeli:** Kullanıcıların manuel "Refresh" butonuna basması fonlar için canlı tetikleme yapmaz; veritabanındaki son başarılı fiyat gösterilir.

---

## 2. Güncel Fiyat Bulunamadığında Uygulanan Senaryolar

Sistem artık "sahte veri" (mock price) üretmemektedir. Hata toleransı şu şekildedir:
1.  **DB Fallback:** Eğer canlı kaynak (Google Sheets veya TEFAS) yanıt vermezse, sistem önce veritabanında (`positions` tablosu) kayıtlı **son başarılı fiyatı** (`currentPrice`) kontrol eder.
2.  **Null Dönüşü:** Veritabanında da bir kayıt yoksa (örneğin ilk kez ekleniyorsa ve API o an çökükse), sistem `null` değeri döner.
3.  **Frontend Uyarıları:** `null` fiyat dönmesi durumunda, kullanıcı arayüzündeki bileşenler (kartlar ve tablolar) fiyatı göstermek yerine maliyet değeri üzerinden hesaplama yapar ve kullanıcıya "Veri Bekleniyor" veya "Fiyat Güncellenemedi" şeklinde uyarılarda bulunur.

---

## 3. Ön Yüz (Frontend) Görüntüleme Mantığı

Kullanıcının gördüğü rakamlar şu mantığa göre hesaplanır:

*   **Son Fiyat (Current Price):** Veritabanındaki `currentPrice` sütunundaki değerdir. Bu değer her 15 dakikada bir (hisseler için) veya her sabah (fonlar için) güncellenir.
*   **Maliyet Hesaplama:** Kullanıcının pozisyonu eklerken girdiği `buyPrice` (Alış Fiyatı) baz alınır.
*   **Kâr/Zarar Gösterimi:** 
    *   `Fiyat > Maliyet` ise YEŞİL (Success)
    *   `Fiyat < Maliyet` ise KIRMIZI (Error)
*   **Kur Etkisi:** ABD hisselerinde kâr/zarar hem USD bazında hem de kur farkı eklenmiş TRY bazında hesaplanarak kullanıcıya sunulur.
*   **Zaman Damgası:** Her varlığın ne zaman güncellendiği `lastUpdated` alanı ile takip edilir ve front-end tarafında "Son Güncelleme" bilgisi olarak sunulabilir.

---

*Doküman Oluşturulma Tarihi: 25 Nisan 2026*
