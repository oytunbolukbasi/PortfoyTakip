import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCachedFundPrice, setCachedFundPrice } from './fund-price-cache';
import { db } from '../db';
import { positions } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface MarketSymbol {
  symbol: string;
  name: string;
  price: string;
  change: string;
  changePercent: string;
  isFollowed: boolean;
}

// BIST 30 major symbols
const BIST_SYMBOLS = [
  { symbol: "AKBNK", name: "Akbank T.A.Ş." },
  { symbol: "ALARK", name: "Alarko Holding A.Ş." },
  { symbol: "ARCLK", name: "Arçelik A.Ş." },
  { symbol: "ASELS", name: "Aselsan Elektronik San. ve Tic. A.Ş." },
  { symbol: "BIMAS", name: "BİM Birleşik Mağazalar A.Ş." },
  { symbol: "EREGL", name: "Ereğli Demir ve Çelik Fabrikaları T.A.Ş." },
  { symbol: "FROTO", name: "Ford Otomotiv Sanayi A.Ş." },
  { symbol: "GARAN", name: "Türkiye Garanti Bankası A.Ş." },
  { symbol: "ISCTR", name: "Türkiye İş Bankası A.Ş." },
  { symbol: "KCHOL", name: "Koç Holding A.Ş." },
  { symbol: "SASA", name: "Sasa Polyester Sanayi A.Ş." },
  { symbol: "SISE", name: "Şişe ve Cam Fabrikaları A.Ş." },
  { symbol: "TCELL", name: "Turkcell İletişim Hizmetleri A.Ş." },
  { symbol: "THYAO", name: "Türk Hava Yolları A.O." },
  { symbol: "TUPRS", name: "Tüpraş-Türkiye Petrol Rafinerileri A.Ş." },
  { symbol: "YKBNK", name: "Yapı ve Kredi Bankası A.Ş." }
];

export class PriceService {
  private readonly GOOGLE_SHEETS_FETCH_URL = 'https://script.google.com/macros/s/AKfycbzK9aEJI-tTAJMtyhj_k8J-BBouaR-T1lVDQ6sqen_MdyQIqj2glt3kltr2mKzqePJx/exec';

  async getPrice(symbol: string, type: 'stock' | 'fund' | 'us_stock'): Promise<number | null> {
    console.log(`[PriceService] Getting price for ${symbol} (type: ${type})`);

    if (type === 'fund') {
      const cached = getCachedFundPrice(symbol);
      if (cached !== null) return cached;
      
      return this.getFundPrice(symbol);
    } else if (type === 'us_stock') {
      return this.getUSStockPrice(symbol);
    } else {
      return this.getBISTPrice(symbol);
    }
  }

  async forceTEFASUpdate(symbol: string): Promise<number | null> {
    // Keeping method name for compatibility, but it now uses Fintables
    return this.getFundPrice(symbol);
  }

  private async getFundPrice(symbol: string): Promise<number | null> {
    console.log(`[PriceService] Fetching fund price for ${symbol} via Fintables...`);

    try {
      const price = await this.scrapeFintablesPrice(symbol);
      if (price !== null) {
        setCachedFundPrice(symbol, price);
        return price;
      }
    } catch (err) {
      console.warn(`[Fintables Fail] ${symbol}: ${(err as Error).message}`);
    }

    // DB Fallback
    try {
      const [position] = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
      if (position && position.currentPrice) {
        const dbPrice = parseFloat(position.currentPrice);
        if (dbPrice > 0) return dbPrice;
      }
    } catch (err) { /* ignore */ }
    
    return null;
  }

  private async scrapeFintablesPrice(symbol: string): Promise<number | null> {
    try {
      const url = `https://fintables.com/fonlar/${symbol}`;
      const response = await this.makeProxiedRequest(url, 'GET', true);
      const html = response.data;
      const $ = cheerio.load(html);
      
      let price: number | null = null;

      try {
        const nextData = $('#__NEXT_DATA__').html();
        if (nextData) {
          const jsonData = JSON.parse(nextData);
          const foundPrice = jsonData?.props?.pageProps?.fund?.price;
          if (foundPrice) price = parseFloat(foundPrice);
        }
      } catch (e) { /* fallback */ }

      if (!price) {
        const selectorPriceText = $('span.inline-flex.items-center.tabular-nums').first().text().trim();
        if (selectorPriceText) {
          price = parseFloat(selectorPriceText.replace(/\./g, '').replace(',', '.'));
        }
      }

      if (!price || isNaN(price)) throw new Error('Price not found');
      return price;
    } catch (error) {
      console.warn(`[Fintables Scraper Error] ${symbol}: ${(error as Error).message}`);
      return null;
    }
  }

  private async makeProxiedRequest(targetUrl: string, method: 'GET' | 'POST', forceRender: boolean = false) {
    const apiKey = process.env.SCRAPER_API_KEY;
    if (!apiKey) return axios({ method, url: targetUrl, timeout: 15000 });
    
    const renderParam = forceRender ? '&render=true' : '';
    const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}${renderParam}`;

    return axios({
      method,
      url: proxyUrl,
      headers: { 'Accept-Language': 'tr-TR,tr;q=0.9' },
      timeout: 30000
    });
  }

  // --- OTHERS ---
  private async fetchFromGoogleSheets(): Promise<Record<string, number>> {
    try {
      const response = await axios.get(this.GOOGLE_SHEETS_FETCH_URL, { timeout: 10000 });
      return response.data || {};
    } catch (error) {
      console.error('Google Sheets fetch failed:', error);
      return {};
    }
  }

  private async getBISTPrice(symbol: string): Promise<number | null> {
    const sheetsData = await this.fetchFromGoogleSheets();
    return sheetsData[symbol] || null;
  }

  private async getUSStockPrice(symbol: string): Promise<number | null> {
    const sheetsData = await this.fetchFromGoogleSheets();
    return sheetsData[symbol] || null;
  }

  async getExchangeRate(pair: string = 'USDTRY'): Promise<number> {
    try {
      const response = await axios.get(`https://api.frankfurter.app/latest?from=USD&to=TRY`, { timeout: 5000 });
      return response.data?.rates?.TRY || 34.50;
    } catch { return 34.50; }
  }

  async getBISTMarketData(): Promise<MarketSymbol[]> {
    const results: MarketSymbol[] = [];
    const sheetsData = await this.fetchFromGoogleSheets();

    for (const symbolInfo of BIST_SYMBOLS) {
      const price = sheetsData[symbolInfo.symbol] || 0;
      results.push({
        symbol: symbolInfo.symbol,
        name: symbolInfo.name,
        price: price.toString(),
        change: "0",
        changePercent: "0",
        isFollowed: false
      });
    }
    return results;
  }

  getFundName(symbol: string): string {
    const knownFundNames: Record<string, string> = {
      'IRY': 'INVEO PORTFÖY PARA PİYASASI FONU',
      'YKT': 'YAPI KREDİ PORTFÖY ALTIN FONU',
      'AFT': 'Ak Portföy Yeni Teknolojiler Yabancı Hisse Senedi Fonu',
      'IPJ': 'İş Portföy Büyüme Potansiyeli Yabancı Hisse Senedi Fonu',
      'GAH': 'Garanti Portföy Altın Fonu'
    };
    return knownFundNames[symbol] || symbol;
  }
}
