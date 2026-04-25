import axios from 'axios';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testAllMethods(symbol: string) {
  console.log(`\n=== TESTING ALL SCRAPING METHODS FOR: ${symbol} ===\n`);
  const targetUrl = `https://fintables.com/fonlar/${symbol}`;
  
  // METHOD 1: Direct with browser-like headers
  console.log('--- METHOD 1: Direct request (no proxy) ---');
  try {
    const r = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      timeout: 10000,
      maxRedirects: 5,
    });
    console.log(`  Status: ${r.status}, Length: ${r.data.length}`);
    const price = extractPrice(r.data);
    if (price) console.log(`  ✅ SUCCESS! Price: ${price}`);
    else console.log(`  ❌ HTML received but price not found`);
  } catch (e: any) {
    console.log(`  ❌ Failed: ${e.response?.status || e.message}`);
  }

  // METHOD 2: ScraperAPI WITHOUT render (cheapest: 1 credit)
  const apiKey = process.env.SCRAPER_API_KEY;
  if (apiKey) {
    console.log('\n--- METHOD 2: ScraperAPI (no render, 1 credit) ---');
    try {
      const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`;
      const startTime = Date.now();
      const r = await axios.get(proxyUrl, { timeout: 20000 });
      console.log(`  Status: ${r.status}, Length: ${r.data.length}, Took: ${Date.now() - startTime}ms`);
      const price = extractPrice(r.data);
      if (price) console.log(`  ✅ SUCCESS! Price: ${price}`);
      else console.log(`  ❌ HTML received but price not found`);
    } catch (e: any) {
      console.log(`  ❌ Failed: ${e.response?.status || e.message}`);
    }

    console.log('\n--- METHOD 3: ScraperAPI (render=true, 5 credits) ---');
    try {
      const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&render=true`;
      const startTime = Date.now();
      const r = await axios.get(proxyUrl, { timeout: 60000 });
      console.log(`  Status: ${r.status}, Length: ${r.data.length}, Took: ${Date.now() - startTime}ms`);
      const price = extractPrice(r.data);
      if (price) console.log(`  ✅ SUCCESS! Price: ${price}`);
      else console.log(`  ❌ HTML received but price not found`);
    } catch (e: any) {
      console.log(`  ❌ Failed: ${e.response?.status || e.message}`);
    }
  }
  
  // METHOD 4: Fintables internal RSC/JSON fetch
  console.log('\n--- METHOD 4: Fintables RSC Fetch (direct JSON) ---');
  try {
    const rscUrl = `https://fintables.com/fonlar/${symbol}`;
    const r = await axios.get(rscUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/x-component',
        'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22(terminal)%22%2C%7B%22children%22%3A%5B%22fonlar%22%2C%7B%22children%22%3A%5B%5B%22code%22%2C%22' + symbol + '%22%2C%22d%22%5D%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%5D%7D%5D',
        'Next-Action': '',
        'RSC': '1',
      },
      timeout: 10000,
    });
    console.log(`  Status: ${r.status}, Length: ${JSON.stringify(r.data).length}`);
    const price = extractPrice(JSON.stringify(r.data));
    if (price) console.log(`  ✅ SUCCESS! Price: ${price}`);
    else console.log(`  ❌ Response received but price not found`);
  } catch (e: any) {
    console.log(`  ❌ Failed: ${e.response?.status || e.message}`);
  }
}

function extractPrice(html: string): number | null {
  // Strategy 1: Regex for "price":NUMBER pattern in Fintables Next.js data
  const priceMatch = html.match(/"price"\s*:\s*([\d.]+)/);
  if (priceMatch && priceMatch[1]) {
    const price = parseFloat(priceMatch[1]);
    if (price > 0 && price < 10000) { // sanity check for fund prices
      return price;
    }
  }
  return null;
}

testAllMethods('YKT').catch(console.error);
