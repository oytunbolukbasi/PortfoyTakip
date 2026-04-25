import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testFastScraper(symbol: string) {
  console.log(`\n=== DEBUGGING FAST SCRAPE (NO RENDER) FOR: ${symbol} ===\n`);
  const targetUrl = `https://fintables.com/fonlar/${symbol}`;
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) {
    console.error("ERROR: SCRAPER_API_KEY is not defined in .env");
    return;
  }
  
  // RENDER=TRUE yok! Çok daha hızlı ve daha az kota tüketir.
  const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`;

  console.log(`[1] Making request to ScraperAPI without render=true...`);

  let html = '';
  try {
    const startTime = Date.now();
    const response = await axios({
      method: 'GET',
      url: proxyUrl,
      headers: { 'Accept-Language': 'tr-TR,tr;q=0.9' },
      timeout: 20000
    });
    const duration = Date.now() - startTime;
    console.log(`[+] Request successful! Status: ${response.status}. Took ${duration}ms`);
    html = response.data;
    fs.writeFileSync('raw-fintables.html', html);
    console.log('[+] Saved raw HTML to raw-fintables.html');
  } catch (error: any) {
    console.error(`[-] Axios Request Failed!`);
    console.error(`Error message: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(error.response.data);
    }
    return;
  }

  let price: number | null = null;

  // Strategy 1: Specific regex for Fintables fund data structure
  const specificRegex = /"price":\s*([\d.]+)/;
  const match = html.match(specificRegex);
  
  if (match && match[1]) {
    const p = parseFloat(match[1]);
    if (!isNaN(p) && p > 0 && p < 10000) {
      price = p;
      console.log(`[+] Successfully parsed price from Regex: ${price}`);
    }
  }

  if (!price) {
    console.log(`\n[2] Parsing HTML with Cheerio (Fallback)...`);
    const $ = cheerio.load(html);
    const selectors = [
      'span.inline-flex.items-center.tabular-nums',
      'div.text-3xl.font-semibold'
    ];
    
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        const cleanPrice = text.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(cleanPrice);
        if (!isNaN(parsed) && parsed > 0 && parsed < 10000) {
          price = parsed;
          console.log(`[+] Successfully parsed price from CSS selector: ${price}`);
          break;
        }
      }
    }
  }

  if (price) {
    console.log(`SUCCESS! Final Price: ${price} TL`);
  } else {
    console.log(`FAILED! Could not extract price.`);
  }
}

testFastScraper('AES').catch(console.error);
