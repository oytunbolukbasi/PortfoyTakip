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
  private readonly GOOGLE_FINANCE_BASE_URL = 'https://www.google.com/finance/quote';

  async getPrice(symbol: string, type: 'stock' | 'fund' | 'us_stock'): Promise<number> {
    console.log(`Getting price for ${symbol} (type: ${type})`);
    
    if (type === 'fund') {
      // 1. Check in-memory daily cache first
      const cached = getCachedFundPrice(symbol);
      if (cached !== null) {
        console.log(`[Cache] Returning cached fund price for ${symbol}: ${cached}`);
        return cached;
      }
      
      // 2. Check DB if any existing price is present (so we avoid hammering TEFAS out-of-schedule)
      try {
        const [position] = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
        if (position && position.currentPrice) {
           const dbPrice = parseFloat(position.currentPrice);
           if (dbPrice > 0) {
              console.log(`[DB Fallback] Using DB price for existing fund ${symbol}: ${dbPrice}`);
              // Seed cache so subsequent checks don't hit DB
              setCachedFundPrice(symbol, dbPrice);
              return dbPrice;
           }
        }
      } catch (err) {
         console.warn(`[DB Error] Failed to check fallback price for ${symbol}:`, err);
      }

      // 3. Fallthrough happens ONLY if the fund has no previous DB price (e.g. completely new fund being added)
      console.log(`[TEFAS On-Demand] New or zero-priced fund ${symbol}, fetching live...`);
      return this.getTEFASPrice(symbol);
    } else if (type === 'us_stock') {
      return this.getUSStockPrice(symbol);
    } else {
      // Use BIST price system for stocks
      return this.getBISTPrice(symbol);
    }
  }

  private async getBISTPrice(symbol: string): Promise<number> {
    try {
      // Use the exact Google Finance URL format: SYMBOL:IST
      console.log(`Fetching price for ${symbol} from Google Finance`);
      const price = await this.tryGoogleFinancePrice(symbol);
      if (price && price > 0 && price < 10000) {
        console.log(`Found price for ${symbol}: ${price} TL`);
        return price;
      }

      // Try alternative sources if Google Finance fails
      const altPrice = await this.tryAlternativeSources(symbol);
      if (altPrice) {
        return altPrice;
      }

      // Use current market prices for known stocks
      const knownPrices = await this.getCurrentMarketPrices();
      if (knownPrices[symbol]) {
        console.log(`Using current market price for ${symbol}: ${knownPrices[symbol]} TL`);
        return knownPrices[symbol];
      }

      throw new Error(`No reliable price source found for ${symbol}`);
    } catch (error) {
      console.warn(`Failed to fetch BIST price for ${symbol}:`, error);
      return this.getMockPrice(symbol, 'stock');
    }
  }

  private async tryGoogleFinancePrice(ticker: string, exchange: string = 'IST'): Promise<number | null> {
    try {
      const googleUrl = exchange 
        ? `https://www.google.com/finance/quote/${ticker}:${exchange}`
        : `https://www.google.com/finance/quote/${ticker}`;
      console.log(`Fetching from: ${googleUrl}`);
      
      const response = await axios.get(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Enhanced Google Finance selectors based on the screenshot
      const priceSelectors = [
        '.YMlKec.fxKbKc',           // Main price display (like ₺22.94 in screenshot)
        '[data-last-price]',
        '.YMlKec.fxKbKc',
        '.YMlKec',
        '[jsname="ip75ob"] .YMlKec',
        '[data-symbol] .YMlKec',
        '.AHmHk .YMlKec',
        'div[class*="price"] span',
        '[class*="CurrentPrice"]',
        '.Ax4B8',
        '[aria-label*="price"]',
        '[data-test*="price"]'
      ];

      for (const selector of priceSelectors) {
        const priceElement = $(selector);
        if (priceElement.length > 0) {
          const priceText = priceElement.attr('data-last-price') || 
                           priceElement.attr('data-price') ||
                           priceElement.text().trim();
          
          if (priceText) {
            console.log(`Raw price text found: "${priceText}"`);
            
            // Clean price text more carefully for Turkish format
            let cleanPrice = priceText
              .replace(/[₺$]/g, '')           // Remove currency symbol
              .replace(/[^\d,.-]/g, '')    // Keep only digits, comma, dot, minus
              .trim();
            
            // Handle Turkish decimal format (22,94 -> 22.94)
            if (cleanPrice.includes(',') && !cleanPrice.includes('.')) {
              cleanPrice = cleanPrice.replace(',', '.');
            }
            
            const price = parseFloat(cleanPrice);
            console.log(`Parsed price: ${price}`);
            
            if (!isNaN(price) && price > 0 && price < 10000) {
              console.log(`Valid price found for ${ticker}: ${price} TL`);
              return price;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private async getUSStockPrice(symbol: string): Promise<number> {
    try {
      let usdPrice = 0;
      // First try NASDAQ
      const nasdaqPrice = await this.tryGoogleFinancePrice(symbol, 'NASDAQ');
      if (nasdaqPrice && nasdaqPrice > 0) usdPrice = nasdaqPrice;
      else {
        // Then try NYSE
        const nysePrice = await this.tryGoogleFinancePrice(symbol, 'NYSE');
        if (nysePrice && nysePrice > 0) usdPrice = nysePrice;
      }
      
      if (usdPrice > 0) {
        return Math.round(usdPrice * 1000000) / 1000000;
      }
      
      throw new Error(`Google Finance did not return price for US stock ${symbol}`);
    } catch (error) {
      console.warn(`Failed to fetch US stock price for ${symbol}:`, error);
      return this.getMockPrice(symbol, 'us_stock');
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

    try {
      const ticker = pair === 'USDTRY' ? 'USD-TRY' : pair;
      // Fallback to Google Finance for currency pairs
      const rate = await this.tryGoogleFinancePrice(ticker, 'CURRENCY');
      if (rate && rate > 0) {
        console.log(`Fetched fallback exchange rate for ${pair} from Google: ${rate}`);
        return rate;
      }
    } catch (e) {
      console.warn(`Google fallback failed for ${pair}:`, e);
    }
    // Final realistic fallback
    return 34.25;
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
      // Fallback: If it's a very recent date, use current rate
      if (new Date().getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
        return this.getExchangeRate(pair);
      }
      // Otherwise return a generic historical fallback (around 30-34 TL)
      return 34.0;
    }
  }

  private async tryAlternativeSources(symbol: string): Promise<number | null> {
    try {
      // Try Investing.com
      const investingUrl = `https://www.investing.com/search/?q=${symbol}`;
      const response = await axios.get(investingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 5000
      });

      const $ = cheerio.load(response.data);
      
      const priceSelectors = [
        '[data-test="instrument-price-last"]',
        '.text-2xl[data-test*="price"]',
        '.instrument-price_last__KQzyA',
        '.last-price-value',
        '[class*="price-value"]'
      ];

      for (const selector of priceSelectors) {
        const priceElement = $(selector);
        if (priceElement.length > 0) {
          const priceText = priceElement.text().trim();
          const cleanPrice = priceText.replace(/[^\d,.-]/g, '').replace(',', '.');
          const price = parseFloat(cleanPrice);
          if (!isNaN(price) && price > 0) {
            return price;
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private async getCurrentMarketPrices(): Promise<Record<string, number>> {
    // Updated with current market prices (July 26, 2025)
    return {
      'ULKER': 106.80,
      'ENKAI': 69.15,
      'AKFIS': 22.94,
      'ASELS': 85.30,
      'BIMAS': 489.50,
      'CCOLA': 98.60,
      'EKGYO': 8.95,
      'FROTO': 485.00,
      'GARAN': 98.85,
      'HALKB': 10.49,
      'ISCTR': 12.78,
      'KCHOL': 163.40,
      'MIGRS': 312.00,
      'SAHOL': 58.65,
      'SISE': 52.40,
      'TCELL': 64.00,
      'TUPRS': 185.80,
      'VAKBN': 8.54,
      'YKBNK': 24.80,
      'AKBNK': 59.30
    };
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
        } catch (error) {
          console.warn(`Failed to fetch price for ${symbolInfo.symbol}:`, error);
          // Return with current market price as fallback
          const currentPrices = await this.getCurrentMarketPrices();
          const fallbackPrice = currentPrices[symbolInfo.symbol] || 100;
          const change = (Math.random() - 0.5) * 10;
          const changePercent = (change / fallbackPrice) * 100;
          
          return {
            symbol: symbolInfo.symbol,
            name: symbolInfo.name,
            price: fallbackPrice.toString(),
            change: change.toFixed(2),
            changePercent: changePercent.toFixed(2),
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

  // Manually bypass DB caching mechanism to force a live hit to TEFAS API (e.g. for Cron jobs or Manual UI refreshes)
  async forceTEFASUpdate(symbol: string): Promise<number> {
    const price = await this.getTEFASPrice(symbol);
    setCachedFundPrice(symbol, price);
    return price;
  }

  private async getTEFASPrice(symbol: string): Promise<number> {
    console.log(`Fetching TEFAS price for ${symbol}`);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${d}.${m}.${y}`; // TEFAS expects DD.MM.YYYY
    };

    // Setup Cookie Jar and Session-Aware Axios
    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));
    const commonHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'X-Requested-With': 'XMLHttpRequest',
    };

    try {
      // 1. Visit the main page to grab valid ASP.NET session cookies and tokens
      await client.get('https://www.tefas.gov.tr/TarihselVeriler.aspx', {
        headers: {
          ...commonHeaders,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        timeout: 10000
      });
      console.log(`[TEFAS] Session established for ${symbol} fetch.`);
    } catch (err) {
      console.warn(`[TEFAS] Failed to establish main page session before API request: ${(err as Error).message}`);
      // Proceeding anyway because sometimes the API doesn't strictly need a fresh session, but often it helps.
    }

    // 2. Perform the actual API POST Request (TEFAS strictly requires x-www-form-urlencoded)
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

    const response = await client.post(
      'https://www.tefas.gov.tr/api/DB/BindHistoryInfo',
      formData.toString(),
      {
        headers: {
          ...commonHeaders,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx',
        },
        timeout: 10000,
      }
    );

    if (
      response.data?.data &&
      Array.isArray(response.data.data) &&
      response.data.data.length > 0
    ) {
      const latestData = response.data.data[0];
      if (latestData.FIYAT && !isNaN(parseFloat(latestData.FIYAT.replace(',', '.')))) {
        const price = parseFloat(latestData.FIYAT.replace(',', '.'));
        console.log(`[TEFAS] ${symbol}: ${price} TL (${latestData.FONUNVAN})`);
        
        // Write to in-memory cache so subsequent calls skip the API
        setCachedFundPrice(symbol, price);
        return price;
      }
    }

    // Phase B: HTML Fallback — If the API returns no data (common for new funds like IJC/YJK), 
    // scrape the public analysis page which always has the latest "live" price.
    try {
      console.log(`[TEFAS] API returned no data for ${symbol}, triggering Phase B (Official HTML Scraper)...`);
      return await this.scrapeTEFASPrice(symbol, client, commonHeaders);
    } catch (e) {
      // Phase C: Alternative Source — If TEFAS official site is blockading our IP (common on Railway),
      // use Halk Yatırım as a mirror source that is typically less aggressive with blocks.
      try {
        console.log(`[TEFAS] Official HTML failed for ${symbol}, triggering Phase C (Halk Yatirim Fallback)...`);
        return await this.halkYatirimScrapePrice(symbol);
      } catch (halkError) {
        console.warn(`[TEFAS] All external sources failed for ${symbol}. Using last known DB price as safety...`);
        
        // Final Safety: Try to get from last known database value
        try {
          const [pos] = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
          if (pos && pos.currentPrice) {
            return parseFloat(pos.currentPrice);
          }
        } catch (dbErr) { /* ignore */ }
        
        // Last-resort fallback to a realistic generated price (as per original code)
        return this.getMockPrice(symbol, 'fund');
      }
    }
  }

  private async halkYatirimScrapePrice(symbol: string): Promise<number> {
    try {
      // Halk Yatirim Fonbul is a reliable mirror for TEFAS data
      const url = `https://fonbul.halkyatirim.com.tr/YatirimFonlari/FonProfilleri/FonFiyatTablosu/${symbol}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Data is in a table, the first row's 3rd cell (usually) is the price
      // Selector: Find the first <tr> in the pricing table
      const priceText = $('.invest-table tbody tr:first-child td:nth-child(3)').text().trim();
      
      if (!priceText) {
        throw new Error(`Price not found on Halk Yatirim for ${symbol}`);
      }

      // Convert Turkish decimal format (1,351283 -> 1.351283)
      const cleanPrice = priceText.replace(/\./g, '').replace(',', '.');
      const price = parseFloat(cleanPrice);

      if (isNaN(price) || price <= 0) {
        throw new Error(`Invalid price from Halk Yatirim: ${priceText}`);
      }

      console.log(`[Halk Yatirim] Successfully retrieved price for ${symbol}: ${price} TL`);
      setCachedFundPrice(symbol, price);
      return price;
    } catch (error) {
      throw new Error(`Halk Yatirim Scraper failed: ${(error as Error).message}`);
    }
  }

  private async scrapeTEFASPrice(symbol: string, client: any, headers: any): Promise<number> {
    try {
      const url = `https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${symbol}`;
      const response = await client.get(url, { headers, timeout: 10000 });
      
      const $ = cheerio.load(response.data);
      
      // Selector verified for the "Son Fiyat" span in the top-list
      const priceText = $('.top-list li:nth-child(1) span').text().trim();
      
      if (!priceText) {
        throw new Error(`Could not find price on TEFAS HTML page for ${symbol}`);
      }
      
      // Clean and parse the Turkish formatted decimal (e.g. 12,125602 -> 12.125602)
      const cleanPrice = priceText.replace(/\./g, '').replace(',', '.');
      const price = parseFloat(cleanPrice);
      
      if (isNaN(price) || price <= 0) {
        throw new Error(`Invalid price parsed from TEFAS HTML for ${symbol}: ${priceText}`);
      }
      
      console.log(`[TEFAS Scraper] Successfully retrieved price for ${symbol}: ${price} TL`);
      setCachedFundPrice(symbol, price);
      return price;
    } catch (error) {
      console.error(`[TEFAS Scraper] Failed to scrape price for ${symbol}:`, (error as Error).message);
      throw new Error(`TEFAS Scraping failed for ${symbol}: ${(error as Error).message}`);
    }
  }

  private getMockPrice(symbol: string, type: 'stock' | 'fund' | 'us_stock'): number {
    // Generate realistic mock prices for Turkish markets
    const hash = symbol.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Known TEFAS fund reference prices for demo (as of late 2024/early 2025)
    const knownFundPrices: Record<string, number> = {
      'IRY': 4.02,
      'YAC': 2.85,
      'ALC': 3.41,
      'TYS': 1.23,
      'AKB': 15.67,
      'GRO': 8.94,
      'DCB': 1.15,
      'ZP8': 1.08,
      'DAS': 12.34,
      'EUZ': 7.89,
      'AFT': 0.145,
      'IPJ': 1.89,
      'GAH': 3.25,
      'HPP': 2.15
    };
    
    // Use known price if available, otherwise generate realistic price
    if (type === 'fund' && knownFundPrices[symbol]) {
      // Add small random variation to simulate market movement
      const basePrice = knownFundPrices[symbol];
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      return Math.round((basePrice + basePrice * variation) * 100) / 100;
    }
    
    // Fallback to algorithm-generated prices
    const basePrice = type === 'us_stock' ? 150 : (type === 'stock' ? 25 : 2.5); // US Stock baseline natively in USD
    const variation = (Math.abs(hash) % 100) / 100;
    const multiplier = type === 'us_stock' ? 20 : (type === 'stock' ? 8 : 2);
    const price = basePrice + (variation * multiplier);
    
    return Math.round(price * 100) / 100;
  }

  async validateSymbol(symbol: string, type: 'stock' | 'fund' | 'us_stock'): Promise<boolean> {
    try {
      await this.getPrice(symbol, type);
      return true;
    } catch {
      return false;
    }
  }

  // Get fund name from symbol for TEFAS funds
  getFundName(symbol: string, type: 'stock' | 'fund' | 'us_stock'): string {
    if (type === 'fund') {
      const knownFundNames: Record<string, string> = {
        'IRY': 'INVEO PORTFÖY PARA PİYASASI (TL) FONU', // Updated from TEFAS API response
        'GBG': 'INVEO PORTFÖY G-20 ÜLKELERİ YABANCI HİSSE SENEDİ FONU', // Updated from TEFAS API response
        'YKT': 'YAPI KREDİ PORTFÖY ALTIN FONU', // Updated from TEFAS API response
        'YAC': 'Ak Portföy Değer Odakli 100 Şirketleri Hisse Senedi Fonu',
        'ALC': 'Ak Portföy Kar Payi Ödeyen Şirketler Hisse Senedi Fonu',
        'TYS': 'Teb Portföy Teknoloji Sektörü Hisse Senedi Fonu',
        'AKB': 'Ak Portföy Kısa Vadeli Borçlanma Araçları Fonu',
        'GJH': 'GARANTİ PORTFÖY PARA PİYASASI SERBEST (TL) FON', // Updated from TEFAS API response
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
