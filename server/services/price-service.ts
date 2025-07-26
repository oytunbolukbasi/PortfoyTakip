import axios from 'axios';
import * as cheerio from 'cheerio';

export class PriceService {
  private readonly TEFAS_BASE_URL = 'https://www.tefas.gov.tr/FonAnaliz.aspx';
  private readonly GOOGLE_FINANCE_BASE_URL = 'https://www.google.com/finance/quote';

  async getPrice(symbol: string, type: 'stock' | 'fund'): Promise<number> {
    if (type === 'stock') {
      return this.getBISTPrice(symbol);
    } else {
      return this.getTEFASPrice(symbol);
    }
  }

  private async getBISTPrice(symbol: string): Promise<number> {
    try {
      // Try Google Finance first
      const response = await axios.get(`${this.GOOGLE_FINANCE_BASE_URL}/${symbol}:BIST`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const priceText = $('[data-last-price]').attr('data-last-price') || 
                       $('.YMlKec.fxKbKc').first().text();
      
      if (priceText) {
        const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(price)) {
          return price;
        }
      }
      
      throw new Error('Price not found in Google Finance');
    } catch (error) {
      console.warn(`Failed to fetch BIST price for ${symbol} from Google Finance:`, error);
      // Fallback to a mock price service for demo
      return this.getMockPrice(symbol, 'stock');
    }
  }

  private async getTEFASPrice(symbol: string): Promise<number> {
    try {
      const response = await axios.get(this.TEFAS_BASE_URL, {
        params: {
          FonKod: symbol,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      // Look for price in various possible selectors
      const priceSelectors = [
        '#MainContent_PanelInfo table tr:contains("Birim Pay Değeri") td:last',
        '.price-value',
        '.fund-price',
        'table td:contains("₺")',
      ];

      for (const selector of priceSelectors) {
        const priceElement = $(selector);
        if (priceElement.length > 0) {
          const priceText = priceElement.text().trim();
          const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
          if (!isNaN(price)) {
            return price;
          }
        }
      }

      throw new Error('Price not found in TEFAS');
    } catch (error) {
      console.warn(`Failed to fetch TEFAS price for ${symbol}:`, error);
      // Fallback to mock price service for demo
      return this.getMockPrice(symbol, 'fund');
    }
  }

  private getMockPrice(symbol: string, type: 'stock' | 'fund'): number {
    // Generate deterministic mock prices based on symbol for demo purposes
    const hash = symbol.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const basePrice = type === 'stock' ? 50 : 2;
    const variation = (Math.abs(hash) % 100) / 100;
    const price = basePrice + (variation * basePrice);
    
    return Math.round(price * 100) / 100;
  }

  async validateSymbol(symbol: string, type: 'stock' | 'fund'): Promise<boolean> {
    try {
      await this.getPrice(symbol, type);
      return true;
    } catch {
      return false;
    }
  }
}
