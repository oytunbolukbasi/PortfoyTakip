# Portfolio Tracker — Design System

> **Durum:** ✅ Uygulandı (Nisan 2026)
> **Versiyon:** 1.0
> **Prensip:** Minimal · Fresh · Trustworthy

Bu doküman, uygulamanın token tabanlı renk sisteminin **tek kaynak gerçeği (single source of truth)**'dir.
Yeni bir bileşen eklenirken veya mevcut bileşen güncellenirken bu dokümandaki kurallara uyulması zorunludur.

## 0. Genel Kısıtlar ve Çalışma Kuralları

Bu migration boyunca aşağıdaki kurallar **kesinlikle** uygulanır:

| Kural | Açıklama |
|---|---|
| ✅ Yapılacak | CSS değişkenleri (`globals.css`) üzerinden token tanımla |
| ✅ Yapılacak | `tailwind.config.ts`'e token mapping ekle |
| ✅ Yapılacak | Bileşenlerdeki renk class'larını token tabanlı olanla değiştir |
| ❌ Yapılmayacak | Bileşen yapısı (JSX hierarchy) değiştirilmez |
| ❌ Yapılmayacak | Spacing, sizing, layout değiştirilmez |
| ❌ Yapılmayacak | Hardcoded hex renk (`#3F6F73`) bileşen içinde kullanılmaz |
| ❌ Yapılmayacak | Login / matematik / hesaplama / navigasyon mantığı değiştirilmez |
| ❌ Yapılmayacak | Yeni bileşen oluşturulmaz |

---

## 1. Design Token Tanımları (`client/src/index.css`)

Mevcut `index.css` içindeki `:root` ve `.dark` blokları **korunur**, altına yeni token seti **eklenir**.

> [!IMPORTANT]
> Mevcut shadcn/Radix token'ları (`--background`, `--foreground`, `--primary`, vb.) silinmez. Yeni token'lar bunların **yanına** eklenir çünkü shadcn bileşenleri hâlâ eski token'lara bağlıdır.

### 1a. Light Mode (`:root`)

```css
/* ── Portfolio Design System Tokens (Light) ── */

/* Primary */
--color-primary-500: #3F6F73;
--color-primary-400: #5F8F92;
--color-primary-100: #E6F0F0;

/* Semantic: Success (Kâr) */
--color-success-500: #2FA36B;
--color-success-100: #EAF7F1;

/* Semantic: Error (Zarar) */
--color-error-500: #D65C5C;
--color-error-100: #FBECEC;

/* Backgrounds */
--color-bg-primary: #F7F8F8;
--color-bg-card: #FFFFFF;
--color-bg-subtle: #F1F3F3;

/* Text */
--color-text-primary: #1C1F1F;
--color-text-secondary: #6B7373;
--color-text-tertiary: #9AA3A3;

/* Borders */
--color-border-default: #D3DADA;
--color-border-light: #E3E7E7;

/* Asset Category Colors */
--color-asset-hisse: #4C7DFF;
--color-asset-usd: #9B6BFF;
--color-asset-fon: #2FA36B;

/* AI / Insight */
--color-insight: #7B61FF;
```

### 1b. Dark Mode (`.dark`)

```css
/* ── Portfolio Design System Tokens (Dark) ── */

.dark {
  --color-primary-500: #5F8F92;
  --color-primary-400: #7FAFB2;
  --color-primary-100: #1F2E2F;

  --color-success-500: #3CBF84;
  --color-success-100: #1D3A2F;

  --color-error-500: #E07A7A;
  --color-error-100: #3A1F1F;

  --color-bg-primary: #0F1414;
  --color-bg-card: #151A1A;
  --color-bg-subtle: #1C2323;

  --color-text-primary: #E6ECEC;
  --color-text-secondary: #AAB4B4;
  --color-text-tertiary: #7D8787;

  --color-border-default: #2A3333;
  --color-border-light: #1F2626;

  --color-asset-hisse: #6C8FFF;
  --color-asset-usd: #B08CFF;
  --color-asset-fon: #3CBF84;

  --color-insight: #9A84FF;
}
```

---

## 2. Tailwind Config Mapping (`tailwind.config.ts`)

Mevcut `colors` objesi içine aşağıdaki key'ler **extend edilir** (mevcut key'ler bozulmaz):

```ts
// tailwind.config.ts — colors.extend içine eklenecek
primary: {
  // Mevcut shadcn primary'ye ek olarak:
  500: 'var(--color-primary-500)',
  400: 'var(--color-primary-400)',
  100: 'var(--color-primary-100)',
  DEFAULT: 'var(--color-primary-500)',  // shadcn'ın DEFAULT'unu override eder
  foreground: 'var(--primary-foreground)',
},
success: {
  500: 'var(--color-success-500)',
  100: 'var(--color-success-100)',
},
error: {
  500: 'var(--color-error-500)',
  100: 'var(--color-error-100)',
},
subtle: 'var(--color-bg-subtle)',
text: {
  primary: 'var(--color-text-primary)',
  secondary: 'var(--color-text-secondary)',
  tertiary: 'var(--color-text-tertiary)',
},
border: {
  DEFAULT: 'var(--color-border-default)',
  light: 'var(--color-border-light)',
},
asset: {
  hisse: 'var(--color-asset-hisse)',
  usd: 'var(--color-asset-usd)',
  fon: 'var(--color-asset-fon)',
},
insight: 'var(--color-insight)',
```

---

## 3. Bileşen Renk Migration Kuralları

Bileşenler **içeriğe dokunmadan** sadece renk class'ları güncellenir.

### 3.1 Renk Dönüşüm Tablosu

| Eski Class | Yeni Class | Kullanım Yeri |
|---|---|---|
| `text-green-600 dark:text-green-400` | `text-success-500` | Kâr değerleri |
| `text-green-800 dark:text-green-400` | `text-success-500` | Kâr badge'leri |
| `bg-green-100 dark:bg-green-900/20` | `bg-success-100` | Kâr arka planları |
| `text-red-600 dark:text-red-400` | `text-error-500` | Zarar değerleri |
| `text-red-800 dark:text-red-400` | `text-error-500` | Zarar badge'leri |
| `bg-red-100 dark:bg-red-900/20` | `bg-error-100` | Zarar arka planları |
| `bg-white dark:bg-gray-800` | `bg-card` | Kart arka planları |
| `bg-gray-50 dark:bg-gray-700/50` | `bg-subtle` | İkincil yüzeyler |
| `bg-gray-100 dark:bg-gray-700` | `bg-subtle` | Chip/badge arka planları |
| `text-gray-900 dark:text-white` | `text-text-primary` | Ana başlıklar |
| `text-gray-500 dark:text-gray-400` | `text-text-secondary` | İkincil metinler |
| `text-gray-400 dark:text-gray-500` | `text-text-tertiary` | Yardımcı metinler |
| `border-gray-100 dark:border-gray-700` | `border-border` | Kart kenarlıkları |
| `border-gray-200 dark:border-gray-700` | `border-border` | Genel kenarlıklar |
| `text-blue-500 dark:bg-blue-400` | `bg-asset-hisse` | BIST rengi |
| `text-purple-500 dark:bg-purple-400` | `bg-asset-usd` | ABD Hisse rengi |
| `text-indigo-600 dark:text-indigo-400` | `text-insight` | AI öğeleri |
| `bg-indigo-100 dark:bg-indigo-900/40` | `bg-insight/10` | AI arka planları |
| `hover:bg-red-50 dark:hover:bg-red-900/20` | `hover:bg-error-100` | Logout hover |

### 3.2 Asset Renkleri — Sadece Belirli Alanlarda

Asset renkleri (`asset-hisse`, `asset-usd`, `asset-fon`) yalnızca şu bileşenlerde kullanılır:
- `portfolio-summary.tsx` → Varlık dağılımı grafik yayları (SVG paths)
- `analytics.tsx` → Grafik lejantları ve kategori tagları
- `position-card.tsx` → Kategori rozeti rengi

Asset renkleri **asla** buton, başlık, arka plan gibi genel UI elemanlarında kullanılmaz.

### 3.3 Insight Rengi — Sadece AI Bileşenleri

`insight` token'ı yalnızca şu yerlerde kullanılır:
- `analytics.tsx` → AI Hub kartı (Yapay Zeka Görüşü) — ikon rengi, arka plan (`bg-insight/10`)
- AI ile ilişkili spark ikon'ları ve vurgular

---

## 4. Bileşen Bazlı Migration Listesi

### Yüksek Öncelik (En Çok Renk İçeren)

| Dosya | Durum | Notlar |
|---|---|---|
| `pages/analytics.tsx` | ⏳ Bekliyor | K/Z renkleri, AI Hub, grafik renkleri |
| `pages/portfolio.tsx` | ⏳ Bekliyor | Ana sayfa container renkleri |
| `components/ui/portfolio-summary.tsx` | ⏳ Bekliyor | Kâr/zarar badge, kart arka planları |
| `components/ui/position-card.tsx` | ⏳ Bekliyor | K/Z renkleri, asset tag renkleri |
| `components/ui/position-table.tsx` | ⏳ Bekliyor | Tablo satır renkleri |
| `components/ui/closed-position-table.tsx` | ⏳ Bekliyor | Gerçekleşen K/Z renkleri |

### Orta Öncelik

| Dosya | Durum | Notlar |
|---|---|---|
| `components/ui/position-detail-modal.tsx` | ⏳ Bekliyor | Detay kartı arka planları |
| `components/ui/add-position-modal.tsx` | ⏳ Bekliyor | Form renkleri |
| `components/ui/bottom-navigation.tsx` | ⏳ Bekliyor | Logout butonundaki `text-red-500` |
| `components/ui/drawer-modal.tsx` | ⏳ Bekliyor | Genel arka plan renkleri |

### Düşük Öncelik / Shadcn Bileşenleri

Bu bileşenler mevcut shadcn token sistemini kullandığı için büyük olasılıkla doğrudan token güncellemelerinden otomatik faydalanacak:

| Dosya | Notlar |
|---|---|
| `button.tsx`, `card.tsx`, `input.tsx`, vb. | shadcn token'ları zaten kullanıyor |
| `badge.tsx` | Variant'a göre ayrı kontrol gerekebilir |

---

## 5. Dark Mode Stratejisi

### Temel Kural: Sadece CSS Değişkenleri Değişir

Bileşenlerde `dark:` Tailwind class'ları **kaldırılır**, bunun yerine light/dark aynı token class'larını kullanır. Token'ların değerleri `.dark` selector'ı altında otomatik olarak değişir.

**Örnek:**
```tsx
// ESKİ (dark: prefix ile çift class)
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// YENİ (tek class, dark mode CSS var ile halledilir)
<div className="bg-card text-text-primary">
```

### Dark Mode Yüzey Katmanları

```
bg-background  →  Uygulama tabanı (en alt katman)
bg-card        →  Yükseltilmiş yüzeyler (kartlar, modal'lar)
bg-subtle      →  İkincil alanlar (chip, iç bölmeler)
```

### Dark Mode Tasarım Prensipleri

- Arka planlar saf siyah değil, sıcak koyu teal tonları (`#0F1414`)
- Primary renk doygunluğu dark mode'da düşürülür
- Border'lar çok ince ve dikkat çekmez
- Neon veya yüksek kontrast renklerden kaçınılır
- Opacity kullanımı tercih edilir (`bg-primary/10`) yerine ayrı lighter varyant'lar

---

## 6. Uygulama Sırası (Migration Sequence)

```
Adım 1: globals.css token'ları ekle          ← Token altyapısı
Adım 2: tailwind.config.ts mapping ekle     ← Tailwind erişimi
Adım 3: portfolio-summary.tsx güncelle      ← Kritik yüzey
Adım 4: position-card.tsx güncelle         ← Sık kullanılan kart
Adım 5: analytics.tsx güncelle             ← AI Hub + grafikler
Adım 6: position-table.tsx güncelle        ← Tablo renkleri
Adım 7: closed-position-table.tsx güncelle ← Gerçekleşen K/Z
Adım 8: Kalan bileşenler (modal'lar, nav)  ← Tamamlama
Adım 9: Dark mode doğrulaması              ← Görsel test
```

---

## 7. Alınan Kararlar ve Mimari Notlar

### 7.1 shadcn Token'larına Dokunulmaz

**Karar:** Mevcut shadcn/Radix UI token sistemi (`--primary`, `--background`, `--foreground`, vb.) **hiç değiştirilmez**.

**Gerekçe:**  
`button.tsx`, `badge.tsx`, `input.tsx`, `alert-dialog.tsx` gibi tüm shadcn bileşenleri `var(--primary)` ve `var(--foreground)` gibi token'lara bağımlıdır. Bu değerleri değiştirmek shadcn bileşenlerinin görsel bütünlüğünü ve erişilebilirlik davranışlarını (focus ring, disabled state, vb.) bozabilir. Shadcn'ın kendi token sistemi kendi içinde tutarlıdır ve zaten bir dark mode desteğine sahiptir.

**Uygulama:**  
Yeni design system token'ları (`--color-primary-500`, `--color-success-500`, vb.) **shadcn namespace'in yanına eklenir**, üstüne yazılmaz. Custom bileşenler yeni token'ları kullanırken shadcn bileşenleri kendi token'larıyla çalışmaya devam eder.

```
Eski shadcn system:   --primary, --background, --card  → shadcn bileşenleri kullanır
Yeni design system:   --color-primary-500, --color-bg-card  → custom bileşenler kullanır
```

---

### 7.2 `dark:` Class'ları Design System'a Bağlanır

**Karar:** Bileşenlerdeki `dark:text-white`, `dark:bg-gray-800` gibi tüm Tailwind dark prefix class'ları kaldırılır ve yerlerine tek bir token tabanlı class gelir. Test eforu kabul edilmiştir.

**Gerekçe:**  
İki paralel sistemin (Tailwind dark prefix + CSS variable) aynı anda yaşaması uzun vadede bakım yükü oluşturur ve renk tutarsızlıklarına zemin hazırlar. Token tabanlı yaklaşım, tüm dark mode değişikliklerini tek bir noktadan (`.dark {}` CSS bloğu) yönetmeyi sağlar ve bileşen kodunu sadeleştirir.

**Kural:**  
```tsx
// ESKİ — Kaldırılacak
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">

// YENİ — Token tabanlı
<div className="bg-card text-text-primary">
```

**Risk Yönetimi:**  
Her bileşen ayrı ayrı güncellendikten sonra hem light hem dark modda gözle kontrol edilir. Migration aşamalı yapılır; bir bileşen tamamlanmadan diğerine geçilmez.

---

### 7.3 SVG Grafik Renkleri: Şimdilik Hardcoded, Sonrası İçin Not

**Karar:** `analytics.tsx` içindeki semi-donut grafiğinin SVG `stroke` ve `fill` attribute değerleri, design system renk paletine uygun **hardcoded hex değerlerle** güncellenir. Token binding **yapılmaz**.

**Kullanılacak Değerler (Palette'e Uyumlu):**
```
Hisse (BIST)   → #4C7DFF   (light) / #6C8FFF   (dark)
ABD Hisse      → #9B6BFF   (light) / #B08CFF   (dark)
Fon            → #2FA36B   (light) / #3CBF84   (dark)
```

**Gerekçe:**  
SVG `stroke`/`fill` attribute'larını CSS variable'a bağlamak için `currentColor` + CSS wrapper gibi ek mimari değişiklik gerekir. Bu, şu anki migration'ın kapsamı dışındadır. Proje ilerledikçe ve daha fazla grafik bileşeni eklendikçe, tüm grafik renk yönetimi tek seferde çözülecektir.

**Gelecek Not:**  
Grafik altyapısı genişlediğinde, tüm SVG ve chart bileşenleri için merkezi bir `chartColors` token objesi oluşturulacak ve bu obje CSS variable'lardan beslenecek. Şu an her SVG arc'ı için light/dark değerleri de kodda `data-theme` ya da JS ile yönetilmelidir.


---

## 8. Referans: Moodboard Özeti

Moodboard'dan çıkarılan görsel prensipler (renk değil):

- **Güven**: Sakin, istikrarlı tonlar — aşırı canlı renklerden kaçın
- **Netlik**: Okunabilir hiyerarşi — text-primary / secondary / tertiary katmanlaması
- **Odak**: Kâr/zarar vurgusu güçlü, diğer renkler nötr kalır
- **Denge**: Yumuşak ve modern — asset renkleri lokalize, genel UI nötr

Navigation bar moodboard'da **Aktif: Primary-500, Pasif: Text-Tertiary** olarak belirtilmiş — bu mevcut `text-primary` ve `text-muted-foreground` kullanımıyla uyumlu.

---

*Son Güncelleme: 2026-04-23 | Hazırlayan: AI Assistant*
