import axios from 'axios';
import * as cheerio from 'cheerio';

async function testDirectFintables(symbol: string) {
  console.log(`\n=== DEBUGGING DIRECT SCRAPE (NO PROXY) FOR: ${symbol} ===\n`);
  const targetUrl = `https://fintables.com/fonlar/${symbol}`;

  console.log(`[1] Making DIRECT request to Fintables...`);
  console.log(`Target: ${targetUrl}`);

  let html = '';
  try {
    const startTime = Date.now();
    const response = await axios({
      method: 'GET',
      url: targetUrl,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      },
      timeout: 10000
    });
    const duration = Date.now() - startTime;
    console.log(`[+] Request successful! Status: ${response.status}. Took ${duration}ms`);
    html = response.data;
    console.log(`[+] Received HTML payload length: ${html.length} characters`);
  } catch (error: any) {
    console.error(`[-] Axios Request Failed!`);
    console.error(`Error message: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return;
  }

  console.log(`\n[2] Parsing HTML with Cheerio...`);
  const $ = cheerio.load(html);
  let price: number | null = null;

  console.log(`\n[3] Attempting CSS Selector...`);
  const selectors = [
    'span.inline-flex.items-center.tabular-nums',
    'div.text-3xl.font-semibold',
    'h1 + div span'
  ];
  
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    if (text) {
      console.log(`[~] Found text "${text}" using selector "${sel}"`);
      const cleanPrice = text.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleanPrice);
      if (!isNaN(parsed) && parsed > 0) {
        price = parsed;
        console.log(`[+] Successfully parsed price: ${price}`);
        break;
      }
    } else {
        console.log(`[-] Selector "${sel}" yielded no text.`);
    }
  }

  console.log(`\n=== FINAL RESULT ===`);
  if (price) {
    console.log(`SUCCESS! Final Price for ${symbol}: ${price} TL`);
  } else {
    console.log(`FAILED!`);
    console.log(`HTML Snippet:`, html.substring(0, 1000));
  }
}

testDirectFintables('YKT').catch(console.error);
