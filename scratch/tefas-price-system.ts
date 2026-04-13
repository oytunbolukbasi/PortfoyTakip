import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCachedFundPrice, setCachedFundPrice } from './fund-price-cache';
import { db } from '../db';
import { positions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export class PriceService {
  private async getTEFASPrice(symbol: string): Promise<number> {
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

    const jar = new CookieJar();
    const client = wrapper(axios.create({ jar }));
    const commonHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      'X-Requested-With': 'XMLHttpRequest',
    };

    try {
      // Phase A: Official TEFAS JSON API
      await client.get('https://www.tefas.gov.tr/TarihselVeriler.aspx', {
        headers: { ...commonHeaders, 'Accept': 'text/html' },
        timeout: 10000
      });

      const formData = new URLSearchParams();
      formData.append('fontip', 'YAT');
      formData.append('bastarih', formatDate(startDate));
      formData.append('bittarih', formatDate(today));
      formData.append('fonkod', symbol);
      formData.append('strperiod', '1,1,1,1,1,1,1');
      formData.append('intdraw', '2000');

      const response = await client.post(
        'https://www.tefas.gov.tr/api/DB/BindHistoryInfo',
        formData.toString(),
        {
          headers: {
            ...commonHeaders,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Referer': 'https://www.tefas.gov.tr/TarihselVeriler.aspx',
          },
          timeout: 10000,
        }
      );

      if (response.data?.data?.length > 0) {
        const latestData = response.data.data[0];
        const price = parseFloat(latestData.FIYAT.replace(',', '.'));
        setCachedFundPrice(symbol, price);
        return price;
      }
    } catch (apiError) {
      console.warn(`[TEFAS API] Failed for ${symbol}:`, apiError.message);
    }

    // Phase B: Official TEFAS HTML Scraper
    try {
      console.log(`[TEFAS Scraper] Triggering Phase B (Official HTML)...`);
      const url = `https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${symbol}`;
      const response = await client.get(url, { headers: commonHeaders, timeout: 10000 });
      const $ = cheerio.load(response.data);
      const priceText = $('.top-list li:nth-child(1) span').text().trim();
      if (priceText) {
        const price = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
        setCachedFundPrice(symbol, price);
        return price;
      }
    } catch (scrapeError) {
      console.warn(`[TEFAS Scraper] Failed for ${symbol}:`, scrapeError.message);
    }

    // Phase C: Halk Yatirim Mirror Scraper (The current failing part on Railway)
    try {
      console.log(`[Halk Yatirim] Triggering Phase C (Mirror Fallback)...`);
      const url = `https://fonbul.halkyatirim.com.tr/YatirimFonlari/FonProfilleri/FonFiyatTablosu/${symbol}`;
      const response = await axios.get(url, { headers: { 'User-Agent': commonHeaders['User-Agent'] }, timeout: 10000 });
      const $ = cheerio.load(response.data);
      const priceText = $('.invest-table tbody tr:first-child td:nth-child(3)').text().trim();
      if (priceText) {
        const price = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
        setCachedFundPrice(symbol, price);
        return price;
      }
    } catch (halkError) {
      console.warn(`[Halk Yatirim] Failed for ${symbol}:`, halkError.message);
    }

    // Phase D: Final Safety Fallback
    const [pos] = await db.select().from(positions).where(eq(positions.symbol, symbol)).limit(1);
    if (pos && pos.currentPrice) return parseFloat(pos.currentPrice);
    
    // Algorithmically generate mock price if everything else fails
    return this.getMockPrice(symbol, 'fund');
  }

  private getMockPrice(symbol: string, type: 'stock' | 'fund' | 'us_stock'): number {
    const hash = symbol.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const basePrice = type === 'fund' ? 2.5 : 25;
    const variation = (Math.abs(hash) % 100) / 100;
    return Math.round((basePrice + (variation * 2)) * 100) / 100;
  }
}
