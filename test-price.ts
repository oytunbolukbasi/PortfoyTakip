import { PriceService } from './server/services/price-service.ts';
async function test() {
  const s = new PriceService();
  console.log("USDTRY:", await s.getExchangeRate('USDTRY'));
}
test();
