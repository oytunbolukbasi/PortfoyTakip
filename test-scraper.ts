import axios from 'axios';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testFintablesScraper(symbol: string) {
  console.log(`\n=== DEBUGGING SCRAPE FOR: ${symbol} ===\n`);
  const targetUrl = `https://fintables.com/fonlar/${symbol}`;
  const apiKey = process.env.SCRAPER_API_KEY;

  if (!apiKey) {
    console.error("ERROR: SCRAPER_API_KEY is not defined in .env");
    return;
  }
  
  console.log(`API Key loaded (ending in ...${apiKey.slice(-4)})`);

  // Testing without premium to see if Free Plan can bypass Fintables Cloudflare
  const renderParam = '&render=true';
  const proxyUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}${renderParam}`;

  console.log(`\n[1] Making request to ScraperAPI...`);
  console.log(`Target: ${targetUrl}`);

  let html = '';
  try {
    const startTime = Date.now();
    const response = await axios({
      method: 'GET',
      url: proxyUrl,
      headers: { 'Accept-Language': 'tr-TR,tr;q=0.9' },
      timeout: 60000
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
      console.error(`Response data:`, JSON.stringify(error.response.data).substring(0, 500));
    }
    return;
  }

  console.log(`\n[2] Parsing HTML with Cheerio...`);
  const $ = cheerio.load(html);
  let price: number | null = null;

  console.log(`\n[3] Attempting parsing strategy 1: __NEXT_DATA__ JSON extraction...`);
  const nextDataHtml = $('#__NEXT_DATA__').html();
  if (nextDataHtml) {
    console.log(`[+] Found <script id="__NEXT_DATA__">. Length: ${nextDataHtml.length}`);
    try {
      const jsonData = JSON.parse(nextDataHtml);
      const foundPrice = jsonData?.props?.pageProps?.fund?.price;
      
      if (foundPrice) {
        console.log(`[+] Successfully extracted price from JSON: ${foundPrice}`);
        price = parseFloat(foundPrice);
      } else {
        console.log(`[-] Could not find props.pageProps.fund.price in the JSON structure.`);
        console.log(`[-] Available keys in pageProps: ${Object.keys(jsonData?.props?.pageProps || {})}`);
      }
    } catch (e) {
      console.log(`[-] JSON.parse failed on __NEXT_DATA__ content.`);
    }
  } else {
    console.log(`[-] <script id="__NEXT_DATA__"> NOT FOUND in the HTML.`);
  }

  if (!price) {
    console.log(`\n[4] Attempting parsing strategy 2: CSS Selector fallback...`);
    const selectors = [
      'span.inline-flex.items-center.tabular-nums',
      'div.text-3xl.font-semibold'
    ];
    
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text) {
        console.log(`[~] Found text "${text}" using selector "${sel}"`);
        const cleanPrice = text.replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(cleanPrice);
        if (!isNaN(parsed) && parsed > 0) {
          price = parsed;
          console.log(`[+] Successfully parsed price from CSS selector: ${price}`);
          break;
        }
      } else {
         console.log(`[-] Selector "${sel}" yielded no text.`);
      }
    }
  }

  console.log(`\n=== FINAL RESULT ===`);
  if (price) {
    console.log(`SUCCESS! Final Price for ${symbol}: ${price} TL`);
  } else {
    console.log(`FAILED! Could not extract price using any method.`);
  }
}

testFintablesScraper('YKT').catch(console.error);
