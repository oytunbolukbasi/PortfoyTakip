const axios = require('axios');
const cheerio = require('cheerio');

async function debugExchangeRate() {
  const ticker = 'USD-TRY';
  const exchange = 'CURRENCY';
  const googleUrl = `https://www.google.com/finance/quote/${ticker}:${exchange}`;
  
  console.log(`Fetching from: ${googleUrl}`);
  
  try {
    const response = await axios.get(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const priceSelectors = [
      '.YMlKec.fxKbKc',
      '.YMlKec',
      '[data-last-price]',
    ];

    for (const selector of priceSelectors) {
      const el = $(selector);
      console.log(`Selector ${selector}: found ${el.length} elements`);
      el.each((i, e) => {
        console.log(`  [${i}] Text: "${$(e).text().trim()}" Price: "${$(e).attr('data-last-price')}"`);
      });
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

debugExchangeRate();
