import axios from 'axios';

async function testTefas(symbol: string) {
  console.log(`\n=== DEBUGGING DIRECT SCRAPE FOR TEFAS API: ${symbol} ===\n`);
  const targetUrl = 'https://tefas.gov.tr/api/DB/BindHistoryInfo';
  
  try {
    const response = await axios.post(targetUrl, `fontip=YAT&sfontur=&fonkod=${symbol}&fongrup=&kurucukod=&tarih=24.04.2026`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
      timeout: 10000
    });
    
    console.log(`[+] TEFAS Status: ${response.status}`);
    console.log(response.data);
  } catch (error: any) {
    console.error(`[-] TEFAS Request Failed!`);
    console.error(`Status code: ${error.response?.status}`);
  }
}

testTefas('YKT').catch(console.error);
