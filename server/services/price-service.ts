import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCachedFundPrice, setCachedFundPrice } from './fund-price-cache';
import { db } from '../db';
import { positions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export interface PriceData {
  symbol: string;
  price: string;
  currency: string;
  timestamp: Date;
}

export interface MarketSymbol {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isFollowed: boolean;
}

// BIST 30 major symbols with company names
const BIST_SYMBOLS = [
  { symbol: "AKBNK", name: "Akbank T.A.Ş." },
  { symbol: "AKFIS", name: "Ak Finansal Kiralama A.Ş." },
  { symbol: "ALARK", name: "Alarko Holding A.Ş." },
  { symbol: "ARCLK", name: "Arçelik A.Ş." },
  { symbol: "ASELS", name: "Aselsan Elektronik San. ve Tic. A.Ş." },
  { symbol: "BIMAS", name: "BİM Birleşik Mağazalar A.Ş." },
  { symbol: "CCOLA", name: "Coca-Cola İçecek A.Ş." },
  { symbol: "DOHOL", name: "Doğan Şirketler Grubu Holding A.Ş." },
  { symbol: "EKGYO", name: "Emlak Konut GYO A.Ş." },
  { symbol: "ENKAI", name: "Enka İnşaat ve Sanayi A.Ş." },
  { symbol: "EREGL", name: "Ereğli Demir ve Çelik Fabrikaları T.A.Ş." },
  { symbol: "FROTO", name: "Ford Otomotiv Sanayi A.Ş." },
  { symbol: "GARAN", name: "Türkiye Garanti Bankası A.Ş." },
  { symbol: "HALKB", name: "Türkiye Halk Bankası A.Ş." },
  { symbol: "ISCTR", name: "Türkiye İş Bankası A.Ş." },
  { symbol: "KCHOL", name: "Koç Holding A.Ş." },
  { symbol: "KRDMD", name: "Kardemir Karabük Demir Çelik Sanayi ve Ticaret A.Ş." },
  { symbol: "MIGRS", name: "Migros Ticaret A.Ş." },
  { symbol: "OTKAR", name: "Otokar Otomotiv ve Savunma Sanayi A.Ş." },
  { symbol: "PETKM", name: "Petkim Petrokimya Holding A.Ş." },
  { symbol: "PGSUS", name: "Pegasus Hava Taşımacılığı A.Ş." },
  { symbol: "SAHOL", name: "Sabancı Holding A.Ş." },
  { symbol: "SASA", name: "Sasa Polyester Sanayi A.Ş." },
  { symbol: "SISE", name: "Şişe ve Cam Fabrikaları A.Ş." },
  { symbol: "TAVHL", name: "TAV Havalimanları Holding A.Ş." },
  { symbol: "TCELL", name: "Turkcell İletişim Hizmetleri A.Ş." },
  { symbol: "TKFEN", name: "Tekfen Holding A.Ş." },
  { symbol: "TOASO", name: "Tofaş Türk Otomobil Fabrikası A.Ş." },
  { symbol: "TUPRS", name: "Tüpraş-Türkiye Petrol Rafinerileri A.Ş." },
  { symbol: "ULKER", name: "Ülker Bisküvi Sanayi A.Ş." },
  { symbol: "VAKBN", name: "Vakıflar Bankası T.A.O." },
  { symbol: "VESTL", name: "Vestel Elektronik Sanayi ve Ticaret A.Ş." },
  { symbol: "YKBNK", name: "Yapı ve Kredi Bankası A.Ş." }
];

export class PriceService {
  private readonly TEFAS_BASE_URL = 'https://www.tefas.gov.tr/FonAnaliz.aspx';
  private readonly GOOGLE_SHEETS_FETCH_URL = 'https://script.google.com/macros/s/AKfycbzK9aEJI-tTAJMtyhj_k8J-BBouaR-T1lVDQ6sqen_MdyQIqj2glt3kltr2mKzqePJx/exec';

  async getPrice(symbol: string, type: 'stock' | 'fund' | 'us_stock'): Promise<number | null> {
    console.log(`Getting price for ${symbol} (type: ${type})`);
    
    if (type === 'fund') {
      const cached = getCachedFundPrice(symbol);
      if (cached !== null) {
        console.log(`[Cache] Returning cached fund price for ${symbol}: ${cached}`);
        return cached;
      }
      
      try {
        const [position] = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
        if (position && position.currentPrice) {
           const dbPrice = parseFloat(position.currentPrice);
           if (dbPrice > 0) {
              console.log(`[DB Fallback] Using DB price for existing fund ${symbol}: ${dbPrice}`);
              setCachedFundPrice(symbol, dbPrice);
              return dbPrice;
           }
        }
      } catch (err) {
         console.warn(`[DB Error] Failed to check fallback price for ${symbol}:`, err);
      }

      console.log(`[TEFAS Quota Protection] No live fetch for ${symbol}. Price will update in the next scheduled cycle.`);
      return null;
    } else if (type === 'us_stock') {
      return this.getUSStockPrice(symbol);
    } else {
      return this.getBISTPrice(symbol);
    }
  }

  async registerSymbolToGoogleSheets(symbol: string, type: 'stock' | 'fund' | 'us_stock'): Promise<void> {
    if (type === 'fund') return; // Sadece hisseleri gönderiyoruz
    
    try {
      let prefix = 'IST';
      if (type === 'us_stock') {
        prefix = 'NASDAQ'; // Varsayılan olarak NASDAQ gönderiyoruz
      }
      
      const payload = { symbol: `${prefix}:${symbol}` };
      console.log(`Sending new symbol to Google Sheets: ${payload.symbol}`);
      
      await axios.post(this.GOOGLE_SHEETS_FETCH_URL, payload);
      console.log(`Successfully registered ${payload.symbol} to Google Sheets.`);
    } catch (error) {
      console.error(`Failed to register symbol ${symbol} to Google Sheets:`, (error as Error).message);
    }
  }

  // --- GOOGLE SHEETS ENTEGRASYONU ---
  private async fetchFromGoogleSheets(symbols: string[]): Promise<Record<string, number>> {
    try {
      console.log(`Fetching from Google Sheets for symbols: ${symbols.join(', ')}`);
      const response = await axios.get(this.GOOGLE_SHEETS_FETCH_URL);
      const data: Record<string, number> = response.data;
      
      return data;
    } catch (error) {
      console.error('Google Sheets fetch failed:', error);
      return {}; // Hata durumunda boş obje
    }
  }

  private async getBISTPrice(symbol: string): Promise<number | null> {
    try {
      const sheetsData = await this.fetchFromGoogleSheets([symbol]);
      const livePrice = sheetsData[symbol];
      
      if (livePrice && livePrice > 0) {
        console.log(`Found live price for ${symbol} from Google Sheets: ${livePrice} TL`);
        return livePrice;
      }
      
      // DB Fallback
      const [pos] = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
      if (pos && pos.currentPrice) {
        return parseFloat(pos.currentPrice);
      }
      
      console.warn(`No price found for ${symbol} in Sheets and DB.`);
      return null;
    } catch (error) {
      console.warn(`Failed to fetch BIST price for ${symbol}:`, error);
      return null;
    }
  }

  private async getUSStockPrice(symbol: string): Promise<number | null> {
    try {
      const sheetsData = await this.fetchFromGoogleSheets([symbol]);
      const livePrice = sheetsData[symbol];
      
      if (livePrice && livePrice > 0) {
        console.log(`Found live price for ${symbol} from Google Sheets: $${livePrice}`);
        return livePrice;
      }
      
      // DB Fallback
      const [pos] = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
      if (pos && pos.currentPrice) {
        return parseFloat(pos.currentPrice);
      }
      
      console.warn(`No price found for ${symbol} in Sheets and DB.`);
      return null;
    } catch (error) {
      console.warn(`Failed to fetch US stock price for ${symbol}:`, error);
      return null;
    }
  }

  async getExchangeRate(pair: string = 'USDTRY'): Promise<number> {
    try {
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      
      console.log(`Fetching latest exchange rate for ${pair} from Frankfurter...`);
      const response = await axios.get(`https://api.frankfurter.app/latest?from=${from}&to=${to}`, {
        timeout: 5000
      });

      if (response.data && response.data.rates && response.data.rates[to]) {
        const rate = response.data.rates[to];
        console.log(`Fetched latest exchange rate for ${pair}: ${rate}`);
        return rate;
      }
    } catch (e) {
      console.warn(`Frankfurter API failed for latest ${pair}:`, (e as Error).message);
    }

    return 34.25; // Sabit fallback
  }

  async getHistoricalExchangeRate(date: Date, pair: string = 'USDTRY'): Promise<number> {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const from = pair.substring(0, 3);
      const to = pair.substring(3);
      
      console.log(`Fetching historical rate for ${pair} on ${formattedDate}`);
      
      const response = await axios.get(`https://api.frankfurter.app/${formattedDate}?from=${from}&to=${to}`, {
        timeout: 10000
      });

      if (response.data && response.data.rates && response.data.rates[to]) {
        const rate = response.data.rates[to];
        console.log(`Found historical rate for ${pair} on ${formattedDate}: ${rate}`);
        return rate;
      }
      
      throw new Error(`Frankfurter API did not return rate for ${pair} on ${formattedDate}`);
    } catch (error) {
      console.warn(`Historical rate fetch failed for ${pair} on ${date}:`, (error as Error).message);
      if (new Date().getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
        return this.getExchangeRate(pair);
      }
      return 34.0;
    }
  }

  async getBISTMarketData(): Promise<MarketSymbol[]> {
    const results: MarketSymbol[] = [];
    
    // Process symbols in batches to avoid overwhelming the API
    const BATCH_SIZE = 10;
    for (let i = 0; i < BIST_SYMBOLS.length; i += BATCH_SIZE) {
      const batch = BIST_SYMBOLS.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (symbolInfo) => {
        try {
          const price = await this.getBISTPrice(symbolInfo.symbol);
          
          if (price !== null) {
            const change = (Math.random() - 0.5) * 10; // Random change for demo
            const changePercent = (change / price) * 100;
            return {
              symbol: symbolInfo.symbol,
              name: symbolInfo.name,
              price: price.toString(),
              change: change.toFixed(2),
              changePercent: changePercent.toFixed(2),
              isFollowed: false
            };
          } else {
            return {
              symbol: symbolInfo.symbol,
              name: symbolInfo.name,
              price: "0",
              change: "0",
              changePercent: "0",
              isFollowed: false
            };
          }
        } catch (error) {
          console.warn(`Failed to fetch price for ${symbolInfo.symbol}:`, error);
          return {
            symbol: symbolInfo.symbol,
            name: symbolInfo.name,
            price: "0",
            change: "0",
            changePercent: "0",
            isFollowed: false
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add small delay between batches
      if (i + BATCH_SIZE < BIST_SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  async forceTEFASUpdate(symbol: string): Promise<number | null> {
    const price = await this.getTEFASPrice(symbol);
    if (price !== null) {
      setCachedFundPrice(symbol, price);
    }
    return price;
  }

  private async getTEFASPrice(symbol: string): Promise<number | null> {
    console.log(`Fetching TEFAS price for ${symbol}`);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${d}.${m}.${y}`; 
    };

    try {
      console.log(`[TEFAS] Fetching live through proxy for ${symbol}...`);
      
      const formData = new URLSearchParams();
      formData.append('fontip', 'YAT');
      formData.append('sfontur', '');
      formData.append('kurucukod', '');
      formData.append('fongrup', '');
      formData.append('bastarih', formatDate(startDate));
      formData.append('bittarih', formatDate(today));
      formData.append('fonkod', symbol);
      formData.append('fonunvan', '');
      formData.append('strperiod', '1,1,1,1,1,1,1');
      formData.append('intdraw', '2000');

      const response = await this.makeProxiedRequest(
        'https://www.tefas.gov.tr/api/DB/BindHistoryInfo',
        'POST',
        formData.toString()
      );

      if (
        response.data?.data &&
        Array.isArray(response.data.data) &&
        response.data.data.length > 0
      ) {
        const latestData = response.data.data[0];
        if (latestData.FIYAT && !isNaN(parseFloat(latestData.FIYAT.replace(',', '.')))) {
          const price = parseFloat(latestData.FIYAT.replace(',', '.'));
          console.log(`[TEFAS Proxy] ${symbol}: ${price} TL (${latestData.FONUNVAN})`);
          setCachedFundPrice(symbol, price);
          return price;
        }
      }
    } catch (err) {
      console.warn(`[TEFAS Proxy API] Failed for ${symbol}:`, (err as Error).message);
    }

    try {
      console.log(`[TEFAS Proxy] API returned no data for ${symbol}, trying HTML Scraper fallback...`);
      return await this.scrapeTEFASPrice(symbol);
    } catch (e) {
      console.warn(`[TEFAS] All external sources failed for ${symbol}. Using last known DB price as safety...`);
      try {
        const [pos] = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
        if (pos && pos.currentPrice) {
          return parseFloat(pos.currentPrice);
        }
      } catch (dbErr) { /* ignore */ }
      
      return null;
    }
  }

  private async makeProxiedRequest(targetUrl: string, method: 'GET' | 'POST', data: any = null) {
    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) {
      console.error('[ScraperAPI] MISSING API KEY in environment variables!');
    }
    
    const renderParam = method === 'GET' ? '&render=true' : '';
    const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}${renderParam}`;
    
    const config: any = {
      method,
      url: proxyUrl,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 60000 
    };

    if (method === 'POST') {
      config.data = data;
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }

    return axios(config);
  }

  private async scrapeTEFASPrice(symbol: string): Promise<number | null> {
    try {
      const url = `https://fintables.com/fonlar/${symbol}`;
      console.log(`[Fintables Scraper] Fetching price for ${symbol}...`);
      
      const response = await this.makeProxiedRequest(url, 'GET');
      const html = response.data;
      const $ = cheerio.load(html);
      
      let price: number | null = null;

      try {
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
          const jsonData = JSON.parse(nextData);
          const foundPrice = jsonData?.props?.pageProps?.fund?.price;
          if (foundPrice && !isNaN(parseFloat(foundPrice))) {
            price = parseFloat(foundPrice);
            console.log(`[Fintables Scraper] Found price in __NEXT_DATA__ for ${symbol}: ${price}`);
          }
        }
      } catch (e) {
        console.warn(`[Fintables Scraper] JSON parse failed, moving to selector fallback...`);
      }

      if (!price) {
        const selectorPriceText = $('span.inline-flex.items-center.tabular-nums').first().text().trim();
        if (selectorPriceText) {
          const cleanPrice = selectorPriceText.replace(/\./g, '').replace(',', '.');
          const parsedPrice = parseFloat(cleanPrice);
          if (!isNaN(parsedPrice) && parsedPrice > 0) {
            price = parsedPrice;
            console.log(`[Fintables Scraper] Found price via CSS selector for ${symbol}: ${price}`);
          }
        }
      }

      if (!price) {
        const priceMatch = html.match(/"price":\s*(\d+\.\d+)/);
        if (priceMatch && priceMatch[1]) {
          price = parseFloat(priceMatch[1]);
          console.log(`[Fintables Scraper] Found price via Regex for ${symbol}: ${price}`);
        }
      }
      
      if (!price || price <= 0) {
        throw new Error(`Could not find valid price on Fintables for ${symbol}`);
      }
      
      console.log(`[Fintables Scraper] Successfully retrieved price for ${symbol}: ${price} TL`);
      setCachedFundPrice(symbol, price);
      return price;
    } catch (error) {
      console.warn(`Fintables Scraping failed for ${symbol}: ${(error as Error).message}`);
      return null;
    }
  }

  async validateSymbol(symbol: string, type: 'stock' | 'fund' | 'us_stock'): Promise<boolean> {
    try {
      const price = await this.getPrice(symbol, type);
      return price !== null;
    } catch {
      return false;
    }
  }

  getFundName(symbol: string, type: 'stock' | 'fund' | 'us_stock'): string {
    if (type === 'fund') {
      const knownFundNames: Record<string, string> = {
        'IRY': 'INVEO PORTFÖY PARA PİYASASI (TL) FONU', 
        'GBG': 'INVEO PORTFÖY G-20 ÜLKELERİ YABANCI HİSSE SENEDİ FONU', 
        'YKT': 'YAPI KREDİ PORTFÖY ALTIN FONU', 
        'YAC': 'Ak Portföy Değer Odakli 100 Şirketleri Hisse Senedi Fonu',
        'ALC': 'Ak Portföy Kar Payi Ödeyen Şirketler Hisse Senedi Fonu',
        'TYS': 'Teb Portföy Teknoloji Sektörü Hisse Senedi Fonu',
        'AKB': 'Ak Portföy Kısa Vadeli Borçlanma Araçları Fonu',
        'GJH': 'GARANTİ PORTFÖY PARA PİYASASI SERBEST (TL) FON', 
        'GRO': 'Garanti Portföy Otuzuncu Serbest (Döviz) Fon',
        'DCB': 'Deniz Portföy Para Piyasası Serbest (TL) Fon',
        'ZP8': 'Ziraat Portföy Kehribar Para Piyasası Katılım Serbest Fon',
        'DAS': 'Deniz Portföy Onikinci Serbest (Döviz) Fon',
        'EUZ': 'Garanti Portföy Serbest (Döviz-Avro) Fon',
        'AFT': 'Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu',
        'IPJ': 'İş Portföy Büyüme Potansiyeli Yabancı Hisse Senedi Fonu',
        'GAH': 'Garanti Portföy Altın Fonu',
        'HPP': 'Hsbc Portföy Para Piyasası Fonu'
      };
      
      return knownFundNames[symbol] || symbol;
    }
    
    return symbol;
  }
}
